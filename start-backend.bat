@echo off
echo Starting STES Backend Server...
echo.

cd /d "%~dp0backend"

echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
npm install

echo.
echo Testing MongoDB connection...
node test-mongodb.js
if %errorlevel% neq 0 (
    echo.
    echo MongoDB connection failed. Please set up MongoDB first.
    echo See setup-mongodb.md for instructions.
    echo.
    echo Starting simple server without MongoDB for testing...
    node simple-server.js
) else (
    echo.
    echo Starting full backend server...
    npm run dev
)

pause
