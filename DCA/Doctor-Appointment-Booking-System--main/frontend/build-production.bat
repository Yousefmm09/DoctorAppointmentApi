@echo off
echo 🚀 Building Doctor Appointment Frontend for Production...

:: Install dependencies
echo 📦 Installing dependencies...
call npm ci

:: Run linting
echo 🔍 Running linter...
call npm run lint

:: Build for production
echo 🏗️ Building production bundle...
call npm run build

:: Show success message
echo ✅ Production build complete!
echo 📁 Output files are in dist/ directory 