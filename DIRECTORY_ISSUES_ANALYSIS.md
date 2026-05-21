# Deep Analysis: Application Starting in Wrong Directory

## Critical Issues Identified

### 🔴 Issue 1: Database Path Uses Relative Path (CRITICAL)

**Location**: 
- `api/database.py` line 6: `DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nutribox.db")`
- `run_api.py` line 22: `os.environ.setdefault("DATABASE_URL", "sqlite:///./nutribox.db")`

**Problem**: 
- The path `sqlite:///./nutribox.db` uses a relative path (`./`) which resolves relative to the **current working directory** (`os.getcwd()`), NOT relative to the script location.
- If the script is run from any directory other than the project root, the database will be created/looked for in the wrong location.

**Impact**:
- Running from subdirectories creates database in wrong location
- Running from different drives or paths causes database not found errors
- Database may be created in user's home directory or script execution directory

**Root Cause**: 
- SQLAlchemy's SQLite connection uses relative paths based on `os.getcwd()`, not `__file__` location

**Evidence**:
- Test showed: If run from `test_subdir`, database would be created at `C:\Users\user\Desktop\nutribox\code\code\ZyaeLNutriBox\test_subdir\nutribox.db`
- Current working directory determines database location, not script location

---

### 🔴 Issue 2: start_ecosystem.py Module Path Error (CRITICAL)

**Location**: `start_ecosystem.py` lines 31-32

```python
"command": ["python", "-m", "uvicorn", "main:app", ...],
"cwd": self.base_dir / "api",
```

**Problem**:
- Sets working directory to `api/` subdirectory
- But tries to import `main:app` instead of `api.main:app`
- When `cwd` is `api/`, Python cannot find `main` module because it's looking in `api/` directory, but `main.py` is also in `api/`, creating a circular/nested import issue

**Impact**:
- `ModuleNotFoundError: No module named 'main'` when running from ecosystem script
- The correct path should be `api.main:app` when running from project root
- OR the `cwd` should be project root, not `api/`

**Root Cause**:
- Mismatch between working directory (`api/`) and module path (`main:app`)
- Should either use `cwd=project_root` with `api.main:app` OR `cwd=api/` with different import structure

---

### ⚠️ Issue 3: Path Resolution Inconsistency (MEDIUM)

**Location**: Multiple files

**Problem**:
- `api/optimize_database.py` correctly uses: `Path(__file__).parent / "nutribox.db"` (absolute path from script)
- `api/database.py` incorrectly uses: `sqlite:///./nutribox.db` (relative to CWD)
- This inconsistency causes confusion and errors

**Impact**:
- Different scripts expect database in different locations
- Optimization script looks in `api/` directory
- Database connection looks in current working directory

---

### ⚠️ Issue 4: PowerShell Script Directory Changes (MEDIUM)

**Location**: 
- `start_all_services.ps1` line 42: `Set-Location '$scriptPath'`
- `start_web_app.ps1` line 7: `Set-Location $scriptPath`

**Problem**:
- PowerShell scripts correctly set location using `$MyInvocation.MyCommand.Path`
- However, when spawning new PowerShell processes with `Start-Process`, the working directory is inherited
- Python subprocesses may not inherit the correct working directory if parent PowerShell window is in different location

**Impact**:
- If parent PowerShell is in different directory, subprocesses might run from wrong location
- Database path resolution fails because CWD is wrong

---

### ⚠️ Issue 5: run_api.py Doesn't Change Working Directory (MEDIUM)

**Location**: `run_api.py` lines 13-14, 22

**Problem**:
- Script uses `Path(__file__).parent` to get script location
- Adds it to Python path: `sys.path.insert(0, str(project_root))`
- But does NOT change working directory: `os.chdir(project_root)` is missing
- Database path still depends on CWD, not script location

**Impact**:
- Running `python run_api.py` from any directory will fail if not in project root
- Database created in wrong location

---

## Test Results

### Test 1: Database Path from Subdirectory
```python
# From test_subdir/
./nutribox.db resolves to: C:\Users\user\Desktop\nutribox\code\code\ZyaeLNutriBox\test_subdir\nutribox.db
```

### Test 2: Module Import
- Import fails due to syntax error in `daily_meals.py` (now fixed)
- Once fixed, module path resolution works correctly when `sys.path` includes project root

---

## Root Cause Summary

1. **Relative Database Path**: Uses `./` which is CWD-relative, not script-relative
2. **No Working Directory Change**: Scripts don't ensure they're in project root
3. **Inconsistent Path Resolution**: Mix of absolute (Path(__file__)) and relative (./) paths
4. **Module Path Mismatch**: start_ecosystem.py has wrong cwd/module combination

---

## Files Requiring Fixes

1. ✅ `api/endpoints/daily_meals.py` - Fixed syntax error (missing except block)
2. `api/database.py` - Fix database path to use absolute path
3. `run_api.py` - Add working directory change or fix database path
4. `start_ecosystem.py` - Fix module path or working directory
5. PowerShell scripts - Ensure subprocess working directories are correct

