# Test customer registration API
$body = @{
    email = 'test@example.com'
    password = 'password123'
    firstName = 'Test'
    lastName = 'User'
} | ConvertTo-Json

Write-Host "Testing customer registration..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/customers/register' -Method Post -Body $body -ContentType 'application/json'
    Write-Host "✅ Registration successful!"
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "❌ Registration failed!"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
