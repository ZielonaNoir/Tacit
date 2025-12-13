# PowerShell pre-commit check script
# Usage: .\pre-commit-check.ps1

Write-Host "🔍 Running TypeScript type check..." -ForegroundColor Cyan

pnpm type-check

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed! Please fix the errors before committing." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Type check passed!" -ForegroundColor Green
exit 0

