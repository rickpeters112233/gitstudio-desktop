# =============================================================================
# Git Tools GUI — Pull + Daily Report, side by side - v0.1.0
#
# Runs git_pull_all.py and github_daily_report.py IN-PROCESS (imported as
# modules, executed in background threads). Output streams live into each
# panel's console. No subprocesses — works identically as .py and as .exe.
# =============================================================================

import io
import queue
import sys
import threading
import tkinter as tk
import tkinter.ttk as ttk
from pathlib import Path

__version__ = "0.1.0"

if getattr(sys, "frozen", False):
    BASE = Path(sys.executable).parent
else:
    BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))

import git_pull_all          # noqa: E402
import github_daily_report   # noqa: E402

REPORTS_DIR = BASE / "reports"

git_pull_all.OUTPUT_DIR = REPORTS_DIR
github_daily_report.OUTPUT_DIR = REPORTS_DIR

class StdoutRouter(io.TextIOBase):
    def __init__(self, fallback):
        self._fallback = fallback
        self._routes = {}

    def register(self, q):
        self._routes[threading.get_ident()] = q

    def unregister(self):
        self._routes.pop(threading.get_ident(), None)

    def write(self, text):
        q = self._routes.get(threading.get_ident())
        if q is not None:
            q.put(text)
        else:
            try:
                self._fallback.write(text)
            except Exception:
                pass
        return len(text)

    def flush(self):
        try:
            self._fallback.flush()
        except Exception:
            pass


ROUTER = StdoutRouter(sys.stdout)
sys.stdout = ROUTER
sys.stderr = ROUTER

BG      = "#0e1117"
PANEL   = "#161b22"
BORDER  = "#30363d"
ACC_P   = "#7c6af7"
ACC_R   = "#f0a500"
TEXT    = "#e6edf3"
SUB     = "#8b949e"
OKC     = "#3fb950"
ERRC    = "#f85149"
CONSOLE = "#0c0c0c"
MONO    = ("Consolas", 9)
UI      = ("Segoe UI", 10)
UISB    = ("Segoe UI Semibold", 10)
TITLE   = ("Segoe UI Semibold", 13)


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"Git Tools — Pull & Daily Report v{__version__}")
        self.geometry("1280x760")
        self.minsize(1000, 600)
        self.configure(bg=BG)

        self._pull_q    = queue.Queue()
        self._report_q  = queue.Queue()
        self._pull_busy   = False
        self._report_busy = False

        self._build()
        self.after(60, self._poll)

    def _build(self):
        hdr = tk.Frame(self, bg=PANEL, height=48)
        hdr.pack(fill="x"); hdr.pack_propagate(False)
        tk.Label(hdr, text=f"⬡  Git Tools v{__version__}", font=("Consolas", 12, "bold"),
                 bg=PANEL, fg=ACC_P, padx=16).pack(side="left", pady=10)
        tk.Label(hdr, text="Pull All  +  Daily Report  —  each runs independently",
                 font=("Segoe UI", 9), bg=PANEL, fg=SUB).pack(side="left")
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x")

        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True, padx=12, pady=12)
        body.columnconfigure(0, weight=1, uniform="col")
        body.columnconfigure(1, weight=1, uniform="col")
        body.rowconfigure(0, weight=1)

        self._build_pull_panel(body)
        self._build_report_panel(body)

    def _panel_shell(self, parent, col, title, accent, subtitle):
        outer = tk.Frame(parent, bg=BORDER, padx=1, pady=1)
        outer.grid(row=0, column=col, sticky="nsew",
                   padx=(0, 6) if col == 0 else (6, 0))
        f = tk.Frame(outer, bg=BG)
        f.pack(fill="both", expand=True)

        head = tk.Frame(f, bg=PANEL)
        head.pack(fill="x")
        tk.Label(head, text=title, font=TITLE, bg=PANEL,
                 fg=accent).pack(anchor="w", padx=14, pady=(10, 0))
        tk.Label(head, text=subtitle, font=("Segoe UI", 9), bg=PANEL,
                 fg=SUB).pack(anchor="w", padx=14, pady=(0, 10))
        return f

    def _console(self, parent):
        wrap = tk.Frame(parent, bg=BORDER, padx=1, pady=1)
        wrap.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        txt = tk.Text(wrap, bg=CONSOLE, fg="#cccccc", font=MONO,
                      relief="flat", bd=6, state="disabled", wrap="none",
                      insertbackground=TEXT)
        sb = tk.Scrollbar(wrap, command=txt.yview)
        txt.config(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        txt.pack(side="left", fill="both", expand=True)
        txt.tag_config("ok",  foreground=OKC)
        txt.tag_config("err", foreground=ERRC)
        return txt

    def _build_pull_panel(self, parent):
        f = self._panel_shell(parent, 0, "⬇  Git Pull All", ACC_P,
                              "Pulls every repo in C:\\git  •  clones new GestaltCE repos  •  HTML report saved to reports\\")

        row = tk.Frame(f, bg=BG); row.pack(fill="x", padx=10, pady=8)
        self._pull_btn = tk.Button(row, text="▶  Run Git Pull All",
                                   bg=ACC_P, fg="#ffffff", font=UISB,
                                   relief="flat", bd=0, padx=16, pady=8,
                                   activebackground="#6a59e0", cursor="hand2",
                                   command=self._run_pull)
        self._pull_btn.pack(side="left")
        self._pull_status = tk.StringVar(value="Ready")
        tk.Label(row, textvariable=self._pull_status, font=UI,
                 bg=BG, fg=SUB).pack(side="left", padx=12)
        tk.Button(row, text="📁 Reports", bg=PANEL, fg=SUB, relief="flat",
                  bd=0, font=("Segoe UI", 9), padx=10, pady=8, cursor="hand2",
                  command=self._open_reports).pack(side="right")

        self._pull_txt = self._console(f)

    def _run_pull(self):
        if self._pull_busy:
            return
        self._pull_busy = True
        self._pull_btn.config(state="disabled")
        self._pull_status.set("⏳  Running…")
        self._clear(self._pull_txt)

        def worker():
            ROUTER.register(self._pull_q)
            code = 0
            try:
                git_pull_all.main()
            except SystemExit as e:
                code = 1
                print(f"\n{e}")
            except Exception as e:
                code = 1
                print(f"\n[ERROR] {type(e).__name__}: {e}")
            finally:
                ROUTER.unregister()
                self._pull_q.put(("__DONE__", code))

        threading.Thread(target=worker, daemon=True).start()

    def _build_report_panel(self, parent):
        f = self._panel_shell(parent, 1, "📊  GitHub Daily Report", ACC_R,
                              "Commits, PRs & issues across all GestaltCE repos  •  HTML report saved to reports\\")

        row = tk.Frame(f, bg=BG); row.pack(fill="x", padx=10, pady=8)
        tk.Label(row, text="Period:", font=UI, bg=BG, fg=SUB).pack(side="left")
        self._mode = tk.StringVar(value="daily")
        style = ttk.Style(); style.theme_use("default")
        style.configure("M.TCombobox", fieldbackground="#0d1117",
                        background=PANEL, foreground=TEXT)
        cb = ttk.Combobox(row, textvariable=self._mode, style="M.TCombobox",
                          values=["daily", "weekly", "monthly"],
                          state="readonly", width=9)
        cb.pack(side="left", padx=(6, 10))

        self._report_btn = tk.Button(row, text="▶  Run Report",
                                     bg=ACC_R, fg="#000000", font=UISB,
                                     relief="flat", bd=0, padx=16, pady=8,
                                     activebackground="#d99400", cursor="hand2",
                                     command=self._run_report)
        self._report_btn.pack(side="left")
        self._report_status = tk.StringVar(value="Ready")
        tk.Label(row, textvariable=self._report_status, font=UI,
                 bg=BG, fg=SUB).pack(side="left", padx=12)
        tk.Button(row, text="📁 Reports", bg=PANEL, fg=SUB, relief="flat",
                  bd=0, font=("Segoe UI", 9), padx=10, pady=8, cursor="hand2",
                  command=self._open_reports).pack(side="right")

        self._report_txt = self._console(f)

    def _run_report(self):
        if self._report_busy:
            return
        self._report_busy = True
        self._report_btn.config(state="disabled")
        self._report_status.set("⏳  Running…")
        self._clear(self._report_txt)
        mode = self._mode.get()

        def worker():
            ROUTER.register(self._report_q)
            code = 0
            try:
                old_argv = sys.argv
                sys.argv = ["github_daily_report.py", mode]
                try:
                    github_daily_report.main()
                finally:
                    sys.argv = old_argv
            except SystemExit as e:
                code = 1
                print(f"\n{e}")
            except Exception as e:
                code = 1
                print(f"\n[ERROR] {type(e).__name__}: {e}")
            finally:
                ROUTER.unregister()
                self._report_q.put(("__DONE__", code))

        threading.Thread(target=worker, daemon=True).start()

    def _clear(self, txt):
        txt.config(state="normal")
        txt.delete("1.0", tk.END)
        txt.config(state="disabled")

    def _append(self, txt, s, tag=None):
        txt.config(state="normal")
        if tag:
            txt.insert(tk.END, s, tag)
        else:
            txt.insert(tk.END, s)
        txt.see(tk.END)
        txt.config(state="disabled")

    def _open_reports(self):
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        import os
        import subprocess
        if sys.platform == "win32":
            os.startfile(str(REPORTS_DIR))
        else:
            subprocess.Popen(["xdg-open", str(REPORTS_DIR)])

    def _poll(self):
        self._drain(self._pull_q, self._pull_txt, "pull")
        self._drain(self._report_q, self._report_txt, "report")
        self.after(60, self._poll)

    def _drain(self, q, txt, which):
        try:
            while True:
                item = q.get_nowait()
                if isinstance(item, tuple) and item[0] == "__DONE__":
                    ok = (item[1] == 0)
                    self._append(txt, "\n✅  Done.\n" if ok else "\n❌  Finished with errors.\n",
                                 "ok" if ok else "err")
                    if which == "pull":
                        self._pull_busy = False
                        self._pull_btn.config(state="normal")
                        self._pull_status.set("✅  Done" if ok else "❌  Error")
                    else:
                        self._report_busy = False
                        self._report_btn.config(state="normal")
                        self._report_status.set("✅  Done" if ok else "❌  Error")
                else:
                    self._append(txt, item)
        except queue.Empty:
            pass

if __name__ == "__main__":
    App().mainloop()
