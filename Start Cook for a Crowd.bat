@echo off
REM Double-click this file to start Cook for a Crowd via Docker and open
REM it in your browser. Needs Docker Desktop installed and running:
REM https://www.docker.com/products/docker-desktop/
REM
REM Unlike a plain "run the app" script, this keeps running in the
REM background (as a Docker container) even after this window closes --
REM run "Stop Cook for a Crowd.bat" (or `docker compose down`) to stop it.
setlocal
cd /d "%~dp0"

echo Cook for a Crowd
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop isn't installed. Get it from:
  echo https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop doesn't seem to be running yet.
  echo Start it, wait for it to finish starting, then run this again.
  pause
  exit /b 1
)

REM First run: create a local settings file so there's somewhere to add
REM an API key later. The app works fine without one -- only "Generate
REM with AI" needs it -- so this is never required to get started.
if not exist .env.local (
  if exist .env.example copy .env.example .env.local >nul
)

curl -s -o nul http://localhost:3000
if %errorlevel%==0 (
  echo Already running -- opening in your browser.
  start http://localhost:3000
  goto :end
)

echo Starting up -- this can take a minute the first time...
REM --wait blocks until the container reports healthy (see the
REM healthcheck in docker-compose.yml) instead of needing our own
REM readiness-polling loop here.
docker compose up -d --build --wait
if errorlevel 1 (
  echo.
  echo Something went wrong starting the app -- see the error above.
  pause
  exit /b 1
)

start http://localhost:3000

echo.
echo Cook for a Crowd is running at http://localhost:3000
echo It keeps running in the background even after you close this
echo window. To stop it, run "Stop Cook for a Crowd.bat".
echo.

:end
pause
