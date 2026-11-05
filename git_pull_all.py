# =============================================================================
# Copyright (c) 2026. All rights reserved.
# Git Pull All Repos - v0.1.0
# Pulls the latest changes for all git repositories found in a root folder.
# If a repo has uncommitted changes, it stashes them, pulls, then restores.
# If the current branch is gone from remote, switches to default branch first.
# Clones any new repos from GitHub org/user that are not yet in REPOS_ROOT.
# Saves an HTML summary report of the results.
# =============================================================================

import os
import sys
import subprocess
import datetime
from pathlib import Path

__version__ = "0.1.0"

NO_WINDOW = 0x08000000 if os.name == "nt" else 0  # subprocess.CREATE_NO_WINDOW

try:
    import requests
except ImportError:
    sys.exit("ERROR: 'requests' is not installed. Run: pip install requests")

# =============================================================================
# CONFIGURATION — Edit these values before running
# =============================================================================

REPOS_ROOT = os.environ.get("REPOS_ROOT", r"C:\git")

def _load_env_token() -> str:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        return token
    # Search local candidate .env files
    env_paths = [
        Path(__file__).parent / ".env",
        Path(r"C:\git\gitstudio\.env"),
        Path(r"C:\git\rick\gitstudio-desktop\.env"),
        Path(r"C:\tools\gittools\.env")
    ]
    for p in env_paths:
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.startswith("GITHUB_TOKEN="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

GITHUB_TOKEN = _load_env_token()
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "GestaltCE")
CLONE_NEW_REPOS = True
OUTPUT_DIR = Path(__file__).parent / "reports"

# =============================================================================
# GITHUB API HELPERS
# =============================================================================

GITHUB_API = "https://api.github.com"


def _gh_headers() -> dict:
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }


def fetch_remote_repos() -> list:
    """Return all repos for GITHUB_OWNER via the GitHub API (handles pagination)."""
    repos = []
    for url in [f"{GITHUB_API}/orgs/{GITHUB_OWNER}/repos",
                f"{GITHUB_API}/users/{GITHUB_OWNER}/repos"]:
        params = {"per_page": 100, "page": 1, "type": "all"}
        while True:
            try:
                r = requests.get(url, headers=_gh_headers(), params=params, timeout=30)
                if r.status_code == 404:
                    break
                r.raise_for_status()
                batch = r.json()
                if not batch:
                    break
                repos.extend(batch)
                params["page"] += 1
            except requests.RequestException as e:
                print(f"  WARNING: Could not fetch remote repo list: {e}")
                return []
        if repos:
            break

    return repos


def clone_repo(clone_url: str, dest: Path) -> tuple:
    """Clone a repo into dest. Returns (success, message)."""
    auth_clone_url = clone_url
    if GITHUB_TOKEN and "https://" in clone_url:
        auth_clone_url = clone_url.replace("https://", f"https://{GITHUB_TOKEN}@")

    result = subprocess.run(
        ["git", "clone", auth_clone_url, str(dest)],
        capture_output=True, text=True,
        creationflags=NO_WINDOW,
    )
    if result.returncode == 0:
        return True, "Cloned successfully."
    return False, result.stderr.strip()


# =============================================================================
# GIT HELPERS
# =============================================================================

def run_git(args: list, cwd: Path) -> tuple:
    """Run a git command in a given directory. Returns (returncode, stdout, stderr)."""
    result = subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        creationflags=NO_WINDOW,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def is_git_repo(path: Path) -> bool:
    return (path / ".git").exists()


def has_uncommitted_changes(path: Path) -> bool:
    code, out, _ = run_git(["status", "--porcelain"], path)
    return code == 0 and bool(out)


def get_current_branch(path: Path) -> str:
    code, out, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"], path)
    return out if code == 0 else "unknown"


def get_remote_url(path: Path) -> str:
    code, out, _ = run_git(["remote", "get-url", "origin"], path)
    return out if code == 0 else ""


def get_default_branch(path: Path) -> str:
    """Return the remote default branch (e.g. dev, main, master)."""
    code, out, _ = run_git(["remote", "show", "origin"], path)
    if code == 0:
        for line in out.splitlines():
            if "HEAD branch" in line:
                return line.split(":")[-1].strip()
    code2, out2, _ = run_git(["symbolic-ref", "refs/remotes/origin/HEAD"], path)
    if code2 == 0:
        return out2.replace("refs/remotes/origin/", "").strip()
    return "main"


def branch_exists_on_remote(path: Path, branch: str) -> bool:
    """Check if branch exists on origin."""
    code, out, _ = run_git(["ls-remote", "--heads", "origin", branch], path)
    return code == 0 and bool(out.strip())


def pull_repo(path: Path) -> dict:
    """
    Pull a single repo. Stashes changes if needed, pulls, then restores stash.
    If current branch is gone from remote, switches to default branch first.
    Returns a result dict with status and messages.
    """
    name     = path.name
    branch   = get_current_branch(path)
    remote   = get_remote_url(path)
    stashed  = False
    messages = []
    status   = "ok"
    switched = False

    print(f"  {name} [{branch}] ...", end=" ", flush=True)

    if GITHUB_TOKEN and "github.com" in remote and "@" not in remote:
        auth_url = remote.replace("https://", f"https://{GITHUB_TOKEN}@")
        run_git(["remote", "set-url", "origin", auth_url], path)

    run_git(["fetch", "--prune"], path)

    if not branch_exists_on_remote(path, branch):
        default = get_default_branch(path)
        messages.append(f"Branch '{branch}' not found on remote — switching to '{default}'.")
        code, out, err = run_git(["checkout", default], path)
        if code != 0:
            code, out, err = run_git(["checkout", "-b", default, f"origin/{default}"], path)
        if code == 0:
            branch   = default
            switched = True
            messages.append(f"Switched to '{default}'.")
        else:
            status = "switch_failed"
            messages.append(f"Could not switch to '{default}': {err}")
            print("SWITCH FAILED")
            return {
                "name": name, "branch": branch, "remote": remote,
                "status": status, "messages": messages, "stashed": False,
                "switched": switched, "cloned": False,
            }

    if has_uncommitted_changes(path):
        code, out, err = run_git(["stash", "push", "-m", "git_pull_all auto-stash"], path)
        if code == 0:
            stashed = True
            messages.append(f"Stashed local changes: {out}")
        else:
            status = "stash_failed"
            messages.append(f"Stash failed — skipping pull: {err}")
            print("STASH FAILED")
            return {
                "name": name, "branch": branch, "remote": remote,
                "status": status, "messages": messages, "stashed": False,
                "switched": switched, "cloned": False,
            }

    code, out, err = run_git(["pull", "origin", branch], path)
    if code != 0:
        code, out, err = run_git(["pull", "--ff-only"], path)

    if code == 0:
        if "Already up to date" in out:
            status = "up_to_date"
            messages.append("Already up to date.")
        else:
            status = "updated"
            messages.append(f"Updated: {out}")
    else:
        status = "pull_failed"
        messages.append(f"Pull failed: {err or out}")
        print(f"  >> {err or out}", flush=True)

    if stashed:
        pop_code, pop_out, pop_err = run_git(["stash", "pop"], path)
        if pop_code == 0:
            messages.append(f"Stash restored: {pop_out}")
        else:
            status = "stash_restore_failed"
            messages.append(f"WARNING: Stash restore failed — check manually: {pop_err}")

    label = {
        "ok":                   "UPDATED",
        "up_to_date":           "UP TO DATE",
        "updated":              "UPDATED",
        "pull_failed":          "PULL FAILED",
        "stash_restore_failed": "STASH WARN",
        "switch_failed":        "SWITCH FAILED",
    }.get(status, status.upper())

    suffix = f" (switched dead branch → {branch})" if switched else ""
    print(label + suffix)

    return {
        "name": name, "branch": branch, "remote": remote,
        "status": status, "messages": messages, "stashed": stashed,
        "switched": switched, "cloned": False,
    }


# =============================================================================
# NEW REPO CLONING
# =============================================================================

def sync_new_repos(root: Path) -> list:
    """Clone any repos in the GitHub org that don't exist locally yet."""
    if not GITHUB_TOKEN or GITHUB_TOKEN.startswith("ghp_xxx"):
        print("  Skipping new repo check — GITHUB_TOKEN not configured.\n")
        return []

    print(f"  Checking GitHub ({GITHUB_OWNER}) for new repositories...")
    remote_repos = fetch_remote_repos()
    if not remote_repos:
        print("  No remote repos returned (check token / owner).\n")
        return []

    existing_names = {d.name.lower() for d in root.iterdir() if d.is_dir()}
    new_repos = [r for r in remote_repos if r["name"].lower() not in existing_names]

    if not new_repos:
        print(f"  All {len(remote_repos)} remote repos already cloned locally in {root}.\n")
        return []

    print(f"  Found {len(new_repos)} new repo(s) to clone:\n")
    cloned_results = []

    for repo in new_repos:
        name      = repo["name"]
        clone_url = repo["clone_url"]
        dest      = root / name
        print(f"  Cloning {name} ...", end=" ", flush=True)
        success, msg = clone_repo(clone_url, dest)
        status = "cloned" if success else "clone_failed"
        print("OK" if success else f"FAILED — {msg}")
        cloned_results.append({
            "name": name, "branch": repo.get("default_branch", ""),
            "remote": clone_url, "status": status,
            "messages": [msg], "stashed": False,
            "switched": False, "cloned": True,
        })

    print()
    return cloned_results


# =============================================================================
# MAIN COLLECTION
# =============================================================================

def pull_all(root: Path) -> list:
    if not root.exists():
        root.mkdir(parents=True, exist_ok=True)

    cloned = []
    if CLONE_NEW_REPOS:
        cloned = sync_new_repos(root)

    dirs = sorted([d for d in root.iterdir() if d.is_dir() and is_git_repo(d)])
    if not dirs:
        print(f"  No existing git repositories found in {root} yet.")
        return cloned

    print(f"  Found {len(dirs)} git repos in {root}\n")

    results = []
    for d in dirs:
        results.append(pull_repo(d))

    return cloned + results


# =============================================================================
# HTML RENDERING
# =============================================================================

def status_badge(status: str) -> str:
    colors = {
        "updated":              ("#1a7f37", "UPDATED"),
        "up_to_date":           ("#0969da", "UP TO DATE"),
        "pull_failed":          ("#cf222e", "PULL FAILED"),
        "stash_failed":         ("#cf222e", "STASH FAILED"),
        "stash_restore_failed": ("#e36209", "STASH WARN"),
        "switch_failed":        ("#cf222e", "SWITCH FAILED"),
        "cloned":               ("#6f42c1", "CLONED"),
        "clone_failed":         ("#cf222e", "CLONE FAILED"),
    }
    color, label = colors.get(status, ("#6e7781", status.upper()))
    return f'<span class="badge" style="background:{color}">{label}</span>'


def render_html(results: list, root: str) -> str:
    gen_time   = datetime.datetime.now().strftime("%b %d, %Y  %H:%M")
    total      = len(results)
    updated    = sum(1 for r in results if r["status"] == "updated")
    up_to_date = sum(1 for r in results if r["status"] == "up_to_date")
    failed     = sum(1 for r in results if "failed" in r["status"])
    stashed    = sum(1 for r in results if r["stashed"])
    switched   = sum(1 for r in results if r.get("switched"))
    cloned     = sum(1 for r in results if r.get("cloned"))

    rows = ""
    for r in results:
        msgs        = "<br>".join(r["messages"]) if r["messages"] else "—"
        stash_icon  = ' <span style="color:#e36209" title="Changes were stashed and restored">⚑ stashed</span>' if r["stashed"] else ""
        switch_icon = ' <span style="color:#79c0ff" title="Switched from dead branch">⇄ switched</span>' if r.get("switched") else ""
        clone_icon  = ' <span style="color:#6f42c1" title="Newly cloned">★ new</span>' if r.get("cloned") else ""
        rows += f"""
        <tr>
          <td><strong>{r['name']}</strong>{stash_icon}{switch_icon}{clone_icon}</td>
          <td class="mono" style="color:#8b949e">{r['branch']}</td>
          <td>{status_badge(r['status'])}</td>
          <td style="font-size:0.8rem;color:#8b949e">{msgs}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Git Pull All — {gen_time}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg:      #0d1117;
    --surface: #161b22;
    --border:  #30363d;
    --accent:  #f0a500;
    --text:    #e6edf3;
    --muted:   #8b949e;
    --link:    #79c0ff;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; font-size: 15px; line-height: 1.6; padding: 2rem; }}
  .mono {{ font-family: 'IBM Plex Mono', monospace; font-size: 0.85em; }}
  header {{ border-left: 4px solid var(--accent); padding: 1rem 1.5rem; margin-bottom: 2rem; background: var(--surface); border-radius: 0 8px 8px 0; }}
  header h1 {{ font-size: 1.8rem; font-weight: 800; }}
  header h1 span {{ color: var(--accent); }}
  header p {{ color: var(--muted); font-size: 0.9rem; margin-top: 0.25rem; }}
  .totals {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
  .stat-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }}
  .stat-card .num {{ font-size: 2rem; font-weight: 800; color: var(--accent); line-height: 1; }}
  .stat-card .label {{ color: var(--muted); font-size: 0.75rem; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }}
  .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th, td {{ padding: 0.6rem 1.25rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.875rem; }}
  th {{ color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(0,0,0,0.2); }}
  tr:last-child td {{ border-bottom: none; }}
  tr:hover td {{ background: rgba(255,255,255,0.02); }}
  .badge {{ display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #fff; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.04em; }}
  footer {{ margin-top: 2.5rem; text-align: center; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }}
</style>
</head>
<body>
<header>
  <h1>Git Pull All — <span>{GITHUB_OWNER}</span></h1>
  <p>Root: {root} &nbsp;|&nbsp; Run at: {gen_time}</p>
</header>
<div class="totals">
  <div class="stat-card"><div class="num">{total}</div><div class="label">Repos</div></div>
  <div class="stat-card"><div class="num">{updated}</div><div class="label">Updated</div></div>
  <div class="stat-card"><div class="num">{up_to_date}</div><div class="label">Up to Date</div></div>
  <div class="stat-card"><div class="num">{cloned}</div><div class="label">Cloned New</div></div>
  <div class="stat-card"><div class="num">{switched}</div><div class="label">Switched</div></div>
  <div class="stat-card"><div class="num">{failed}</div><div class="label">Failed</div></div>
  <div class="stat-card"><div class="num">{stashed}</div><div class="label">Stashed</div></div>
</div>
<div class="card">
<table>
  <thead><tr><th>Repository</th><th>Branch</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
</div>
<footer>Git Pull All &copy; 2026 &nbsp;|&nbsp; Root: {root}</footer>
</body>
</html>"""


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    root = Path(REPOS_ROOT)

    print(f"\n{'='*60}")
    print(f"  Git Pull All Repos - v{__version__}")
    print(f"  Root  : {root}")
    print(f"  Owner : {GITHUB_OWNER}")
    print(f"{'='*60}\n")

    results = pull_all(root)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    html     = render_html(results, str(root))
    date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    out_file = OUTPUT_DIR / f"git_pull_all_{date_str}.html"
    out_file.write_text(html, encoding="utf-8")

    updated    = sum(1 for r in results if r["status"] == "updated")
    up_to_date = sum(1 for r in results if r["status"] == "up_to_date")
    failed     = sum(1 for r in results if "failed" in r["status"])
    cloned     = sum(1 for r in results if r.get("cloned"))
    switched   = sum(1 for r in results if r.get("switched"))

    print(f"\n  {'='*40}")
    print(f"  Total repos    : {len(results)}")
    print(f"  Updated        : {updated}")
    print(f"  Up to date     : {up_to_date}")
    print(f"  Cloned new     : {cloned}")
    print(f"  Switched branch: {switched}")
    print(f"  Failed         : {failed}")
    print(f"  Report saved   : {out_file}")
    print()


if __name__ == "__main__":
    main()
