# Clean Install Guide for Mobile App

This guide provides instructions for performing a clean reinstall of all dependencies after resolving conflicts.

## Quick Clean Install (Mobile App Only)

Run the provided script:
```powershell
cd mobile
.\clean-install.ps1
```

## Manual Clean Install Steps

### 1. Clear Metro Bundler Cache
```powershell
# Clear Metro cache
Remove-Item "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\haste-map-*" -Recurse -Force -ErrorAction SilentlyContinue

# Or use Expo command
npx expo start --clear
```

### 2. Clear npm Cache
```powershell
npm cache clean --force
```

### 3. Remove node_modules
```powershell
# From mobile directory
cd mobile
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue

# From root directory (if needed)
cd ..
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item client\node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item mobile\node_modules -Recurse -Force -ErrorAction SilentlyContinue
```

### 4. Remove Lock Files (Optional - will be regenerated)
```powershell
# From root
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
Remove-Item yarn.lock -Force -ErrorAction SilentlyContinue
```

### 5. Clean Install
```powershell
# From root directory
npm install --legacy-peer-deps

# Install workspace dependencies
npm run install:all
```

## Full Clean Install (All Workspaces)

From the root directory:
```powershell
# 1. Clear caches
npm cache clean --force

# 2. Remove all node_modules
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item client\node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item mobile\node_modules -Recurse -Force -ErrorAction SilentlyContinue

# 3. Remove lock files
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

# 4. Clean install
npm install --legacy-peer-deps
npm run install:all
```

## Verify Installation

After installation, verify everything works:

```powershell
# Check mobile app
cd mobile
npm run type-check
npx expo start --clear
```

## Troubleshooting

### If installation fails:
1. Check Node.js version: `node --version` (should be >= 18.0.0)
2. Check npm version: `npm --version` (should be >= 8.0.0)
3. Try clearing npm cache again: `npm cache clean --force`
4. Check for conflicting global packages: `npm list -g --depth=0`

### If Metro bundler has issues:
1. Clear Metro cache: `npx expo start --clear`
2. Restart Metro bundler
3. Check metro.config.js is correct

### If peer dependency warnings:
- These are expected and handled by `--legacy-peer-deps` flag
- The app should still work correctly

