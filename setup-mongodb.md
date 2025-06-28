# MongoDB Setup Guide for Windows

## Option 1: Install MongoDB Community Server Locally

### Step 1: Download MongoDB
1. Go to https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0.x (Current)
   - Platform: Windows
   - Package: msi
3. Download the installer

### Step 2: Install MongoDB
1. Run the downloaded .msi file
2. Choose "Complete" installation
3. Install MongoDB as a Service (recommended)
4. Install MongoDB Compass (GUI tool) - optional but helpful

### Step 3: Start MongoDB Service
Open Command Prompt as Administrator and run:
```cmd
net start MongoDB
```

### Step 4: Verify Installation
```cmd
mongosh
```
If successful, you'll see the MongoDB shell.

## Option 2: Use MongoDB Atlas (Cloud - Recommended for Development)

### Step 1: Create Account
1. Go to https://cloud.mongodb.com/
2. Sign up for a free account
3. Create a new project

### Step 2: Create Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select a cloud provider and region
4. Click "Create Cluster"

### Step 3: Configure Access
1. Create a database user:
   - Username: `admin`
   - Password: `password123` (or your choice)
2. Add IP address: `0.0.0.0/0` (allows access from anywhere)

### Step 4: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password

### Step 5: Update .env File
Replace the MONGODB_URI in your .env file:
```
MONGODB_URI=mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/stes-ecommerce?retryWrites=true&w=majority
```

## Option 3: Use Docker (Alternative)

If you have Docker installed:
```cmd
docker run --name mongodb -d -p 27017:27017 mongo:latest
```

## Testing the Connection

After setting up MongoDB, test the connection:
```cmd
cd backend
node test-mongodb.js
```

## Starting the Backend Server

Once MongoDB is running:
```cmd
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
Connected to MongoDB
```
