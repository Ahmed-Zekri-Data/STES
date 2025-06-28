# 🔧 Manual Troubleshooting Steps

Since you installed MongoDB but authentication still isn't working, let's troubleshoot step by step.

## Step 1: Check MongoDB Service

**Open Command Prompt as Administrator** and run:

```cmd
sc query MongoDB
```

**Expected output if MongoDB is installed as service:**
```
SERVICE_NAME: MongoDB
STATE: 4 RUNNING
```

**If MongoDB is not running:**
```cmd
net start MongoDB
```

**If MongoDB service doesn't exist:**
```cmd
mongod --install
net start MongoDB
```

## Step 2: Test MongoDB Connection

```cmd
mongosh
```

**If successful, you should see:**
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/
```

**Type `exit` to close mongosh**

## Step 3: Start Backend Server

**Open a NEW Command Prompt/PowerShell window:**

```cmd
cd "C:\Users\ASUS\Documents\augment-projects\STES\backend"
npm install
npm run dev
```

**You should see:**
```
🚀 STES Backend Server Started Successfully!
📡 Server running on: http://localhost:5000
✅ Successfully connected to MongoDB
```

## Step 4: Test Backend API

**Open another Command Prompt and test:**

```cmd
curl http://localhost:5000/api/health
```

**Or open in browser:** http://localhost:5000/api/health

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "environment": "development"
}
```

## Step 5: Test Frontend Connection

1. **Make sure your frontend is still running** (http://localhost:5173)
2. **Open browser console** (F12)
3. **Try to register/login**
4. **Check for any error messages**

## Common Issues & Solutions

### Issue 1: "MongoDB connection error"

**Solution A: Use MongoDB Atlas (Cloud)**
1. Go to https://cloud.mongodb.com/
2. Create free account
3. Create cluster
4. Get connection string
5. Update `.env` file:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/stes-ecommerce
```

**Solution B: Fix Local MongoDB**
```cmd
# Create data directory
mkdir C:\data\db

# Start MongoDB manually
mongod --dbpath "C:\data\db"
```

### Issue 2: "Port 5000 already in use"

```cmd
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID [PID] /F
```

### Issue 3: "npm run dev" fails

```cmd
cd backend
npm install --force
npm run dev
```

### Issue 4: Frontend still shows connection errors

1. **Check if backend is running** on http://localhost:5000/api/health
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Restart frontend:**
```cmd
cd frontend
npm run dev
```

## Quick Test Script

**Run this to automatically troubleshoot:**

```cmd
cd "C:\Users\ASUS\Documents\augment-projects\STES"
troubleshoot.bat
```

## Alternative: Use Simple Server for Testing

**If MongoDB keeps failing, use the simple server:**

```cmd
cd backend
node simple-server.js
```

This will start a server without MongoDB that provides mock responses for testing.

## What to Look For

### ✅ Success Indicators:
- MongoDB service is RUNNING
- Backend shows "✅ Successfully connected to MongoDB"
- http://localhost:5000/api/health returns JSON
- No CORS errors in browser console
- Registration/login attempts reach the backend

### ❌ Problem Indicators:
- "MongoDB connection error" in backend
- "ECONNREFUSED" errors in frontend
- "net::ERR_CONNECTION_REFUSED" in browser console
- Backend not accessible at localhost:5000

## Next Steps

1. **Follow steps 1-5 above**
2. **Share the exact error messages** you see
3. **Let me know which step fails**

The authentication system is fully implemented - we just need to get the backend server running with MongoDB!
