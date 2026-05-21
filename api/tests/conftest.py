"""
Pytest configuration for API tests.

Sets DATABASE_URL to a temporary SQLite file before any `api.*` import so the
engine matches the test database (not MySQL from .env).
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

# Project root (parent of api/)
_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

_fd, _TEST_SQLITE_PATH = tempfile.mkstemp(suffix="_pytest_auth.db")
os.close(_fd)
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.abspath(_TEST_SQLITE_PATH).replace("\\", "/")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("AUTO_CREATE_DB_SCHEMA", "true")
os.environ.setdefault("SECRET_KEY", "pytest-secret-key-not-for-production")


def pytest_sessionfinish(session, exitstatus):
    try:
        os.unlink(_TEST_SQLITE_PATH)
    except OSError:
        pass


def pytest_configure(config):
    """Relax auth rate limits so multiple tests can login in one session."""
    # Import after DATABASE_URL is set above
    from api.endpoints import auth as auth_mod

    auth_mod.auth_rate_limiter.max_requests = 50_000
