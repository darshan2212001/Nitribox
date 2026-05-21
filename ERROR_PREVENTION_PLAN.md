# Error Prevention Plan - Resolving Repeated Issues

## Objective

Add proactive checks and safeguards to prevent the 7 most common repeated issues before they occur, making the application more robust and user-friendly.

## Target Issues

1. PowerShell `&&` syntax errors (user behavior - add warnings)
2. API server timeout errors (already fixed, add startup validation)
3. Module not found errors (already fixed, add directory validation)
4. Database initialization failures (enhance locking detection)
5. Directory/path resolution issues (add startup validation)
6. Missing dependencies (integrate checks at startup)
7. WebSocket errors (verify environment at startup)

---

## Implementation Plan

### Phase 1: Pre-Flight Check System

#### Task 1.1: Create Pre-Flight Check Script
**File**: `preflight_check.py` (NEW)

**Purpose**: Comprehensive validation before starting application

**Checks to implement**:
- ✅ Project root directory validation (verify api/, run_api.py exist)
- ✅ Critical Python dependencies check (fastapi, uvicorn, sqlalchemy, pydantic, jose, passlib, websockets)
- ✅ Database file access check (path exists, writable)
- ✅ Database lock detection (try exclusive lock)
- ✅ Port availability check (8000, 5000)
- ✅ Python version check (>=3.8)
- ✅ Working directory validation

**Output Format**:
```
✅ Project root: Valid
✅ Dependencies: All critical packages installed
⚠️  Database: File locked by another process (PID: 12345)
❌ Port 8000: In use by process (PID: 6789)
```

#### Task 1.2: Integrate Pre-Flight Checks
**File**: `run_api.py`

**Changes**:
- Import `preflight_check.py` 
- Run checks at start of `main()` function
- Show summary before starting server
- Option to continue despite warnings (with confirmation)
- Link to troubleshooting docs

**Code location**: Before `uvicorn.run()` call

---

### Phase 2: Enhanced Database Protection

#### Task 2.1: Database Lock Detection
**File**: `api/main.py` (startup_event function)

**Enhancement**:
- Before database operations, check for file locks
- Detect other Python processes using database
- Show clear error with process IDs
- Suggest: "Stop other API instances: Get-Process python | Stop-Process"

**Location**: Before `Base.metadata.create_all()` call

#### Task 2.2: Database Lock Utility
**File**: `api/database.py` (NEW function)

**Function**: `check_database_lock() -> bool`

**Purpose**: Try to get exclusive lock on database file to detect locks early

---

### Phase 3: Startup Validation

#### Task 3.1: Directory Validation
**File**: `run_api.py` (main function)

**Enhancement**:
- Verify correct directory before starting
- Check that `api/` directory exists
- Auto-fix by changing directory if needed
- Show message: "Changed working directory to project root"

#### Task 3.2: Port Availability Check
**File**: `run_api.py` (main function)

**Enhancement**:
- Check if port 8000 is in use
- Show process ID using the port
- Offer to kill process (with user confirmation)
- Clear message: "Port 8000 is in use by process [PID]. Stop it?"

#### Task 3.3: Dependency Warning
**File**: `run_api.py` (main function)

**Enhancement**:
- Quick check of critical packages (non-blocking)
- Show warning if missing, but don't block startup
- Link to: "Run: python check_packages.py for details"

---

### Phase 4: Enhanced Error Messages

#### Task 4.1: Error Message Enhancement
**Files**: `run_api.py`, `api/main.py`

**Enhancement**:
- Add links to documentation in error messages
- Format: "See [DOCUMENT.md] for details"
- Include actionable next steps
- Use consistent formatting (✅ ❌ ⚠️)

**Message Template**:
```
❌ Error: [Description]
   
   Common causes:
   1. [Cause 1]
   2. [Cause 2]
   
   Solutions:
   1. [Solution 1]
   2. [Solution 2]
   
   Documentation: See REPEATED_ISSUES_REPORT.md section [X]
```

#### Task 4.2: PowerShell Warning (Documentation)
**File**: README.md (Update Quick Start)

**Enhancement**:
- Add prominent warning box about PowerShell syntax
- Show correct syntax examples
- Link to POWERSHELL_SYNTAX_GUIDE.md

---

## Implementation Details

### preflight_check.py Structure

```python
#!/usr/bin/env python3
"""
Pre-Flight Check System for ZyaeL NutriBox
Validates environment before starting application
"""

import sys
import os
import socket
import sqlite3
from pathlib import Path
from typing import List, Tuple, Optional

class PreflightChecker:
    """Validates application environment before startup"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.issues = []
        self.warnings = []
    
    def check_project_root(self) -> bool:
        """Verify we're in project root directory"""
        # Implementation: Check for api/, run_api.py
        pass
    
    def check_dependencies(self, critical_only: bool = True) -> Tuple[bool, List[str]]:
        """Check Python dependencies"""
        # Implementation: Import check for critical packages
        pass
    
    def check_database_access(self) -> Tuple[bool, Optional[str]]:
        """Check database file access and locks"""
        # Implementation: Try to open database file
        pass
    
    def check_ports(self, ports: List[int]) -> Tuple[bool, List[Tuple[int, int]]]:
        """Check if ports are available"""
        # Implementation: Try to bind to ports
        pass
    
    def check_python_version(self) -> bool:
        """Verify Python version >= 3.8"""
        pass
    
    def run_all_checks(self) -> Tuple[bool, List[str], List[str]]:
        """Run all checks and return (success, issues, warnings)"""
        pass
```

### Integration Example (run_api.py)

```python
def main():
    """Start the FastAPI server"""
    
    # Ensure we're in the project root
    os.chdir(project_root)
    
    # Run pre-flight checks
    from preflight_check import PreflightChecker
    checker = PreflightChecker(project_root)
    success, issues, warnings = checker.run_all_checks()
    
    if not success:
        print("\n⚠️  Pre-flight checks failed:")
        for issue in issues:
            print(f"   ❌ {issue}")
        
        response = input("\nContinue anyway? (y/N): ")
        if response.lower() != 'y':
            print("Startup cancelled.")
            sys.exit(1)
    
    if warnings:
        print("\n⚠️  Pre-flight warnings:")
        for warning in warnings:
            print(f"   ⚠️  {warning}")
    
    # Continue with server startup...
```

---

## Files to Create/Modify

### New Files:
1. `preflight_check.py` - Comprehensive startup validation system

### Files to Modify:
1. `run_api.py` - Add preflight checks, directory validation, port checks
2. `api/main.py` - Enhanced database locking detection
3. `api/database.py` - Add database lock checking utility (optional)
4. `README.md` - Update with PowerShell warnings and preflight info

---

## Testing Strategy

### Test Cases:

1. **Missing Dependencies**
   - Remove a critical package
   - Run: `python run_api.py`
   - Expected: Warning with solution

2. **Wrong Directory**
   - Run from `api/` subdirectory
   - Expected: Auto-fix or clear error

3. **Database Locked**
   - Start two API instances
   - Expected: Clear error with process info

4. **Port in Use**
   - Start server on port 8000
   - Try to start second instance
   - Expected: Port check catches it

5. **All Checks Pass**
   - Normal startup scenario
   - Expected: Quick validation, clean startup

---

## Success Criteria

- ✅ Application detects common errors before they fail
- ✅ Clear, actionable error messages with documentation links
- ✅ Non-blocking warnings for non-critical issues
- ✅ Prevents database locking errors with early detection
- ✅ Validates environment before attempting to start
- ✅ Reduces user frustration from unclear errors
- ✅ Prevents 70%+ of repeated issues through early detection

---

## Estimated Impact

**Before**:
- Users encounter errors after startup attempts
- Unclear error messages
- Time wasted debugging setup issues
- Database locks cause cryptic failures

**After**:
- Errors detected before startup
- Clear actionable messages
- Automatic validation
- Better user experience

**Metrics**:
- Reduce repeated errors by 70%+
- Faster debugging with clear messages
- Better developer experience

---

## Implementation Order

1. **Phase 1**: Create `preflight_check.py` and integrate basic checks
2. **Phase 2**: Add database lock detection to startup
3. **Phase 3**: Add directory and port validation
4. **Phase 4**: Enhance error messages with documentation links

---

## Documentation Updates

After implementation:

1. Update `README.md`:
   - Add "Pre-Flight Checks" section
   - Update troubleshooting with preflight info
   - Add PowerShell warning box

2. Update `REPEATED_ISSUES_REPORT.md`:
   - Mark issues as "Prevented by preflight checks"
   - Add section on preflight system

3. Create `PREFLIGHT_CHECKS_GUIDE.md`:
   - Document all checks
   - Show examples of failures and fixes
   - Troubleshooting guide

---

## Rollout Strategy

1. Implement preflight system (Phases 1-2)
2. Test with common error scenarios
3. Deploy and monitor
4. Gather user feedback
5. Enhance based on feedback (Phases 3-4)

---

**Ready to implement when approved!**

