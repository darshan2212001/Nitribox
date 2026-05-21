#!/usr/bin/env python3
"""
Run both backend and frontend with debugging enabled.
This script starts both services in the background.
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def main():
    project_root = Path(__file__).parent
    
    print("="*60)
    print("Starting ZyaeL NutriBox with Debugging")
    print("="*60)
    print("\nBackend: http://localhost:8000 (with debugpy on port 5678)")
    print("Frontend: http://localhost:5000")
    print("\nTo attach debugger:")
    print("  1. In VS Code: Run > Attach to Python Process")
    print("  2. Or use: Python: FastAPI Backend (from launch.json)")
    print("\nPress Ctrl+C to stop all services\n")
    print("="*60 + "\n")
    
    # Start backend with debugpy
    print("Starting backend with debugpy...")
    backend_process = subprocess.Popen(
        [
            sys.executable,
            "-m", "debugpy",
            "--listen", "5678",
            "-m", "uvicorn",
            "api.main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ],
        cwd=project_root,
        env={**os.environ, "API_PORT": "8000", "NODE_ENV": "development"}
    )
    
    # Wait a bit for backend to start
    time.sleep(2)
    
    # Start frontend
    print("Starting frontend dev server...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=project_root / "client",
        shell=True
    )
    
    try:
        # Wait for both processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n\nStopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("All services stopped.")

if __name__ == "__main__":
    main()

