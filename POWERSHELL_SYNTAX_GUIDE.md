# PowerShell Syntax Guide - Avoiding Common Errors

## The `&&` Operator Issue

### Problem
PowerShell does NOT support `&&` as a command separator (unlike bash/cmd). This causes errors like:
```
The token '&&' is not a valid statement separator in this version.
```

### When `&&` Appears in Codebase

#### ✅ CORRECT: Batch Files (.bat)
Batch files (CMD.exe) DO support `&&`, so these are correct:
```batch
cd /d %~dp0 && python run_api.py
cd /d %~dp0\client && npm run dev
```

#### ✅ CORRECT: npm Scripts (package.json)
npm scripts run in a shell environment that supports `&&`:
```json
"install:all": "npm install --legacy-peer-deps && npm run install:web && npm run install:mobile"
```

#### ✅ CORRECT: JavaScript/TypeScript Logical AND
In JS/TS code, `&&` is logical AND operator (not command chaining):
```typescript
if (error && error.message) { ... }
```

#### ❌ INCORRECT: PowerShell Scripts (.ps1)
PowerShell scripts must use semicolons (`;`) or separate statements:
```powershell
# WRONG:
cd .. && python script.py

# CORRECT:
cd ..
python script.py

# OR use semicolon:
cd ..; python script.py
```

---

## PowerShell Command Chaining

### Use Semicolon (`;`) for Sequential Commands
```powershell
# Sequential execution (always runs second command)
Write-Host "First"; Write-Host "Second"
```

### Use `-And` Operator for Conditional Logic
```powershell
# Conditional execution
if ($condition1 -And $condition2) { ... }
```

### Use Separate Lines for Clarity
```powershell
# Best practice: separate statements
Set-Location $scriptPath
python run_api.py
```

---

## Common PowerShell Patterns

### Changing Directory and Running Command
```powershell
# Method 1: Separate statements (RECOMMENDED)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
python run_api.py

# Method 2: Using semicolon
Set-Location $scriptPath; python run_api.py

# Method 3: Using -Command parameter with semicolon
Start-Process powershell -ArgumentList "-Command", "Set-Location '$scriptPath'; python run_api.py"
```

### Conditional Command Execution
```powershell
# PowerShell equivalent of: cmd1 && cmd2 (run cmd2 only if cmd1 succeeds)
$result = python script.py
if ($LASTEXITCODE -eq 0) {
    python next_script.py
}
```

### Error Handling in PowerShell
```powershell
# Check if command succeeded
python run_api.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error occurred" -ForegroundColor Red
    exit 1
}
```

---

## Fixed Issues in This Codebase

1. ✅ **start_mobile_app.ps1 line 33**: Removed invalid `$_.CommandLine` property reference
2. ✅ **start_all_services.ps1**: Already uses correct PowerShell syntax
3. ✅ **start_web_app.ps1**: Already uses correct PowerShell syntax
4. ✅ **start_all_services.bat**: Correctly uses `&&` (CMD syntax)

---

## Documentation Command Examples

When documenting commands, show PowerShell-compatible syntax:

### ❌ Don't Show (bash/cmd):
```bash
cd client && npm run dev
```

### ✅ Show PowerShell Version:
```powershell
cd client
npm run dev
```

### ✅ Or Show Both:
```bash
# For CMD/Bash:
cd client && npm run dev

# For PowerShell:
cd client
npm run dev
# OR: cd client; npm run dev
```

---

## Verification Checklist

When creating PowerShell scripts:
- [ ] No `&&` operators (use semicolons `;` or separate lines)
- [ ] Use `-And` for logical AND operations
- [ ] Use `$LASTEXITCODE` to check command success
- [ ] Test scripts in PowerShell (not just cmd)
- [ ] Use `Set-Location` instead of `cd` for clarity
- [ ] Document PowerShell-specific syntax when relevant

