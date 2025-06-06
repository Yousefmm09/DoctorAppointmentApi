# Test OpenAI API Key
$baseUrl = "http://localhost:5109" # Update this to match your backend URL
$endpoint = "$baseUrl/api/AdvancedChatBot/test-key"

Write-Host "Testing OpenAI API key..."
Write-Host "Endpoint: $endpoint"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method Get
    
    if ($response.isValid) {
        Write-Host "✅ API Key is valid!" -ForegroundColor Green
        Write-Host "Test response: $($response.testResponse)" -ForegroundColor Gray
    } else {
        Write-Host "❌ API Key validation failed!" -ForegroundColor Red
        Write-Host "Error: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error testing API key!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    try {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error Message: $($errorDetails.message)" -ForegroundColor Red
    } catch {
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 