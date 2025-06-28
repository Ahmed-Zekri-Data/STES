Write-Host "Starting STES Backend Server..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location -Path "backend"

Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Testing MongoDB connection..." -ForegroundColor Yellow
$mongoTest = node test-mongodb.js
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "MongoDB connection failed. Please set up MongoDB first." -ForegroundColor Red
    Write-Host "See setup-mongodb.md for instructions." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Starting simple server without MongoDB for testing..." -ForegroundColor Cyan
    node simple-server.js
} else {
    Write-Host ""
    Write-Host "Starting full backend server..." -ForegroundColor Green
    npm run dev
}

Read-Host "Press Enter to exit"
