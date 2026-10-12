$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not $env:BOOKING_USERNAME -or -not $env:BOOKING_PASSWORD) {
    throw "Set BOOKING_USERNAME and BOOKING_PASSWORD before starting the public server."
}

& "$projectRoot\.venv\Scripts\waitress-serve.exe" --listen=127.0.0.1:5000 app:app
