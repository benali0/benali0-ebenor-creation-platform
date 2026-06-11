# Script d'arrêt - Frontend + Backend
# Ébenor Création

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "   🛑 ÉBENOR CRÉATION - Arrêt des Serveurs       " -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Red
Write-Host ""

# Fonction pour arrêter un processus sur un port
function Stop-ProcessOnPort {
    param (
        [int]$Port,
        [string]$ServiceName
    )
    
    Write-Host "🔍 Recherche du processus $ServiceName sur le port $Port..." -ForegroundColor Yellow
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connection) {
            $processId = $connection.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            
            if ($process) {
                Write-Host "   Processus trouvé: $($process.Name) (PID: $processId)" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "✅ $ServiceName arrêté" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Processus introuvable" -ForegroundColor Yellow
            }
        } else {
            Write-Host "ℹ️  Aucun processus n'écoute sur le port $Port" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Erreur lors de l'arrêt: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Arrêter le Frontend (port 3000)
Stop-ProcessOnPort -Port 3000 -ServiceName "Frontend (Next.js)"

# Arrêter le Backend (port 5000)
Stop-ProcessOnPort -Port 5000 -ServiceName "Backend (Express)"

# Rechercher et arrêter tous les processus Node/Bun qui pourraient traîner
Write-Host "🔍 Nettoyage des processus Node.js et Bun..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*backend*" -or 
    $_.MainWindowTitle -like "*frontend*" -or
    $_.MainWindowTitle -like "*tsx*" -or
    $_.CommandLine -like "*ebenor*"
}

$bunProcesses = Get-Process -Name "bun" -ErrorAction SilentlyContinue

$allProcesses = @()
if ($nodeProcesses) { $allProcesses += $nodeProcesses }
if ($bunProcesses) { $allProcesses += $bunProcesses }

if ($allProcesses.Count -gt 0) {
    Write-Host "   Trouvé $($allProcesses.Count) processus à arrêter" -ForegroundColor Cyan
    foreach ($proc in $allProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   ✓ Arrêté: $($proc.Name) (PID: $($proc.Id))" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Impossible d'arrêter PID $($proc.Id)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ℹ️  Aucun processus Node/Bun trouvé" -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ Tous les serveurs ont été arrêtés            " -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pour redémarrer, exécutez: .\start-all.ps1" -ForegroundColor Cyan
Write-Host ""
