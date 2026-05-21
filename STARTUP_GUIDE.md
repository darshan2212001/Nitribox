# 🚀 ZyaeL NutriBox - Startup Guide

## 📋 **Available Startup Scripts**

### **Web Application**
- **`start_web_app.ps1`** - PowerShell (Recommended)
- **`start_web_app.bat`** - Batch wrapper for PowerShell

### **Mobile Application**  
- **`start_mobile_app.ps1`** - PowerShell (Recommended)
- **`start_mobile_app.bat`** - Batch wrapper for PowerShell

### **Process Management**
- **`kill_processes.ps1`** - Kill all NutriBox processes
- **`kill_processes.bat`** - Batch wrapper for PowerShell

## 🎯 **Quick Start**

### **Option 1: PowerShell (Recommended)**
```powershell
# Web Application
.\start_web_app.ps1

# Mobile Application  
.\start_mobile_app.ps1

# Kill all processes
.\kill_processes.ps1
```

### **Option 2: Batch Files**
```cmd
# Web Application
start_web_app.bat

# Mobile Application
start_mobile_app.bat

# Kill all processes
kill_processes.bat
```

### **Option 3: NPM Scripts**
```bash
# Web Application (Backend + Frontend)
npm run start:web-app

# Mobile Application
npm run start:mobile

# Install all dependencies
npm run install:all
```

## 🔧 **What Each Script Does**

### **Web Application Script**
- ✅ Checks for required files
- ✅ Installs dependencies if missing
- ✅ Cleans up existing processes
- ✅ Starts FastAPI backend (port 8000)
- ✅ Starts React frontend (port 5000)
- ✅ Single process with auto-cleanup

### **Mobile Application Script**
- ✅ Checks for required files
- ✅ Installs dependencies if missing
- ✅ Cleans up existing processes
- ✅ Starts Expo development server (port 8085)
- ✅ Shows QR code for mobile testing

### **Kill Processes Script**
- ✅ Stops all Python processes (FastAPI)
- ✅ Stops all Node.js processes (Vite, Expo)
- ✅ Cleans up any hanging processes

## 🌐 **Access Points**

### **Web Application**
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### **Mobile Application**
- **Expo Dev Server**: http://localhost:8085
- **QR Code**: Scan with Expo Go app on your phone

## ⚠️ **Important Notes**

1. **First Time Setup**: Run `npm run install:all` to install all dependencies
2. **Environment Variables**: Copy `env.example` to `.env` and configure
3. **Database**: Ensure MySQL is running and database exists
4. **Ports**: Make sure ports 5000, 8000, and 8085 are available
5. **Node.js**: Requires Node.js 18+ and npm 8+

## 🆘 **Troubleshooting**

### **Port Already in Use**
```bash
# Kill all processes and try again
.\kill_processes.ps1
.\start_web_app.ps1
```

### **Dependencies Missing**
```bash
# Install all dependencies
npm run install:all
```

### **Permission Issues (PowerShell)**
```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📱 **Mobile App Testing**

1. **Install Expo Go** on your phone from App Store/Play Store
2. **Run mobile script**: `.\start_mobile_app.ps1`
3. **Scan QR code** that appears in the terminal
4. **App opens** on your phone automatically

## 🎉 **Success Indicators**

### **Web Application**
- ✅ Backend: "FastAPI backend ready"
- ✅ Frontend: "Local: http://localhost:5000"
- ✅ No error messages in terminal

### **Mobile Application**
- ✅ Expo: "Metro waiting on exp://192.168.x.x:8085"
- ✅ QR code displayed in terminal
- ✅ "Expo Go" app opens on phone

---

**🚀 Your ZyaeL NutriBox application is now running!**
