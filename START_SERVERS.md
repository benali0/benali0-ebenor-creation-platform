# 🚀 Guide de Démarrage - Frontend + Backend

## Problème Actuel
Le frontend ne peut pas se connecter au backend car **le backend n'est pas démarré**.

---

## ✅ Solution: Démarrer les Deux Serveurs

### Option 1: Deux Terminaux Séparés (RECOMMANDÉ)

#### Terminal 1 - Backend:
```bash
cd backend
bun run dev
```
**Attendez de voir:** 
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```
**Attendez de voir:**
```
Ready on http://localhost:3000
```

---

### Option 2: Un Seul Terminal (Windows)

**PowerShell:**
```powershell
# Démarrer le backend en arrière-plan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; bun run dev"

# Attendre 5 secondes pour que le backend démarre
Start-Sleep -Seconds 5

# Démarrer le frontend
cd frontend
npm run dev
```

**CMD:**
```cmd
start cmd /k "cd backend && bun run dev"
timeout /t 5
cd frontend && npm run dev
```

---

### Option 3: Script Automatique

**Créer `start-all.ps1`:**
```powershell
Write-Host "🚀 Démarrage du Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot\backend; bun run dev"

Write-Host "⏳ Attente du démarrage du backend (10 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🎨 Démarrage du Frontend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
npm run dev
```

**Exécuter:**
```powershell
.\start-all.ps1
```

---

## 🔍 Vérification

### 1. Backend est démarré:
Ouvrez dans votre navigateur:
```
http://localhost:5000/api/health
```

Vous devriez voir:
```json
{
  "status": "ok",
  "timestamp": "2026-06-11T..."
}
```

### 2. Frontend peut accéder au Backend:
Ouvrez:
```
http://localhost:3000
```

La page devrait charger **sans erreur de connexion**.

---

## ⚠️ Si le Backend Ne Démarre Pas

### Erreur: Port 5000 déjà utilisé
```bash
# Trouver le processus
netstat -ano | findstr :5000

# Tuer le processus (remplacer PID)
taskkill /PID <PID> /F

# Ou changer le port dans backend/.env
PORT=5001
```

### Erreur: MongoDB non connecté
```bash
# Vérifier si MongoDB tourne
mongosh

# Si erreur, démarrer MongoDB:
# Windows: Ouvrir "Services" → Démarrer "MongoDB Server"
# Ou installer MongoDB: https://www.mongodb.com/try/download/community
```

### Erreur: Module non trouvé
```bash
cd backend
bun install
# ou
npm install
```

---

## 📱 Accès depuis un Autre Appareil

Si vous voulez tester sur votre téléphone (même WiFi):

### 1. Trouver votre IP:
```powershell
ipconfig
# Cherchez "IPv4 Address": 192.168.x.x
```

### 2. Modifier frontend/.env.local:
```env
NEXT_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

### 3. Redémarrer le frontend:
```bash
npm run dev
```

### 4. Accéder depuis le téléphone:
```
http://192.168.x.x:3000
```

---

## 🎯 Ordre de Démarrage Correct

```
1. MongoDB      (doit être déjà installé et lancé)
2. Backend      (port 5000)
3. Frontend     (port 3000)
```

---

## 📊 Monitoring

### Backend Logs:
```bash
cd backend
tail -f logs/combined.log
```

### Frontend Build:
```bash
cd frontend
npm run build
# Vérifier les erreurs
```

---

## 🛑 Arrêter les Serveurs

### Option 1: Dans les Terminaux
Appuyez sur `Ctrl + C` dans chaque terminal

### Option 2: Tuer les Processus
```powershell
# Backend (port 5000)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Frontend (port 3000)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

---

## ✅ Checklist Finale

- [ ] MongoDB est installé et démarré
- [ ] Backend démarre sans erreur sur port 5000
- [ ] `/api/health` retourne status "ok"
- [ ] Frontend démarre sans erreur sur port 3000
- [ ] Page d'accueil charge correctement
- [ ] Pas d'erreur "Failed to fetch" dans la console

---

## 🎉 Tout est OK!

Une fois les deux serveurs démarrés, vous pouvez:

1. **Page Publique**: http://localhost:3000
2. **Admin Login**: http://localhost:3000/admin/login
3. **Interface Produits**: http://localhost:3000/admin/products
4. **API Health**: http://localhost:5000/api/health

---

**Note**: Gardez les deux terminaux ouverts pendant le développement!
