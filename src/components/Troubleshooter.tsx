import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sparkles,
  Play,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  HelpCircle,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { DiagnosticResult, RepoItem } from '../types';

interface TroubleshooterProps {
  initialErrorSnippet?: string;
  activeRepo: RepoItem | null;
  onExecuteCommandInTerminal: (command: string) => void;
}

export const Troubleshooter: React.FC<TroubleshooterProps> = ({
  initialErrorSnippet,
  activeRepo,
  onExecuteCommandInTerminal,
}) => {
  const [errorInput, setErrorInput] = useState(
    initialErrorSnippet ||
      `fatal: repository 'https://github.com/GestaltCE/Tribernachi-Foundation.git/' not found\nPULL FAILED (switched dead branch -> main)`
  );
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (initialErrorSnippet) {
      setErrorInput(initialErrorSnippet);
      handleAnalyze(initialErrorSnippet);
    }
  }, [initialErrorSnippet]);

  const handleAnalyze = async (customSnippet?: string) => {
    setIsLoading(true);
    setDiagnostic(null);
    try {
      const res = await fetch('/api/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorContext: customSnippet || errorInput,
          userQuery: userQuery || 'Diagnose this Git error and provide immediate terminal resolution commands.',
          activeRepo: activeRepo?.fullName,
          localPath: activeRepo?.localPath || 'c:/git',
        }),
      });
      const data = await res.json();
      if (data.result) {
        setDiagnostic(data.result);
      }
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const PRESETS = [
    {
      title: 'Fatal 404 Remote Not Found',
      snippet: `fatal: repository 'https://github.com/GestaltCE/Tribernachi-Foundation.git/' not found\nPULL FAILED (switched dead branch -> main)`,
      desc: 'Organization namespace collision (GestaltCE vs Tribernachi-Foundation)',
    },
    {
      title: 'Windows File Lock (.git/index.lock)',
      snippet: `fatal: Unable to create 'c:/git/trib/TMS/.git/index.lock': File exists.\nAnother git process seems to be running in this repository.`,
      desc: 'Dangling process holding index lock on Windows file system',
    },
    {
      title: 'Local Changes Overwritten by Merge',
      snippet: `error: Your local changes to the following files would be overwritten by merge:\n  src/config/runtime.ts\nPlease commit your changes or stash them before you merge.`,
      desc: 'Dirty working tree preventing fast-forward pull',
    },
    {
      title: '403 Forbidden / Token Permission Denied',
      snippet: `remote: Permission to Tribernachi-Foundation/Lydian_Node_V002.1.git denied to rickpeters112233.\nfatal: unable to access 'https://github.com/...': The requested URL returned error: 403`,
      desc: 'Missing PAT repo write or SSO organization authorization',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] text-slate-200 overflow-y-auto p-6 font-sans select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-semibold text-slate-100">
                AI Troubleshooting Agent
              </h1>
              <span className="text-xs bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded font-mono">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated diagnostics for Git connection errors, PAT permissions, branch collisions, and local Windows file path conflicts (<span className="font-mono text-amber-400">c:/git</span>, <span className="font-mono text-amber-400">c:/git/trib</span>, <span className="font-mono text-amber-400">c:/git/rick</span>).
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono">
            <div>Account: rickpeters112233</div>
            <div>Context: {activeRepo ? activeRepo.localPath : 'c:/git'}</div>
          </div>
        </div>

        {/* Quick Diagnostics Presets */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Common Error Scenarios
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESETS.map((p, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setErrorInput(p.snippet);
                  handleAnalyze(p.snippet);
                }}
                className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 cursor-pointer transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                  <span className="group-hover:text-amber-400 transition-colors font-mono">
                    {p.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Run Diagnosis →</span>
                </div>
                <p className="text-[11px] text-slate-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3 bg-slate-900/50 rounded-lg border border-slate-800 p-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Error Log or Console Output</span>
              <span className="text-[11px] text-slate-500 font-mono">Paste terminal output below</span>
            </label>
            <textarea
              rows={4}
              value={errorInput}
              onChange={(e) => setErrorInput(e.target.value)}
              placeholder="Paste git error or conflict message here..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-rose-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Optional: Ask specific question (e.g. How do I fix the remote URL without losing my commits?)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !errorInput.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-xs shadow-md shadow-rose-900/30 transition-all disabled:opacity-50 shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Diagnosing...' : 'Analyze with AI'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Results Card */}
        {diagnostic && (
          <div className="space-y-4 bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-xl animate-fadeIn">
            {/* Summary & Severity */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {diagnostic.summary}
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  diagnostic.severity === 'critical'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                Severity: {diagnostic.severity}
              </span>
            </div>

            {/* Root Cause Analysis */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block font-mono">
                1. Root Cause Analysis
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded border border-slate-800/80">
                {diagnostic.rootCause}
              </p>
            </div>

            {/* Recommended Fix */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block font-mono">
                2. Recommended Solution
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded border border-slate-800/80 whitespace-pre-wrap">
                {diagnostic.recommendedFix}
              </p>
            </div>

            {/* Suggested 1-Click Terminal Commands */}
            {diagnostic.suggestedCommands && diagnostic.suggestedCommands.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block font-mono">
                  3. Executable Remediation Commands
                </span>
                <div className="space-y-2">
                  {diagnostic.suggestedCommands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 gap-3"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-emerald-400 font-bold">$</span>
                        <span className="truncate text-emerald-300">{cmd}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copyCommand(cmd)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                        >
                          {copiedCmd === cmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCmd === cmd ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => onExecuteCommandInTerminal(cmd)}
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Run in Terminal</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preventative Tip */}
            {diagnostic.preventativeTip && (
              <div className="p-3 rounded bg-amber-950/30 border border-amber-900/60 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Path & Architecture Advisory:</span>
                  <span className="text-amber-300/90">{diagnostic.preventativeTip}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
