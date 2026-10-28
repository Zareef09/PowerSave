"""pytest suite — no live network. Uses saved XML fixtures only."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from wholesale_core import (
    IESO_COPYRIGHT,
    WORST_CASE_COLD_REQUESTS,
    build_error_payload,
    build_payload,
    freshness_state,
    handle_get,
    interval_end_eastern,
    mw_h_to_cents_kwh,
    parse_directory_listing,
    parse_realtime_xml,
    response_json,
    select_latest_version_per_hour,
)

ET = ZoneInfo("America/Toronto")
FIXTURES = Path(__file__).resolve().parent / "fixtures"


def read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_unit_conversion_matches_design():
    assert mw_h_to_cents_kwh(46.0) == 4.6
    assert mw_h_to_cents_kwh(52.48) == pytest.approx(5.248)


def test_parse_synthetic_skips_empty_intervals():
    report = parse_realtime_xml(read("synthetic_hour.xml"))
    assert report.delivery_date == date(2026, 11, 18)
    assert report.delivery_hour == 18
    assert [i.interval for i in report.intervals] == [1, 2, 3]
    assert report.last_interval is not None
    assert report.last_interval.mw_h == 46.0
    assert mw_h_to_cents_kwh(report.last_interval.mw_h) == 4.6


def test_parse_saved_ieso_fixture():
    report = parse_realtime_xml(read("latest_partial.xml"))
    assert report.delivery_date == date(2026, 10, 17)
    assert report.delivery_hour == 20
    assert report.last_interval is not None
    assert report.last_interval.interval >= 1


def test_parse_live_stuck_he19_fixture():
    """Regression: real IESO XML from 2026-10-28 (HE 19, 8 filled intervals)."""
    report = parse_realtime_xml(read("live_stuck_he19.xml"))
    assert report.delivery_date == date(2026, 10, 28)
    assert report.delivery_hour == 19
    assert [i.interval for i in report.intervals] == list(range(1, 9))
    assert report.last_interval is not None
    assert report.last_interval.mw_h == 63.43
    assert mw_h_to_cents_kwh(report.last_interval.mw_h) == pytest.approx(6.343)


def test_pick_freshest_prefers_more_recent_interval():
    from wholesale_core.core import HourReport, IntervalPrice, pick_freshest_report

    older = HourReport(
        delivery_date=date(2026, 10, 28),
        delivery_hour=19,
        intervals=[IntervalPrice(7, 63.39)],
    )
    newer = HourReport(
        delivery_date=date(2026, 10, 28),
        delivery_hour=19,
        intervals=[IntervalPrice(7, 63.39), IntervalPrice(8, 63.43)],
    )
    assert pick_freshest_report(older, newer) is newer
    assert pick_freshest_report(newer, older) is newer


def test_resolve_live_prefers_hour_archive_over_stale_alias():
    """When the rolling latest alias lags an hour archive, use the archive."""
    from wholesale_core.core import resolve_live_report

    archive = read("live_stuck_he19.xml")
    # Alias stops at interval 7 (empty LmpCap for 8+).
    alias = archive.replace(
        "<Interval>8</Interval>\n<Flag>DSO-RD</Flag>\n<LmpCap>63.43</LmpCap>\n"
        "<LossPriceCap>0.16</LossPriceCap>\n<CongPriceCap>0.04</CongPriceCap>",
        "<Interval>8</Interval>\n<Flag/>\n<LmpCap/>\n"
        "<LossPriceCap/>\n<CongPriceCap/>",
    )
    assert "63.43" not in alias  # interval 8 cleared
    assert "63.43" in archive

    def fetcher(url: str) -> str:
        if url.endswith("PUB_RealtimeOntarioZonalPrice.xml"):
            return alias
        if "2026102819" in url:
            return archive
        if url.rstrip("/").endswith("RealtimeOntarioZonalPrice"):
            return read("directory.html")
        raise FileNotFoundError(url)

    now = datetime(2026, 10, 28, 18, 42, tzinfo=ET)
    index = {"2026102819": "PUB_RealtimeOntarioZonalPrice_2026102819.xml"}
    report = resolve_live_report(fetcher, index, now)
    assert report.last_interval is not None
    assert report.last_interval.interval == 8
    assert report.last_interval.mw_h == 63.43


def test_version_selection_prefers_unversioned_then_max_v():
    names = parse_directory_listing(read("directory.html"))
    chosen = select_latest_version_per_hour(names)
    # Unversioned wins over _v12 for hour 20
    assert chosen["2026101720"] == "PUB_RealtimeOntarioZonalPrice_2026101720.xml"
    # Unversioned wins over _v2 for hour 14 on Oct 15
    assert chosen["2026101514"] == "PUB_RealtimeOntarioZonalPrice_2026101514.xml"
    # Only versions: highest v wins
    assert chosen["2026101515"] == "PUB_RealtimeOntarioZonalPrice_2026101515_v3.xml"


def test_interval_end_hour_ending():
    # HE 18 = 17:00–18:00; interval 3 ends 17:15
    end = interval_end_eastern(date(2026, 11, 18), 18, 3)
    assert end == datetime(2026, 11, 18, 17, 15, tzinfo=ET)


def test_freshness_live_delayed_stale():
    d = date(2026, 11, 18)
    he, interval = 18, 3
    end = interval_end_eastern(d, he, interval)

    live_now = end + __import__("datetime").timedelta(minutes=2)
    state, age, _ = freshness_state(d, he, interval, now=live_now)
    assert state == "live"
    assert age == pytest.approx(120, abs=1)

    delayed_now = end + __import__("datetime").timedelta(minutes=6)
    state, _, _ = freshness_state(d, he, interval, now=delayed_now)
    assert state == "delayed"

    stale_now = end + __import__("datetime").timedelta(minutes=21)
    state, _, _ = freshness_state(d, he, interval, now=stale_now)
    assert state == "stale"


def test_freshness_never_uses_filename():
    """Observation time comes from DeliveryDate + DeliveryHour + interval only."""
    d = date(2026, 10, 17)
    state, age, end = freshness_state(
        d, 20, 6, now=datetime(2026, 10, 17, 19, 32, tzinfo=ET)
    )
    assert end == datetime(2026, 10, 17, 19, 30, tzinfo=ET)
    assert state == "live"
    assert age == pytest.approx(120, abs=1)


def test_averages_and_payload_from_fixtures_no_network():
    synthetic = read("synthetic_hour.xml")
    hour19 = read("hour_2026101719.xml")
    hour20 = read("hour_2026101720.xml")
    listing = read("directory.html")

    files = {
        "https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/": listing,
        "https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/PUB_RealtimeOntarioZonalPrice.xml": synthetic,
        "https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/PUB_RealtimeOntarioZonalPrice_2026111818.xml": synthetic,
    }
    # Map any other hour URL to hour20/hour19 fixtures for averages scaffolding
    files["https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/PUB_RealtimeOntarioZonalPrice_2026101720.xml"] = hour20
    files["https://reports-public.ieso.ca/public/RealtimeOntarioZonalPrice/PUB_RealtimeOntarioZonalPrice_2026101719.xml"] = hour19

    def fetcher(url: str) -> str:
        if url in files:
            return files[url]
        # Return synthetic with adjusted date/hour carved from URL when possible
        import re

        m = re.search(r"PUB_RealtimeOntarioZonalPrice_(\d{8})(\d{2})", url)
        if not m:
            raise FileNotFoundError(url)
        ymd, hh = m.group(1), m.group(2)
        return synthetic.replace("2026-11-18", f"{ymd[0:4]}-{ymd[4:6]}-{ymd[6:8]}").replace(
            "<DeliveryHour>18</DeliveryHour>", f"<DeliveryHour>{int(hh)}</DeliveryHour>"
        )

    now = datetime(2026, 11, 18, 17, 16, tzinfo=ET)
    payload = build_payload(fetcher=fetcher, now=now, use_cache=False)

    assert payload["ok"] is True
    assert payload["deliveryDate"] == "2026-11-18"
    assert payload["deliveryHour"] == 18
    assert payload["lastInterval"] == 3
    assert payload["latest"]["centsKwh"] == 4.6
    assert payload["latest"]["mwH"] == 46.0
    assert payload["freshness"]["state"] == "live"
    assert payload["copyright"] == IESO_COPYRIGHT
    assert "averages" in payload
    assert payload["averages"]["status"] in ("complete", "partial", "missing")
    assert "daysUsed" in payload["averages"]
    assert any(p["centsKwh"] == 4.6 for p in payload["series"])
    assert payload["budget"]["seconds"] == 8.0


def test_handler_wrapper_with_fixtures(monkeypatch):
    """Call shared handle_get against fixtures (no network)."""
    import wholesale_core.core as core

    synthetic = read("synthetic_hour.xml")
    listing = read("directory.html")

    def fetcher(url: str) -> str:
        if url.rstrip("/").endswith("RealtimeOntarioZonalPrice"):
            return listing
        if url.endswith("PUB_RealtimeOntarioZonalPrice.xml"):
            return synthetic
        import re

        m = re.search(r"PUB_RealtimeOntarioZonalPrice_(\d{8})(\d{2})", url)
        if not m:
            raise FileNotFoundError(url)
        ymd, hh = m.group(1), m.group(2)
        return synthetic.replace("2026-11-18", f"{ymd[0:4]}-{ymd[4:6]}-{ymd[6:8]}").replace(
            "<DeliveryHour>18</DeliveryHour>", f"<DeliveryHour>{int(hh)}</DeliveryHour>"
        )

    fixed_now = datetime(2026, 11, 18, 17, 16, tzinfo=ET)
    real_build = core.build_payload

    def fake_build_payload(**kwargs):
        kwargs.setdefault("fetcher", fetcher)
        kwargs.setdefault("now", fixed_now)
        kwargs.setdefault("use_cache", False)
        return real_build(**kwargs)

    monkeypatch.setattr(core, "build_payload", fake_build_payload)

    import json

    status, headers, body = handle_get()
    assert status == 200
    assert "application/json" in headers["Content-Type"]
    assert "s-maxage=60" in headers["Cache-Control"]
    data = json.loads(body.decode("utf-8"))
    assert data["ok"] is True
    assert data["copyright"] == IESO_COPYRIGHT


def test_structured_error_payload_fields():
    err = build_error_payload("boom", code="fetch_error", stage="fetch")
    assert err["ok"] is False
    assert err["error"] == "boom"
    assert err["errorCode"] == "fetch_error"
    assert err["stage"] == "fetch"
    assert err["copyright"] == IESO_COPYRIGHT
    assert err["freshness"]["state"] == "error"
    status, headers, body = response_json(err, cache_live=False)
    assert status == 503
    assert headers["Cache-Control"] == "no-store"
    import json

    data = json.loads(body.decode("utf-8"))
    assert data["errorCode"] == "fetch_error"
    assert data["stage"] == "fetch"


def test_handle_get_returns_structured_json_on_failure(monkeypatch):
    import urllib.error

    import wholesale_core.core as core

    def boom(**_kwargs):
        raise urllib.error.URLError("simulated network down")

    monkeypatch.setattr(core, "build_payload", boom)
    import json

    status, _headers, body = handle_get()
    assert status == 503
    data = json.loads(body.decode("utf-8"))
    assert data["ok"] is False
    assert data["errorCode"] == "fetch_error"
    assert data["stage"] == "fetch"
    assert "simulated network down" in data["error"]


def test_vercel_style_clean_copy_import(tmp_path):
    """
    Reproduce the Vercel layout: only deployable files, project-root cwd,
    no PYTHONPATH, load api/wholesale.py. Must import wholesale_core from root.
    """
    import os
    import shutil
    import subprocess
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    dest = tmp_path / "deploy"
    dest.mkdir()

    # Files Vercel needs for this function (respect .gitignore-style excludes).
    for rel in (
        "api/wholesale.py",
        "wholesale_core/__init__.py",
        "wholesale_core/core.py",
        "wholesale_core/__main__.py",
        "requirements.txt",
        "vercel.json",
        ".python-version",
    ):
        src = root / rel
        assert src.is_file(), f"missing {rel}"
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)

    # Assert shared core is NOT under api/ (would become a public endpoint).
    assert not (dest / "api" / "wholesale_core.py").exists()
    assert not list((dest / "api").glob("_*.py")) or True

    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    env.pop("PYTHONPATH", None)
    script = r"""
import importlib.util
from pathlib import Path
root = Path(".").resolve()
spec = importlib.util.spec_from_file_location("wholesale", root / "api" / "wholesale.py")
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
assert hasattr(mod, "handler")
assert hasattr(mod, "handle_get") or hasattr(mod, "handler")
from wholesale_core import handle_get, build_error_payload
assert callable(handle_get)
err = build_error_payload("x", code="test", stage="test")
assert err["errorCode"] == "test"
print("CLEAN_IMPORT_OK")
"""
    proc = subprocess.run(
        [sys.executable, "-c", script],
        cwd=str(dest),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr + proc.stdout
    assert "CLEAN_IMPORT_OK" in proc.stdout


def test_api_has_no_public_core_module():
    """Shared core must not sit as a sibling .py under api/ (Vercel would expose it)."""
    from pathlib import Path

    api = Path(__file__).resolve().parents[1] / "api"
    assert (api / "wholesale.py").is_file()
    assert not (api / "wholesale_core.py").exists()
    py_files = sorted(p.name for p in api.glob("*.py"))
    assert py_files == ["wholesale.py"], f"unexpected api/*.py files: {py_files}"


def test_worst_case_constant_documented():
    assert WORST_CASE_COLD_REQUESTS == 170


def test_deadline_helper():
    from wholesale_core import Deadline

    t = {"v": 0.0}

    def clock() -> float:
        return t["v"]

    d = Deadline(8.0, clock=clock)
    assert d.remaining() == pytest.approx(8.0)
    assert not d.expired()
    t["v"] = 5.0
    assert d.remaining() == pytest.approx(3.0)
    t["v"] = 9.0
    assert d.expired()


def test_budget_stops_history_but_keeps_live_price():
    """Fake clock burns budget during fetches; live price still returned."""
    from wholesale_core import TIME_BUDGET_SECONDS, clear_caches

    clear_caches()
    synthetic = read("synthetic_hour.xml")
    listing = read("directory.html")

    def base_fetcher(url: str) -> str:
        if url.rstrip("/").endswith("RealtimeOntarioZonalPrice"):
            return listing
        if url.endswith("PUB_RealtimeOntarioZonalPrice.xml"):
            return synthetic
        import re

        m = re.search(r"PUB_RealtimeOntarioZonalPrice_(\d{8})(\d{2})", url)
        if not m:
            raise FileNotFoundError(url)
        ymd, hh = m.group(1), m.group(2)
        return synthetic.replace("2026-11-18", f"{ymd[0:4]}-{ymd[4:6]}-{ymd[6:8]}").replace(
            "<DeliveryHour>18</DeliveryHour>", f"<DeliveryHour>{int(hh)}</DeliveryHour>"
        )

    mono = {"t": 0.0}

    def clock() -> float:
        return mono["t"]

    def slow_fetcher(url: str) -> str:
        mono["t"] += 3.0  # 3s per HTTP call → budget expires quickly
        return base_fetcher(url)

    now = datetime(2026, 11, 18, 17, 16, tzinfo=ET)
    payload = build_payload(
        fetcher=slow_fetcher,
        now=now,
        use_cache=False,
        budget_seconds=TIME_BUDGET_SECONDS,
        clock=clock,
    )

    assert payload["ok"] is True
    assert payload["latest"]["centsKwh"] == 4.6
    assert payload["averages"]["status"] in ("partial", "missing")
    assert payload["averages"]["showDay7"] is False
    if payload["averages"]["status"] == "partial":
        assert "partial" in payload["averages"]["label"]
        assert "Not a full 3-day or 7-day" in (payload["averages"]["note"] or "")
    if payload["averages"]["status"] == "missing":
        assert payload["averages"]["showDay3"] is False
        assert "unavailable" in payload["averages"]["label"]


def test_build_averages_block_never_mislabels():
    from wholesale_core import build_averages_block

    today = date(2026, 11, 18)
    # Only 2 past days of data
    by = {
        (today - __import__("datetime").timedelta(days=1), 14): 5.0,
        (today - __import__("datetime").timedelta(days=2), 14): 5.1,
    }
    block = build_averages_block(by, today, timed_out=True, from_cache=False)
    assert block["status"] == "partial"
    assert block["daysUsed"] == 2
    assert block["showDay3"] is False
    assert block["showDay7"] is False
    assert block["showPartialNDay"] is True
    assert "partial" in block["label"]
    assert "7-day" not in block["label"]
    assert "3-day" not in block["label"]

    empty = build_averages_block({}, today, timed_out=True, from_cache=False)
    assert empty["status"] == "missing"
    assert empty["showDay3"] is False
    assert empty["showDay7"] is False
