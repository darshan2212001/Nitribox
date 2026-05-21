#!/usr/bin/env python3
"""
Test utilities for ZyaeL NutriBox tests
Provides server readiness checks and common test helpers
"""

import sys
import os
from pathlib import Path
import requests
import time
from typing import Optional

# Add project root to path for imports
_project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_project_root))


def wait_for_server(base_url: str = "http://localhost:8000", 
                    max_attempts: int = 30, 
                    timeout: float = 1.0,
                    endpoint: str = "/api/health") -> bool:
    """
    Wait for API server to be ready by checking health endpoint.
    
    Args:
        base_url: Base URL of the API server
        max_attempts: Maximum number of attempts to check
        timeout: Timeout per request in seconds
        endpoint: Health check endpoint path
        
    Returns:
        True if server is ready, False otherwise
    """
    url = f"{base_url}{endpoint}"
    
    print(f"Waiting for server to be ready at {url}...")
    
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                print(f"✅ Server is ready! (attempt {attempt}/{max_attempts})")
                return True
        except requests.exceptions.ConnectionError:
            pass  # Server not ready yet
        except requests.exceptions.Timeout:
            pass  # Request timed out
        except Exception as e:
            print(f"⚠️  Unexpected error checking server: {e}")
        
        if attempt < max_attempts:
            time.sleep(1)  # Wait 1 second between attempts
    
    print(f"❌ Server not ready after {max_attempts} attempts")
    print(f"   Make sure the API server is running: python run_api.py")
    return False


def ensure_project_path():
    """Ensure project root is in sys.path for imports"""
    if str(_project_root) not in sys.path:
        sys.path.insert(0, str(_project_root))


if __name__ == "__main__":
    # Test server readiness
    if wait_for_server():
        print("Server is ready!")
    else:
        print("Server is not ready")
        sys.exit(1)

