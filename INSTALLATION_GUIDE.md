# ZyaeL NutriBox - Installation Guide

## Quick Start

### Python Dependencies

**Install all required runtime packages:**
```bash
pip install fastapi>=0.104.0 uvicorn[standard]>=0.24.0 python-multipart>=0.0.6 sqlalchemy>=2.0.0 pydantic>=2.5.0 python-jose[cryptography]>=3.3.0 passlib[bcrypt]>=1.7.4 python-dotenv>=1.0.0 websockets>=12.0 requests>=2.31.0 aiohttp>=3.9.0
```

**Or install from requirements.txt (includes optional packages):**
```bash
pip install -r requirements.txt
```

**For testing only:**
```bash
pip install pytest>=7.4.0 pytest-asyncio>=0.21.0
```

**For MySQL (optional, SQLite works for development):**
```bash
pip install mysql-connector-python>=8.2.0
```

---

### Node.js Dependencies

**Install all workspace dependencies:**
```bash
npm run install:all
```

**Or install separately:**
```bash
# Root dependencies
npm install --legacy-peer-deps

# Client (web) dependencies
npm --workspace client install --legacy-peer-deps

# Mobile dependencies
npm --workspace mobile install --legacy-peer-deps
```

---

## Package Verification

### Check Python Packages

Run the verification script:
```bash
python check_packages.py
```

This will show:
- ✅ Installed packages
- ❌ Missing packages
- Installation commands for missing packages

---

## Dependency Status

### Python: ✅ 11/14 Critical Packages Installed

**Installed (Critical):**
- fastapi, uvicorn, python-multipart
- sqlalchemy, pydantic
- python-jose, passlib
- python-dotenv, websockets
- requests, aiohttp

**Missing (Optional):**
- mysql-connector-python (only for MySQL)
- pytest (only for testing)
- pytest-asyncio (only for testing)

### Node.js: ✅ All Packages Listed

- **Client**: All dependencies listed
- **Mobile**: All dependencies listed (including expo-camera)

---

## See Also

- `DEPENDENCY_ANALYSIS_REPORT.md` - Complete analysis
- `DEPENDENCY_FIXES_APPLIED.md` - Fixes applied
- `check_packages.py` - Package verification script

