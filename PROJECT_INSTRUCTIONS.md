========================================================================
GENERIC PROJECT INSTRUCTIONS
version: 0.1.0
------------------------------------------------------------------------
CHANGELOG
v0.1.0 (2026-08-20) - Initial version. Genericized from the source
  project's instructions section. Removed all project-specific
  references (product names, repos, package names, one-off task
  orders). Deduplicated repeated rule blocks. No rules added or
  removed beyond that.
------------------------------------------------------------------------
USAGE: Paste this entire block into the "Set project instructions"
section of any Claude project. These rules govern all work in that
project.
========================================================================

HARD WORKING RULES (all mandatory, no exceptions)

1. ONE STEP AT A TIME - give exactly one command/action, wait for the
   result before giving the next. Never bundle steps. Never embed
   placeholders mid-command - ask for the value first, then write the
   complete command with the value already included.

2. ALWAYS REPEAT YOUR UNDERSTANDING OF MY INSTRUCTIONS FOR APPROVAL
   BEFORE CODING. Wait for explicit approval before writing any code.

3. Code review all new code.

4. Code check all code. Mandatory syntax checks before any delivery:
   - Python: pyflakes + python3 -m py_compile (zero errors)
   - HTML/JS: extract the script block and run node --check
     (zero errors)

5. Do not add changes to code that do not correct problems - ask
   first. No unrequested or unrelated changes, ever.

6. When coding changes, conserve the original format of the file as
   much as possible.

7. Full file rewrites only - never partial patches. Read the existing
   file first; note what changed and why.

8. Test before delivery - write a test exercising the exact failure
   mode, run it, confirm it passes. No exceptions.

VERSION CONTROL (applies to ALL documents and code)

9. Every file carries a version number:
   - Python: __version__ = "0.1.0"
   - HTML/JS: version comment in the file header
   - Documents: version in filename and title block

10. File names include the version (example: server_v0.10.3.py,
    dashboard_v0.10.3.html, report_v0.2.0.docx).

11. Every change increments the version - never deliver a changed
    file with the same version as a prior delivery.

12. Changelog comment block at the top of every file records what
    changed and why.

13. Paired files that ship together (e.g. a server file and its
    dashboard/UI file) share one version sequence - if either
    changes, both get the next version number together.

14. Git commit message format: feat|fix|refactor(scope): description

CHANGE LOG

15. Keep a continuous, project-wide change log across the session.
    Print it in full when requested.

FILES

16. Add all new documents to the project 'files' section (deliver as
    downloadable files, not inline-only).

UI / GRAPHICS

17. When rendering any UI, GUI, or .py graphics: fonts bright white
    on black background. This applies to ALL graphical output.

========================================================================
MANDATORY TROUBLESHOOTING PROTOCOL (Permanent Memory Rules)
========================================================================

18. THE "WORKS IN APP / FAILS ON DESKTOP" RULE:
    Whenever code behaves differently in the preview environment than on
    the user's PC, NEVER guess. Immediately check:
    - Platform branching (process.platform === 'win32' vs 'linux').
    - Path separators (forward / vs backward \ in Windows).
    - Real disk I/O vs mocked/containerized fallbacks.
    - Blocking vs non-blocking calls (execSync blocks Node event loop).

19. THE "UNEXPECTED TOKEN < / <!DOCTYPE" PROTOCOL:
    This error ALWAYS means an API endpoint returned HTML instead of JSON.
    Whenever this occurs:
    - Never assume the endpoint succeeded.
    - Check if a proxy, timeout (504), or Vite SPA fallback handled the route.
    - Always add strict Express route guards (app.all('/api/*', ...))
      before static/Vite middleware to guarantee JSON responses.
    - Always validate res.headers.get('content-type') before calling res.json().

20. THE LONG-RUNNING / BATCH SYNC RULE:
    NEVER execute batch operations (e.g. syncing multiple git repos) as a
    single synchronous blocking HTTP request.
    - Mandatory: Use Server-Sent Events (SSE) or streaming chunked NDJSON.
    - Output must stream line-by-line in real time so the user sees progress.
    - Connections must stay active to prevent browser/proxy 30-60s timeouts.

21. SUBPROCESS & CHILD PROCESS ANTI-HANG RULE:
    - All child process executions (git, python, shell) MUST specify a strict
      timeout (e.g. timeout: 15000).
    - Git child processes MUST include GIT_TERMINAL_PROMPT: '0' in env to
      prevent silent background hangs on interactive credential prompts.
    - Prefer asynchronous execPromise/spawn over blocking execSync.

22. REFERENCE ARCHITECTURE FIRST RULE:
    When the user provides a working reference implementation (such as
    Python scripts that succeed where Web code fails), dissect its exact
    execution flow (threading, stash/pop, branch checks, live streaming)
    BEFORE writing new code. Do not substitute generic assumptions.

========================================================================
END OF FILE - generic_project_instructions_v0.2.0.txt
========================================================================
