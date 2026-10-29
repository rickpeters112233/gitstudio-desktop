import React, { useState } from 'react';
import {
  ArrowDownToLine,
  BarChart3,
  Play,
  FileText,
  CheckSquare,
  AlertTriangle,
  FolderOpen,
  ShieldAlert,
  Terminal,
  Download,
} from 'lucide-react';
import { GitReport } from '../types';

interface GitToolsProps {
  onOpenReportModal: (report: GitReport) => void;
  onOpenTroubleshoot: (errorSnippet: string) => void;
  onOpenTerminal: (command?: string) => void;
}

export const GitTools: React.FC<GitToolsProps> = ({
  onOpenReportModal,
  onOpenTroubleshoot,
  onOpenTerminal,
}) => {
  // Pull All State
  const [pullScope, setPullScope] = useState<'all' | 'gestaltce' | 'trib' | 'rick'>('all');
  const [isPullRunning, setIsPullRunning] = useState(false);
  const [pullStatus, setPullStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [pullLog, setPullLog] = useState<string>(
    [
      'superstreamer-proof-of-performance [main] ... UP TO DATE',
      'tce [master] ... UP TO DATE',
      'TEM-E [main] ... UP TO DATE',
      'tgss-mem [main] ... UP TO DATE',
      'TMS [main] ... UP TO DATE',
      'tribernachi-coherent-substrate [master] ... UP TO DATE',
      'Tribernachi-Elements [main] ... UP TO DATE',
      'tribernachi-empirical-catalog [main] ... UP TO DATE',
      'Tribernachi-Foundation [main] ... >> remote: Repository not found.',
      "fatal: repository 'https://github.com/GestaltCE/Tribernachi-Foundation.git/' not found",
      'PULL FAILED (switched dead branch -> main)',
      'Tribernachi-Memory-Layer [master] ... UP TO DATE',
      'tribernachi-micronode-demo [main] ... UP TO DATE',
      'tribernachi-m1 [main] ... STASH WARN',
      'tribernachi-prime-demo [main] ... UP TO DATE',
      'tribernachi-site [master] ... UP TO DATE',
      'tribernachi-skills [master] ... UP TO DATE',
      'tribernachi-style [master] ... UP TO DATE',
      'tribernachi-trust [master] ... UP TO DATE',
      'ttem-platform [master] ... UP TO DATE',
      'vitrea [main] ... UP TO DATE',
      'web-estate [master] ... UP TO DATE',
      'whatsapp-bridge [master] ... UP TO DATE',
      'wiki [main] ... UP TO DATE',
      'word-cloud [main] ... UP TO DATE',
      '',
      '=====================================',
      'Total repos     : 84',
      'Updated         : 1',
      'Up to date      : 69',
      'Cloned new      : 0',
      'Switched branch : 7',
      'Failed          : 14',
      `Report saved    : C:\\git\\reports\\git_pull_all_${new Date().toISOString().slice(0, 10)}.html`,
      '=====================================',
    ].join('\n')
  );
  const [lastPullReport, setLastPullReport] = useState<GitReport | null>(null);

  // Daily Report State
  const [reportPeriod, setReportPeriod] = useState<'daily' | '3days' | 'weekly'>('daily');
  const [isReportRunning, setIsReportRunning] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [reportLog, setReportLog] = useState<string>('');
  const [lastDailyReport, setLastDailyReport] = useState<GitReport | null>(null);

  // Execute Git Pull All
  const runGitPullAll = async () => {
    setIsPullRunning(true);
    setPullStatus('running');
    setPullLog(`[INITIATING BATCH PULL] Scanning repositories across scope: ${pullScope.toUpperCase()}...\n`);

    try {
      const res = await fetch('/api/batch/pull-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: pullScope }),
      });
      const data = await res.json();
      if (data.report) {
        setPullLog(data.report.log);
        setLastPullReport(data.report);
      }
      setPullStatus('done');
    } catch (err: any) {
      setPullLog((prev) => prev + `\n[ERROR]: ${err.message}`);
      setPullStatus('done');
    } finally {
      setIsPullRunning(false);
    }
  };

  // Execute Daily Report
  const runDailyReport = async () => {
    setIsReportRunning(true);
    setReportStatus('running');
    setReportLog(`Fetching commits, PRs, and issues for period: ${reportPeriod}...\n`);

    try {
      const res = await fetch('/api/batch/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: reportPeriod }),
      });
      const data = await res.json();
      if (data.report) {
        setReportLog(
          [
            `GitHub Daily Report generated for GestaltCE, Tribernachi-Foundation, rickpeters112233`,
            `Coverage: ${data.report.summary.total} repositories`,
            `Period: ${reportPeriod.toUpperCase()}`,
            '',
            data.report.log,
            '',
            `Report file saved: ${data.report.path}`,
          ].join('\n')
        );
        setLastDailyReport(data.report);
      }
      setReportStatus('done');
    } catch (err: any) {
      setReportLog((prev) => prev + `\n[ERROR]: ${err.message}`);
      setReportStatus('done');
    } finally {
      setIsReportRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden select-none">
      {/* Header Bar matching screenshot: "Git Tools | Pull All + Daily Report — each runs independently" */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border border-sky-400 flex items-center justify-center text-sky-400 text-xs font-bold">
            ⬡
          </div>
          <h1 className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
            Git Tools
          </h1>
          <span className="text-xs text-slate-400 font-mono">
            Pull All + Daily Report — each runs independently
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Reports Path:</span>
          <span className="text-amber-400">C:\git\reports\</span>
        </div>
      </div>

      {/* Main Dual Cards Split Container */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* CARD 1: Git Pull All (Left Card) */}
        <div className="flex flex-col h-full rounded-lg border border-slate-800/90 bg-[#0d1322] overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-sky-400">
              <ArrowDownToLine className="w-5 h-5" />
              <h2 className="text-base font-semibold text-slate-100 tracking-tight">
                Git Pull All
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Pulls every repo in C:\git (GestaltCE), C:\git\trib, C:\git\rick • clones new repos • HTML report saved to reports\
            </p>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={runGitPullAll}
                  disabled={isPullRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isPullRunning ? 'animate-spin' : ''}`} />
                  <span>Run Git Pull All</span>
                </button>

                {/* Scope selector */}
                <select
                  value={pullScope}
                  onChange={(e: any) => setPullScope(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                >
                  <option value="all">All (c:\git, trib, rick)</option>
                  <option value="gestaltce">GestaltCE (c:\git)</option>
                  <option value="trib">Tribernachi (c:\git\trib)</option>
                  <option value="rick">Rick Peters (c:\git\rick)</option>
                </select>

                {pullStatus === 'done' && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono font-medium">
                    <CheckSquare className="w-3.5 h-3.5" /> Done
                  </span>
                )}
                {isPullRunning && (
                  <span className="text-xs text-amber-400 font-mono animate-pulse">
                    Pulling repos...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {lastPullReport && (
                  <button
                    onClick={() => onOpenReportModal(lastPullReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>View HTML</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Terminal Console Output Window */}
          <div className="flex-1 p-3 bg-[#080d1a] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-[11px] font-mono text-slate-500">
              <span>BATCH LOG OUTPUT</span>
              {pullLog.includes('fatal:') && (
                <button
                  onClick={() => onOpenTroubleshoot(pullLog)}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
                >
                  <ShieldAlert className="w-3 h-3" /> Fix Failures with AI
                </button>
              )}
            </div>
            <pre className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 p-2 whitespace-pre select-text selection:bg-sky-900">
              {pullLog}
            </pre>
          </div>
        </div>

        {/* CARD 2: GitHub Daily Report (Right Card) */}
        <div className="flex flex-col h-full rounded-lg border border-slate-800/90 bg-[#0d1322] overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <BarChart3 className="w-5 h-5" />
              <h2 className="text-base font-semibold text-slate-100 tracking-tight">
                GitHub Daily Report
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Commits, PRs & issues across GestaltCE, Tribernachi & Rick Peters repos • HTML report saved to reports\
            </p>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <span>Period:</span>
                  <select
                    value={reportPeriod}
                    onChange={(e: any) => setReportPeriod(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="daily">daily</option>
                    <option value="3days">3 days</option>
                    <option value="weekly">weekly</option>
                  </select>
                </div>

                <button
                  onClick={runDailyReport}
                  disabled={isReportRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isReportRunning ? 'animate-spin' : ''}`} />
                  <span>Run Report</span>
                </button>

                <span className="text-xs text-slate-400 font-mono">
                  {reportStatus === 'done' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : isReportRunning ? (
                    <span className="text-amber-400 animate-pulse">Compiling...</span>
                  ) : (
                    'Ready'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {lastDailyReport && (
                  <button
                    onClick={() => onOpenReportModal(lastDailyReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>View HTML</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Terminal / Report Display Window */}
          <div className="flex-1 p-3 bg-[#080d1a] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-[11px] font-mono text-slate-500">
              <span>REPORT PREVIEW & TELEMETRY</span>
              {lastDailyReport && (
                <span className="text-amber-400">
                  {lastDailyReport.summary.total} repos analyzed
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] text-slate-300 space-y-3">
              {reportLog ? (
                <pre className="whitespace-pre-wrap leading-relaxed select-text selection:bg-amber-900/60">
                  {reportLog}
                </pre>
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <BarChart3 className="w-8 h-8 mx-auto text-slate-700" />
                  <p>Click "Run Report" above to aggregate commits and pull requests.</p>
                  <p className="text-[10px] text-slate-600">
                    Reports will compile into HTML format and persist under reports\ directory.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
