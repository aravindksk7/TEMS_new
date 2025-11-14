# E2E smoke test script for Test Environment Management
# Usage: Open PowerShell in repo root and run: .\scripts\e2e-smoke.ps1

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'

Write-Output "Logging in as admin..."
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -Body (@{email='admin@testenv.com'; password='Admin@123'} | ConvertTo-Json) -ContentType 'application/json'
$token = $login.token
Write-Output "Token: $($token.Substring(0,20))..."

# Booking: create
Write-Output "\n--- Booking: create/list/delete ---"
$start=(Get-Date).AddHours(3).ToString('o')
$end=(Get-Date).AddHours(4).ToString('o')
$bk=@{environment_id=1; start_time=$start; end_time=$end; title='E2E Booking Test - temp'}
$createdBk = Invoke-RestMethod -Method Post -Uri "$base/api/bookings" -Body ($bk|ConvertTo-Json -Depth 5) -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"}
Write-Output "Create response: $(($createdBk | ConvertTo-Json -Depth 3))"

# Extract booking id if present
$bookingId = $null
if ($createdBk -and $createdBk.booking -and $createdBk.booking.id) { $bookingId = $createdBk.booking.id }
elseif ($createdBk -and $createdBk.bookingId) { $bookingId = $createdBk.bookingId }
elseif ($createdBk -and $createdBk.booking_id) { $bookingId = $createdBk.booking_id }
elseif ($createdBk -and $createdBk.id) { $bookingId = $createdBk.id }
Write-Output "Booking id: $bookingId"

# List bookings
$bookings = Invoke-RestMethod -Method Get -Uri "$base/api/bookings" -Headers @{Authorization = "Bearer $token"}
Write-Output "Bookings count: $($bookings.bookings.Count)"

# Try to delete booking if route exists
if ($bookingId) {
    try {
        Invoke-RestMethod -Method Delete -Uri "$base/api/bookings/$bookingId" -Headers @{Authorization = "Bearer $token"}
        Write-Output "Booking $bookingId deleted"
    } catch {
        Write-Output "Could not delete booking $bookingId (route may not exist): $($_.Exception.Message)"
    }
}

# User admin: register -> delete
Write-Output "\n--- User admin: register/delete ---"
$u = @{username='e2e_smoke_user'; email='e2e-smoke-user@testenv.com'; password='Test@1234'; role='developer'; full_name='E2E Smoke'}
$newu = Invoke-RestMethod -Method Post -Uri "$base/api/auth/register" -Body ($u|ConvertTo-Json -Depth 5) -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"}
Write-Output "Register response: $(($newu | ConvertTo-Json -Depth 3))"
# extract id
$userId = $null
if ($newu -and $newu.user -and $newu.user.id) { $userId = $newu.user.id }
elseif ($newu -and $newu.userId) { $userId = $newu.userId }
elseif ($newu -and $newu.user_id) { $userId = $newu.user_id }
elseif ($newu -and $newu.userId) { $userId = $newu.userId }
elseif ($newu -and $newu.id) { $userId = $newu.id }
Write-Output "Created user id: $userId"

if ($userId) {
    Invoke-RestMethod -Method Delete -Uri "$base/api/auth/users/$userId" -Headers @{Authorization = "Bearer $token"}
    Write-Output "Deleted user $userId"
} else {
    Write-Output "No user id returned; inspect register response." 
}

# Final user list
$users = Invoke-RestMethod -Method Get -Uri "$base/api/auth/users" -Headers @{Authorization = "Bearer $token"}
Write-Output "Users count after cleanup: $($users.users.Count)"

Write-Output "E2E smoke script complete." 