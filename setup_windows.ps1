$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 --version
    if ($LASTEXITCODE -ne 0) {
        throw "Python 3 is required. Install it from https://www.python.org/downloads/windows/ and run this installer again."
    }
    & py -3 -m venv .venv
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python --version
    if ($LASTEXITCODE -ne 0) {
        throw "Python 3 is required. Install it from https://www.python.org/downloads/windows/ and run this installer again."
    }
    & python -m venv .venv
} else {
    throw "Python 3 is required. Install it from https://www.python.org/downloads/windows/ and run this installer again."
}

if ($LASTEXITCODE -ne 0) {
    throw "Could not create the Python virtual environment."
}

& "$projectRoot\.venv\Scripts\python.exe" -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    throw "Could not update pip. Check your internet connection and try again."
}

& "$projectRoot\.venv\Scripts\python.exe" -m pip install -r requirements-windows.txt
if ($LASTEXITCODE -ne 0) {
    throw "Could not install the app dependencies. Check your internet connection and try again."
}

Write-Host "Setup complete. Double-click run_windows.bat to start the app."