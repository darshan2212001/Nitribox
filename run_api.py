#!/usr/bin/env python3
"""
ZyaeL NutriBox API - Main Startup Script
This script starts the FastAPI server with all endpoints.
"""

import os
import sys
import uvicorn
import platform
from pathlib import Path

# Windows-safe print helper for emoji
def safe_print(text: str) -> None:
    """Print text, replacing emojis with ASCII alternatives on Windows"""
    if platform.system() == "Windows":
        # Replace emojis with ASCII equivalents for Windows console compatibility
        replacements = {
            "✅": "[OK]",
            "⚠️": "[WARN]",
            "❌": "[ERROR]",
            "💡": "[TIP]",
            "📚": "[INFO]",
        }
        for emoji, replacement in replacements.items():
            text = text.replace(emoji, replacement)
    print(text, flush=True)

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Start the FastAPI server"""
    from dotenv import load_dotenv

    load_dotenv(project_root / ".env")

    # Run pre-flight checks
    print("\n" + "="*60)
    print("ZyaeL NutriBox API - Starting Pre-Flight Checks")
    print("="*60)
    
    try:
        from preflight_check import PreflightChecker
        
        checker = PreflightChecker(project_root)
        success, issues, warnings = checker.run_all_checks(check_ports=True, critical_deps_only=True)
        
        checker.print_summary()
        
        if not success:
            safe_print("[ERROR] CRITICAL ISSUES DETECTED")
            safe_print("\nThe following issues must be resolved before starting:")
            for issue in issues:
                safe_print(f"   • {issue}")
            
            safe_print("\n[TIP] Quick Solutions:")
            if any("Missing" in issue for issue in issues):
                safe_print("   • Install dependencies: pip install -r requirements.txt")
                safe_print("   • Check packages: python check_packages.py")
            
            if any("locked" in issue.lower() or "Database" in issue for issue in issues):
                safe_print("   • Stop other API instances: Get-Process python | Stop-Process")
                safe_print("   • Or restart your terminal/IDE")
            
            port_conflicts = [issue for issue in issues if "Port" in issue]
            if port_conflicts:
                safe_print("   • Stop process using port 8000")
                safe_print("   • Or change API_PORT in environment")
                try_resolve = False
                if not sys.stdin.isatty() or os.getenv(
                    "NUTRIBOX_AUTO_RESOLVE_PORTS", ""
                ).lower() in ("1", "true", "yes"):
                    try_resolve = True
                    safe_print(
                        "\n[INFO] Auto-resolving port conflicts "
                        "(non-interactive terminal or NUTRIBOX_AUTO_RESOLVE_PORTS)..."
                    )
                else:
                    safe_print("")
                    safe_print("[TIP] Auto-resolution available:")
                    response = input(
                        "   Attempt to automatically resolve port conflicts? (y/N): "
                    )
                    try_resolve = response.lower() == "y"
                if try_resolve:
                    safe_print("\n[INFO] Attempting to resolve port conflicts...")
                    resolved = True
                    for issue in port_conflicts:
                        import re

                        port_match = re.search(r"Port (\d+)", issue)
                        if port_match:
                            port = int(port_match.group(1))
                            ok, error = checker.resolve_port_conflict(port)
                            if not ok:
                                resolved = False
                                safe_print(
                                    f"[ERROR] Could not resolve port {port} conflict: {error}"
                                )

                    if resolved:
                        safe_print(
                            "[OK] Port conflicts resolved. Re-running pre-flight checks..."
                        )
                        success, issues, warnings = checker.run_all_checks(
                            check_ports=True, critical_deps_only=True
                        )
                        if success:
                            safe_print("[OK] All pre-flight checks now pass!")
                            port_conflicts = []
                        else:
                            safe_print(
                                "[WARN] Some issues remain after resolution attempt"
                            )
                            checker.print_summary()
            
            if any("directory" in issue.lower() or "root" in issue.lower() for issue in issues):
                safe_print("   • Run from project root: cd <project-root>")
                safe_print("   • Script will auto-fix if possible")
            
            safe_print("\n[INFO] For detailed solutions, see:")
            safe_print("   • REPEATED_ISSUES_REPORT.md")
            safe_print("   • README.md (Troubleshooting section)")
            
            if not success:
                if not sys.stdin.isatty():
                    safe_print(
                        "\n[ERROR] Startup cancelled (critical issues, non-interactive mode)."
                    )
                    safe_print("Fix ports/deps above, or set API_PORT to a free port.\n")
                    sys.exit(1)
                response = input(
                    "\n[WARN] Continue anyway? This may cause errors. (y/N): "
                )
                if response.lower() != "y":
                    safe_print(
                        "\nStartup cancelled. Please fix the issues above and try again."
                    )
                    sys.exit(1)
                safe_print("\n[WARN] Proceeding with known issues. Errors may occur.\n")
        
        if warnings and success:
            safe_print("[WARN] Warnings detected (non-critical):")
            for warning in warnings:
                safe_print(f"   • {warning}")
            safe_print("\nApplication can start, but review warnings above.\n")
    
    except ImportError:
        # If preflight_check not available, warn but continue
        safe_print("[WARN] Pre-flight checks not available (preflight_check.py not found)")
        safe_print("   Starting without validation...\n")
    except Exception as e:
        safe_print(f"[WARN] Pre-flight check error: {e}")
        safe_print("   Continuing with startup...\n")
    
    # Ensure we're in the project root (already calculated above)
    os.chdir(project_root)
    
    # Set environment variables if not already set
    os.environ.setdefault("API_PORT", "8000")
    os.environ.setdefault("NODE_ENV", "development")
    # DATABASE_URL: set in .env. If unset, api/database.py defaults to local MySQL nutribox (see DEFAULT there).
    # Do not inject SQLite here — that would override the app default and confuse Workbench users.
    _db_url_from_env = os.environ.get("DATABASE_URL")
    if not _db_url_from_env:
        safe_print(
            "[WARN] DATABASE_URL not in .env — using api/database.py default (MySQL nutribox @ localhost:3306). "
            "Set DATABASE_URL in .env with your real root password."
        )
    os.environ.setdefault("SECRET_KEY", "test-secret-key-for-development")

    try:
        from sqlalchemy.engine.url import make_url
        from api.database import DATABASE_URL as _resolved_db_url

        u = make_url(_resolved_db_url)
        host = u.host or "localhost"
        port = u.port or ("3306" if "mysql" in (u.drivername or "") else "")
        dbn = u.database or "(no name)"
        safe_print(f"[INFO] Resolved database URL: {u.drivername} @ {host}:{port}/{dbn}")
    except Exception as _e:
        safe_print(f"[WARN] Could not display database URL: {_e}")
    
    # Get configuration
    api_port = int(os.environ.get("API_PORT", "8000"))
    host = "0.0.0.0"
    
    print("=" * 60)
    print("Starting ZyaeL NutriBox API")
    print("=" * 60)
    print(f"Server will run on: http://{host}:{api_port}")
    print(f"API Documentation: http://{host}:{api_port}/docs")
    print(f"WebSocket: ws://{host}:{api_port}/ws")
    print("=" * 60)
    
    try:
        # Start the server
        uvicorn.run(
            "api.main:app",
            host=host,
            port=api_port,
            reload=True,
            reload_dirs=["api"],
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
