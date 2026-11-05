# =============================================================================
# Copyright (c) 2026. All rights reserved.
# GitHub Report Generator - v0.1.0
# Fetches commits, PRs, and issues from a GitHub Organization
# and saves a styled HTML report.
# Supports daily, weekly, monthly, or custom lookback periods.
# =============================================================================

import os
import sys
import datetime
import requests
from pathlib import Path

__version__ = "0.1.0"

def _load_env_token() -> str:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        return token
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
GITHUB_USER  = os.environ.get("GITHUB_ORG",   "GestaltCE")
OUTPUT_DIR   = Path(__file__).parent / "reports"

MODES = {
    "1": ("Daily",   24),
    "2": ("Weekly",  168),
    "3": ("Monthly", 720),
    "4": ("Custom",  None),
}

def select_mode() -> tuple[str, int]:
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg == "daily":
            return "Daily", 24
        elif arg == "weekly":
            return "Weekly", 168
        elif arg == "monthly":
            return "Monthly", 720
        else:
            try:
                hours = int(arg)
                return f"Custom ({hours}h)", hours
            except ValueError:
                sys.exit(f"ERROR: Unknown mode '{arg}'. Use: daily, weekly, monthly, or a number of hours.")

    print("\n" + "=" * 60)
    print(f"  GitHub Report Generator - v{__version__}")
    print("=" * 60)
    print("\n  Select report period:\n")
    print("    1  —  Daily   (last 24 hours)")
    print("    2  —  Weekly  (last 7 days)")
    print("    3  —  Monthly (last 30 days)")
    print("    4  —  Custom  (enter hours manually)")
    print()

    while True:
        choice = input("  Enter choice [1-4]: ").strip()
        if choice in MODES:
            label, hours = MODES[choice]
            if choice == "4":
                while True:
                    try:
                        hours = int(input("  Enter number of hours to look back: ").strip())
                        if hours > 0:
                            label = f"Custom ({hours}h)"
                            break
                        print("  Please enter a positive number.")
                    except ValueError:
                        print("  Please enter a valid number.")
            return label, hours
        print("  Invalid choice — please enter 1, 2, 3, or 4.")

BASE_URL = "https://api.github.com"

def get_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def gh_get(path: str, params: dict = None) -> list:
    results = []
    url = f"{BASE_URL}{path}"
    p = dict(params or {})
    p.setdefault("per_page", 100)

    while url:
        resp = requests.get(url, headers=get_headers(), params=p)
        if resp.status_code == 401:
            sys.exit("ERROR: GitHub token is invalid or missing. Check GITHUB_TOKEN.")
        if resp.status_code == 403:
            try:
                msg = resp.json().get("message", "No message returned")
            except Exception:
                msg = resp.text
            print(f"  SKIPPING (403): {msg}")
            break
        if resp.status_code not in (200, 204):
            try:
                msg = resp.json().get("message", "No message returned")
            except Exception:
                msg = resp.text
            print(f"  WARNING: {resp.status_code} — {msg}")
            break

        data = resp.json()
        if isinstance(data, list):
            results.extend(data)
        else:
            return data

        link = resp.links.get("next", {}).get("url")
        url = link
        p = {}

    return results

def get_repos() -> list:
    print(f"  Fetching repos for: {GITHUB_USER}")
    repos = gh_get(f"/orgs/{GITHUB_USER}/repos", {"sort": "pushed", "per_page": 100, "type": "all"})
    print(f"  Found {len(repos)} repos")
    return repos

def get_commits_since(owner: str, repo: str, since: str) -> list:
    return gh_get(f"/repos/{owner}/{repo}/commits", {"since": since})

def get_prs(owner: str, repo: str) -> list:
    return gh_get(f"/repos/{owner}/{repo}/pulls",
                  {"state": "all", "sort": "updated", "direction": "desc"})

def get_issues(owner: str, repo: str, since: str) -> list:
    raw = gh_get(f"/repos/{owner}/{repo}/issues",
                 {"state": "all", "since": since, "sort": "updated", "direction": "desc"})
    return [i for i in raw if "pull_request" not in i]

def collect(lookback_hours: int) -> dict:
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=lookback_hours)
    since  = cutoff.isoformat()

    repos = get_repos()
    report = {
        "user":      GITHUB_USER,
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "since":     since,
        "repos":     [],
        "totals":    {"commits": 0, "prs_open": 0, "prs_merged": 0, "prs_closed": 0, "issues": 0},
    }

    for repo in repos:
        name  = repo["name"]
        owner = repo["owner"]["login"]
        print(f"  Scanning {name} ...", end=" ", flush=True)

        commits = get_commits_since(owner, name, since)
        all_prs = get_prs(owner, name)

        prs_recent = [
            pr for pr in all_prs
            if datetime.datetime.fromisoformat(pr["updated_at"].replace("Z", "+00:00")) >= cutoff
        ]

        issues = get_issues(owner, name, since)
        print(f"{len(commits)} commits | {len(prs_recent)} PRs | {len(issues)} issues")

        open_prs   = [pr for pr in prs_recent if pr["state"] == "open"]
        merged_prs = [pr for pr in prs_recent if pr.get("merged_at")]
        closed_prs = [pr for pr in prs_recent if pr["state"] == "closed" and not pr.get("merged_at")]

        report["totals"]["commits"]    += len(commits)
        report["totals"]["prs_open"]   += len(open_prs)
        report["totals"]["prs_merged"] += len(merged_prs)
        report["totals"]["prs_closed"] += len(closed_prs)
        report["totals"]["issues"]     += len(issues)

        if commits or prs_recent or issues:
            report["repos"].append({
                "name":        name,
                "html_url":    repo["html_url"],
                "description": repo.get("description") or "",
                "commits":     commits,
                "prs_open":    open_prs,
                "prs_merged":  merged_prs,
                "prs_closed":  closed_prs,
                "issues":      issues,
            })

    return report

def fmt_date(iso: str) -> str:
    dt = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.strftime("%b %d, %Y  %H:%M UTC")

def badge(text: str, color: str) -> str:
    return f'<span class="badge" style="background:{color}">{text}</span>'

def pr_state_badge(pr: dict) -> str:
    if pr.get("merged_at"):
        return badge("MERGED", "#6f42c1")
    if pr["state"] == "open":
        return badge("OPEN", "#1a7f37")
    return badge("CLOSED", "#cf222e")

def render_commits(commits: list) -> str:
    if not commits:
        return ""
    rows = ""
    for c in commits[:20]:
        sha    = c["sha"][:7]
        msg    = c["commit"]["message"].split("\n")[0][:100]
        author = (c.get("author") or {}).get("login") or c["commit"]["author"]["name"]
        url    = c["html_url"]
        rows  += f"""
        <tr>
          <td><a href="{url}" class="mono">{sha}</a></td>
          <td>{msg}</td>
          <td>{author}</td>
          <td>{fmt_date(c["commit"]["author"]["date"])}</td>
        </tr>"""
    more = f'<p class="muted">+ {len(commits)-20} more commits not shown</p>' if len(commits) > 20 else ""
    return f"""
    <h4>Commits ({len(commits)})</h4>
    <table><thead><tr><th>SHA</th><th>Message</th><th>Author</th><th>Date</th></tr></thead>
    <tbody>{rows}</tbody></table>{more}"""

def render_prs(prs: list, section_title: str) -> str:
    if not prs:
        return ""
    rows = ""
    for pr in prs:
        rows += f"""
        <tr>
          <td><a href="{pr['html_url']}">{pr['title']}</a></td>
          <td>{pr_state_badge(pr)}</td>
          <td>{(pr.get('user') or {}).get('login', '—')}</td>
          <td>{fmt_date(pr['updated_at'])}</td>
        </tr>"""
    return f"""
    <h4>{section_title} ({len(prs)})</h4>
    <table><thead><tr><th>Title</th><th>State</th><th>Author</th><th>Updated</th></tr></thead>
    <tbody>{rows}</tbody></table>"""

def render_issues(issues: list) -> str:
    if not issues:
        return ""
    rows = ""
    for i in issues:
        state_color = "#1a7f37" if i["state"] == "open" else "#cf222e"
        rows += f"""
        <tr>
          <td><a href="{i['html_url']}">#{i['number']} {i['title']}</a></td>
          <td>{badge(i['state'].upper(), state_color)}</td>
          <td>{(i.get('user') or {}).get('login', '—')}</td>
          <td>{fmt_date(i['updated_at'])}</td>
        </tr>"""
    return f"""
    <h4>Issues ({len(issues)})</h4>
    <table><thead><tr><th>Title</th><th>State</th><th>Author</th><th>Updated</th></tr></thead>
    <tbody>{rows}</tbody></table>"""

def render_html(report: dict, mode_label: str, lookback_hours: int) -> str:
    user     = report["user"]
    gen_time = fmt_date(report["generated"])
    since    = fmt_date(report["since"])
    t        = report["totals"]

    repo_sections = ""
    for repo in report["repos"]:
        all_prs = repo["prs_open"] + repo["prs_merged"] + repo["prs_closed"]
        repo_sections += f"""
        <section class="repo-card">
          <div class="repo-header">
            <h3><a href="{repo['html_url']}">{repo['name']}</a></h3>
            <p class="repo-desc">{repo['description']}</p>
            <div class="repo-summary">
              <span>{len(repo['commits'])} commits</span>
              <span>{len(all_prs)} PRs</span>
              <span>{len(repo['issues'])} issues</span>
            </div>
          </div>
          {render_commits(repo['commits'])}
          {render_prs(repo['prs_open'],   'Open Pull Requests')}
          {render_prs(repo['prs_merged'], 'Merged Pull Requests')}
          {render_prs(repo['prs_closed'], 'Closed Pull Requests')}
          {render_issues(repo['issues'])}
        </section>"""

    no_activity = ""
    if not report["repos"]:
        no_activity = f'<p class="muted" style="text-align:center;padding:3rem">No activity in the last {lookback_hours} hours.</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub {mode_label} Report — {user}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
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
  a {{ color: var(--link); text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  .mono {{ font-family: 'IBM Plex Mono', monospace; font-size: 0.85em; }}
  header {{ border-left: 4px solid var(--accent); padding: 1rem 1.5rem; margin-bottom: 2.5rem; background: var(--surface); border-radius: 0 8px 8px 0; }}
  header h1 {{ font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; }}
  header h1 span {{ color: var(--accent); }}
  header p {{ color: var(--muted); font-size: 0.9rem; margin-top: 0.25rem; }}
  .mode-badge {{ display: inline-block; background: var(--accent); color: #000; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 4px; margin-left: 0.75rem; vertical-align: middle; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.05em; }}
  .totals {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }}
  .stat-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; text-align: center; }}
  .stat-card .num {{ font-size: 2.2rem; font-weight: 800; color: var(--accent); line-height: 1; }}
  .stat-card .label {{ color: var(--muted); font-size: 0.8rem; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }}
  .repo-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem; overflow: hidden; }}
  .repo-header {{ padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); background: rgba(240,165,0,0.05); }}
  .repo-header h3 {{ font-size: 1.2rem; font-weight: 700; }}
  .repo-header h3 a {{ color: var(--text); }}
  .repo-desc {{ color: var(--muted); font-size: 0.875rem; margin-top: 0.2rem; }}
  .repo-summary {{ display: flex; gap: 1rem; margin-top: 0.75rem; }}
  .repo-summary span {{ background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 0.15rem 0.75rem; font-size: 0.8rem; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }}
  h4 {{ font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 0.75rem 1.5rem 0.25rem; border-top: 1px solid var(--border); margin-top: 0.5rem; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th, td {{ padding: 0.5rem 1.5rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.875rem; }}
  th {{ color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(0,0,0,0.2); }}
  tr:last-child td {{ border-bottom: none; }}
  tr:hover td {{ background: rgba(255,255,255,0.02); }}
  .badge {{ display: inline-block; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; color: #fff; font-family: 'IBM Plex Mono', monospace; }}
  .muted {{ color: var(--muted); font-size: 0.85rem; padding: 0.5rem 1.5rem; }}
  footer {{ margin-top: 3rem; text-align: center; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }}
</style>
</head>
<body>
<header>
  <h1>GitHub Report — <span>{user}</span><span class="mode-badge">{mode_label.upper()}</span></h1>
  <p>Generated: {gen_time} &nbsp;|&nbsp; Activity since: {since}</p>
</header>
<div class="totals">
  <div class="stat-card"><div class="num">{t['commits']}</div><div class="label">Commits</div></div>
  <div class="stat-card"><div class="num">{t['prs_open']}</div><div class="label">Open PRs</div></div>
  <div class="stat-card"><div class="num">{t['prs_merged']}</div><div class="label">Merged PRs</div></div>
  <div class="stat-card"><div class="num">{t['prs_closed']}</div><div class="label">Closed PRs</div></div>
  <div class="stat-card"><div class="num">{t['issues']}</div><div class="label">Issues</div></div>
</div>
{repo_sections}
{no_activity}
<footer>GitHub Report &copy; 2026 &nbsp;|&nbsp; {mode_label} report &nbsp;|&nbsp; Repos with no activity omitted</footer>
</body>
</html>"""

def main():
    mode_label, lookback_hours = select_mode()

    print(f"\n{'='*60}")
    print(f"  GitHub {mode_label} Report — {GITHUB_USER} (v{__version__})")
    print(f"  Lookback: {lookback_hours} hours")
    print(f"{'='*60}\n")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Collecting data from GitHub API...")
    report = collect(lookback_hours)

    print("\nRendering HTML report...")
    html = render_html(report, mode_label, lookback_hours)

    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    mode_str = mode_label.lower().replace(" ", "-").replace("(", "").replace(")", "")
    out_file = OUTPUT_DIR / f"github_{mode_str}_report_{date_str}.html"
    out_file.write_text(html, encoding="utf-8")

    print(f"\n  Report saved to     : {out_file}")
    print(f"  Repos with activity : {len(report['repos'])}")
    print(f"  Total commits       : {report['totals']['commits']}")
    print(f"  Total PRs (open)    : {report['totals']['prs_open']}")
    print(f"  Total PRs (merged)  : {report['totals']['prs_merged']}")
    print(f"  Total issues        : {report['totals']['issues']}")
    print()

if __name__ == "__main__":
    main()
