# Script de démarrage automatique - Frontend + Backend
# Ébenor Création

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 ÉBENOR CRÉATION - Démarrage des Serveurs   " -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Vérifier si MongoDB est accessible
Write-Host "🔍 Vérification de MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
    if ($mongoTest.TcpTestSucceeded) {
        Write-Host "✅ MongoDB est accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB n'est pas accessible sur le port 27017" -ForegroundColor Red
        Write-Host "   Veuillez démarrer MongoDB avant de continuer" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Appuyez sur Entrée pour continuer quand même ou Ctrl+C pour annuler"
    }
} catch {
    Write-Host "⚠️  Impossible de vérifier MongoDB" -ForegroundColor Yellow
}

Write-Host ""

# Démarrer le Backend
Write-Host "🔧 Démarrage du Backend (port 5000)..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"

if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$backendPath'; Write-Host '═════════════════════════════════' -ForegroundColor Green; Write-Host '     🔧 BACKEND SERVER (5000)    ' -ForegroundColor Yellow; Write-Host '═════════════════════════════════' -ForegroundColor Green; Write-Host ''; bun run dev"
    )
    Write-Host "✅ Backend lancé dans un nouveau terminal" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier backend introuvable: $backendPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Attente du démarrage complet du backend..." -ForegroundColor Yellow

# Attendre que le backend soit prêt (max 30 secondes)
$maxAttempts = 30
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Backend pas encore prêt
    }
}

Write-Host ""

if ($backendReady) {
    Write-Host "✅ Backend prêt et accessible!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend n'a pas répondu après 30 secondes" -ForegroundColor Yellow
    Write-Host "   Le frontend va démarrer quand même..." -ForegroundColor Yellow
}

Write-Host ""

# Démarrer le Frontend
Write-Host "🎨 Démarrage du Frontend (port 3000)..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"

if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    Write-Host ""
    Write-Host "═════════════════════════════════" -ForegroundColor Magenta
    Write-Host "     🎨 FRONTEND SERVER (3000)    " -ForegroundColor Yellow
    Write-Host "═════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    
    # Le frontend s'exécute dans ce terminal
    npm run dev
} else {
    Write-Host "❌ Dossier frontend introuvable: $frontendPath" -ForegroundColor Red
    exit 1
}
