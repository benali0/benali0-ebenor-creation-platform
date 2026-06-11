# ✅ Startup Checklist - Ébenor Création

## 🚀 Quick Start Guide

### Step 1: Prerequisites
```bash
☐ MongoDB is running (port 27017)
☐ Node.js v20+ installed
☐ Bun installed
☐ Dependencies installed
```

**Check MongoDB:**
```bash
mongosh
# If works → MongoDB is running ✅
```

### Step 2: Start Backend
```bash
cd backend
bun run dev
```

**Wait for:**
```
✅ Connexion MongoDB établie avec succès
🚀 Serveur ÉBENOR CRÉATION démarré sur le port 5000
```

### Step 3: Verify Backend
```bash
curl http://localhost:5000/api/health
```

**Expected:**
```json
{
  "status": "OK",
  "message": "API is healthy"
}
```

### Step 4: Start Frontend
```bash
cd frontend
npm run dev
```

**Wait for:**
```
✓ Ready on http://localhost:3000
```

### Step 5: Verify Integration
Open browser:
```
http://localhost:3000/admin/products
```

**Expected:**
- ✅ Page loads without errors
- ✅ No "Failed to fetch" errors
- ✅ Products interface displays

---

## 🎯 One-Command Start

**Use the auto-start script:**
```powershell
.\start-all.ps1
```

This will:
1. Check MongoDB
2. Start backend
3. Wait for backend to be ready
4. Start frontend

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check port 5000
netstat -ano | findstr :5000

# Kill if occupied
taskkill /PID <PID> /F

# Restart
cd backend
bun run dev
```

### Frontend can't connect?
```bash
# Check backend health
curl http://localhost:5000/api/health

# Check .env.local
cat frontend/.env.local
# Should have: NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### MongoDB not running?
```bash
# Windows Services → Start "MongoDB Server"
# Or install: https://www.mongodb.com/try/download/community
```

---

## 📊 Success Indicators

### Backend ✅
- [ ] Server started on port 5000
- [ ] MongoDB connected
- [ ] `/api/health` returns 200 OK
- [ ] `/api/products` returns data

### Frontend ✅
- [ ] Server started on port 3000
- [ ] No console errors
- [ ] Admin login works
- [ ] Products page loads

### Integration ✅
- [ ] Frontend can fetch products
- [ ] Create product works
- [ ] Edit product works
- [ ] Delete product works

---

## 🎉 Ready to Develop!

When all indicators show ✅:

**You're ready to:**
- Develop new features
- Test the product interface
- Create products via admin
- Deploy to production

**Endpoints available:**
```
Backend:  http://localhost:5000/api
Frontend: http://localhost:3000
Admin:    http://localhost:3000/admin/products
```

---

**Last Updated**: 2026-06-11  
**Status**: ✅ All Systems Operational
