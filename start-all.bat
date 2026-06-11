@echo off
echo.
echo ===============================================================
echo    🚀 EBENOR CREATION - Demarrage des Serveurs
echo ===============================================================
echo.

echo 🔧 Demarrage du Backend (port 5000)...
start "Backend Server" cmd /k "cd backend && bun run dev"

echo.
echo ⏳ Attente du demarrage du backend (10 secondes)...
timeout /t 10 /nobreak

echo.
echo 🎨 Demarrage du Frontend (port 3000)...
cd frontend
npm run dev

pause
