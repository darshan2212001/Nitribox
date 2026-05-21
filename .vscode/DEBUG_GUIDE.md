# Debug and Run Guide

## Quick Start

### Option 1: Debug Both Services (Recommended)
1. Press `F5` or go to **Run and Debug** panel
2. Select **"Debug Full Stack (Backend + Frontend)"** from the dropdown
3. This will:
   - Start the backend API on port 8000 with debugging enabled
   - Start the frontend dev server on port 5000
   - Open Chrome with debugging attached

### Option 2: Debug Individual Services
- **Backend Only**: Select **"Python: FastAPI Backend"**
- **Frontend Only**: Select **"Chrome: Frontend Debug"** or **"Edge: Frontend Debug"**

### Option 3: Run Without Debugging
Use the PowerShell script:
```powershell
.\start_all_services.ps1
```

## Debug Features

### Backend Debugging
- Breakpoints work in Python files
- Step through code execution
- Inspect variables and call stack
- Debug WebSocket connections
- View API request/response in real-time

### Frontend Debugging
- Breakpoints in TypeScript/React files
- React DevTools integration
- Network request inspection
- Component state inspection
- Hot module replacement (HMR) enabled

## Ports
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5000
- **WebSocket**: ws://localhost:8000/ws

## Troubleshooting

### Port Already in Use
Run the kill task:
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select "kill-all-services"

Or use PowerShell:
```powershell
Get-Process -Name python,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Frontend Not Starting
- Check if port 5000 is available
- Verify `client/package.json` exists
- Run `npm install` in the `client` directory

### Backend Not Starting
- Check if port 8000 is available
- Verify Python dependencies: `pip install -r requirements.txt`
- Check database connection in `.env` file

### Debugger Not Attaching
- Ensure sourcemaps are enabled (already configured)
- Check browser console for errors
- Verify VS Code extensions: Python, Debugger for Chrome/Edge

