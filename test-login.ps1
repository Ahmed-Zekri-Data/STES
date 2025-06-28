# Test customer login API
$body = @{
    email = 'test@example.com'
    password = 'password123'
} | ConvertTo-Json

Write-Host "Testing customer login..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/customers/login' -Method Post -Body $body -ContentType 'application/json'
    Write-Host "✅ Login successful!"
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "❌ Login failed!"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
