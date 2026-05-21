#!/usr/bin/env python3
"""
Pre-Flight Check System for ZyaeL NutriBox
Validates environment before starting application to prevent common errors
"""

import sys
import os
import socket
import sqlite3
import platform
from pathlib import Path
from typing import List, Tuple, Optional, Dict
import subprocess

# Windows-safe print helper for emoji
def safe_print(text: str) -> None:
    """Print text, replacing emojis with ASCII alternatives on Windows"""
    if platform.system() == "Windows":
        # Replace emojis with ASCII equivalents for Windows console compatibility
        replacements = {
            "✅": "[OK]",
            "⚠️": "[WARN]",
            "❌": "[ERROR]",
        }
        for emoji, replacement in replacements.items():
            text = text.replace(emoji, replacement)
    print(text, flush=True)

class PreflightChecker:
    """Validates application environment before startup"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root.resolve()
        self.issues = []
        self.warnings = []
        self.checks_passed = []
    
    def check_project_root(self) -> Tuple[bool, Optional[str]]:
        """Verify we're in project root directory"""
        try:
            # Check for key project files/directories
            required_paths = [
                self.project_root / "api",
                self.project_root / "run_api.py",
                self.project_root / "requirements.txt",
            ]
            
            missing = []
            for path in required_paths:
                if not path.exists():
                    missing.append(str(path.name))
            
            if missing:
                return False, f"Missing project files: {', '.join(missing)}"
            
            # Check current working directory
            current_dir = Path.cwd().resolve()
            if current_dir != self.project_root:
                return True, f"Working directory is '{current_dir}' but project root is '{self.project_root}'"
            
            self.checks_passed.append("[OK] Project root: Valid")
            return True, None
        except Exception as e:
            return False, f"Error checking project root: {str(e)}"
    
    def check_dependencies(self, critical_only: bool = True) -> Tuple[bool, List[str]]:
        """Check Python dependencies"""
        missing = []
        warnings_list = []
        
        # Critical runtime packages (must have)
        critical_packages = {
            'fastapi': 'fastapi',
            'uvicorn': 'uvicorn',
            'sqlalchemy': 'sqlalchemy',
            'pydantic': 'pydantic',
            'jose': 'python-jose',
            'passlib': 'passlib',
            'websockets': 'websockets',
            'requests': 'requests',
            'aiohttp': 'aiohttp',
        }
        db_url = os.getenv("DATABASE_URL", "")
        if "mysql" in db_url:
            critical_packages["pymysql"] = "PyMySQL"
        
        # Optional packages (warn but don't fail)
        optional_packages = {
            'pytest': 'pytest',
        }
        
        # Check critical packages
        for module_name, package_name in critical_packages.items():
            try:
                if module_name == 'jose':
                    __import__('jose')
                elif module_name == 'mysql':
                    __import__('mysql').connector
                else:
                    __import__(module_name)
                self.checks_passed.append(f"[OK] Package '{package_name}': Installed")
            except ImportError:
                missing.append(package_name)
                self.issues.append(f"[ERROR] Missing critical package: {package_name}")
        
        # Check optional packages
        if not critical_only:
            for module_name, package_name in optional_packages.items():
                try:
                    __import__(module_name)
                except ImportError:
                    warnings_list.append(f"[WARN] Optional package '{package_name}' not installed")
        
        if missing:
            return False, missing
        return True, warnings_list
    
    def check_database_access(self) -> Tuple[bool, Optional[str]]:
        """Check database file access and locks"""
        try:
            db_path = self.project_root / "nutribox.db"
            db_url = os.getenv("DATABASE_URL")
            
            # If DATABASE_URL is set and it's SQLite, use that path
            if db_url and db_url.startswith("sqlite:///"):
                path_part = db_url.replace("sqlite:///", "")
                if os.path.isabs(path_part):
                    db_path = Path(path_part)
                else:
                    db_path = self.project_root / path_part

            # MySQL/PostgreSQL etc.: no local SQLite file to validate
            if db_url and not db_url.startswith("sqlite"):
                self.checks_passed.append(
                    "[OK] Database: server URL configured (skipped SQLite file checks)"
                )
                return True, None
            
            # Check if database file exists (optional - will be created)
            if db_path.exists():
                # Try to open database file to check for locks
                try:
                    conn = sqlite3.connect(str(db_path), timeout=0.1)
                    conn.execute("BEGIN IMMEDIATE")
                    conn.commit()
                    conn.close()
                    self.checks_passed.append(f"[OK] Database access: OK ({db_path})")
                    return True, None
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        # Try to find process locking the database
                        lock_process = self._find_database_lock_process(db_path)
                        if lock_process:
                            return False, f"Database file is locked by another process (PID: {lock_process})"
                        return False, "Database file is locked. Another process may be using it."
                    return False, f"Database access error: {str(e)}"
            else:
                # Database doesn't exist yet - that's OK, will be created
                parent_dir = db_path.parent
                if not parent_dir.exists():
                    return False, f"Database directory doesn't exist: {parent_dir}"
                if not os.access(parent_dir, os.W_OK):
                    return False, f"Database directory not writable: {parent_dir}"
                self.checks_passed.append(f"[OK] Database path: OK (will create at {db_path})")
                return True, None
        except Exception as e:
            return False, f"Error checking database: {str(e)}"
    
    def _find_database_lock_process(self, db_path: Path) -> Optional[int]:
        """Try to find process locking database (Windows-specific for now)"""
        if platform.system() != "Windows":
            return None
        
        try:
            # Get all Python processes
            result = subprocess.run(
                ["wmic", "process", "where", "name='python.exe'", "get", "processid,commandline"],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0 and str(db_path) in result.stdout:
                # Parse process ID (simplified - would need better parsing)
                lines = result.stdout.strip().split('\n')
                for line in lines[1:]:  # Skip header
                    if str(db_path) in line:
                        parts = line.split()
                        for part in parts:
                            if part.isdigit():
                                return int(part)
        except Exception:
            pass  # Ignore errors in process detection
        
        return None
    
    def check_ports(self, ports: List[int]) -> Tuple[bool, List[Tuple[int, Optional[int]]]]:
        """Check if ports are available"""
        unavailable = []
        
        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            try:
                result = sock.connect_ex(('127.0.0.1', port))
                sock.close()
                if result == 0:
                    # Port is in use - try to find process
                    process_id = self._find_port_process(port)
                    unavailable.append((port, process_id))
                    self.issues.append(f"[ERROR] Port {port}: In use by process (PID: {process_id})" if process_id else f"[ERROR] Port {port}: In use")
                else:
                    self.checks_passed.append(f"[OK] Port {port}: Available")
            except Exception as e:
                self.warnings.append(f"[WARN] Could not check port {port}: {str(e)}")
            finally:
                sock.close()
        
        if unavailable:
            return False, unavailable
        return True, []
    
    def _find_port_process(self, port: int) -> Optional[int]:
        """Find process using a port"""
        try:
            # Try netstat approach (works on both Windows and Linux)
            result = subprocess.run(
                ["netstat", "-ano"] if platform.system() == "Windows" else ["netstat", "-tulpn"],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if f":{port}" in line and ("LISTENING" in line or "LISTEN" in line):
                        parts = line.split()
                        if parts:
                            # Last part is PID on Windows, may vary on Linux
                            pid = parts[-1]
                            if pid.isdigit():
                                return int(pid)
        except Exception:
            pass
        return None
    
    def resolve_port_conflict(self, port: int, max_retries: int = 3) -> Tuple[bool, Optional[str]]:
        """
        Attempt to resolve port conflict by stopping the process using the port.
        
        Args:
            port: Port number to free
            max_retries: Maximum number of retry attempts
            
        Returns:
            Tuple of (success, error_message)
        """
        for attempt in range(max_retries):
            # Check if port is still in use
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            try:
                result = sock.connect_ex(('127.0.0.1', port))
                sock.close()
                
                if result != 0:
                    # Port is free
                    return True, None
                
                # Port is in use - find and stop process
                pid = self._find_port_process(port)
                if not pid:
                    return False, f"Port {port} is in use but could not identify process"
                
                # Attempt to stop process
                try:
                    if platform.system() == "Windows":
                        subprocess.run(
                            ["taskkill", "/F", "/PID", str(pid)],
                            capture_output=True,
                            timeout=5
                        )
                    else:
                        subprocess.run(
                            ["kill", "-9", str(pid)],
                            capture_output=True,
                            timeout=5
                        )
                    
                    # Wait a bit for process to stop
                    import time
                    time.sleep(2 * (attempt + 1))  # Exponential backoff
                    
                    # Verify port is now free
                    sock2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock2.settimeout(1)
                    result2 = sock2.connect_ex(('127.0.0.1', port))
                    sock2.close()
                    
                    if result2 != 0:
                        # Port is now free
                        safe_print(f"[OK] Port {port} conflict resolved (stopped process PID {pid})")
                        return True, None
                    
                except Exception as e:
                    if attempt < max_retries - 1:
                        continue
                    return False, f"Failed to stop process PID {pid}: {str(e)}"
            except Exception as e:
                sock.close()
                if attempt < max_retries - 1:
                    continue
                return False, f"Error checking port {port}: {str(e)}"
        
        return False, f"Port {port} conflict could not be resolved after {max_retries} attempts"
    
    def check_python_version(self) -> Tuple[bool, Optional[str]]:
        """Verify Python version >= 3.10"""
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 10):
            return False, f"Python 3.10+ required, found {version.major}.{version.minor}.{version.micro}"
        
        self.checks_passed.append(f"[OK] Python version: {version.major}.{version.minor}.{version.micro}")
        return True, None
    
    def check_working_directory(self) -> Tuple[bool, Optional[str]]:
        """Check and fix working directory"""
        current_dir = Path.cwd().resolve()
        if current_dir != self.project_root:
            try:
                os.chdir(self.project_root)
                self.warnings.append(f"[WARN] Changed working directory from '{current_dir}' to '{self.project_root}'")
                return True, f"Auto-fixed: Changed to project root"
            except Exception as e:
                return False, f"Cannot change to project root: {str(e)}"
        
        self.checks_passed.append(f"[OK] Working directory: {current_dir}")
        return True, None
    
    def run_all_checks(self, check_ports: bool = True, critical_deps_only: bool = True) -> Tuple[bool, List[str], List[str]]:
        """
        Run all checks and return (success, issues, warnings)
        
        Args:
            check_ports: Whether to check port availability
            critical_deps_only: Only check critical dependencies
        
        Returns:
            (success, issues, warnings)
        """
        self.issues = []
        self.warnings = []
        self.checks_passed = []
        
        # Check Python version
        success, error = self.check_python_version()
        if not success:
            self.issues.append(error)
        
        # Check project root
        success, warning = self.check_project_root()
        if not success:
            self.issues.append(warning)
        elif warning:
            self.warnings.append(warning)
        
        # Fix working directory if needed
        success, message = self.check_working_directory()
        if not success:
            self.issues.append(message)
        elif message and "Auto-fixed" in message:
            # Already added to warnings in check_working_directory
            pass
        
        # Check dependencies
        success, missing_or_warnings = self.check_dependencies(critical_only=critical_deps_only)
        if not success:
            self.issues.extend([f"Missing: {pkg}" for pkg in missing_or_warnings])
        else:
            self.warnings.extend(missing_or_warnings)
        
        # Check database access
        success, error = self.check_database_access()
        if not success:
            self.issues.append(error)
        
        # Check ports (must match API_PORT / run_api.py)
        if check_ports:
            try:
                api_port = int(os.environ.get("API_PORT", "8000"))
            except ValueError:
                api_port = 8000
            ports_to_check = [api_port]
            success, unavailable = self.check_ports(ports_to_check)
            if not success:
                # Issues already added in check_ports
                pass
        
        # Determine overall success (no critical issues)
        overall_success = len(self.issues) == 0
        
        return overall_success, self.issues, self.warnings
    
    def print_summary(self):
        """Print formatted summary of checks"""
        safe_print("\n" + "="*60)
        safe_print("PRE-FLIGHT CHECKS SUMMARY")
        safe_print("="*60)
        
        if self.checks_passed:
            safe_print("\n[OK] Passed Checks:")
            for check in self.checks_passed:
                safe_print(f"   {check}")
        
        if self.warnings:
            safe_print("\n[WARN] Warnings:")
            for warning in self.warnings:
                safe_print(f"   {warning}")
        
        if self.issues:
            safe_print("\n[ERROR] Critical Issues:")
            for issue in self.issues:
                safe_print(f"   {issue}")
        
        safe_print("="*60 + "\n")


def main():
    """CLI entry point for preflight checks"""
    project_root = Path(__file__).parent.resolve()
    try:
        from dotenv import load_dotenv

        load_dotenv(project_root / ".env")
    except ImportError:
        pass

    checker = PreflightChecker(project_root)
    success, issues, warnings = checker.run_all_checks()
    
    checker.print_summary()
    
    if not success:
        safe_print("[ERROR] Pre-flight checks FAILED")
        safe_print("\nFix the issues above before starting the application.")
        safe_print("See REPEATED_ISSUES_REPORT.md for solutions.")
        return 1
    
    if warnings:
        safe_print("[WARN] Pre-flight checks passed with warnings")
        safe_print("Application can start, but review warnings above.")
        return 0
    
    safe_print("[OK] All pre-flight checks PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())

