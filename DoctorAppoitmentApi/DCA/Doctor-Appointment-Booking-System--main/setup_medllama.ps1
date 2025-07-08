# PowerShell Script for setting up MedLLama Arabic integration
# This script helps set up and test the MedLLama integration for the Doctor Appointment System

# Stop on error
$ErrorActionPreference = "Stop"

# Output header
Write-Host @"
===============================================
MedLLama Arabic Integration Setup
===============================================
This script will help you set up and test the MedLLama Arabic integration
for the Doctor Appointment System.
"@

# Check Python installation
try {
    $pythonVersion = (python --version) 2>&1
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "DCA/Doctor-Appointment-Booking-System--main/Chatbot")) {
    Write-Host "Please run this script from the root directory of the DoctorAppoitmentApi project." -ForegroundColor Red
    exit 1
}

# Set up paths
$chatbotDir = "DCA/Doctor-Appointment-Booking-System--main/Chatbot"
$medllamaDir = "$chatbotDir/medllama"

# Check if MedLLama directory exists
if (-not (Test-Path $medllamaDir)) {
    Write-Host "MedLLama directory not found. Creating directory structure..." -ForegroundColor Yellow
    New-Item -Path $medllamaDir -ItemType Directory -Force | Out-Null
    
    # Copy MedLLama files if they exist in another location
    if (Test-Path "medllama") {
        Write-Host "Found MedLLama files in root directory. Copying..." -ForegroundColor Yellow
        Copy-Item "medllama/*" -Destination $medllamaDir -Recurse -Force
    } else {
        Write-Host "MedLLama files not found. Please make sure you've downloaded the MedLLama files." -ForegroundColor Red
        Write-Host "You can continue with setup, but you'll need to add the MedLLama files later." -ForegroundColor Yellow
    }
}

# Create and activate virtual environment
Write-Host "Setting up Python virtual environment..." -ForegroundColor Cyan
$venvPath = "$chatbotDir/venv"

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
$activateScript = "$venvPath/Scripts/Activate.ps1"
try {
    & $activateScript
} catch {
    Write-Host "Failed to activate virtual environment." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Install requirements if available
$requirementsPath = "$medllamaDir/requirements.txt"
if (Test-Path $requirementsPath) {
    Write-Host "Installing MedLLama requirements..." -ForegroundColor Cyan
    pip install -r $requirementsPath
} else {
    Write-Host "MedLLama requirements file not found. Skipping installation." -ForegroundColor Yellow
}

# Check Hugging Face token
$hfToken = $env:HUGGING_FACE_TOKEN
if (-not $hfToken) {
    Write-Host @"
IMPORTANT: Hugging Face token not found in environment variables.
Some models may require a Hugging Face token for access.

You can set the token by running:
`$env:HUGGING_FACE_TOKEN = 'your_token_here'`

You can get a token at: https://huggingface.co/settings/tokens
"@ -ForegroundColor Yellow
    
    $setToken = Read-Host "Would you like to set a Hugging Face token now? (y/n)"
    if ($setToken -eq "y") {
        $token = Read-Host "Enter your Hugging Face token"
        $env:HUGGING_FACE_TOKEN = $token
        Write-Host "Token set for this session." -ForegroundColor Green
        
        $saveToken = Read-Host "Save this token for future sessions? (y/n)"
        if ($saveToken -eq "y") {
            [Environment]::SetEnvironmentVariable("HUGGING_FACE_TOKEN", $token, "User")
            Write-Host "Token saved to user environment variables." -ForegroundColor Green
        }
    }
}

# Generate test data
if (Test-Path "$medllamaDir/data_collection.py") {
    Write-Host "Generating test data for MedLLama..." -ForegroundColor Cyan
    $generateData = Read-Host "Generate sample data for testing? (y/n)"
    if ($generateData -eq "y") {
        python "$medllamaDir/data_collection.py"
    }
}

# Set up API
Write-Host @"

===============================================
MedLLama Setup Complete!
===============================================

To start the MedLLama API server:
1. Navigate to the Chatbot directory:
   cd $chatbotDir
2. Activate the virtual environment:
   .\venv\Scripts\Activate.ps1
3. Run the API server:
   python medllama/api.py

To use MedLLama with the existing chatbot:
1. Start the existing chatbot:
   python app.py
2. In another terminal, start the MedLLama API server as described above

For more information, check the README.md file in the MedLLama directory.

"@ -ForegroundColor Cyan

# Ask to start the API
$startApi = Read-Host "Would you like to start the MedLLama API server now? (y/n)"
if ($startApi -eq "y") {
    Write-Host "Starting MedLLama API server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    try {
        python "$medllamaDir/api.py"
    } catch {
        Write-Host "Error starting MedLLama API server:" -ForegroundColor Red
        Write-Host $_ -ForegroundColor Red
    }
} 