@echo off
setlocal enabledelayedexpansion

echo ==================================
echo MedLLama Arabic Setup and Run Tool
echo ==================================
echo.

REM Check if Python is installed
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist "medllama-env" (
    echo Creating virtual environment...
    python -m venv medllama-env
    if %errorlevel% neq 0 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call medllama-env\Scripts\activate.bat

REM Install requirements
echo Installing/upgrading requirements...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install requirements.
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "data" (
    echo Creating data directory...
    mkdir data
)

echo.
echo ===============================
echo MedLLama setup is complete!
echo ===============================
echo.

:menu
echo What would you like to do?
echo 1. Generate synthetic training data
echo 2. Start MedLLama API server
echo 3. Run fine-tuning example
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Generating synthetic Arabic medical data...
    python data_collection.py
    echo.
    goto menu
) else if "%choice%"=="2" (
    echo Starting MedLLama API server...
    echo The server will be available at http://localhost:5001
    echo Press CTRL+C to stop the server
    python api.py
    goto menu
) else if "%choice%"=="3" (
    echo Running fine-tuning example...
    echo This will generate data and train a model, which may take a long time.
    set /p confirm="Do you want to continue? (y/n): "
    if "!confirm!"=="y" (
        python finetune_example.py --num_samples 50 --epochs 1
    )
    goto menu
) else if "%choice%"=="4" (
    echo Exiting...
    goto :eof
) else (
    echo Invalid choice, please try again.
    goto menu
)

endlocal
