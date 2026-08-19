# AWS S3 Bulk Upload Script for Drawbook Media
# Target Bucket: drawbook-016355331017-us-east-1-an
# Usage: .\upload_to_s3.ps1 [-BucketName "drawbook-016355331017-us-east-1-an"] [-Region "us-east-1"]

param (
    [string]$BucketName = "drawbook-016355331017-us-east-1-an",
    [string]$Region = "us-east-1"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Drawbook Media AWS S3 Upload Utility" -ForegroundColor Cyan
Write-Host " Target Bucket: s3://$BucketName" -ForegroundColor Yellow
Write-Host " Region:        $Region" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# Check if AWS CLI is installed
if (-not (Get-Command "aws" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] AWS CLI is not installed or not available in PATH." -ForegroundColor Red
    Write-Host "Please install AWS CLI from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStarting S3 sync for book photo collections (book1 through book64)..." -ForegroundColor Green

aws s3 sync . "s3://$BucketName" `
    --region $Region `
    --exclude "*" `
    --include "book*/*.JPG" `
    --include "book*/*.jpg" `
    --include "book*/*.png" `
    --include "book*/*.PNG" `
    --cache-control "max-age=31536000, public"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] All media files uploaded successfully to s3://$BucketName!" -ForegroundColor Green
    Write-Host "Your S3 Base URL is:" -ForegroundColor Yellow
    Write-Host "https://$BucketName.s3.$Region.amazonaws.com" -ForegroundColor Cyan
} else {
    Write-Host "`n[ERROR] AWS S3 sync failed. Please check your credentials and bucket permissions." -ForegroundColor Red
}
