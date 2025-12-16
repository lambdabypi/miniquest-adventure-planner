# deploy-backend.ps1
# Backend deployment script for MiniQuest

param(
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$SkipDeploy,
    [switch]$WatchLogs
)

$ErrorActionPreference = "Stop"

# Configuration
$BACKEND_PATH = "E:\Documents\Prof_Docs\Tavily\Multi-Agent System Assignment\backend"
$ECR_REGISTRY = "140352704388.dkr.ecr.us-east-1.amazonaws.com"
$ECR_REPO = "miniquest-backend"
$IMAGE_TAG = "latest"
$ECS_CLUSTER = "miniquest-prod-cluster"
$ECS_SERVICE = "miniquest-backend-service"
$AWS_REGION = "us-east-1"
$LOG_GROUP = "/ecs/miniquest-backend"

Write-Host "`n" -NoNewline
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Backend Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend
Write-Host "Navigating to backend..." -ForegroundColor Yellow
Set-Location $BACKEND_PATH

if (-Not (Test-Path "Dockerfile")) {
    Write-Host "ERROR: Dockerfile not found" -ForegroundColor Red
    exit 1
}

# Build Docker image
if (-Not $SkipBuild) {
    Write-Host "`nBuilding Docker image..." -ForegroundColor Cyan
    docker build -t "$ECR_REPO`:$IMAGE_TAG" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build complete" -ForegroundColor Green
} else {
    Write-Host "`nSkipping build" -ForegroundColor Yellow
}

# Push to ECR
if (-Not $SkipPush) {
    Write-Host "`nTagging for ECR..." -ForegroundColor Cyan
    docker tag "$ECR_REPO`:$IMAGE_TAG" "$ECR_REGISTRY/$ECR_REPO`:$IMAGE_TAG"
    
    Write-Host "Logging into ECR..." -ForegroundColor Cyan
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: ECR login failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Pushing to ECR..." -ForegroundColor Cyan
    docker push "$ECR_REGISTRY/$ECR_REPO`:$IMAGE_TAG"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Push failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Push complete" -ForegroundColor Green
} else {
    Write-Host "`nSkipping ECR push" -ForegroundColor Yellow
}

# Deploy to ECS
if (-Not $SkipDeploy) {
    Write-Host "`nDeploying to ECS..." -ForegroundColor Cyan
    
    aws ecs update-service `
        --cluster $ECS_CLUSTER `
        --service $ECS_SERVICE `
        --force-new-deployment `
        --region $AWS_REGION `
        --no-cli-pager | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Deployment started" -ForegroundColor Green
    
    Write-Host "`nWaiting for tasks (2 minutes)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 120
    
    Write-Host "Wait complete" -ForegroundColor Green
} else {
    Write-Host "`nSkipping ECS deployment" -ForegroundColor Yellow
}

# Check logs
if ($WatchLogs -or (-Not $SkipDeploy)) {
    Write-Host "`nChecking startup logs..." -ForegroundColor Cyan
    
    try {
        aws logs tail $LOG_GROUP --since 3m --format short | Select-String -Pattern "Started server process|Application startup|RAG system|worker|Uvicorn"
    } catch {
        Write-Host "Could not fetch logs" -ForegroundColor Yellow
    }
}

# Service status
Write-Host "`nService Status:" -ForegroundColor Cyan

try {
    $serviceInfo = aws ecs describe-services `
        --cluster $ECS_CLUSTER `
        --services $ECS_SERVICE `
        --region $AWS_REGION `
        --no-cli-pager | ConvertFrom-Json
    
    $service = $serviceInfo.services[0]
    Write-Host "  Status: $($service.status)" -ForegroundColor Green
    Write-Host "  Running: $($service.runningCount) / $($service.desiredCount)" -ForegroundColor Green
} catch {
    Write-Host "Could not fetch status" -ForegroundColor Yellow
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`nWhat was deployed:" -ForegroundColor White
Write-Host "  - Intent Parser with scope detection" -ForegroundColor Gray
Write-Host "  - Adventures route with out-of-scope handling" -ForegroundColor Gray
Write-Host "  - New /about endpoint" -ForegroundColor Gray

Write-Host "`nUseful commands:" -ForegroundColor White
Write-Host "  aws logs tail $LOG_GROUP --follow" -ForegroundColor Gray

Write-Host ""

# Watch logs if requested
if ($WatchLogs) {
    Write-Host "Watching logs (Ctrl+C to stop)..." -ForegroundColor Cyan
    aws logs tail $LOG_GROUP --follow
}