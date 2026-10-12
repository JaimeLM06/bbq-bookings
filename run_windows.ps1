$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$waitressPath = Join-Path $projectRoot ".venv\Scripts\waitress-serve.exe"

if (-not (Test-Path $waitressPath)) {
    throw "Dependencies are not installed. Run setup_windows.bat first."
}

Set-Location $projectRoot
Start-Process "http://127.0.0.1:5000"
& $waitressPath --listen=127.0.0.1:5000 app:app