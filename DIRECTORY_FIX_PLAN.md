# Comprehensive Fix Plan: Directory and Path Resolution Issues

## Summary of Issues Found

1. ✅ **Syntax Error Fixed**: `api/endpoints/daily_meals.py` - Added missing except block
2. 🔴 **Database Path**: Uses relative path `./nutribox.db` instead of absolute
3. 🔴 **Module Path**: `start_ecosystem.py` has wrong cwd/module combination
4. ⚠️ **Working Directory**: Scripts don't ensure correct CWD

---

## Fix 1: Database Path Resolution (CRITICAL)

### Problem
`api/database.py` uses relative path: `sqlite:///./nutribox.db`
- Resolves relative to current working directory
- Creates database in wrong location if script run from different directory

### Solution
Make database path absolute based on project root, not CWD.

**File**: `api/database.py`
```python
# Change from:
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nutribox.db")

# To:
from pathlib import Path
# Get project root (parent of api/ directory)
project_root = Path(__file__).parent.parent
db_path = project_root / "nutribox.db"
default_db_url = f"sqlite:///{db_path.resolve().as_posix()}"
DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)
```

**File**: `run_api.py`
```python
# Change from:
os.environ.setdefault("DATABASE_URL", "sqlite:///./nutribox.db")

# To:
project_root = Path(__file__).parent
db_path = project_root / "nutribox.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{db_path.resolve().as_posix()}")
```

**Benefits**:
- Database always created in project root regardless of execution directory
- Consistent with `optimize_database.py` approach
- Works when run from any directory

---

## Fix 2: start_ecosystem.py Module Path (CRITICAL)

### Problem
```python
"command": ["python", "-m", "uvicorn", "main:app", ...],
"cwd": self.base_dir / "api",  # Wrong!
```

Working directory set to `api/` but trying to import `main:app`.

### Solution A (Recommended): Run from project root
```python
"command": ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
"cwd": self.base_dir,  # Project root
```

### Solution B (Alternative): Keep cwd as api/ but fix import
This would require restructured imports - not recommended.

**Choose Solution A** - It's cleaner and consistent with `run_api.py`.

---

## Fix 3: Ensure Working Directory in run_api.py (MEDIUM)

### Problem
Script doesn't change working directory, relies on being run from correct location.

### Solution
Add explicit working directory change:
```python
def main():
    """Start the FastAPI server"""
    # Ensure we're in the project root
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    # Rest of the function...
```

**Benefits**:
- Script works when run from any directory
- Provides consistent behavior
- Database path fix makes this optional, but adds safety

---

## Fix 4: PowerShell Script Subprocess Working Directory (MEDIUM)

### Problem
When PowerShell spawns subprocesses with `Start-Process`, working directory might not be inherited correctly.

### Solution
In `start_all_services.ps1`, ensure working directory is explicitly set:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'ZyaeL NutriBox - Backend API Server';
    Set-Location '$scriptPath';  # Already present, but ensure it's first
    Write-Host 'Current Directory: ' (Get-Location);
    # ... rest of command
"@
```

The current implementation already sets location, but we should verify it's working.

---

## Fix 5: Consistent Path Resolution (LOW)

### Problem
Mix of relative and absolute paths creates confusion.

### Solution
- Use `Path(__file__).parent` pattern for all file references
- Document that database path is absolute in project root
- Update any other scripts using relative paths

---

## Implementation Priority

1. **HIGH**: Fix database path in `api/database.py` and `run_api.py`
2. **HIGH**: Fix `start_ecosystem.py` module path
3. **MEDIUM**: Add working directory change to `run_api.py`
4. **MEDIUM**: Verify PowerShell subprocess directories
5. **LOW**: Document and standardize path resolution patterns

---

## Testing Plan

After fixes, test:

1. Run `python run_api.py` from project root → ✅ Should work
2. Run `python run_api.py` from `api/` subdirectory → ✅ Should work (after fix)
3. Run `python run_api.py` from parent directory → ✅ Should work (after fix)
4. Run `python start_ecosystem.py` → ✅ Should work (after fix)
5. Run PowerShell scripts from different locations → ✅ Should work
6. Check database location → ✅ Should always be in project root

---

## Expected Outcomes

- ✅ Database always created in project root
- ✅ Scripts work from any execution directory
- ✅ Consistent path resolution throughout codebase
- ✅ No more "wrong directory" errors
- ✅ Better error messages if paths are incorrect

