param(
  [string]$BaseUrl = "https://guest-lodge-backend.onrender.com",
  [string]$AdminToken = "",
  [string]$HotelDataPath = "C:\Users\samat\BOOKING\hotel-booking-app\src\hotelData.js",
  [string]$GetHotelIdPath = "C:\Users\samat\BOOKING\hotel-booking-app\src\utils\getHotelId.js",
  [string]$HotelId = "",
  [string]$HotelName = "",
  [string]$Pms = "",
  [string[]]$Domains = @(),
  [string]$PrimaryDomain = "",
  [string]$Pin = "",
  [string]$PinLabel = "Owner",
  [string]$PhoneForFrontend = "",
  [string]$AddressForFrontend = "",
  [string]$BookingBaseUrl = "",
  [string]$ManualRooms = "",
  [switch]$NonInteractive,
  [switch]$DryRun,
  [switch]$PrintStarterBlock
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-Required([string]$Prompt, [string]$Default = "") {
  if ($NonInteractive -and -not $Default) {
    throw "Missing required value for: $Prompt"
  }
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
  $pieces = [Regex]::Split($Raw.Trim(), '[,\s]+') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  return @(
    $pieces |
      ForEach-Object { Normalize-Domain $_ } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )
}

function Parse-ManualRoomSeeds([string]$Raw) {
  $items = New-Object System.Collections.Generic.List[hashtable]
  if ([string]::IsNullOrWhiteSpace($Raw)) { return @() }

  foreach ($piece in $Raw.Split(',')) {
    $entry = [string]$piece
    $entry = $entry.Trim()
    if ([string]::IsNullOrWhiteSpace($entry)) { continue }

    $name = $entry
    $units = 1
    $parts = $entry.Split(':', 2)
    if ($parts.Count -gt 0) {
      $name = ([string]$parts[0]).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($name)) {
      throw "Invalid manual room seed '$entry'. Use Name:Units."
    }
    if ($parts.Count -gt 1 -and -not [string]::IsNullOrWhiteSpace($parts[1])) {
      $parsedUnits = 0
      if (-not [int]::TryParse(([string]$parts[1]).Trim(), [ref]$parsedUnits)) {
        throw "Invalid unit count in manual room seed '$entry'. Use Name:Units."
      }
      $units = [Math]::Max(0, $parsedUnits)
    }

    $existing = $items | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if ($existing) {
      $existing['totalUnits'] = $units
    } else {
      $items.Add(@{
        name = $name
        totalUnits = $units
      })
    }
  }

  return @($items)
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

function Insert-IntoObjectLiteral(
  [string]$Source,
  [string]$ObjectName,
  [string]$Snippet
) {
  $startToken = "const $ObjectName = {"
  $start = $Source.IndexOf($startToken)
  if ($start -lt 0) {
    throw "Could not find $ObjectName object literal in target file."
  }

  $bodyStart = $Source.IndexOf('{', $start)
  $depth = 0
  $end = -1
  for ($i = $bodyStart; $i -lt $Source.Length; $i++) {
    $ch = $Source[$i]
    if ($ch -eq '{') { $depth += 1 }
    elseif ($ch -eq '}') {
      $depth -= 1
      if ($depth -eq 0) {
        $end = $i
        break
      }
    }
  }

  if ($end -lt 0) {
    throw "Could not find end of $ObjectName object literal in target file."
  }

  $prefix = $Source.Substring(0, $end).TrimEnd()
  $suffix = $Source.Substring($end)
  return "$prefix$Snippet`n$suffix"
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

function Upsert-GetHotelIdBare(
  [string]$Path,
  [string]$HotelId,
  [string[]]$Domains,
  [switch]$DryRunMode
) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return @{ updated = $false; reason = "getHotelId.js path not provided" }
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    return @{ updated = $false; reason = "getHotelId.js not found at $Path" }
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  $updated = $raw
  $domainSnippets = New-Object System.Collections.Generic.List[string]
  $addedDomains = New-Object System.Collections.Generic.List[string]
  $normalizedDomains = @($Domains | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)

  foreach ($domain in $normalizedDomains) {
    $pattern = "'$([Regex]::Escape($domain))'\s*:\s*'([^']+)'"
    $match = [Regex]::Match($updated, $pattern)
    if ($match.Success) {
      if ($match.Groups[1].Value -ne $HotelId) {
        return @{ updated = $false; reason = "Domain '$domain' already maps to '$($match.Groups[1].Value)' in getHotelId.js" }
      }
      continue
    }

    $domainSnippets.Add("`n  '$domain': '$HotelId',")
    $addedDomains.Add($domain)
  }

  if ($domainSnippets.Count -gt 0) {
    $updated = Insert-IntoObjectLiteral -Source $updated -ObjectName 'domainMap' -Snippet ($domainSnippets -join '')
  }

  $pathRoute = "/$HotelId"
  $pathPattern = "'$([Regex]::Escape($pathRoute))'\s*:\s*'([^']+)'"
  $pathMatch = [Regex]::Match($updated, $pathPattern)
  $addedPath = $false
  if ($pathMatch.Success) {
    if ($pathMatch.Groups[1].Value -ne $HotelId) {
      return @{ updated = $false; reason = "Path '$pathRoute' already maps to '$($pathMatch.Groups[1].Value)' in getHotelId.js" }
    }
  } else {
    $updated = Insert-IntoObjectLiteral -Source $updated -ObjectName 'pathMap' -Snippet "`n  '$pathRoute': '$HotelId',"
    $addedPath = $true
  }

  if ($DryRunMode) {
    if ($addedDomains.Count -eq 0 -and -not $addedPath) {
      return @{ updated = $false; reason = "No new getHotelId.js mappings were needed" }
    }
    return @{
      updated = $true
      reason = "dry-run"
      path = $Path
      domains = @($addedDomains)
      pathRoute = if ($addedPath) { $pathRoute } else { "" }
    }
  }

  if ($updated -eq $raw) {
    return @{ updated = $false; reason = "No new getHotelId.js mappings were needed" }
  }

  $backupPath = "$Path.bak"
  Copy-Item -LiteralPath $Path -Destination $backupPath -Force
  Set-Content -LiteralPath $Path -Value $updated -Encoding UTF8
  return @{
    updated = $true
    reason = "ok"
    path = $Path
    backup = $backupPath
    domains = @($addedDomains)
    pathRoute = if ($addedPath) { $pathRoute } else { "" }
  }
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

function Test-AdminToken([string]$Base, [string]$Token, [switch]$DryRunMode) {
  if ($DryRunMode) {
    Write-Host "[DRY RUN] Skipping admin token validation call." -ForegroundColor Cyan
    return
  }

  $url = "$($Base.TrimEnd('/'))/api/admin/hotels"
  $headers = @{ "x-admin-token" = $Token }
  try {
    $null = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
  } catch {
    $resp = $_.Exception.Response
    if ($resp -and $resp.StatusCode) {
      throw "Admin token validation failed ($([int]$resp.StatusCode)) against $url"
    }
    throw "Admin token validation failed against ${url}: $($_.Exception.Message)"
  }
}

$base = $BaseUrl.TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($AdminToken)) {
  $AdminToken = $env:ADMIN_TOKEN
}
if ([string]::IsNullOrWhiteSpace($AdminToken)) {
  $AdminToken = Read-Required "Admin token (x-admin-token)"
}

Write-Host "Validating admin token..." -ForegroundColor Green
Test-AdminToken -Base $base -Token $AdminToken -DryRunMode:$DryRun
Write-Host "Admin token is valid." -ForegroundColor Green

Write-Host ""
Write-Host "=== New Hotel Onboarding ===" -ForegroundColor Green

$hotelId = if (-not [string]::IsNullOrWhiteSpace($HotelId)) { $HotelId.Trim() } else { Read-Required "hotelId (example: east-grand-inn)" }
$hotelName = if (-not [string]::IsNullOrWhiteSpace($HotelName)) { $HotelName.Trim() } else { Read-Optional "Hotel name" $hotelId }

$pms = if (-not [string]::IsNullOrWhiteSpace($Pms)) { $Pms.Trim().ToLower() } else { "" }
while ($true) {
  if ([string]::IsNullOrWhiteSpace($pms)) {
    $pms = (Read-Optional "PMS type: manual | cloudbeds | bookingcenter" "manual").ToLower()
  }
  if (@("manual", "cloudbeds", "bookingcenter") -contains $pms) { break }
  Write-Host "PMS must be one of: manual, cloudbeds, bookingcenter." -ForegroundColor Yellow
  if ($NonInteractive) { throw "Invalid PMS type provided: $pms" }
  $pms = ""
}

$providedDomains = @($Domains | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$domains = if ($providedDomains.Count -gt 0) {
  @(
    $providedDomains |
      ForEach-Object { Parse-DomainList ([string]$_) } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )
} else {
  $domainsRaw = Read-Optional "Domains (comma-separated, optional)"
  @(Parse-DomainList $domainsRaw)
}
$domainCount = @($domains).Length
$primaryDomain = if (-not [string]::IsNullOrWhiteSpace($PrimaryDomain)) { Normalize-Domain $PrimaryDomain } else { "" }
if ($domainCount -gt 0) {
  if ([string]::IsNullOrWhiteSpace($primaryDomain)) {
    $primaryDomain = Normalize-Domain (Read-Optional "Primary domain" $domains[0])
  }
}

$pin = if (-not [string]::IsNullOrWhiteSpace($Pin)) { $Pin.Trim() } else { Read-Required "Front desk PIN" }
$pinLabel = if (-not [string]::IsNullOrWhiteSpace($PinLabel)) { $PinLabel.Trim() } else { Read-Optional "PIN label" "Owner" }
$phoneForFrontend = if (-not [string]::IsNullOrWhiteSpace($PhoneForFrontend)) { $PhoneForFrontend.Trim() } else { Read-Optional "Hotel phone for frontend (optional)" }
$addressForFrontend = if (-not [string]::IsNullOrWhiteSpace($AddressForFrontend)) { $AddressForFrontend.Trim() } else { Read-Optional "Hotel address for frontend (optional)" }
$bookingBaseUrl = if (-not [string]::IsNullOrWhiteSpace($BookingBaseUrl)) { $BookingBaseUrl.Trim().TrimEnd('/') } else { "" }
$manualRoomsRaw = if (-not [string]::IsNullOrWhiteSpace($ManualRooms)) { $ManualRooms.Trim() } elseif ($pms -eq "manual") { Read-Optional "Manual room seeds (Name:Units, comma-separated, optional)" } else { "" }
$manualRoomSeeds = @(Parse-ManualRoomSeeds $manualRoomsRaw)

$hotelBody = @{
  hotelId = $hotelId
  name = $hotelName
  pms = $pms
  active = $true
}

if ($domainCount -gt 0) { $hotelBody.domains = @($domains) }
if (-not [string]::IsNullOrWhiteSpace($primaryDomain)) { $hotelBody.primaryDomain = $primaryDomain }
if ($pms -eq "manual" -and $manualRoomSeeds.Count -gt 0) { $hotelBody.seedManualRooms = @($manualRoomSeeds) }

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
} elseif (-not [string]::IsNullOrWhiteSpace($bookingBaseUrl)) {
  "$bookingBaseUrl/?hotelId=$hotelId"
} else {
  "$base/?hotelId=$hotelId"
}
$frontDeskUrl = if (-not [string]::IsNullOrWhiteSpace($primaryDomain)) {
  "https://$primaryDomain/frontdesk"
} else {
  "$base/frontdesk?hotelId=$hotelId"
}
$frontDeskFallbackUrl = "$base/frontdesk?hotelId=$hotelId"

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
Write-Host "Updating getHotelId.js route map..." -ForegroundColor Green
$routeDomains = @($domains)
if (-not [string]::IsNullOrWhiteSpace($primaryDomain) -and $routeDomains -notcontains $primaryDomain) {
  $routeDomains += $primaryDomain
}
$getHotelIdResult = Upsert-GetHotelIdBare -Path $GetHotelIdPath -HotelId $hotelId -Domains $routeDomains -DryRunMode:$DryRun

if (-not $getHotelIdResult.updated) {
  Write-Host "getHotelId.js not updated: $($getHotelIdResult.reason)" -ForegroundColor Yellow
} else {
  if ($DryRun) {
    Write-Host "getHotelId.js update dry-run OK ($($getHotelIdResult.path))" -ForegroundColor Cyan
  } else {
    Write-Host "getHotelId.js updated: $($getHotelIdResult.path)" -ForegroundColor Green
    if ($getHotelIdResult.backup) {
      Write-Host "Backup saved: $($getHotelIdResult.backup)" -ForegroundColor DarkGray
    }
  }
  if ($getHotelIdResult.domains -and @($getHotelIdResult.domains).Count -gt 0) {
    Write-Host "Added domains: $(@($getHotelIdResult.domains) -join ', ')" -ForegroundColor DarkGray
  }
  if (-not [string]::IsNullOrWhiteSpace($getHotelIdResult.pathRoute)) {
    Write-Host "Added path route: $($getHotelIdResult.pathRoute)" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Hotel ID: $hotelId"
Write-Host "PMS: $pms"
Write-Host "Booking URL: $bookingUrl"
Write-Host "Front Desk URL: $frontDeskUrl"
Write-Host "Front Desk Fallback URL: $frontDeskFallbackUrl"
Write-Host "PIN: $pin"
if ($manualRoomSeeds.Count -gt 0) {
  $roomSummary = @($manualRoomSeeds | ForEach-Object { "$($_.name):$($_.totalUnits)" }) -join ', '
  Write-Host "Seeded Manual Rooms: $roomSummary"
}
if ([string]::IsNullOrWhiteSpace($primaryDomain)) {
  Write-Host "Note: No primary domain was provided, so fallback URLs still use ?hotelId=$hotelId." -ForegroundColor Yellow
}

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
