# Setup OpenAI API key as an environment variable
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

# Set for the current session
$env:OPENAI_API_KEY = $ApiKey
Write-Host "API key set for current session"

# Set for the current user (persistent across sessions)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $ApiKey, "User")
Write-Host "API key set permanently for current user"

# Test the configuration
Write-Host "Testing API key configuration..."
$keyLength = $ApiKey.Length
$maskedKey = $ApiKey.Substring(0, 3) + "..." + $ApiKey.Substring($keyLength - 4, 4)
Write-Host "Using API key: $maskedKey" 