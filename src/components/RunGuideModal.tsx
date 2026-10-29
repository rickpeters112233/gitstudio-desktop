import React, { useState } from 'react';
import { X, Download, Terminal, Folder, Play, Check, Copy, Laptop, ExternalLink } from 'lucide-react';

interface RunGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunGuideModal: React.FC<RunGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-mono">
                How to Download & Run GitStudio Desktop
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Code location & local desktop installation instructions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs font-sans">
          {/* Section 1: Where is the code */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-xs uppercase tracking-wider">
              <Folder className="w-4 h-4" />
              <span>1. Codebase Structure & Location</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              All source code files are stored in the project workspace:
            </p>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div><span className="text-sky-400">/server.ts</span> — Full-stack Express backend with GitHub API sync, Git CLI handler, and Gemini AI</div>
              <div><span className="text-sky-400">/src/App.tsx</span> — Main desktop interface orchestrator</div>
              <div><span className="text-sky-400">/src/components/Dashboard.tsx</span> — Repo dashboard (Pull, Push, Archive, Working Tree diff, Commits)</div>
              <div><span className="text-sky-400">/src/components/GitTools.tsx</span> — Batch "Git Pull All" & "GitHub Daily Report"</div>
              <div><span className="text-sky-400">/src/components/Terminal.tsx</span> — Integrated interactive Git CLI shell</div>
              <div><span className="text-sky-400">/src/components/Troubleshooter.tsx</span> — Gemini 3.8 Flash AI diagnostic agent</div>
              <div><span className="text-sky-400">/src/components/Sidebar.tsx</span> — Repository navigation grouped by GestaltCE (c:/git), Trib (c:/git/trib), Rick (c:/git/rick)</div>
            </div>
          </div>

          {/* Section 2: Download Package */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-xs uppercase tracking-wider">
              <Download className="w-4 h-4" />
              <span>2. 1-Click Download App (.zip)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Click below to download the complete source code archive:
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/download/zip');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'gitstudio-desktop.zip';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }, 500);
                  } catch (e) {
                    window.location.href = '/api/download/zip';
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download gitstudio-desktop.zip (73 KB)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Instant Windows PowerShell 1-Liner */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-xs uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>3. Or Instant Windows 1-Liner (PowerShell)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              If Windows Explorer blocks browser zip downloads, run this single command in PowerShell to download & extract directly into <span className="font-mono text-amber-300">C:\git\gitstudio</span>:
            </p>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
              <code className="text-emerald-300 whitespace-pre">
                iwr "{window.location.origin}/api/download/zip" -OutFile "$env:TEMP\gitstudio.zip"; Expand-Archive "$env:TEMP\gitstudio.zip" "C:\git\gitstudio" -Force
              </code>
              <button
                onClick={() =>
                  copyText(
                    `iwr "${window.location.origin}/api/download/zip" -OutFile "$env:TEMP\\gitstudio.zip"; Expand-Archive "$env:TEMP\\gitstudio.zip" "C:\\git\\gitstudio" -Force`,
                    'ps'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 shrink-0"
              >
                {copiedCmd === 'ps' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'ps' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Section 4: How to run on your desktop */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-semibold font-mono text-xs uppercase tracking-wider">
              <Laptop className="w-4 h-4" />
              <span>4. Running Locally on Your Desktop</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Once extracted into <span className="font-mono text-amber-300">C:\git\gitstudio</span>, you can simply <strong>double-click</strong>:
            </p>

            <div className="bg-emerald-950/40 p-3 rounded border border-emerald-800 font-mono text-xs flex items-center justify-between text-emerald-200">
              <div>
                <span className="font-bold text-emerald-300 block">start-gitstudio.bat</span>
                <span className="text-[11px] text-emerald-400">1-click launcher: checks dependencies, opens browser, and runs on port 8080</span>
              </div>
              <button
                onClick={() => copyText('.\\start-gitstudio.bat', 'bat')}
                className="px-2.5 py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white text-[11px] flex items-center gap-1 shrink-0"
              >
                {copiedCmd === 'bat' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'bat' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-slate-400 text-[11px]">
              Or run via manual terminal commands:
            </p>

            <div className="space-y-2">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                <span className="text-emerald-300">npm install</span>
                <button
                  onClick={() => copyText('npm install', 'install')}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                >
                  {copiedCmd === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'install' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                <span className="text-emerald-300">npm run dev:8080</span>
                <button
                  onClick={() => copyText('npm run dev:8080', 'dev8080')}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                >
                  {copiedCmd === 'dev8080' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'dev8080' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                <span className="text-emerald-300">npm run dev:8888</span>
                <button
                  onClick={() => copyText('npm run dev:8888', 'dev8888')}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                >
                  {copiedCmd === 'dev8888' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'dev8888' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <p className="text-slate-400 text-[11px]">
              If port <strong className="text-rose-400 font-mono">3000</strong> or <strong className="text-rose-400 font-mono">7080</strong> is already occupied on your computer, you can run on port <strong className="text-emerald-400 font-mono">8080</strong> using <code className="text-amber-300">npm run dev:8080</code> (or on port <strong className="text-emerald-400 font-mono">8888</strong> using <code className="text-amber-300">npm run dev:8888</code>). The server also has auto-detection: if 3000 is occupied, it automatically shifts to 8080.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
