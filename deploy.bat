@echo off
echo ==============================================
echo Pushing Code to GitHub...
echo ==============================================

git add .
git commit -m "Auto-deploy update"
git push origin main

echo.
echo ==============================================
echo Code Pushed Successfully!
echo Triggering Render Deployments...
echo ==============================================

:: =========================================================
:: PASTE YOUR RENDER DEPLOY HOOK URLs BELOW
:: (You can find these in Render -> Your Service -> Settings -> Deploy Hook)
:: =========================================================

set BACKEND_HOOK=https://api.render.com/deploy/srv-d7hm30vavr4c73f5f620?key=D7znz5TZhv4
set FRONTEND_HOOK=https://api.render.com/deploy/srv-d7hm4gegvqtc738p2hq0?key=EuoUdXTGUkg

:: Trigger Backend
if "%BACKEND_HOOK%"=="CHANGE_THIS_TO_YOUR_WEB_SERVICE_HOOK_URL" (
    echo [SKIP] Backend hook not set yet.
) else (
    curl -X POST %BACKEND_HOOK%
    echo.
    echo Backend deployment triggered!
)

:: Trigger Frontend
if "%FRONTEND_HOOK%"=="CHANGE_THIS_TO_YOUR_STATIC_SITE_HOOK_URL" (
    echo [SKIP] Frontend hook not set yet.
) else (
    curl -X POST %FRONTEND_HOOK%
    echo.
    echo Frontend deployment triggered!
)

echo.
echo ==============================================
echo Deployment Process Initiated! Check Render Dashboard.
echo ==============================================
pause
