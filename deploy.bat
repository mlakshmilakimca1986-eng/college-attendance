@echo off
echo ==============================================
echo Pushing Code to GitHub (Backend Auto-Deploy)...
echo ==============================================

git add .
git commit -m "Auto-deploy update"
git push origin main

echo.
echo ==============================================
echo Backend Pushed! Triggering Render Webhook...
echo ==============================================

set BACKEND_HOOK=https://api.render.com/deploy/srv-d7hm30vavr4c73f5f620?key=D7znz5TZhv4

curl -X POST %BACKEND_HOOK%
echo.
echo Backend deployment triggered!

echo.
echo ==============================================
echo Building and Deploying Frontend to Firebase...
echo ==============================================

cd client
call npm run build
call firebase deploy --only hosting
cd ..

echo.
echo ==============================================
echo Deployment Complete! 
echo Your App is Live across Render and Firebase!
echo ==============================================
pause
