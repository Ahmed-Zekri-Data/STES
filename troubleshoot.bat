@echo off
echo ========================================
echo STES Authentication Troubleshooting
echo ========================================
echo.

echo 1. Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)
echo.

echo 2. Checking MongoDB service status...
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB service exists
    sc query MongoDB | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo ✅ MongoDB service is RUNNING
    ) else (
        echo ⚠️ MongoDB service is NOT running
        echo Starting MongoDB service...
        net start MongoDB
    )
) else (
    echo ❌ MongoDB service not found
    echo MongoDB might not be installed as a service
)
echo.

echo 3. Testing MongoDB connection...
mongosh --eval "db.runCommand({connectionStatus: 1})" --quiet >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB is accessible
) else (
    echo ❌ Cannot connect to MongoDB
    echo Trying to start MongoDB manually...
    start /min mongod --dbpath "C:\data\db"
    timeout /t 3 >nul
)
echo.

echo 4. Checking if port 5000 is available...
netstat -an | find ":5000" >nul
if %errorlevel% equ 0 (
    echo ⚠️ Port 5000 is already in use
    echo Killing existing processes on port 5000...
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":5000"') do taskkill /PID %%a /F >nul 2>&1
) else (
    echo ✅ Port 5000 is available
)
echo.

echo 5. Installing backend dependencies...
cd backend
npm install
echo.

echo 6. Starting backend server...
echo ========================================
echo Backend server output:
echo ========================================
npm run dev

pause
