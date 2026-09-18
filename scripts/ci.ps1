# PowerShell local CI verification script
Write-Host "Running Ruff formatting check..." -ForegroundColor Cyan
ruff format --check backend/
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Ruff lint check..." -ForegroundColor Cyan
ruff check backend/
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Mypy type check..." -ForegroundColor Cyan
mypy backend/app
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Pytest test suite..." -ForegroundColor Cyan
Set-Location backend
pytest tests/ -v
Set-Location ..
