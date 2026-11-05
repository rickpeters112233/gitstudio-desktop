# ==============================================================
# GitStudio Desktop - Batch Git Pull & Sync Tool for All Workspaces
# Pulls every local Git repository and clones missing ones in:
#   - C:\git               (GestaltCE)
#   - C:\git\trib          (Tribernachi-Foundation)
#   - C:\git\rick          (rickpeters112233)
# Saves HTML summary report to C:\git\reports\
# ==============================================================

param(
    [string]$Scope = "all", # "all", "gestaltce", "trib", "rick"
    [switch]$NoPause = $false
)

$dateStr = (Get-Date).ToString("yyyy-MM-dd")
$timeStr = (Get-Date).ToString("HH:mm:ss")
$reportsDir = "C:\git\reports"

if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

# 1. Resolve Script Directory and Files
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$envCandidates = @(
    (Join-Path $scriptDir ".env"),
    "C:\git\rick\gitstudio-desktop\.env",
    "C:\git\gitstudio\.env",
    ".env"
)

# Resolve GitHub Personal Access Token
$token = $env:GITHUB_TOKEN
if (-not $token) {
    foreach ($cand in $envCandidates) {
        if (Test-Path $cand) {
            $envContent = Get-Content $cand | Where-Object { $_ -match "^GITHUB_TOKEN=" }
            if ($envContent) {
                $token = ($envContent -split "=", 2)[1].Trim('"').Trim("'")
                if ($token) { break }
            }
        }
    }
}
if ($token -and $token.Contains("ujYlOmZKzBTQ49Z2SmfxEHWV4zrhTZ0uE2fZ")) {
    $token = ""
}

# Prompt user for token if not currently configured
if (-not $token) {
    Write-Host "`n[AUTH NOTICE] No GitHub token found in .env or environment." -ForegroundColor Yellow
    Write-Host "To pull/clone private repositories (Tribernachi-Foundation, GestaltCE, primeID), a PAT is required." -ForegroundColor Yellow
    $enteredToken = Read-Host "Paste your GitHub Personal Access Token (or press Enter to proceed unauthenticated)"
    if ($enteredToken) {
        $token = $enteredToken.Trim()
        $targetEnv = Join-Path $scriptDir ".env"
        "GITHUB_TOKEN=`"$token`"" | Out-File -FilePath $targetEnv -Encoding utf8
        Write-Host "Token saved to $targetEnv for future executions." -ForegroundColor Green
    }
}

# Load masterCatalog.json for full workspace coverage
$catalogCandidates = @(
    (Join-Path $scriptDir "masterCatalog.json"),
    "C:\git\rick\gitstudio-desktop\masterCatalog.json",
    "C:\git\gitstudio\masterCatalog.json",
    "masterCatalog.json"
)
$masterCatalog = @()
foreach ($catCand in $catalogCandidates) {
    if (Test-Path $catCand) {
        try {
            $masterCatalog = Get-Content $catCand -Raw | ConvertFrom-Json
            Write-Host "Loaded repository catalog from $catCand with $($masterCatalog.Count) repositories." -ForegroundColor DarkGray
            break
        } catch {}
    }
}

$workspaceMap = @(
    @{ Name = "GestaltCE Core"; Path = "C:\git"; Scope = "gestaltce"; Group = "GestaltCE" },
    @{ Name = "Tribernachi Foundation"; Path = "C:\git\trib"; Scope = "trib"; Group = "Tribernachi-Foundation" },
    @{ Name = "Rick Peters Personal"; Path = "C:\git\rick"; Scope = "rick"; Group = "rickpeters112233" }
)

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "          GitStudio Desktop - Batch Git Pull Tool             " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Date/Time: $dateStr $timeStr"
Write-Host "Reports Directory: $reportsDir" -ForegroundColor Yellow
if ($token) {
    Write-Host "GitHub Authentication: Active (PAT Loaded)" -ForegroundColor Green
} else {
    Write-Host "GitHub Authentication: Public / Unauthenticated" -ForegroundColor DarkGray
}
Write-Host "==============================================================`n" -ForegroundColor Cyan

$totalCount = 0
$upToDateCount = 0
$updatedCount = 0
$clonedCount = 0
$failedCount = 0
$logLines = [System.Collections.Generic.List[string]]::new()

foreach ($ws in $workspaceMap) {
    if ($Scope -ne "all" -and $ws.Scope -ne $Scope) {
        continue
    }

    $wsName = $ws.Name
    $wsPath = $ws.Path
    $wsGroup = $ws.Group

    Write-Host ">> Synchronizing $wsName at $wsPath..." -ForegroundColor Cyan
    $logLines.Add(">> Workspace: $wsName ($wsPath)")

    if (-not (Test-Path $wsPath)) {
        New-Item -ItemType Directory -Path $wsPath -Force | Out-Null
    }

    # Gather repositories from masterCatalog for this group
    $groupRepos = $masterCatalog | Where-Object { $_.group -eq $wsGroup }

    if ($groupRepos.Count -gt 0) {
        foreach ($r in $groupRepos) {
            $totalCount++
            $repoName = $r.name
            $repoPath = Join-Path $wsPath $repoName
            $cloneUrl = $r.htmlUrl + ".git"
            if ($token) {
                $cloneUrl = $cloneUrl.Replace("https://", "https://${token}@")
            }

            if (Test-Path (Join-Path $repoPath ".git")) {
                Write-Host "   [$repoName] Pulling..." -NoNewline -ForegroundColor White
                if ($token) {
                    git -C $repoPath remote set-url origin $cloneUrl 2>$null
                }
                $curBranch = (git -C $repoPath rev-parse --abbrev-ref HEAD 2>$null)
                if ($curBranch) { $curBranch = $curBranch.Trim() }
                if (-not $curBranch -or $curBranch -eq "HEAD") {
                    $curBranch = if ($r.defaultBranch) { $r.defaultBranch } else { "main" }
                }
                $pullOutput = (git -C $repoPath pull origin $curBranch 2>&1 | Out-String).Trim()

                if ($LASTEXITCODE -eq 0) {
                    if ($pullOutput -match "Already up to date" -or $pullOutput -match "up to date") {
                        Write-Host " [UP TO DATE]" -ForegroundColor Green
                        $upToDateCount++
                        $logLines.Add("   [OK] $repoName [$curBranch] ... UP TO DATE")
                    } else {
                        Write-Host " [UPDATED]" -ForegroundColor Cyan
                        $updatedCount++
                        $firstLine = ($pullOutput -split "`n")[0]
                        $logLines.Add("   [UPDATED] $repoName [$curBranch] ... $firstLine")
                    }
                } else {
                    Write-Host " [ATTENTION]" -ForegroundColor Yellow
                    $failedCount++
                    $firstErr = ($pullOutput -split "`n")[0]
                    $logLines.Add("   [WARN] $repoName [$curBranch] ... $firstErr")
                }
            } else {
                Write-Host "   [$repoName] Not yet on disk. Cloning..." -NoNewline -ForegroundColor Yellow
                git clone --quiet $cloneUrl $repoPath
                if ($LASTEXITCODE -eq 0) {
                    Write-Host " [CLONED]" -ForegroundColor Green
                    $clonedCount++
                    $logLines.Add("   [CLONED] $repoName ... Successfully cloned")
                } else {
                    Write-Host " [FAIL]" -ForegroundColor Red
                    $failedCount++
                    $logLines.Add("   [FAIL] $repoName ... Clone failed")
                }
            }
        }
    } else {
        # Fallback to scanning existing local directory if catalog not matched
        $subDirs = Get-ChildItem -Path $wsPath -Directory
        if ($wsPath -eq "C:\git") {
            $subDirs = $subDirs | Where-Object { $_.Name -ne "trib" -and $_.Name -ne "rick" -and $_.Name -ne "reports" }
        }
        foreach ($dir in $subDirs) {
            $gitDir = Join-Path $dir.FullName ".git"
            if (-not (Test-Path $gitDir)) { continue }

            $totalCount++
            $repoName = $dir.Name
            $repoPath = $dir.FullName
            Write-Host "   [$repoName] Pulling..." -NoNewline -ForegroundColor White

            if ($token) {
                $remUrl = (git -C $repoPath config --get remote.origin.url 2>$null).Trim()
                if ($remUrl -and $remUrl.StartsWith("https://github.com/")) {
                    $authRem = $remUrl.Replace("https://github.com/", "https://${token}@github.com/")
                    git -C $repoPath remote set-url origin $authRem 2>$null
                }
            }
            $dirBranch = (git -C $repoPath rev-parse --abbrev-ref HEAD 2>$null)
            if ($dirBranch) { $dirBranch = $dirBranch.Trim() }
            if (-not $dirBranch -or $dirBranch -eq "HEAD") { $dirBranch = "main" }

            $pullOutput = (git -C $repoPath pull origin $dirBranch 2>&1 | Out-String).Trim()
            if ($LASTEXITCODE -eq 0) {
                Write-Host " [OK]" -ForegroundColor Green
                $upToDateCount++
                $logLines.Add("   [OK] $repoName [$dirBranch] ... UP TO DATE")
            } else {
                Write-Host " [ATTN]" -ForegroundColor Yellow
                $failedCount++
                $logLines.Add("   [WARN] $repoName [$dirBranch] ... $pullOutput")
            }
        }
    }
    Write-Host ""
}

$summaryBox = @"
=====================================
Total Repositories  : $totalCount
Already Up to Date  : $upToDateCount
Updated / Merged    : $updatedCount
Newly Cloned        : $clonedCount
Attention / Warn    : $failedCount
Reports Saved Path  : $reportsDir\git_pull_all_$dateStr.html
=====================================
"@

Write-Host $summaryBox -ForegroundColor Green

# Generate HTML Report file
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Git Pull All Report - $dateStr</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 2rem; margin: 0; }
    h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #131c31; border: 1px solid #1e293b; padding: 1.25rem; border-radius: 8px; }
    .card-val { font-size: 2rem; font-weight: 700; color: #f8fafc; font-family: monospace; }
    .card-lbl { font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; }
    pre { background: #050811; border: 1px solid #1e293b; padding: 1.25rem; border-radius: 8px; font-family: Consolas, monospace; font-size: 13px; color: #38bdf8; overflow-x: auto; line-height: 1.6; }
    .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <h1>GitStudio Desktop - Batch Git Pull Report</h1>
  <div class="subtitle">Generated on $dateStr at $timeStr | Target Workspaces: C:\git, C:\git\trib, C:\git\rick</div>
  <div class="grid">
    <div class="card"><div class="card-val">$totalCount</div><div class="card-lbl">Total Repos</div></div>
    <div class="card"><div class="card-val" style="color: #4ade80;">$upToDateCount</div><div class="card-lbl">Up to Date</div></div>
    <div class="card"><div class="card-val" style="color: #60a5fa;">$updatedCount</div><div class="card-lbl">Updated</div></div>
    <div class="card"><div class="card-val" style="color: #a78bfa;">$clonedCount</div><div class="card-lbl">Newly Cloned</div></div>
    <div class="card"><div class="card-val" style="color: #f87171;">$failedCount</div><div class="card-lbl">Attention</div></div>
  </div>
  <h3>Console Execution Log</h3>
  <pre>$([System.Net.WebUtility]::HtmlEncode(($logLines -join "`n") + "`n`n" + $summaryBox))</pre>
  <div class="footer">GitStudio Desktop v2.4.0 · Local Workspace Synchronization</div>
</body>
</html>
"@

$reportFilePath = Join-Path $reportsDir "git_pull_all_$dateStr.html"
$htmlContent | Out-File -FilePath $reportFilePath -Encoding utf8
Write-Host "Successfully saved HTML report to: $reportFilePath" -ForegroundColor Cyan

if (-not $NoPause) {
    pause
}
