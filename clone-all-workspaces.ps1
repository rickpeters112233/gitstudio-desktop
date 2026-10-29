# GitStudio Desktop - Bulk Clone & Workspace Sync Tool
# This script clones all repositories for GestaltCE, Tribernachi-Foundation, and rickpeters112233
# into their designated paths on your Windows PC.

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "          GitStudio Desktop - Bulk Workspace Cloner           " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Destination Paths:"
Write-Host "  - GestaltCE:              C:\git" -ForegroundColor Yellow
Write-Host "  - Tribernachi-Foundation:  C:\git\trib" -ForegroundColor Yellow
Write-Host "  - rickpeters112233:       C:\git\rick" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan

# Read token from environment variable or local .env file
$token = $env:GITHUB_TOKEN
if (-not $token -and (Test-Path ".env")) {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^GITHUB_TOKEN=" }
    if ($envContent) {
        $token = ($envContent -split "=", 2)[1].Trim('"').Trim("'")
    }
}

$headers = @{
    "User-Agent" = "GitStudioCloner"
}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

# Function to fetch and clone repos
function Sync-GroupRepos {
    param(
        [string]$TargetType, # "users" or "orgs"
        [string]$Name,
        [string]$BasePath
    )

    Write-Host "`n>> Scanning $Name ($BasePath)..." -ForegroundColor Cyan
    if (-not (Test-Path $BasePath)) {
        New-Item -ItemType Directory -Path $BasePath -Force | Out-Null
    }

    try {
        $url = "https://api.github.com/$TargetType/$Name/repos?per_page=100&sort=updated"
        $repos = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

        Write-Host "Found $($repos.Count) repositories under $Name." -ForegroundColor Green

        $cloned = 0
        $alreadyThere = 0

        foreach ($r in $repos) {
            $dest = Join-Path $BasePath $r.name
            if (Test-Path $dest) {
                Write-Host "  [EXISTS]  $($r.name) is already at $dest" -ForegroundColor DarkGray
                $alreadyThere++
            } else {
                Write-Host "  [CLONING] $($r.name) into $dest..." -ForegroundColor Yellow
                $cloneUrl = $r.clone_url.Replace("https://", "https://$token@")
                git clone --quiet $cloneUrl $dest
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  [OK]      Successfully cloned $($r.name)" -ForegroundColor Green
                    $cloned++
                } else {
                    Write-Host "  [FAIL]    Failed to clone $($r.name)" -ForegroundColor Red
                }
            }
        }

        Write-Host "`nSummary for $Name: $cloned newly cloned, $alreadyThere already up-to-date." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to query $Name`: $_" -ForegroundColor Red
    }
}

# 1. Tribernachi Foundation -> C:\git\trib
Sync-GroupRepos -TargetType "orgs" -Name "Tribernachi-Foundation" -BasePath "C:\git\trib"

# 2. Rick Peters Personal -> C:\git\rick
Sync-GroupRepos -TargetType "users" -Name "rickpeters112233" -BasePath "C:\git\rick"

# 3. GestaltCE -> C:\git
$choice = Read-Host "`nDo you also want to clone all 77 GestaltCE repos into C:\git? (Y/N)"
if ($choice -eq 'Y' -or $choice -eq 'y') {
    Sync-GroupRepos -TargetType "orgs" -Name "GestaltCE" -BasePath "C:\git"
}

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host "All workspace synchronization complete!" -ForegroundColor Green
Write-Host "Launch GitStudio anytime with: .\start-gitstudio.bat" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
pause
