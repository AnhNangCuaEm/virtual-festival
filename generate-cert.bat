@echo off
echo Generating SSL Certificate...

REM Check if certificates already exist
if exist "localhost-key.pem" if exist "localhost-cert.pem" (
    echo Certificates already exist!
    set /p "overwrite=Overwrite? (Y/N): "
    if /i not "%overwrite%"=="Y" exit /b 0
)

REM Find OpenSSL in Git for Windows
set "OPENSSL_CMD="
if exist "C:\Program Files\Git\usr\bin\openssl.exe" set "OPENSSL_CMD=C:\Program Files\Git\usr\bin\openssl.exe"
if exist "C:\Program Files (x86)\Git\usr\bin\openssl.exe" set "OPENSSL_CMD=C:\Program Files (x86)\Git\usr\bin\openssl.exe"

if "%OPENSSL_CMD%"=="" (
    echo ERROR: Git for Windows not found!
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Generate certificate
"%OPENSSL_CMD%" req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -keyout localhost-key.pem -out localhost-cert.pem -days 365

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate certificate!
    pause
    exit /b 1
)

echo.
echo SUCCESS! Created localhost-key.pem and localhost-cert.pem
pause