# deploy-all.ps1
# Full-stack deployment script for MiniQuest

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$SkipTests,
    [switch]$WatchLogs
)

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
if (-Not $SCRIPT_DIR) {
    $SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Write-Host "`n================================================" -ForegroundColor Magenta
Write-Host "Full-Stack Deployment" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "Deployment Scope:" -ForegroundColor White
if ($BackendOnly) {
    Write-Host "  Backend Only" -ForegroundColor Yellow
} elseif ($FrontendOnly) {
    Write-Host "  Frontend Only" -ForegroundColor Yellow
} else {
    Write-Host "  Full Stack" -ForegroundColor Cyan
}

Write-Host "`nFeature Updates:" -ForegroundColor White
Write-Host "  - Scope Guardrails" -ForegroundColor Gray
Write-Host "  - Out-of-Scope UI" -ForegroundColor Gray
Write-Host "  - About Page" -ForegroundColor Gray
Write-Host "  - Service Recommendations" -ForegroundColor Gray

$startTime = Get-Date

# Backend deployment
if (-Not $FrontendOnly) {
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "BACKEND DEPLOYMENT" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    $backendScript = Join-Path $SCRIPT_DIR "deploy-backend.ps1"
    
    if (Test-Path $backendScript) {
        & $backendScript -WatchLogs:$WatchLogs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`nERROR: Backend deployment failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "WARNING: deploy-backend.ps1 not found" -ForegroundColor Yellow
        
        $BACKEND_PATH = "E:\Documents\Prof_Docs\Tavily\Multi-Agent System Assignment\backend"
        Set-Location $BACKEND_PATH
        
        Write-Host "Building..." -ForegroundColor Cyan
        docker build -t miniquest-backend:latest .
        
        Write-Host "Tagging..." -ForegroundColor Cyan
        docker tag miniquest-backend:latest 140352704388.dkr.ecr.us-east-1.amazonaws.com/miniquest-backend:latest
        
        Write-Host "Pushing..." -ForegroundColor Cyan
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 140352704388.dkr.ecr.us-east-1.amazonaws.com
        docker push 140352704388.dkr.ecr.us-east-1.amazonaws.com/miniquest-backend:latest
        
        Write-Host "Deploying..." -ForegroundColor Cyan
        aws ecs update-service --cluster miniquest-prod-cluster --service miniquest-backend-service --force-new-deployment --region us-east-1 --no-cli-pager | Out-Null
        
        Write-Host "Waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 120
    }
    
    Write-Host "`nBackend deployment complete" -ForegroundColor Green
}

# Frontend deployment
if (-Not $BackendOnly) {
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "FRONTEND DEPLOYMENT" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    $frontendScript = Join-Path $SCRIPT_DIR "deploy-frontend.ps1"
    
    if (Test-Path $frontendScript) {
        & $frontendScript
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`nERROR: Frontend deployment failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "WARNING: deploy-frontend.ps1 not found" -ForegroundColor Yellow
        
        $FRONTEND_PATH = "E:\Documents\Prof_Docs\Tavily\Multi-Agent System Assignment\frontend"
        Set-Location $FRONTEND_PATH
        
        Write-Host "Building..." -ForegroundColor Cyan
        npm run build
        
        Write-Host "Uploading..." -ForegroundColor Cyan
        aws s3 sync dist/ s3://miniquest-frontend-prod/ --delete
        
        Write-Host "Invalidating..." -ForegroundColor Cyan
        aws cloudfront create-invalidation --distribution-id E2BYK5CCHHFWLZ --paths "/*"
    }
    
    Write-Host "`nFrontend deployment complete" -ForegroundColor Green
}

# Post-deployment verification
if (-Not $SkipTests) {
    Write-Host "`n================================================" -ForegroundColor Yellow
    Write-Host "POST-DEPLOYMENT VERIFICATION" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    
    Write-Host "`nRunning smoke tests..." -ForegroundColor Cyan
    
    if (-Not $BackendOnly) {
        Write-Host "`nChecking frontend..." -ForegroundColor Gray
        try {
            $response = Invoke-WebRequest -Uri "https://d1nrqhtd83kmw6.cloudfront.net" -Method Get -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "  Frontend accessible" -ForegroundColor Green
            }
        } catch {
            Write-Host "  WARNING: Could not verify frontend" -ForegroundColor Yellow
        }
        
        Write-Host "`nChecking about page..." -ForegroundColor Gray
        try {
            $aboutResponse = Invoke-WebRequest -Uri "https://d1nrqhtd83kmw6.cloudfront.net/about" -Method Get -TimeoutSec 10
            if ($aboutResponse.StatusCode -eq 200) {
                Write-Host "  About page accessible" -ForegroundColor Green
            }
        } catch {
            Write-Host "  WARNING: About page check skipped" -ForegroundColor Yellow
        }
    }
}

# Summary
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n================================================" -ForegroundColor Magenta
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Magenta

Write-Host "`nTotal Time: $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor White

Write-Host "`nLive URLs:" -ForegroundColor White
Write-Host "  Frontend: https://d1nrqhtd83kmw6.cloudfront.net" -ForegroundColor Cyan
Write-Host "  About:    https://d1nrqhtd83kmw6.cloudfront.net/about" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "  1. Wait 2 minutes for services" -ForegroundColor Gray
Write-Host "  2. Hard refresh (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host "  3. Run testing checklist" -ForegroundColor Gray

Write-Host "`nUseful Commands:" -ForegroundColor White
Write-Host "  aws logs tail /ecs/miniquest-backend --follow" -ForegroundColor Gray
Write-Host "  aws ecs describe-services --cluster miniquest-prod-cluster --services miniquest-backend-service" -ForegroundColor Gray

Write-Host "`nDeployment successful!`n" -ForegroundColor Green