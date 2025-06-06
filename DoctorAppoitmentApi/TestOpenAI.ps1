# Test connection to OpenAI API

# Check if API key is set
$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) {
    Write-Host "Error: API key not found in environment variables" -ForegroundColor Red
    Write-Host "Please run setup-api-key.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Create a masked version for display
$keyLength = $apiKey.Length
$maskedKey = $apiKey.Substring(0, 3) + "..." + $apiKey.Substring($keyLength - 4, 4)
Write-Host "Using API key: $maskedKey"

# Test API connection
try {
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Testing connection to OpenAI API (models endpoint)..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/models" -Headers $headers -Method Get
    
    Write-Host "Connection successful!" -ForegroundColor Green
    Write-Host "Available models: $($response.data.Count)"
    
    # Get list of available models
    $modelList = $response.data | Select-Object -Property id | Sort-Object -Property id
    Write-Host "First 5 models:" -ForegroundColor Cyan
    $modelList | Select-Object -First 5 | ForEach-Object { Write-Host " - $($_.id)" }
    
    # Test simple completion
    Write-Host "`nTesting a simple completion..." -ForegroundColor Cyan
    
    $body = @{
        "model" = "gpt-3.5-turbo-0125"
        "messages" = @(
            @{
                "role" = "system"
                "content" = "You are a helpful assistant."
            },
            @{
                "role" = "user"
                "content" = "Hello!"
            }
        )
        "max_tokens" = 50
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Headers $headers -Body $body -Method Post
    Write-Host "Response: $($chatResponse.choices[0].message.content)" -ForegroundColor Green
    
    Write-Host "`nTest completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Error testing API connection:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    # More details about the error
    if ($_.ErrorDetails.Message) {
        $errorInfo = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error type: $($errorInfo.error.type)" -ForegroundColor Red
        Write-Host "Error message: $($errorInfo.error.message)" -ForegroundColor Red
    }
    
    exit 1
} 