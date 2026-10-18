from __future__ import annotations

from pathlib import Path

# Project root is already on sys.path when pytest runs from the repo root.
# Do not insert api/ — that hid the Vercel ModuleNotFoundError for wholesale_core.

FIXTURES = Path(__file__).resolve().parent / "fixtures"
ROOT = Path(__file__).resolve().parents[1]
