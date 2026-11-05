# Root Cause Post-Mortem & Diagnostic Framework

## 1. Executive Summary
- **Symptom**: Single-repo git pull and batch pull worked inside the AI Studio web container, but failed on the user's desktop with:
  `Error executing git pull: Unexpected token '<', "<!doctype "... is not valid JSON`
  and remained permanently stuck at `[INITIATING BATCH PULL]`.
- **Resolution**: Ported the user's working 5-step Python pull engine (`git_pull_all.py`), converted the batch pull architecture from a synchronous blocking loop to **Server-Sent Events (SSE) live streaming** (`/api/batch/pull-all/stream`), guarded all API endpoints against Vite SPA HTML fallthrough, and eliminated background child-process hangs with `GIT_TERMINAL_PROMPT=0`.

---

## 2. Why It Was So Hard to Get Correct

### A. The "Works in Cloud, Fails on Desktop" Trap (Environment Divergence)
The agent developed and tested code inside a cloud Linux container where:
1. `process.platform === 'linux'`, triggering the fast mock/cloud-sync branch that returned in 20ms without touching real local files on drive `C:`.
2. The agent saw "HTTP 200 OK" in its own sandbox and wrongly assumed the code was operational.
3. On the user's actual Windows desktop (`process.platform === 'win32'`), the code executed real disk I/O, actual Git commands across 118 directories, and path normalization (`C:\git`, `C:\git\trib`, `C:\git\rick`).

### B. Guessing Symptoms Instead of Tracing the Call Stack
When the user reported errors, the agent guessed superficial causes (PAT format, Windows port conflicts 8080 vs 8888, path slashes) rather than dissecting the literal JavaScript error:
`Unexpected token '<', "<!doctype "... is not valid JSON`.

---

## 3. Exhaustive Error Breakdown

### Error 1: Blocking Node.js Event Loop with `execSync`
- **What happened**: Inside `server.ts`, the batch pull looped through 118 repositories sequentially using synchronous `execSync`.
- **Impact**: In Node.js (which is single-threaded), `execSync` freezes the entire process. While repo #1 was fetching or pulling, the server could not accept or process ANY other incoming HTTP request (including single-repo pulls, status checks, or static assets).
- **Result**: The server appeared frozen to the browser.

### Error 2: Single Monolithic HTTP Request for a Long Batch Process
- **What happened**: Running 118 git fetches and pulls sequentially takes 5 to 15 minutes.
- **Impact**: Browsers and HTTP reverse proxies enforce hard timeouts (typically 30–60 seconds).
- **Result**: After 60 seconds, the browser connection timed out and the gateway/proxy returned an HTML error page (`504 Gateway Timeout` or `502 Bad Gateway`).

### Error 3: Unguarded Vite SPA Fallthrough & Naked `res.json()`
- **What happened**:
  1. In `server.ts`, Express had no catch-all error handler or 404 handler for `/api/*` before Vite's middleware.
  2. Any unhandled route, 404, or timed-out request fell through to `vite.middlewares`, which served `index.html` (`<!doctype html>`).
  3. In `GitTools.tsx` and `Dashboard.tsx`, the client blindly called `await res.json()`.
- **Impact**: The JavaScript V8 JSON parser attempted to parse `<!doctype html>` and crashed with `Unexpected token '<', "<!doctype "... is not valid JSON`.

### Error 4: Background Child Process Prompts
- **What happened**: Git commands executed without `GIT_TERMINAL_PROMPT=0`.
- **Impact**: If Git needed user credentials or encountered an interactive prompt on Windows, it hung silently in the background waiting on standard input.

### Error 5: Browser Launch Race Condition
- **What happened**: In `start-gitstudio.bat`, `start http://localhost:8888` was invoked immediately before `npm run dev`.
- **Impact**: The browser opened before TypeScript compiled and bound port 8888, causing initial connection failures or loading stale cached services.

---

## 4. The Permanent Diagnostic Protocol (Added to Agent Memory)

Whenever debugging desktop or full-stack applications in AI Studio:

1. **Rule of Platform Divergence**:
   If the user states "it works in your app but not on my desktop", IMMEDIATELY inspect `process.platform === 'win32'` code paths, real local paths (`C:\...`), and disk I/O. Never rely on Linux container test results.

2. **Rule of `Unexpected token '<'`**:
   This error 100% of the time means an API call received HTML.
   - Guard every Express server with:
     ```ts
     app.all('/api/*', (req, res) => res.status(404).json({ error: 'Route not found' }));
     ```
   - Guard every frontend fetch by checking `res.headers.get('content-type')` and `res.ok` before calling `res.json()`.

3. **Rule of Batch Operations**:
   NEVER execute multi-item or long-running tasks via a single blocking request.
   - Always use **Server-Sent Events (SSE)** or streaming chunked NDJSON.
   - Stream line-by-line progress so the UI renders in real time and the HTTP socket remains active.

4. **Rule of Reference Code**:
   When the user provides working reference code (e.g. Python tools that already succeed), dissect and mirror its exact design (threaded execution, live stdout routing, safe auto-stash, dead branch pruning) instead of writing unproven abstractions.

5. **Anti-Hang Mandate**:
   Every child process MUST have a strict `timeout` (e.g. 15s) and `GIT_TERMINAL_PROMPT: '0'` in its environment.
