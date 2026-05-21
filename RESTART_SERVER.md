# Restart Backend Server

The backend server needs to be restarted to pick up the new database models (Area, Batch, BatchMeal).

## Steps to Restart:

1. **Stop the current server** (if running in a terminal, press Ctrl+C)

2. **Kill any stuck processes** (if needed):
   ```powershell
   Get-Process python | Where-Object {$_.Path -like "*ZyaeLNutriBox*"} | Stop-Process -Force
   ```

3. **Start the server** using one of these methods:

   **Option A: Using VS Code Debug (Recommended)**
   - Press F5 or go to Run > Start Debugging
   - Select "Python: FastAPI Backend" configuration

   **Option B: Using Command Line**
   ```bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

   **Option C: Using Python directly**
   ```bash
   python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Wait for startup** - The server will:
   - Create new database tables (Area, Batch, BatchMeal) automatically
   - Initialize the database
   - Start the scheduler

5. **Verify it's working**:
   - Check the terminal for "DATABASE INITIALIZATION COMPLETE"
   - Open http://localhost:8000/api/health in your browser
   - You should see a JSON response with status "running"

## Troubleshooting:

If the server still doesn't respond:
- Check if port 8000 is already in use: `netstat -ano | findstr :8000`
- Make sure no other Python processes are using the database
- Check the terminal output for error messages
- Try running the migration manually (though it should happen automatically):
  ```bash
  python -c "from api.database import engine, Base; from api import models; Base.metadata.create_all(bind=engine); print('Tables created')"
  ```

