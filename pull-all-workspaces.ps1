# ==============================================================
# GitStudio Desktop - Batch Git Pull Tool for All Workspaces
# Pulls every local Git repository in:
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

$workspaceMap = @(
    @{ Name = "GestaltCE Core"; Path = "C:\git"; Scope = "gestaltce" },
    @{ Name = "Tribernachi Foundation"; Path = "C:\git\trib"; Scope = "trib" },
    @{ Name = "Rick Peters Personal"; Path = "C:\git\rick"; Scope = "rick" }
)

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "          GitStudio Desktop - Batch Git Pull Tool             " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Date/Time: $dateStr $timeStr"
Write-Host "Reports Directory: $reportsDir" -ForegroundColor Yellow
Write-Host "==============================================================`n" -ForegroundColor Cyan

$totalCount = 0
$upToDateCount = 0
$updatedCount = 0
$failedCount = 0
$skippedCount = 0
$logLines = [System.Collections.Generic.List[string]]::new()

foreach ($ws in $workspaceMap) {
    if ($Scope -ne "all" -and $ws.Scope -ne $Scope) {
        continue
    }

    $wsName = $ws.Name
    $wsPath = $ws.Path

    Write-Host ">> Scanning $wsName at $wsPath..." -ForegroundColor Cyan
    $logLines.Add(">> Workspace: $wsName ($wsPath)")

    if (-not (Test-Path $wsPath)) {
        Write-Host "   [MISSING] Workspace directory $wsPath does not exist yet." -ForegroundColor DarkGray
        $logLines.Add("   [MISSING] Workspace directory $wsPath does not exist.")
        continue
    }

    # Find immediate subdirectories that are git repos
    $subDirs = Get-ChildItem -Path $wsPath -Directory
    # Special check: If C:\git, avoid recursing into C:\git\trib and C:\git\rick
    if ($wsPath -eq "C:\git") {
        $subDirs = $subDirs | Where-Object { $_.Name -ne "trib" -and $_.Name -ne "rick" -and $_.Name -ne "reports" }
    }

    foreach ($dir in $subDirs) {
        $gitDir = Join-Path $dir.FullName ".git"
        if (-not (Test-Path $gitDir)) {
            continue
        }

        $totalCount++
        $repoName = $dir.Name
        $repoPath = $dir.FullName

        # Detect active branch
        $branch = (git -C $repoPath rev-parse --abbrev-ref HEAD 2>$null)
        if (-not $branch) { $branch = "main" }

        Write-Host "   [$repoName] ($branch) Pulling..." -NoNewline -ForegroundColor White

        $pullOutput = (git -C $repoPath pull --ff-only 2>&1 | Out-String).Trim()

        if ($LASTEXITCODE -eq 0) {
            if ($pullOutput -match "Already up to date" -or $pullOutput -match "up to date") {
                Write-Host " [UP TO DATE]" -ForegroundColor Green
                $upToDateCount++
                $logLines.Add("   [OK] $repoName [$branch] ... UP TO DATE")
            } else {
                Write-Host " [UPDATED]" -ForegroundColor Cyan
                $updatedCount++
                $firstLine = ($pullOutput -split "`n")[0]
                $logLines.Add("   [UPDATED] $repoName [$branch] ... $firstLine")
            }
        } else {
            Write-Host " [ATTENTION]" -ForegroundColor Yellow
            $failedCount++
            $firstErr = ($pullOutput -split "`n")[0]
            $logLines.Add("   [WARN] $repoName [$branch] ... $firstErr")
        }
    }
    Write-Host ""
}

$summaryBox = @"
=====================================
Total Repositories  : $totalCount
Already Up to Date  : $upToDateCount
Updated / Merged    : $updatedCount
Attention / Modified: $failedCount
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
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #131c31; border: 1px solid #1e293b; padding: 1.25rem; border-radius: 8px; }
    .card-val { font-size: 2.2rem; font-weight: 700; color: #f8fafc; font-family: monospace; }
    .card-lbl { font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; }
    pre { background: #050811; border: 1px solid #1e293b; padding: 1.25rem; border-radius: 8px; font-family: Consolas, monospace; font-size: 13px; color: #38bdf8; overflow-x: auto; line-height: 1.6; }
    .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <h1>GitStudio Desktop - Batch Git Pull Report</h1>
  <div class="subtitle">Generated on $dateStr at $timeStr | Target Workspaces: C:\git, C:\git\trib, C:\git\rick</div>
  <div class="grid">
    <div class="card"><div class="card-val">$totalCount</div><div class="card-lbl">Total Repos Checked</div></div>
    <div class="card"><div class="card-val" style="color: #4ade80;">$upToDateCount</div><div class="card-lbl">Up to Date</div></div>
    <div class="card"><div class="card-val" style="color: #60a5fa;">$updatedCount</div><div class="card-lbl">Updated / Merged</div></div>
    <div class="card"><div class="card-val" style="color: #f87171;">$failedCount</div><div class="card-lbl">Attention Needed</div></div>
  </div>
  <h3>Console Execution Log</h3>
  <pre>$([System.Web.HttpUtility]::HtmlEncode(($logLines -join "`n") + "`n`n" + $summaryBox))</pre>
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
