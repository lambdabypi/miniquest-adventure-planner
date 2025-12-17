# deploy-backend.ps1 - Backend deployment
param(
    [string]$BackendPath = ".",
    [string]$EcrRegistry,
    [string]$EcrRepo,
    [string]$EcsCluster,
    [string]$EcsService,
    [string]$AwsRegion = "us-east-1",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if (-Not $EcrRegistry -or -Not $EcrRepo -or -Not $EcsCluster -or -Not $EcsService) {
    Write-Host "ERROR: Required parameters missing" -ForegroundColor Red
    Write-Host "Usage: .\deploy-backend.ps1 -EcrRegistry 'ACCOUNT.dkr.ecr.REGION.amazonaws.com' -EcrRepo 'repo-name' -EcsCluster 'cluster' -EcsService 'service'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Backend Deployment" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Set-Location $BackendPath

if (-Not $SkipBuild) {
    Write-Host "Building..." -ForegroundColor Cyan
    docker build -t "$EcrRepo:latest" .
}

Write-Host "Tagging..." -ForegroundColor Cyan
docker tag "$EcrRepo:latest" "$EcrRegistry/$EcrRepo:latest"

Write-Host "Pushing..." -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $EcrRegistry
docker push "$EcrRegistry/$EcrRepo:latest"

Write-Host "Deploying..." -ForegroundColor Cyan
aws ecs update-service --cluster $EcsCluster --service $EcsService --force-new-deployment --region $AwsRegion --no-cli-pager

Write-Host "`nDeployment complete!`n" -ForegroundColor Green