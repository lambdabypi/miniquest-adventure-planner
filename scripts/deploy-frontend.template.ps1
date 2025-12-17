# deploy-frontend.ps1 - Frontend deployment
param(
    [string]$FrontendPath = ".",
    [string]$S3Bucket,
    [string]$CloudFrontDistId,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if (-Not $S3Bucket -or -Not $CloudFrontDistId) {
    Write-Host "ERROR: Required parameters missing" -ForegroundColor Red
    Write-Host "Usage: .\deploy-frontend.ps1 -S3Bucket 's3://your-bucket' -CloudFrontDistId 'YOUR_DIST_ID'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Frontend Deployment" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Set-Location $FrontendPath

if (-Not $SkipBuild) {
    Write-Host "Building..." -ForegroundColor Cyan
    npm run build
}

Write-Host "Uploading to S3..." -ForegroundColor Cyan
aws s3 sync dist/ $S3Bucket --delete

Write-Host "Invalidating CloudFront..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $CloudFrontDistId --paths "/*"

Write-Host "`nDeployment complete!`n" -ForegroundColor Green