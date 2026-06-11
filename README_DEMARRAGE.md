# 🚀 Guide de Démarrage Rapide - Ébenor Création

## Démarrage Automatique (RECOMMANDÉ)

### ✅ Lancer Tout en Un Clic

**PowerShell** (Clic droit → "Exécuter avec PowerShell"):
```powershell
.\start-all.ps1
```

Ou dans un terminal PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

**Ce script va:**
1. ✅ Vérifier que MongoDB est accessible
2. ✅ Démarrer le backend (port 5000) dans un nouveau terminal
3. ⏳ Attendre que le backend soit prêt
4. ✅ Démarrer le frontend (port 3000) dans le terminal actuel

---

## 🛑 Arrêter les Serveurs

**PowerShell**:
```powershell
.\stop-all.ps1
```

**Ce script va:**
- Arrêter le processus sur le port 3000 (frontend)
- Arrêter le processus sur le port 5000 (backend)
- Nettoyer tous les processus Node/Bun restants

---

## 🔧 Démarrage Manuel (Deux Terminaux)

### Terminal 1 - Backend
```bash
cd backend
bun run dev
```

**Attendez de voir:**
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

**Attendez de voir:**
```
✓ Ready on http://localhost:3000
```

---

## 🌐 Accès aux Interfaces

Une fois les serveurs démarrés:

### 🎨 Frontend (Public)
- **Accueil**: http://localhost:3000
- **Produits**: http://localhost:3000/produits
- **Galerie**: http://localhost:3000/galerie
- **Contact**: http://localhost:3000/contact

### 🔐 Admin
- **Login**: http://localhost:3000/admin/login
- **Dashboard**: http://localhost:3000/admin/dashboard
- **Produits**: http://localhost:3000/admin/products ✨ (NOUVELLE INTERFACE)
- **Galerie**: http://localhost:3000/admin/gallery
- **Messages**: http://localhost:3000/admin/messages

### 🔧 Backend (API)
- **Health Check**: http://localhost:5000/api/health
- **API Docs**: http://localhost:5000/api/

---

## ⚠️ Prérequis

### Avant le Premier Démarrage:

1. **MongoDB** doit être installé et démarré
   ```bash
   # Windows: Ouvrir "Services" → Démarrer "MongoDB Server"
   # Ou installer: https://www.mongodb.com/try/download/community
   ```

2. **Node.js v20+** installé
   ```bash
   node --version  # doit afficher v20.x.x ou supérieur
   ```

3. **Bun** installé (pour le backend)
   ```bash
   bun --version
   # Si non installé: npm install -g bun
   ```

4. **Dépendances installées**
   ```bash
   # Backend
   cd backend
   bun install
   
   # Frontend
   cd frontend
   npm install
   ```

---

## 🐛 Dépannage

### Erreur: "MongoDB connection failed"
```bash
# Vérifier MongoDB
mongosh

# Si erreur, démarrer MongoDB
# Windows: Services → MongoDB Server → Démarrer
```

### Erreur: "Port 5000 already in use"
```bash
# Arrêter le processus
.\stop-all.ps1

# Ou manuellement:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Erreur: "Failed to fetch" dans le frontend
```bash
# Le backend n'est pas démarré ou pas accessible
# 1. Vérifier que le backend tourne:
curl http://localhost:5000/api/health

# 2. Si non, le démarrer:
cd backend
bun run dev
```

### Erreur: "Cannot find module"
```bash
# Réinstaller les dépendances
cd backend
bun install

cd frontend
npm install
```

### Erreur: PowerShell "script is disabled"
```powershell
# Autoriser l'exécution temporairement
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\start-all.ps1
```

---

## 📱 Tester sur Mobile (même WiFi)

### 1. Trouver votre IP locale
```powershell
ipconfig
# IPv4 Address: 192.168.x.x
```

### 2. Modifier `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

### 3. Redémarrer
```powershell
.\stop-all.ps1
.\start-all.ps1
```

### 4. Accéder depuis le téléphone
```
http://192.168.x.x:3000
```

---

## 🎯 Checklist de Démarrage

- [ ] MongoDB installé et démarré
- [ ] Node.js v20+ installé
- [ ] Bun installé
- [ ] Dépendances installées (backend + frontend)
- [ ] Variables d'environnement configurées (.env)
- [ ] Backend démarre sans erreur (port 5000)
- [ ] Frontend démarre sans erreur (port 3000)
- [ ] http://localhost:5000/api/health retourne "ok"
- [ ] http://localhost:3000 charge correctement

---

## 📊 Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Frontend       │────────▶│  Backend        │────────▶│  MongoDB        │
│  (Next.js)      │         │  (Express)      │         │  (Database)     │
│  Port 3000      │         │  Port 5000      │         │  Port 27017     │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## 🎉 C'est Parti!

**Commande unique pour tout démarrer:**
```powershell
.\start-all.ps1
```

**Accédez à la nouvelle interface produits:**
```
http://localhost:3000/admin/products
```

**Pour arrêter:**
```powershell
.\stop-all.ps1
```

---

## 📚 Documentation Complète

- **Interface Produits**: `frontend/INTERFACE_FEATURES.md`
- **Avant/Après**: `frontend/BEFORE_AFTER_COMPARISON.md`
- **Guide Complet**: `frontend/QUICK_START_GUIDE.md`
- **Démarrage Détaillé**: `START_SERVERS.md`

---

**Version**: 1.0.0
**Date**: 2026-06-11
**Support**: Consultez les fichiers de documentation pour plus de détails

✨ **Bon développement!** ✨
