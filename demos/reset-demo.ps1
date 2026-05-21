#!/usr/bin/env pwsh
# IMDE Demo Reset — run via VS Code task "IMDE: Reset demo scenario (local API)"
# or directly: pwsh -File demos/reset-demo.ps1
#
# Requires: local API running on http://localhost:7071

$ErrorActionPreference = 'Stop'

$apiBase = 'http://localhost:7071'

Write-Host ''
Write-Host '=== IMDE Demo Reset ===' -ForegroundColor Cyan

# 1. POST reset
$resetBody = @{
    tenantId       = 'default'
    demoScenarioId = 'imde-rcm-denial-demo'
    actorId        = 'presenter-admin'
} | ConvertTo-Json -Compress

try {
    $resetResp = Invoke-WebRequest -UseBasicParsing -Method Post `
        -Uri "$apiBase/api/sandboxes/demo/reset" `
        -ContentType 'application/json' `
        -Body $resetBody `
        -TimeoutSec 30
} catch {
    Write-Host "FAIL: Reset call returned an error: $_" -ForegroundColor Red
    exit 1
}

$reset = $resetResp.Content | ConvertFrom-Json
Write-Host ''
Write-Host 'Deleted:' -ForegroundColor Yellow
Write-Host "  sandboxes        = $($reset.deleted.sandboxes)"
Write-Host "  modelExperiences = $($reset.deleted.modelExperiences)"
Write-Host "  submissions      = $($reset.deleted.submissions)"
Write-Host "  lifecycleEvents  = $($reset.deleted.lifecycleEvents)"

# 2. Verify baseline
$me  = (Invoke-WebRequest -UseBasicParsing "$apiBase/api/model-experiences?modelRouteId=rcm-denial-prediction-space&tenantId=default" -TimeoutSec 10).Content | ConvertFrom-Json
$sbx = (Invoke-WebRequest -UseBasicParsing "$apiBase/api/sandboxes?tenantId=default" -TimeoutSec 10).Content | ConvertFrom-Json
$sbxTotal = if ($null -ne $sbx.total) { $sbx.total } elseif ($sbx -is [array]) { $sbx.Count } else { 0 }

Write-Host ''
Write-Host 'Current baseline:' -ForegroundColor Yellow
Write-Host "  sandboxes        = $sbxTotal  (expect 0)"
Write-Host "  modelExperiences = $($me.total)  (expect 0)"

if ($sbxTotal -eq 0 -and $me.total -eq 0) {
    Write-Host ''
    Write-Host 'RESET COMPLETE — baseline confirmed clean.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'REMINDER (browser): open http://localhost:3000, DevTools Console:' -ForegroundColor DarkYellow
    Write-Host "  localStorage.removeItem('imde-demo-model-experience')" -ForegroundColor DarkYellow
} else {
    Write-Host ''
    Write-Host 'WARNING: baseline not clean — re-run or check Cosmos.' -ForegroundColor Red
    exit 1
}
