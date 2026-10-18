#!/usr/bin/env python3
"""
Local wholesale API launcher (compat shim).

Re-execs as ``python -m wholesale_core`` from the project root so imports match
Vercel (project-root package, no api/ on PYTHONPATH). Prefer:

    python -m wholesale_core
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    os.execv(sys.executable, [sys.executable, "-m", "wholesale_core"])
