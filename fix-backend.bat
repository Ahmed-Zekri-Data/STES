@echo off
echo ========================================
echo Fixing STES Backend Dependencies
echo ========================================
echo.

cd backend

echo 1. Installing missing dependencies...
npm install

echo.
echo 2. Checking if MongoDB is running...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo Starting MongoDB service...
    net start MongoDB
)

echo.
echo 3. Starting backend server...
echo ========================================
echo Backend Server Output:
echo ========================================
npm run dev
