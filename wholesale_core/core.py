"""
Ontario wholesale price normalisation (stdlib only).

Target runtime: Python 3.12+ (Vercel supports 3.12 default, also 3.13 and 3.14).
Avoids 3.13+/3.14-only syntax so the same code runs on Vercel 3.12 and local 3.14.

IESO source: https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/
Prices: LmpCap in $/MWh. ¢/kWh equivalent = $/MWh / 10.
"""

from __future__ import annotations

import json
import re
import threading
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

ET_TZ = ZoneInfo("America/Toronto")
USER_AGENT = "PowerSave/1.0 (+https://powersave.app; educational household tool; contact: local-dev)"
IESO_DIR = "https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/"
IESO_LATEST = IESO_DIR + "PUB_RealtimeOntarioZonalPrice.xml"

LIVE_CACHE_SECONDS = 90
AVERAGES_CACHE_SECONDS = 3600
MAX_FETCH_WORKERS = 4

# Hobby maxDuration is 300s (vercel.json). Work budget stays far below that so we
# always return live price + whatever averages fit before Vercel kills the function.
TIME_BUDGET_SECONDS = 8.0

# Design thresholds
DELAYED_AFTER_SECONDS = 5 * 60
STALE_AFTER_SECONDS = 20 * 60

IESO_COPYRIGHT = (
    "Copyright © 2004-2022 Independent Electricity System Operator, all rights reserved. "
    "This information is subject to the Terms of Use set out in the IESO’s website (www.ieso.ca)"
)

_NS = {"ieso": "http://www.ieso.ca/schema"}

_cache_lock = threading.Lock()
_live_cache: Dict[str, Any] = {"at": 0.0, "payload": None}
_avg_cache: Dict[str, Any] = {"at": 0.0, "payload": None}
_dir_cache: Dict[str, Any] = {"at": 0.0, "index": None}


@dataclass(frozen=True)
class IntervalPrice:
    interval: int  # 1..12
    mw_h: float


@dataclass
class HourReport:
    delivery_date: date
    delivery_hour: int  # 1..24, IESO hour-ending
    intervals: List[IntervalPrice]
    created_at: Optional[datetime] = None

    @property
    def last_interval(self) -> Optional[IntervalPrice]:
        return self.intervals[-1] if self.intervals else None


def mw_h_to_cents_kwh(mw_h: float) -> float:
    return mw_h / 10.0


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def parse_realtime_xml(xml_text: str) -> HourReport:
    """Parse a RealtimeOntarioZonalPrice document. Ignores empty intervals."""
    root = ET.fromstring(xml_text)
    delivery_date: Optional[date] = None
    delivery_hour: Optional[int] = None
    created_at: Optional[datetime] = None
    intervals: List[IntervalPrice] = []

    for el in root.iter():
        name = local_name(el.tag)
        text = (el.text or "").strip()
        if name == "DeliveryDate" and text:
            delivery_date = date.fromisoformat(text)
        elif name == "DeliveryHour" and text:
            delivery_hour = int(text)
        elif name == "CreatedAt" and text:
            # Naive timestamp from IESO; treat as Eastern local wall time.
            created_at = datetime.fromisoformat(text).replace(tzinfo=ET_TZ)

    for el in root.iter():
        if local_name(el.tag) != "ZonalPrice":
            continue
        interval_n: Optional[int] = None
        lmp: Optional[float] = None
        for child in el:
            cn = local_name(child.tag)
            ct = (child.text or "").strip()
            if cn == "Interval" and ct:
                interval_n = int(ct)
            elif cn == "LmpCap" and ct:
                lmp = float(ct)
        if interval_n is not None and lmp is not None:
            intervals.append(IntervalPrice(interval=interval_n, mw_h=lmp))

    intervals.sort(key=lambda i: i.interval)
    if delivery_date is None or delivery_hour is None:
        raise ValueError("RealtimeOntarioZonalPrice XML missing DeliveryDate or DeliveryHour")
    return HourReport(
        delivery_date=delivery_date,
        delivery_hour=delivery_hour,
        intervals=intervals,
        created_at=created_at,
    )


def interval_end_eastern(delivery_date: date, delivery_hour: int, interval: int) -> datetime:
    """
    IESO DeliveryHour is hour-ending 1..24 in America/Toronto.
    HE 20 = 19:00–20:00. Interval 1 ends at 19:05, interval 12 ends at 20:00.
    """
    if not 1 <= delivery_hour <= 24:
        raise ValueError("delivery_hour out of range")
    if not 1 <= interval <= 12:
        raise ValueError("interval out of range")
    start = datetime(
        delivery_date.year,
        delivery_date.month,
        delivery_date.day,
        tzinfo=ET_TZ,
    ) + timedelta(hours=delivery_hour - 1)
    return start + timedelta(minutes=5 * interval)


def freshness_state(
    delivery_date: date,
    delivery_hour: int,
    last_interval: int,
    now: Optional[datetime] = None,
) -> Tuple[str, float, datetime]:
    """
    Returns (state, age_seconds, observation_end).
    state: live | delayed | stale
    Age is measured from the end of the last filled interval in the XML —
    never from the file name or 'latest' alias.
    """
    if now is None:
        now = datetime.now(ET_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=ET_TZ)
    else:
        now = now.astimezone(ET_TZ)

    end = interval_end_eastern(delivery_date, delivery_hour, last_interval)
    age = (now - end).total_seconds()
    if age > STALE_AFTER_SECONDS:
        state = "stale"
    elif age > DELAYED_AFTER_SECONDS:
        state = "delayed"
    else:
        state = "live"
    return state, age, end


_FILE_RE = re.compile(
    r"PUB_RealtimeOntarioZonalPrice_(\d{8})(\d{2})(?:_v(\d+))?\.xml",
    re.IGNORECASE,
)


def select_latest_version_per_hour(filenames: List[str]) -> Dict[str, str]:
    """
    Map YYYYMMDDHH -> chosen filename.

    Prefer the unversioned file when present (IESO published snapshot for that hour).
    Otherwise take the highest _vN.
    """
    best: Dict[str, Tuple[int, str]] = {}
    for name in filenames:
        m = _FILE_RE.search(name)
        if not m:
            continue
        key = m.group(1) + m.group(2)
        # Unversioned ranks above any _vN
        ver = 10_000 if m.group(3) is None else int(m.group(3))
        prev = best.get(key)
        if prev is None or ver > prev[0]:
            best[key] = (ver, name)
    return {k: v[1] for k, v in best.items()}


def parse_directory_listing(html: str) -> List[str]:
    return re.findall(r"PUB_RealtimeOntarioZonalPrice_\d{10}(?:_v\d+)?\.xml", html, flags=re.I)


def http_get(url: str, timeout: float = 20.0) -> str:
    # Ask intermediaries not to serve a stale IESO snapshot of the rolling "latest" file.
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/xml,text/xml,*/*",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def report_observation_end(report: HourReport) -> Optional[datetime]:
    last = report.last_interval
    if last is None:
        return None
    return interval_end_eastern(report.delivery_date, report.delivery_hour, last.interval)


def toronto_delivery_hour(now: datetime) -> int:
    """IESO hour-ending 1..24 for the current America/Toronto wall clock."""
    local = now.astimezone(ET_TZ) if now.tzinfo else now.replace(tzinfo=ET_TZ)
    return (local.hour * 60 + local.minute) // 60 + 1


def pick_freshest_report(*reports: Optional[HourReport]) -> Optional[HourReport]:
    """Choose the report whose last filled interval ends latest."""
    best: Optional[HourReport] = None
    best_end: Optional[datetime] = None
    for rep in reports:
        if rep is None or not rep.intervals:
            continue
        end = report_observation_end(rep)
        if end is None:
            continue
        if best is None or best_end is None or end > best_end:
            best = rep
            best_end = end
    return best


def resolve_live_report(
    fetcher: Callable[[str], str],
    index: Dict[str, str],
    now: datetime,
) -> HourReport:
    """
    Live price = freshest among:
      - PUB_RealtimeOntarioZonalPrice.xml (rolling latest alias)
      - archived file for that alias's delivery hour (may have more intervals)
      - archived file for the wall-clock delivery hour (alias can lag behind)
    """
    latest_xml = fetcher(IESO_LATEST)
    alias = parse_realtime_xml(latest_xml)
    if not alias.intervals:
        raise ValueError("Latest RealtimeOntarioZonalPrice has no filled intervals")

    local = now.astimezone(ET_TZ) if now.tzinfo else now.replace(tzinfo=ET_TZ)
    wall_he = toronto_delivery_hour(local)
    wall_date = local.date()
    # Near midnight HE 24 is still "today"; HE 1 after midnight is new date.
    candidates: List[Optional[HourReport]] = [alias]

    alias_key = _yyyymmddhh(alias.delivery_date, alias.delivery_hour)
    candidates.append(fetch_hour_xml(alias_key, index, fetcher))

    wall_key = _yyyymmddhh(wall_date, wall_he)
    if wall_key != alias_key:
        candidates.append(fetch_hour_xml(wall_key, index, fetcher))

    # Previous HE helps when the new hour file exists but is empty / not yet listed.
    if wall_he > 1:
        prev_key = _yyyymmddhh(wall_date, wall_he - 1)
        if prev_key != alias_key:
            candidates.append(fetch_hour_xml(prev_key, index, fetcher))
    else:
        prev_day = wall_date - timedelta(days=1)
        prev_key = _yyyymmddhh(prev_day, 24)
        if prev_key != alias_key:
            candidates.append(fetch_hour_xml(prev_key, index, fetcher))

    chosen = pick_freshest_report(*candidates)
    if chosen is None:
        raise ValueError("Latest RealtimeOntarioZonalPrice has no filled intervals")
    return chosen


def refresh_payload_freshness(payload: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    """Recompute freshness/countdown on cached payloads so age does not freeze."""
    if not payload.get("ok"):
        return payload
    if now is None:
        now = datetime.now(ET_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=ET_TZ)
    else:
        now = now.astimezone(ET_TZ)

    try:
        d = date.fromisoformat(str(payload["deliveryDate"]))
        he = int(payload["deliveryHour"])
        iv = int(payload["lastInterval"])
    except (KeyError, TypeError, ValueError):
        return payload

    state, age_sec, obs_end = freshness_state(d, he, iv, now=now)
    next_expected = obs_end + timedelta(minutes=5)
    out = dict(payload)
    out["observationEnd"] = obs_end.isoformat()
    out["freshness"] = {
        "state": state,
        "ageSeconds": int(age_sec),
        "delayedAfterSeconds": DELAYED_AFTER_SECONDS,
        "staleAfterSeconds": STALE_AFTER_SECONDS,
    }
    out["countdownSeconds"] = max(0, int((next_expected - now).total_seconds()))
    return out


def clear_caches() -> None:
    global _live_cache, _avg_cache, _dir_cache
    with _cache_lock:
        _live_cache = {"at": 0.0, "payload": None}
        _avg_cache = {"at": 0.0, "payload": None}
        _dir_cache = {"at": 0.0, "index": None}


def get_directory_index(
    fetcher: Callable[[str], str] = http_get,
    use_cache: bool = True,
) -> Dict[str, str]:
    global _dir_cache
    now = time.time()
    if use_cache:
        with _cache_lock:
            if _dir_cache["index"] is not None and now - _dir_cache["at"] < AVERAGES_CACHE_SECONDS:
                return _dir_cache["index"]
    html = fetcher(IESO_DIR)
    names = parse_directory_listing(html)
    index = select_latest_version_per_hour(names)
    if use_cache:
        with _cache_lock:
            _dir_cache = {"at": now, "index": index}
    return index


def fetch_hour_xml(
    yyyymmddhh: str,
    index: Dict[str, str],
    fetcher: Callable[[str], str] = http_get,
) -> Optional[HourReport]:
    fname = index.get(yyyymmddhh)
    if not fname:
        # try unversioned URL directly
        fname = f"PUB_RealtimeOntarioZonalPrice_{yyyymmddhh}.xml"
    url = IESO_DIR + fname
    try:
        text = fetcher(url)
        return parse_realtime_xml(text)
    except (
        urllib.error.HTTPError,
        urllib.error.URLError,
        ValueError,
        ET.ParseError,
        FileNotFoundError,
        OSError,
    ):
        return None


def series_point_minute_of_day(delivery_hour: int, interval: int) -> int:
    """Minute-of-day at the *start* of the interval (for chart x position)."""
    return (delivery_hour - 1) * 60 + (interval - 1) * 5


def build_today_series(reports: List[HourReport]) -> List[Dict[str, Any]]:
    points: List[Dict[str, Any]] = []
    for rep in sorted(reports, key=lambda r: (r.delivery_date, r.delivery_hour)):
        for iv in rep.intervals:
            m = series_point_minute_of_day(rep.delivery_hour, iv.interval)
            points.append(
                {
                    "minuteOfDay": m,
                    "interval": iv.interval,
                    "deliveryHour": rep.delivery_hour,
                    "mwH": round(iv.mw_h, 4),
                    "centsKwh": round(mw_h_to_cents_kwh(iv.mw_h), 4),
                }
            )
    points.sort(key=lambda p: p["minuteOfDay"])
    return points


def hour_mean_cents(report: HourReport) -> Optional[float]:
    if not report.intervals:
        return None
    vals = [mw_h_to_cents_kwh(i.mw_h) for i in report.intervals]
    return sum(vals) / len(vals)


def compute_hour_averages(
    by_day_hour: Dict[Tuple[date, int], float],
    today: date,
    days: int,
) -> List[Dict[str, Any]]:
    """Same-hour averages for clock hours 0..24 (hour-beginning labels)."""
    out: List[Dict[str, Any]] = []
    for clock_hour in range(0, 25):
        # Map chart hour H to IESO HE = H for H>=1; hour 0 uses previous day's HE 24? 
        # Chart x at H:00 aligns with start of HE (H+1) / end of HE H.
        # Design samples hourly at h*60 for average lines. Use IESO HE = h if h>=1 else skip,
        # for h==0 use HE24 of previous logic: mean of HE1's first interval day... 
        # Simpler: for clock hour h (0-23), use DeliveryHour h+1 means of past days.
        # For h==24, use DeliveryHour 24.
        if clock_hour == 24:
            he = 24
        else:
            he = clock_hour + 1
        vals: List[float] = []
        for d in range(1, days + 1):
            day = today - timedelta(days=d)
            v = by_day_hour.get((day, he))
            if v is not None:
                vals.append(v)
        out.append(
            {
                "hour": clock_hour,
                "centsKwh": round(sum(vals) / len(vals), 4) if vals else None,
                "samples": len(vals),
            }
        )
    return out


def _yyyymmddhh(d: date, he: int) -> str:
    return f"{d.year:04d}{d.month:02d}{d.day:02d}{he:02d}"


class Deadline:
    """Monotonic wall-clock budget for IESO fetches (injectable for tests)."""

    def __init__(
        self,
        seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.seconds = seconds
        self.clock = clock
        self.start = clock()
        self.deadline = self.start + seconds

    def remaining(self) -> float:
        return self.deadline - self.clock()

    def expired(self) -> bool:
        return self.remaining() <= 0


def gather_reports_budgeted(
    keys: List[str],
    index: Dict[str, str],
    fetcher: Callable[[str], str],
    deadline: Optional[Deadline] = None,
) -> Tuple[Dict[str, HourReport], bool]:
    """
    Fetch hour XMLs in order with concurrency ≤ MAX_FETCH_WORKERS.
    Stops starting new batches when the deadline is expired.
    Returns (results, timed_out).
    """
    results: Dict[str, HourReport] = {}
    timed_out = False
    if not keys:
        return results, False

    def one(k: str) -> Tuple[str, Optional[HourReport]]:
        return k, fetch_hour_xml(k, index, fetcher)

    i = 0
    while i < len(keys):
        if deadline is not None and deadline.expired():
            timed_out = True
            break
        batch = keys[i : i + MAX_FETCH_WORKERS]
        i += len(batch)
        with ThreadPoolExecutor(max_workers=MAX_FETCH_WORKERS) as pool:
            futs = [pool.submit(one, k) for k in batch]
            for fut in as_completed(futs):
                k, rep = fut.result()
                if rep is not None:
                    results[k] = rep
        if deadline is not None and deadline.expired() and i < len(keys):
            timed_out = True
            break
    return results, timed_out


def count_past_days_with_data(
    by_day_hour: Dict[Tuple[date, int], float],
    today: date,
    max_days: int,
) -> int:
    n = 0
    for d in range(1, max_days + 1):
        day = today - timedelta(days=d)
        if any(k[0] == day for k in by_day_hour):
            n += 1
    return n


def build_averages_block(
    by_day_hour: Dict[Tuple[date, int], float],
    today: date,
    timed_out: bool,
    from_cache: bool,
) -> Dict[str, Any]:
    """
    Honest averages metadata.
    Only label a line as 3-day / 7-day when that many distinct past days exist
    in the lookback window. Otherwise partial or missing.
    """
    days3 = count_past_days_with_data(by_day_hour, today, 3)
    days7 = count_past_days_with_data(by_day_hour, today, 7)
    days_used = days7

    if days_used == 0:
        status = "missing"
    elif days3 >= 3 and days7 >= 7:
        status = "complete"
    else:
        status = "partial"

    show_day3 = days3 >= 3
    show_day7 = days7 >= 7
    # Partial but some history: expose a single honestly labelled N-day series
    show_partial_n = status == "partial" and days_used >= 1 and not (show_day3 and show_day7)

    day3_points = compute_hour_averages(by_day_hour, today, 3) if show_day3 else []
    day7_points = compute_hour_averages(by_day_hour, today, 7) if show_day7 else []
    partial_points = (
        compute_hour_averages(by_day_hour, today, days_used) if show_partial_n else []
    )

    if status == "complete":
        label = "same-hour historical averages"
        note = None
    elif status == "partial":
        label = f"{days_used}-day same-hour averages (partial)"
        note = (
            f"History averages used {days_used} of 7 days"
            + (" — stopped early for the function time budget." if timed_out else ".")
            + " Not a full 3-day or 7-day average."
        )
    else:
        label = "averages unavailable"
        note = (
            "History averages were not loaded in time. Live price above is still from IESO."
            if timed_out
            else "History averages are not available yet."
        )

    return {
        "status": status,
        "daysUsed": days_used,
        "daysRequested": 7,
        "daysFor3": days3,
        "daysFor7": days7,
        "showDay3": show_day3,
        "showDay7": show_day7,
        "showPartialNDay": show_partial_n,
        "day3": day3_points,
        "day7": day7_points,
        "partialNDay": partial_points,
        "partialN": days_used if show_partial_n else None,
        "label": label,
        "note": note,
        "timedOut": timed_out,
        "fromCache": from_cache,
    }


def build_payload(
    fetcher: Callable[[str], str] = http_get,
    now: Optional[datetime] = None,
    use_cache: bool = True,
    budget_seconds: float = TIME_BUDGET_SECONDS,
    clock: Callable[[], float] = time.monotonic,
) -> Dict[str, Any]:
    """
    Build wholesale JSON.
    Always returns live price + today's series when IESO latest is reachable.
    Historical averages fill only while the time budget remains.
    """
    global _live_cache, _avg_cache

    if now is None:
        now = datetime.now(ET_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=ET_TZ)
    else:
        now = now.astimezone(ET_TZ)

    tnow = time.time()
    if use_cache:
        with _cache_lock:
            if _live_cache["payload"] is not None and tnow - _live_cache["at"] < LIVE_CACHE_SECONDS:
                cached = refresh_payload_freshness(dict(_live_cache["payload"]), now=now)
                # If the cached observation went delayed/stale, bypass cache and re-hit IESO.
                if cached.get("freshness", {}).get("state") == "live":
                    cached["cache"] = {"hit": True, "liveAgeSec": int(tnow - _live_cache["at"])}
                    return cached
    else:
        clear_caches()

    deadline = Deadline(budget_seconds, clock=clock)

    # Directory first so hour archives can beat a lagging "latest" alias.
    index = get_directory_index(fetcher, use_cache=use_cache)

    # 1) Live price first (always — outside “optional history” budget pressure).
    latest = resolve_live_report(fetcher, index, now)
    last_live = latest.last_interval
    if last_live is None:
        raise ValueError("Latest RealtimeOntarioZonalPrice has no filled intervals")

    state, age_sec, obs_end = freshness_state(
        latest.delivery_date,
        latest.delivery_hour,
        last_live.interval,
        now=now,
    )

    today = now.date()
    current_he = latest.delivery_hour
    today_keys = [_yyyymmddhh(today, he) for he in range(1, current_he + 1)]

    # 2) Today's series next (priority over multi-day averages).
    fetched_today, today_timed_out = gather_reports_budgeted(
        today_keys, index, fetcher, deadline=deadline
    )

    today_reports = [fetched_today[k] for k in today_keys if k in fetched_today]
    if not any(
        r.delivery_hour == latest.delivery_hour and r.delivery_date == latest.delivery_date
        for r in today_reports
    ):
        today_reports.append(latest)
    else:
        today_reports = [
            latest
            if (r.delivery_date == latest.delivery_date and r.delivery_hour == latest.delivery_hour)
            else r
            for r in today_reports
        ]
    series = build_today_series(today_reports)

    # 3) Averages from cache or budgeted history (recent days first).
    by_day_hour: Dict[Tuple[date, int], float] = {}
    avg_hit = False
    hist_timed_out = False
    if use_cache:
        with _cache_lock:
            if _avg_cache["payload"] is not None and tnow - _avg_cache["at"] < AVERAGES_CACHE_SECONDS:
                by_day_hour = dict(_avg_cache["payload"])
                avg_hit = True

    if not avg_hit:
        avg_keys: List[str] = []
        for d in range(1, 8):
            day = today - timedelta(days=d)
            for he in range(1, 25):
                avg_keys.append(_yyyymmddhh(day, he))
        fetched_hist, hist_timed_out = gather_reports_budgeted(
            avg_keys, index, fetcher, deadline=deadline
        )
        for rep in fetched_hist.values():
            mean = hour_mean_cents(rep)
            if mean is not None:
                by_day_hour[(rep.delivery_date, rep.delivery_hour)] = mean
        # Cache whatever we got so the next request can deepen history.
        if by_day_hour:
            with _cache_lock:
                prev = _avg_cache.get("payload") or {}
                merged = dict(prev) if isinstance(prev, dict) else {}
                merged.update(by_day_hour)
                _avg_cache = {"at": time.time(), "payload": merged}
                by_day_hour = merged

    timed_out = today_timed_out or hist_timed_out or deadline.expired()
    averages = build_averages_block(
        by_day_hour, today, timed_out=timed_out and not avg_hit, from_cache=avg_hit
    )

    last = latest.last_interval
    assert last is not None
    cents = mw_h_to_cents_kwh(last.mw_h)

    next_expected = obs_end + timedelta(minutes=5)
    countdown_sec = max(0, int((next_expected - now).total_seconds()))

    payload: Dict[str, Any] = {
        "ok": True,
        "source": "IESO RealtimeOntarioZonalPrice",
        "sourceUrl": IESO_DIR,
        "copyright": IESO_COPYRIGHT,
        "priceField": "LmpCap",
        "priceNote": (
            "Ontario zonal energy price is LmpCap ($/MWh), matching the IESO report stylesheet. "
            "LossPriceCap and CongPriceCap are components, not added again."
        ),
        "fetchedAt": now.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "iesoCreatedAt": latest.created_at.isoformat() if latest.created_at else None,
        "deliveryDate": latest.delivery_date.isoformat(),
        "deliveryHour": latest.delivery_hour,
        "lastInterval": last.interval,
        "observationEnd": obs_end.isoformat(),
        "freshness": {
            "state": state,
            "ageSeconds": int(age_sec),
            "delayedAfterSeconds": DELAYED_AFTER_SECONDS,
            "staleAfterSeconds": STALE_AFTER_SECONDS,
        },
        "latest": {
            "mwH": round(last.mw_h, 4),
            "centsKwh": round(cents, 4),
            "displayCents": round(cents, 1),
            "displayMwH": int(round(last.mw_h)),
        },
        "countdownSeconds": countdown_sec,
        "series": series,
        "averages": averages,
        "budget": {
            "seconds": budget_seconds,
            "timedOut": timed_out and not avg_hit,
            "maxDurationHobbySeconds": 300,
        },
        "requestsNote": (
            "Cold cache worst case ≈ 1 directory listing + latest alias + "
            "current/previous hour archives + up to 168 hourly XMLs for averages; "
            f"concurrency capped at 4. Work budget {budget_seconds:g}s (Hobby maxDuration 300s)."
        ),
        "cache": {"hit": False, "averagesHit": avg_hit},
    }

    if use_cache:
        with _cache_lock:
            _live_cache = {"at": time.time(), "payload": payload}

    return payload


def build_error_payload(
    message: str,
    *,
    code: str = "error",
    stage: str = "unknown",
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Structured JSON error — never raise out of the HTTP handler."""
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return {
        "ok": False,
        "error": message,
        "errorCode": code,
        "stage": stage,
        "copyright": IESO_COPYRIGHT,
        "fetchedAt": now.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "freshness": {"state": "error", "ageSeconds": None},
    }


def response_json(payload: Dict[str, Any], cache_live: bool = True) -> Tuple[int, Dict[str, str], bytes]:
    status = 200 if payload.get("ok") else 503
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
    }
    if cache_live and payload.get("ok"):
        state = (payload.get("freshness") or {}).get("state")
        if state == "live":
            headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=30"
        else:
            # Delayed/stale: don't pin CDN on a frozen observation — recheck IESO soon.
            headers["Cache-Control"] = "public, max-age=15, s-maxage=15, stale-while-revalidate=15"
    else:
        headers["Cache-Control"] = "no-store"
    return status, headers, body


def handle_get() -> Tuple[int, Dict[str, str], bytes]:
    """
    Shared GET handler for Vercel (`api/wholesale.py`) and local `python -m wholesale_core`.
    Fetch/parse failures become structured JSON — never an uncaught import or handler crash.
    Live price + today's series still return when only history/averages fail (see build_payload).
    """
    try:
        payload = build_payload()
        return response_json(payload, cache_live=True)
    except Exception as exc:  # noqa: BLE001 — surface as JSON for the UI
        if isinstance(exc, (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError)):
            stage, code = "fetch", "fetch_error"
        elif isinstance(exc, (ValueError, ET.ParseError)):
            stage, code = "parse", "parse_error"
        else:
            stage, code = "build", "handler_error"
        return response_json(
            build_error_payload(str(exc), code=code, stage=stage),
            cache_live=False,
        )


# Documented worst-case IESO HTTP requests on a fully cold process cache:
WORST_CASE_COLD_REQUESTS = 1 + 1 + 168  # dir + latest + 7 days × 24 hours
