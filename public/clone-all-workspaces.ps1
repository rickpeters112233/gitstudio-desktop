# ==============================================================
# GitStudio Desktop - Bulk Clone & Workspace Sync Tool
# Clones and synchronizes all 118 repositories across:
#   - GestaltCE:              C:\git
#   - Tribernachi-Foundation:  C:\git\trib
#   - rickpeters112233:       C:\git\rick
# ==============================================================

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "          GitStudio Desktop - Bulk Workspace Cloner           " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Destination Paths:"
Write-Host "  - GestaltCE:              C:\git" -ForegroundColor Yellow
Write-Host "  - Tribernachi-Foundation:  C:\git\trib" -ForegroundColor Yellow
Write-Host "  - rickpeters112233:       C:\git\rick" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan

# 1. Resolve GitHub Personal Access Token
$token = $env:GITHUB_TOKEN
if (-not $token -and (Test-Path ".env")) {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^GITHUB_TOKEN=" }
    if ($envContent) {
        $token = ($envContent -split "=", 2)[1].Trim('"').Trim("'")
    }
}
if ($token -and $token.Contains("ujYlOmZKzBTQ49Z2SmfxEHWV4zrhTZ0uE2fZ")) {
    $token = ""
}

# Prompt user for token if not currently configured
if (-not $token) {
    Write-Host "`n[AUTH NOTICE] No GitHub token found in .env or environment." -ForegroundColor Yellow
    Write-Host "To clone/pull private repositories (Tribernachi-Foundation, GestaltCE, primeID), a PAT is required." -ForegroundColor Yellow
    $enteredToken = Read-Host "Paste your GitHub Personal Access Token (or press Enter to use local catalog)"
    if ($enteredToken) {
        $token = $enteredToken.Trim()
        "GITHUB_TOKEN=`"$token`"" | Out-File -FilePath ".env" -Encoding utf8
        Write-Host "Token saved to .env for future executions." -ForegroundColor Green
    }
}

$headers = @{
    "User-Agent" = "GitStudioCloner"
}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

# Load fallback catalog from masterCatalog.json if present
$catalogFile = "masterCatalog.json"
$localCatalog = @()
if (Test-Path $catalogFile) {
    try {
        $localCatalog = Get-Content $catalogFile -Raw | ConvertFrom-Json
        Write-Host "Loaded local repository catalog with $($localCatalog.Count) pre-indexed repositories." -ForegroundColor DarkGray
    } catch {
        Write-Host "Notice: masterCatalog.json could not be parsed." -ForegroundColor DarkGray
    }
}

function Sync-GroupRepos {
    param(
        [string]$TargetType, # "users" or "orgs"
        [string]$Name,
        [string]$BasePath,
        [string]$CatalogGroup
    )

    Write-Host "`n>> Scanning $Name ($BasePath)..." -ForegroundColor Cyan
    if (-not (Test-Path $BasePath)) {
        New-Item -ItemType Directory -Path $BasePath -Force | Out-Null
    }

    $repos = @()

    # Attempt Live GitHub API query first
    try {
        $page = 1
        do {
            $url = if ($TargetType -eq "users" -and $token) {
                "https://api.github.com/user/repos?visibility=all&affiliation=owner&per_page=100&page=$page&sort=updated"
            } elseif ($TargetType -eq "orgs") {
                "https://api.github.com/orgs/$Name/repos?per_page=100&page=$page&sort=updated&type=all"
            } else {
                "https://api.github.com/$TargetType/$Name/repos?per_page=100&page=$page&sort=updated"
            }

            $batch = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
            if ($batch.Count -gt 0) {
                $repos += $batch
                $page++
            }
        } while ($batch.Count -eq 100)
    } catch {
        Write-Host "  [API NOTICE] Live GitHub query notice: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # If live API returned 0 or failed, fallback to local masterCatalog.json
    if ($repos.Count -eq 0 -and $localCatalog.Count -gt 0) {
        Write-Host "  Using pre-indexed catalog items for $Name..." -ForegroundColor Yellow
        $catalogMatches = $localCatalog | Where-Object { $_.group -eq $CatalogGroup -or $_.owner -eq $Name }
        foreach ($cm in $catalogMatches) {
            $repos += [PSCustomObject]@{
                name = $cm.name
                clone_url = "https://github.com/$($cm.fullName).git"
            }
        }
    }

    Write-Host "Processing $($repos.Count) repositories under $Name." -ForegroundColor Green

    $cloned = 0
    $alreadyThere = 0
    $failed = 0

    foreach ($r in $repos) {
        $dest = Join-Path $BasePath $r.name
        $cloneUrl = $r.clone_url
        if ($token) {
            $cloneUrl = $cloneUrl.Replace("https://", "https://${token}@")
        }

        if (Test-Path $dest) {
            Write-Host "  [PULLING] $($r.name)..." -NoNewline -ForegroundColor Cyan
            if ($token) {
                git -C $dest remote set-url origin $cloneUrl 2>$null
            }
            $pullOut = (git -C $dest pull --ff-only 2>&1 | Out-String).Trim()
            if ($LASTEXITCODE -eq 0) {
                Write-Host " [OK]" -ForegroundColor Green
                $alreadyThere++
            } else {
                Write-Host " [ATTN]" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [CLONING] $($r.name) into $dest..." -ForegroundColor Yellow
            git clone --quiet $cloneUrl $dest
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK]      Successfully cloned $($r.name)" -ForegroundColor Green
                $cloned++
            } else {
                Write-Host "  [FAIL]    Failed to clone $($r.name)" -ForegroundColor Red
                $failed++
            }
        }
    }

    Write-Host "`nSummary for ${Name}: $cloned newly cloned, $alreadyThere pulled/up-to-date, $failed failed." -ForegroundColor Green
}

# 1. Tribernachi Foundation -> C:\git\trib (84+ Repositories)
Sync-GroupRepos -TargetType "orgs" -Name "Tribernachi-Foundation" -BasePath "C:\git\trib" -CatalogGroup "Tribernachi-Foundation"

# 2. Rick Peters Personal -> C:\git\rick (including primeID, gcd-bot-trader, etc.)
Sync-GroupRepos -TargetType "users" -Name "rickpeters112233" -BasePath "C:\git\rick" -CatalogGroup "rickpeters112233"

# 3. GestaltCE Core -> C:\git (24+ Repositories)
$choice = Read-Host "`nDo you want to clone/pull all GestaltCE repos into C:\git? (Y/N)"
if ($choice -eq 'Y' -or $choice -eq 'y' -or -not $choice) {
    Sync-GroupRepos -TargetType "orgs" -Name "GestaltCE" -BasePath "C:\git" -CatalogGroup "GestaltCE"
}

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host "All workspace synchronization complete!" -ForegroundColor Green
Write-Host "Launch GitStudio anytime with: .\start-gitstudio.bat" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
pause
