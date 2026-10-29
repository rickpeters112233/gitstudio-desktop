import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, Copy, Check, ShieldAlert, Sparkles, CornerDownLeft } from 'lucide-react';
import { RepoItem } from '../types';

interface TerminalProps {
  activeRepo: RepoItem | null;
  onOpenTroubleshoot: (errorSnippet: string) => void;
  initialCommand?: string;
}

interface CommandRecord {
  id: string;
  command: string;
  output: string;
  cwd: string;
  timestamp: string;
  exitCode: number;
}

export const TerminalView: React.FC<TerminalProps> = ({
  activeRepo,
  onOpenTroubleshoot,
  initialCommand,
}) => {
  const [cwd, setCwd] = useState(activeRepo ? activeRepo.localPath : 'c:/git');
  const [inputCommand, setInputCommand] = useState(initialCommand || '');
  const [history, setHistory] = useState<CommandRecord[]>([
    {
      id: '1',
      command: 'git status',
      cwd: activeRepo ? activeRepo.localPath : 'c:/git',
      output: [
        `On branch ${activeRepo ? activeRepo.currentBranch : 'main'}`,
        "Your branch is up to date with 'origin/main'.",
        'nothing to commit, working tree clean',
      ].join('\n'),
      timestamp: new Date().toLocaleTimeString(),
      exitCode: 0,
    },
  ]);
  const [commandHistoryList, setCommandHistoryList] = useState<string[]>(['git status']);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync working dir when active repo changes
  useEffect(() => {
    if (activeRepo) {
      setCwd(activeRepo.localPath);
    }
  }, [activeRepo?.localPath]);

  // Handle prefilled command if passed
  useEffect(() => {
    if (initialCommand) {
      setInputCommand(initialCommand);
      inputRef.current?.focus();
    }
  }, [initialCommand]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmdToRun?: string) => {
    const raw = cmdToRun !== undefined ? cmdToRun : inputCommand;
    const cmd = raw.trim();
    if (!cmd) return;

    if (cmd === 'clear' || cmd === 'cls') {
      setHistory([]);
      setInputCommand('');
      return;
    }

    setIsExecuting(true);
    setCommandHistoryList((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
    setHistoryIndex(-1);

    try {
      const res = await fetch('/api/git/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          cwd,
          repoFullName: activeRepo?.fullName,
        }),
      });
      const data = await res.json();

      if (data.output === '__CLEAR__') {
        setHistory([]);
      } else {
        setHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            command: cmd,
            output: data.output,
            cwd: data.cwd || cwd,
            timestamp: new Date().toLocaleTimeString(),
            exitCode: data.exitCode,
          },
        ]);
        if (data.cwd) setCwd(data.cwd);
      }
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cmd,
          output: `Command failed: ${err.message}`,
          cwd,
          timestamp: new Date().toLocaleTimeString(),
          exitCode: 1,
        },
      ]);
    } finally {
      setIsExecuting(false);
      setInputCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistoryList.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, commandHistoryList.length - 1);
        setHistoryIndex(nextIdx);
        setInputCommand(commandHistoryList[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(commandHistoryList[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const copyOutput = (record: CommandRecord) => {
    navigator.clipboard.writeText(`$ ${record.command}\n${record.output}`);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_COMMANDS = [
    'git status',
    'git pull',
    'git push',
    'git log --oneline -n 5',
    'git branch -a',
    'git diff',
    'git archive --format=zip HEAD -o archive.zip',
    'git remote -v',
    'git stash',
    'help',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b14] text-slate-200 overflow-hidden font-mono select-none">
      {/* Terminal Top Control Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-100">GitStudio Terminal</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px] truncate max-w-sm">
            {cwd.replace(/\//g, '\\')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistory([])}
            title="Clear Terminal (clear / cls)"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Git Commands Bar */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
        <span className="text-slate-500 shrink-0">Quick Run:</span>
        {QUICK_COMMANDS.map((qc) => (
          <button
            key={qc}
            onClick={() => executeCommand(qc)}
            className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {qc}
          </button>
        ))}
      </div>

      {/* Terminal History Log Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text selection:bg-emerald-950 selection:text-emerald-200"
      >
        <div className="text-slate-500 text-[11px] pb-2 border-b border-slate-800/50">
          GitStudio Embedded Shell [Version 2.4.0] · Emulating Git CLI v2.48.1 (Windows x64)
          <br />
          Type <span className="text-amber-400">help</span> for available commands or execute any standard git command.
        </div>

        {history.map((record) => (
          <div key={record.id} className="space-y-1 group">
            {/* Command Header Prompt */}
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-400 font-semibold">
                  {record.cwd.replace(/\//g, '\\')}&gt;
                </span>
                <span className="text-emerald-300 font-medium">{record.command}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                {record.output.includes('fatal:') || record.output.includes('error:') || record.exitCode !== 0 ? (
                  <button
                    onClick={() => onOpenTroubleshoot(record.output)}
                    className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/50"
                  >
                    <ShieldAlert className="w-2.5 h-2.5" /> Troubleshoot with AI
                  </button>
                ) : null}
                <button
                  onClick={() => copyOutput(record)}
                  className="text-slate-500 hover:text-slate-300 text-[10px] flex items-center gap-1"
                >
                  {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === record.id ? 'Copied' : 'Copy'}</span>
                </button>
                <span className="text-[10px] text-slate-600">{record.timestamp}</span>
              </div>
            </div>

            {/* Output Display */}
            {record.output && (
              <pre
                className={`whitespace-pre-wrap pl-2 border-l-2 leading-relaxed ${
                  record.exitCode !== 0 || record.output.includes('fatal:')
                    ? 'border-rose-700/80 text-rose-300 bg-rose-950/20 p-2 rounded'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                {record.output}
              </pre>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Terminal Input Line */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex items-center gap-2 shrink-0">
        <span className="text-amber-400 text-xs shrink-0 font-bold">
          {cwd.replace(/\//g, '\\')}&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type git command (e.g. git status, git pull, git archive)..."
          className="flex-1 bg-transparent border-none text-emerald-300 text-xs font-mono focus:outline-none placeholder:text-slate-600"
          autoFocus
          disabled={isExecuting}
        />
        <button
          onClick={() => executeCommand()}
          disabled={!inputCommand.trim() || isExecuting}
          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 disabled:opacity-40 transition-colors shrink-0"
          title="Run command (Enter)"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
