param(
  [string]$BaseUrl = "https://guest-lodge-backend.onrender.com",
  [string]$AdminToken = "",
  [string]$HotelDataPath = "C:\Users\samat\BOOKING\hotel-booking-app\src\hotelData.js",
  [switch]$DryRun,
  [switch]$PrintStarterBlock
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-Required([string]$Prompt, [string]$Default = "") {
  while ($true) {
    $label = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    $value = Read-Host $label
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value.Trim() }
    if ($Default) { return $Default }
    Write-Host "This field is required." -ForegroundColor Yellow
  }
}

function Read-Optional([string]$Prompt, [string]$Default = "") {
  $label = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
  $value = Read-Host $label
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Normalize-Domain([string]$InputDomain) {
  if ([string]::IsNullOrWhiteSpace($InputDomain)) { return "" }
  $d = $InputDomain.Trim().ToLower()
  $d = $d -replace '^https?://', ''
  $slash = $d.IndexOf('/')
  if ($slash -ge 0) { $d = $d.Substring(0, $slash) }
  return $d.Trim()
}

function Escape-JsSingle([string]$Value) {
  if ($null -eq $Value) { return "" }
  return $Value.Replace("\", "\\").Replace("'", "\'")
}

function Parse-DomainList([string]$Raw) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return @() }
  return @(
    $Raw.Split(',') |
      ForEach-Object { Normalize-Domain $_ } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )
}

function Build-HotelDataBlock(
  [string]$HotelId,
  [string]$HotelName,
  [string]$Pms,
  [string]$BookingUrl,
  [string]$Phone,
  [string]$Address
) {
  $id = Escape-JsSingle $HotelId
  $name = Escape-JsSingle $HotelName
  $url = Escape-JsSingle $BookingUrl
  $subtitle = "Book direct in under 60 seconds on your phone."
  $phoneSafe = Escape-JsSingle $Phone
  $addressSafe = Escape-JsSingle $Address
  $pmsSafe = Escape-JsSingle $Pms
  $subtitleSafe = Escape-JsSingle $subtitle

  return @"
  '$id': {
    name: '$name',
    url: '$url',
    subtitle: '$subtitleSafe',
    address: '$addressSafe',
    phone: '$phoneSafe',
    pms: '$pmsSafe',
    propertyCode: 'TBD',
    rates: {
      NIGHTLY: 79,
      WEEKLY: 349,
      MONTHLY: 1199,
    },
    reviews: [],
    rooms: [],
  },
"@
}

function Upsert-HotelDataBare(
  [string]$Path,
  [string]$HotelId,
  [string]$Block,
  [switch]$DryRunMode
) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return @{ updated = $false; reason = "hotelData.js path not provided" }
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    return @{ updated = $false; reason = "hotelData.js not found at $Path" }
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  $entryPattern = "'$([Regex]::Escape($HotelId))'\s*:\s*\{"
  if ([Regex]::IsMatch($raw, $entryPattern)) {
    return @{ updated = $false; reason = "Entry '$HotelId' already exists in hotelData.js" }
  }

  $endPattern = "}\s*;\s*$"
  if (-not [Regex]::IsMatch($raw, $endPattern)) {
    return @{ updated = $false; reason = "Could not find end of exported object (expected trailing `};`)." }
  }

  $updated = [Regex]::Replace($raw, $endPattern, "$Block`n};", 1)
  if ($DryRunMode) {
    return @{ updated = $true; reason = "dry-run"; path = $Path }
  }

  $backupPath = "$Path.bak"
  Copy-Item -LiteralPath $Path -Destination $backupPath -Force
  Set-Content -LiteralPath $Path -Value $updated -Encoding UTF8
  return @{ updated = $true; reason = "ok"; path = $Path; backup = $backupPath }
}

function Invoke-AdminPost([string]$Url, [string]$Token, [hashtable]$Body, [switch]$DryRunMode) {
  if ($DryRunMode) {
    Write-Host ""
    Write-Host "[DRY RUN] POST $Url" -ForegroundColor Cyan
    ($Body | ConvertTo-Json -Depth 8) | Write-Host
    return @{ success = $true; dryRun = $true }
  }

  $headers = @{
    "x-admin-token" = $Token
    "Content-Type" = "application/json"
  }

  $json = $Body | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Method Post -Uri $Url -Headers $headers -Body $json
}

$base = $BaseUrl.TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($AdminToken)) {
  $AdminToken = $env:ADMIN_TOKEN
}
if ([string]::IsNullOrWhiteSpace($AdminToken)) {
  $AdminToken = Read-Required "Admin token (x-admin-token)"
}

Write-Host ""
Write-Host "=== New Hotel Onboarding ===" -ForegroundColor Green

$hotelId = Read-Required "hotelId (example: east-grand-inn)"
$hotelName = Read-Optional "Hotel name" $hotelId

$pms = ""
while ($true) {
  $pms = (Read-Optional "PMS type: manual | cloudbeds | bookingcenter" "manual").ToLower()
  if (@("manual", "cloudbeds", "bookingcenter") -contains $pms) { break }
  Write-Host "PMS must be one of: manual, cloudbeds, bookingcenter." -ForegroundColor Yellow
}

$domainsRaw = Read-Optional "Domains (comma-separated, optional)"
$domains = Parse-DomainList $domainsRaw
$primaryDomain = ""
if ($domains.Count -gt 0) {
  $primaryDomain = Normalize-Domain (Read-Optional "Primary domain" $domains[0])
}

$pin = Read-Required "Front desk PIN"
$pinLabel = Read-Optional "PIN label" "Owner"
$phoneForFrontend = Read-Optional "Hotel phone for frontend (optional)"
$addressForFrontend = Read-Optional "Hotel address for frontend (optional)"

$hotelBody = @{
  hotelId = $hotelId
  name = $hotelName
  pms = $pms
  active = $true
}

if ($domains.Count -gt 0) { $hotelBody.domains = $domains }
if (-not [string]::IsNullOrWhiteSpace($primaryDomain)) { $hotelBody.primaryDomain = $primaryDomain }

if ($pms -eq "cloudbeds") {
  $propertyId = Read-Required "Cloudbeds propertyId"
  $hotelBody.propertyId = $propertyId
}

if ($pms -eq "bookingcenter") {
  $siteId = Read-Required "BookingCenter siteId"
  $sitePassword = Read-Required "BookingCenter sitePassword"
  $chainCode = Read-Optional "BookingCenter chainCode" "BC"
  $hotelBody.siteId = $siteId
  $hotelBody.sitePassword = $sitePassword
  $hotelBody.chainCode = $chainCode
}

$createHotelUrl = "$base/api/admin/hotels"
$createPinUrl = "$base/api/admin/hotels/$hotelId/pins"

Write-Host ""
Write-Host "Creating/updating hotel..." -ForegroundColor Green
$hotelResp = Invoke-AdminPost -Url $createHotelUrl -Token $AdminToken -Body $hotelBody -DryRunMode:$DryRun

Write-Host "Creating/updating PIN..." -ForegroundColor Green
$pinBody = @{
  pin = $pin
  label = $pinLabel
  active = $true
}
$pinResp = Invoke-AdminPost -Url $createPinUrl -Token $AdminToken -Body $pinBody -DryRunMode:$DryRun

$bookingUrl = if (-not [string]::IsNullOrWhiteSpace($primaryDomain)) {
  "https://$primaryDomain"
} else {
  "$base/?hotelId=$hotelId"
}
$frontDeskUrl = "$base/frontdesk?hotelId=$hotelId"

Write-Host ""
Write-Host "Updating hotelData.js bare entry..." -ForegroundColor Green
$bareBlock = Build-HotelDataBlock -HotelId $hotelId -HotelName $hotelName -Pms $pms -BookingUrl $bookingUrl -Phone $phoneForFrontend -Address $addressForFrontend
$hotelDataResult = Upsert-HotelDataBare -Path $HotelDataPath -HotelId $hotelId -Block $bareBlock -DryRunMode:$DryRun

if (-not $hotelDataResult.updated) {
  Write-Host "hotelData.js not updated: $($hotelDataResult.reason)" -ForegroundColor Yellow
} else {
  if ($DryRun) {
    Write-Host "hotelData.js update dry-run OK ($($hotelDataResult.path))" -ForegroundColor Cyan
  } else {
    Write-Host "hotelData.js updated: $($hotelDataResult.path)" -ForegroundColor Green
    if ($hotelDataResult.backup) {
      Write-Host "Backup saved: $($hotelDataResult.backup)" -ForegroundColor DarkGray
    }
  }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Hotel ID: $hotelId"
Write-Host "PMS: $pms"
Write-Host "Booking URL: $bookingUrl"
Write-Host "Front Desk URL: $frontDeskUrl"
Write-Host "PIN: $pin"

if ($PrintStarterBlock) {
  Write-Host ""
  Write-Host "Optional hotelData.js starter block:" -ForegroundColor Cyan
  @"
'$hotelId': {
  pms: '$pms',
  propertyId: null,
  siteId: null,
  sitePassword: null,
  chainCode: 'BC',
  roomIDMapping: {}
},
"@ | Write-Host
}
