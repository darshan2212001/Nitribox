import os
from pathlib import Path
from sqlalchemy import create_engine, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Tuple, Optional, Dict, Any

from dotenv import load_dotenv

# Get project root (parent of api/ directory)
_project_root = Path(__file__).parent.parent
load_dotenv(_project_root / ".env")

_db_path = _project_root / "nutribox.db"
_default_sqlite_url = f"sqlite:///{_db_path.resolve().as_posix()}"
# Default app database: local MySQL schema `nutribox` on port 3306 (Workbench / standard install).
# Set the real password in .env. To use SQLite instead, set DATABASE_URL=sqlite:///./nutribox.db
_default_mysql_url = "mysql+pymysql://root:CHANGE_ME@localhost:3306/nutribox"

DATABASE_URL = os.getenv("DATABASE_URL", _default_mysql_url)

# Create engine without immediate connection test
# Connection will be tested when first used
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration for thread safety and connection pooling
    # check_same_thread=False allows SQLite to work in multi-threaded FastAPI
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=None,  # SQLite uses NullPool by default, which is fine for SQLite
        pool_pre_ping=True,  # Verify connections before using
    )
elif DATABASE_URL.startswith("mysql"):
    # MySQL via PyMySQL — URL-encode special chars in password (e.g. @ -> %40)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,
        connect_args={"connect_timeout": 30, "charset": "utf8mb4"},
    )
else:
    # PostgreSQL and other servers
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using them
        pool_size=5,  # Maximum number of connections to keep in pool
        max_overflow=10,  # Maximum number of connections to create beyond pool_size
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={
            "connect_timeout": 30,  # Longer timeout for Neon
        }
    )

@event.listens_for(engine, "connect")
def _sqlite_set_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def verify_database_connection() -> Dict[str, Any]:
    """
    Run a live connection check: SELECT 1, and on MySQL SELECT DATABASE().
    Call on startup and from /api/health to confirm the configured database is reachable.
    """
    result: Dict[str, Any] = {"ok": False, "error": None, "current_database": None, "dialect": None}
    try:
        if DATABASE_URL.startswith("sqlite"):
            result["dialect"] = "sqlite"
        elif DATABASE_URL.startswith("mysql"):
            result["dialect"] = "mysql"
        else:
            result["dialect"] = "other"

        with engine.connect() as conn:
            one = conn.execute(text("SELECT 1")).scalar()
            if one != 1:
                result["error"] = f"unexpected SELECT 1 result: {one!r}"
                return result
            if DATABASE_URL.startswith("mysql"):
                current = conn.execute(text("SELECT DATABASE()")).scalar()
                result["current_database"] = current
            result["ok"] = True
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_lock(timeout: float = 0.1) -> Tuple[bool, Optional[str]]:
    """
    Check if database file is locked by another process.
    
    Args:
        timeout: Connection timeout in seconds
    
    Returns:
        (is_available, error_message)
        - is_available: True if database is not locked
        - error_message: Error description if locked, None if available
    """
    if not DATABASE_URL.startswith("sqlite"):
        # Not SQLite, assume available (MySQL/PostgreSQL handle locks differently)
        return True, None
    
    try:
        import sqlite3
        
        # Extract database path
        db_path_str = DATABASE_URL.replace("sqlite:///", "")
        if not os.path.isabs(db_path_str):
            db_path = _project_root / db_path_str
        else:
            db_path = Path(db_path_str)
        
        if not db_path.exists():
            # Database doesn't exist yet, so not locked
            return True, None
        
        # Try to get exclusive lock
        conn = sqlite3.connect(str(db_path), timeout=timeout)
        try:
            conn.execute("BEGIN IMMEDIATE")
            conn.rollback()
            return True, None
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                return False, "Database file is locked by another process"
            return False, f"Database access error: {str(e)}"
        finally:
            conn.close()
    except Exception as e:
        return False, f"Error checking database lock: {str(e)}"
