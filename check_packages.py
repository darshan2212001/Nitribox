#!/usr/bin/env python3
"""
Package Dependency Checker
Checks if all required Python packages are installed
"""

import sys
import subprocess
from pathlib import Path

# Add project root to path
_project_root = Path(__file__).parent
sys.path.insert(0, str(_project_root))

# Required packages from requirements.txt
REQUIRED_PACKAGES = {
    # Core FastAPI
    'fastapi': 'fastapi>=0.104.0',
    'uvicorn': 'uvicorn[standard]>=0.24.0',
    'python_multipart': 'python-multipart>=0.0.6',
    
    # Database
    'sqlalchemy': 'sqlalchemy>=2.0.0',
    'mysql': 'mysql-connector-python>=8.2.0',
    
    # Validation
    'pydantic': 'pydantic>=2.5.0',
    
    # Authentication
    'jose': 'python-jose[cryptography]>=3.3.0',
    'passlib': 'passlib[bcrypt]>=1.7.4',
    
    # Environment
    'dotenv': 'python-dotenv>=1.0.0',
    
    # WebSocket
    'websockets': 'websockets>=12.0',
    
    # HTTP Clients
    'requests': 'requests>=2.31.0',
    'aiohttp': 'aiohttp>=3.9.0',
    
    # Testing
    'pytest': 'pytest>=7.4.0',
    'pytest_asyncio': 'pytest-asyncio>=0.21.0',
}

def check_package(package_key, package_name):
    """Check if a package is installed"""
    try:
        if package_key == 'jose':
            __import__('jose')
        elif package_key == 'python_multipart':
            __import__('multipart')
        elif package_key == 'dotenv':
            __import__('dotenv')
        elif package_key == 'pytest_asyncio':
            __import__('pytest_asyncio')
        else:
            __import__(package_key)
        return True, None
    except ImportError as e:
        return False, str(e)

def main():
    print("="*60)
    print("Python Package Dependency Checker")
    print("="*60)
    print()
    
    missing = []
    installed = []
    errors = []
    
    for package_key, package_name in REQUIRED_PACKAGES.items():
        is_installed, error = check_package(package_key, package_name)
        if is_installed:
            installed.append(package_name)
            print(f"✅ {package_name}")
        else:
            missing.append(package_name)
            errors.append(f"{package_name}: {error}")
            print(f"❌ {package_name} - NOT INSTALLED")
    
    print()
    print("="*60)
    print("Summary")
    print("="*60)
    print(f"✅ Installed: {len(installed)}/{len(REQUIRED_PACKAGES)}")
    print(f"❌ Missing: {len(missing)}/{len(REQUIRED_PACKAGES)}")
    
    if missing:
        print()
        print("Missing Packages:")
        for pkg in missing:
            print(f"  - {pkg}")
        print()
        print("Install with:")
        print(f"  pip install {' '.join(missing)}")
    else:
        print()
        print("✅ All required packages are installed!")
    
    if errors:
        print()
        print("Errors:")
        for error in errors:
            print(f"  {error}")
    
    return len(missing) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

