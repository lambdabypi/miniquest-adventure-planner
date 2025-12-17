# deploy-frontend.ps1
# Frontend deployment script for MiniQuest

param(
    [switch]$SkipBuild,
    [switch]$SkipUpload,
    [switch]$SkipInvalidation
)

$ErrorActionPreference = "Stop"

# Configuration
$FRONTEND_PATH = "E:\Documents\Prof_Docs\Tavily\Multi-Agent System Assignment\frontend"
$S3_BUCKET = "s3://miniquest-frontend-prod/"
$CLOUDFRONT_DIST_ID = "E2BYK5CCHHFWLZ"
$SITE_URL = "https://d1nrqhtd83kmw6.cloudfront.net"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Frontend Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend
Write-Host "Navigating to frontend..." -ForegroundColor Yellow
Set-Location $FRONTEND_PATH

if (-Not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}

# Build
if (-Not $SkipBuild) {
    Write-Host "`nBuilding frontend..." -ForegroundColor Cyan
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
    }
    
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    if (-Not (Test-Path "dist")) {
        Write-Host "ERROR: dist/ folder not found" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Write-Host "Build complete" -ForegroundColor Green
} else {
    Write-Host "`nSkipping build" -ForegroundColor Yellow
    
    if (-Not (Test-Path "dist")) {
        Write-Host "ERROR: dist/ folder not found" -ForegroundColor Red
        exit 1
    }
}

# Upload to S3
if (-Not $SkipUpload) {
    Write-Host "`nUploading to S3..." -ForegroundColor Cyan
    
    aws s3 sync dist/ $S3_BUCKET --delete
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: S3 upload failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Write-Host "Upload complete" -ForegroundColor Green
} else {
    Write-Host "`nSkipping S3 upload" -ForegroundColor Yellow
}

# Invalidate CloudFront
if (-Not $SkipInvalidation) {
    Write-Host "`nInvalidating CloudFront cache..." -ForegroundColor Cyan
    
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Invalidation started" -ForegroundColor Green
        Write-Host "Cache will clear in 1-2 minutes" -ForegroundColor Yellow
    } else {
        Write-Host "WARNING: Invalidation failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nSkipping CloudFront invalidation" -ForegroundColor Yellow
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`nLive Site:" -ForegroundColor White
Write-Host "  $SITE_URL" -ForegroundColor Cyan

Write-Host "`nTesting:" -ForegroundColor White
Write-Host "  1. Wait 1-2 minutes for cache" -ForegroundColor Gray
Write-Host "  2. Test: Chicago for 1 week with $2000" -ForegroundColor Gray
Write-Host "  3. Visit: $SITE_URL/about" -ForegroundColor Gray

Set-Location ..
Write-Host "`nDone.`n" -ForegroundColor Green