import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  Archive,
  GitBranch,
  RefreshCw,
  GitCommit,
  CheckCircle2,
  FileCode,
  FilePlus,
  FileX,
  History,
  ExternalLink,
  Terminal,
  FolderOpen,
  Plus,
  Play,
  Layers,
  Clock,
  ShieldAlert,
  DownloadCloud,
} from 'lucide-react';
import { RepoItem, CommitItem } from '../types';

interface DashboardProps {
  repo: RepoItem | null;
  onOpenTerminal: (command?: string) => void;
  onOpenTroubleshoot: (errorSnippet?: string) => void;
  onRepoUpdated: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  repo,
  onOpenTerminal,
  onOpenTroubleshoot,
  onRepoUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'working_tree' | 'history' | 'branches'>('working_tree');
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null);

  // Commit composer state
  const [commitMessage, setCommitMessage] = useState('');
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<{ action: string; output: string } | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);

  // Load commits when active repo changes
  useEffect(() => {
    if (!repo) return;
    setIsLoadingCommits(true);
    fetch(`/api/repos/${repo.owner}/${repo.name}/commits?branch=${repo.currentBranch}`)
      .then((res) => res.json())
      .then((data) => {
        setCommits(Array.isArray(data) ? data : []);
        if (data && data.length > 0) setSelectedCommit(data[0]);
      })
      .catch((err) => console.error('Failed to load commits', err))
      .finally(() => setIsLoadingCommits(false));
  }, [repo?.fullName, repo?.currentBranch]);

  if (!repo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 select-none">
        <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <GitBranch className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-slate-200">No Repository Selected</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select a repository from the GestaltCE (c:\git), Tribernachi Foundation (c:\git\trib), or Rick Peters (c:\git\rick) sidebar.
        </p>
      </div>
    );
  }

  // Handle Git Action (Push, Pull, Archive, Stash, Checkout, Clone)
  const handleGitAction = async (action: 'pull' | 'push' | 'archive' | 'stash' | 'checkout' | 'clone', branchParam?: string) => {
    setIsPerformingAction(action);
    setActionLog(null);
    try {
      const res = await fetch('/api/git/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          repoFullName: repo.fullName,
          branch: branchParam || repo.currentBranch,
        }),
      });
      const data = await res.json();
      setActionLog({ action, output: data.output });
      onRepoUpdated();
    } catch (err: any) {
      setActionLog({ action, output: `Error executing git ${action}: ${err.message}` });
    } finally {
      setIsPerformingAction(null);
    }
  };

  // Handle Commit & Commit/Push
  const handleCommit = async (andPush: boolean = false) => {
    if (!commitMessage.trim()) return;
    setIsPerformingAction('commit');
    try {
      const res = await fetch('/api/git/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          repoFullName: repo.fullName,
          commitMessage,
          branch: repo.currentBranch,
        }),
      });
      const data = await res.json();
      setCommitMessage('');

      if (andPush) {
        await handleGitAction('push');
      } else {
        setActionLog({ action: 'commit', output: data.output });
        onRepoUpdated();
      }
    } catch (err: any) {
      setActionLog({ action: 'commit', output: `Error: ${err.message}` });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    handleGitAction('checkout', newBranchName.trim());
    repo.branches.push(newBranchName.trim());
    repo.currentBranch = newBranchName.trim();
    setNewBranchName('');
    setShowNewBranchInput(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Context & Action Toolbar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        {/* Repo Identity & Path */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2 font-mono">
              {repo.name}
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Open repository in GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </h1>

            {/* Branch Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={repo.currentBranch}
                onChange={(e) => handleGitAction('checkout', e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {repo.branches.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-200">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Branch Toggle */}
            {showNewBranchInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="feature/branch-name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-mono w-36 focus:outline-none"
                />
                <button
                  onClick={handleCreateBranch}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded text-xs"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewBranchInput(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBranchInput(true)}
                title="Create new branch"
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3" /> Branch
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <FolderOpen className="w-3 h-3 text-amber-500" />
              {repo.localPath}
            </span>
            <span>·</span>
            <span>Namespace: {repo.group}</span>
            <span>·</span>
            <span>Last Sync: {new Date(repo.lastSync).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Primary Git Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Clone Button */}
          <button
            onClick={() => handleGitAction('clone')}
            disabled={isPerformingAction !== null}
            title={`Clone this repository to ${repo.localPath}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-sm transition-colors disabled:opacity-50"
          >
            <DownloadCloud className={`w-3.5 h-3.5 ${isPerformingAction === 'clone' ? 'animate-bounce' : ''}`} />
            <span>Clone to Desktop</span>
          </button>

          {/* Pull Button */}
          <button
            onClick={() => handleGitAction('pull')}
            disabled={isPerformingAction !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-600/90 hover:bg-blue-500 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowDownToLine className={`w-3.5 h-3.5 ${isPerformingAction === 'pull' ? 'animate-bounce' : ''}`} />
            <span>Pull</span>
          </button>

          {/* Push Button */}
          <button
            onClick={() => handleGitAction('push')}
            disabled={isPerformingAction !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowUpFromLine className={`w-3.5 h-3.5 ${isPerformingAction === 'push' ? 'animate-bounce' : ''}`} />
            <span>Push</span>
          </button>

          {/* Archive Button */}
          <button
            onClick={() => handleGitAction('archive')}
            disabled={isPerformingAction !== null}
            title="Export clean ZIP archive of repo at current HEAD"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Archive Repo</span>
          </button>

          {/* Stash Button */}
          <button
            onClick={() => handleGitAction('stash')}
            disabled={isPerformingAction !== null}
            title="Stash working changes away"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Stash</span>
          </button>

          {/* Terminal Shortcut */}
          <button
            onClick={() => onOpenTerminal(`cd ${repo.localPath}`)}
            title="Open integrated terminal at this repository path"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Action Execution Output Banner if recently run */}
      {actionLog && (
        <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-start justify-between gap-4 font-mono text-xs">
          <div className="space-y-1 overflow-x-auto flex-1">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <span>[git {actionLog.action} output]</span>
              <span className="text-[11px] text-slate-500">at {new Date().toLocaleTimeString()}</span>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap text-[11px] max-h-28 overflow-y-auto">
              {actionLog.output}
            </pre>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {actionLog.output.includes('fatal') || actionLog.output.includes('FAILED') || actionLog.output.includes('Error') ? (
              <button
                onClick={() => onOpenTroubleshoot(actionLog.output)}
                className="flex items-center gap-1 text-[11px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1 rounded"
              >
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Fix with AI</span>
              </button>
            ) : null}
            <button
              onClick={() => setActionLog(null)}
              className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 text-right"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Sub Tabs: Working Tree vs Commit History vs Branches */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveSubTab('working_tree')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeSubTab === 'working_tree'
                ? 'border-amber-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Working Tree & Pending Changes</span>
            {repo.pendingChanges.length > 0 && (
              <span className="font-mono text-[10px] bg-amber-950/80 text-amber-400 px-1.5 rounded border border-amber-800/80">
                {repo.pendingChanges.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeSubTab === 'history'
                ? 'border-amber-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Commit History</span>
            <span className="font-mono text-[10px] text-slate-500">
              ({commits.length})
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('branches')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeSubTab === 'branches'
                ? 'border-amber-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Active Branches & Remotes</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          <span>Tracked in {repo.defaultBranch}</span>
        </div>
      </div>

      {/* Main Tab View Content */}
      <div className="flex-1 overflow-hidden p-4">
        {/* VIEW 1: Working Tree & Pending Changes */}
        {activeSubTab === 'working_tree' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Changed Files List & Commit Form */}
            <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/60 rounded-lg border border-slate-800 p-3 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  Modified & Pending Files ({repo.pendingChanges.length})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {repo.status === 'up_to_date' ? 'Tree Clean' : 'Uncommitted'}
                </span>
              </div>

              {/* Files List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                {repo.pendingChanges.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
                    <p className="text-xs text-slate-400">Working tree clean</p>
                    <p className="text-[11px] text-slate-600">
                      No uncommitted changes in {repo.localPath}
                    </p>
                  </div>
                ) : (
                  repo.pendingChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            change.status === 'M'
                              ? 'text-amber-400 bg-amber-950/50'
                              : change.status === 'A'
                              ? 'text-emerald-400 bg-emerald-950/50'
                              : 'text-rose-400 bg-rose-950/50'
                          }`}
                        >
                          {change.status}
                        </span>
                        <span className="text-slate-300 truncate">{change.file}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {change.staged ? 'Staged' : 'Unstaged'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Commit Composer Box */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Commit Message</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    to {repo.currentBranch}
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of changes (e.g. fix: resolve socket timeout and sync telemetry schema)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder:text-slate-600 font-mono focus:outline-none focus:border-slate-700"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCommit(false)}
                    disabled={!commitMessage.trim() || isPerformingAction !== null}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-40"
                  >
                    Commit to {repo.currentBranch}
                  </button>
                  <button
                    onClick={() => handleCommit(true)}
                    disabled={!commitMessage.trim() || isPerformingAction !== null}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-40"
                  >
                    Commit & Push
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Diff Preview */}
            <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/60 rounded-lg border border-slate-800 p-3 space-y-2 overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-200 font-mono">
                  Diff View: {repo.pendingChanges[0]?.file || 'HEAD comparison'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  +14 additions · -3 deletions
                </span>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950 rounded border border-slate-800/80 p-3 font-mono text-xs space-y-0.5">
                <div className="text-slate-500">@@ -28,7 +28,14 @@ export async function synchronize() &#123;</div>
                <div className="text-slate-400">   const connection = await openChannel();</div>
                <div className="text-rose-400 bg-rose-950/30 px-1 rounded">-  await connection.flushBuffer();</div>
                <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+  // Optimized batch write with timeout handling</div>
                <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+  await connection.flushBufferWithRetry(&#123; maxRetries: 3 &#125;);</div>
                <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+  telemetry.recordEvent('sync_success', &#123; timestamp: Date.now() &#125;);</div>
                <div className="text-slate-400">   return connection.getStatus();</div>
                <div className="text-slate-500"> &#125;</div>
                <div className="mt-4 text-slate-500">@@ -54,3 +61,8 @@ export const DEFAULT_CONFIG = &#123;</div>
                <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+  timeoutMs: 15000,</div>
                <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+  workspaceBase: 'c:/git',</div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Commit History */}
        {activeSubTab === 'history' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Commits List */}
            <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/60 rounded-lg border border-slate-800 p-3 space-y-2 overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200">
                  Commit Log on {repo.currentBranch}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {commits.length} commits recorded
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {isLoadingCommits ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    Fetching commit history from GitHub...
                  </div>
                ) : commits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No commits found on this branch.
                  </div>
                ) : (
                  commits.map((commit) => {
                    const isSelected = selectedCommit?.sha === commit.sha;
                    return (
                      <div
                        key={commit.sha}
                        onClick={() => setSelectedCommit(commit)}
                        className={`p-3 rounded border cursor-pointer transition-colors space-y-1.5 ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-600/60 text-slate-100'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium font-mono text-slate-200 truncate">
                            {commit.message}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40 shrink-0">
                            {commit.shortSha}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            {commit.authorAvatar && (
                              <img
                                src={commit.authorAvatar}
                                alt={commit.author}
                                className="w-3.5 h-3.5 rounded-full"
                              />
                            )}
                            {commit.author}
                          </span>
                          <span>·</span>
                          <span>{new Date(commit.date).toLocaleDateString()}</span>
                          <span>·</span>
                          <span>{new Date(commit.date).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Commit Details Inspector */}
            <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/60 rounded-lg border border-slate-800 p-3 space-y-3 overflow-hidden">
              <div className="pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200">Commit Details</span>
              </div>

              {selectedCommit ? (
                <div className="space-y-4 font-mono text-xs flex-1 overflow-y-auto">
                  <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block uppercase tracking-wider">
                      Commit SHA
                    </span>
                    <span className="text-slate-200 text-xs break-all select-all text-amber-400">
                      {selectedCommit.sha}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] block uppercase tracking-wider">
                      Message
                    </span>
                    <p className="text-slate-200 text-xs whitespace-pre-wrap bg-slate-950 p-2.5 rounded border border-slate-800">
                      {selectedCommit.message}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] block uppercase tracking-wider">
                      Author Info
                    </span>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div>Name: {selectedCommit.author}</div>
                      <div>Email: {selectedCommit.authorEmail}</div>
                      <div>Date: {new Date(selectedCommit.date).toISOString()}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] block uppercase tracking-wider">
                      Actions
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenTerminal(`git show ${selectedCommit.sha}`)}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs text-center"
                      >
                        Inspect in Terminal
                      </button>
                      <button
                        onClick={() =>
                          onOpenTerminal(`git archive --format=zip ${selectedCommit.shortSha} -o ${repo.name}_${selectedCommit.shortSha}.zip`)
                        }
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 text-xs text-center"
                      >
                        Archive at this SHA
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 p-6 text-center">
                  Select a commit from the list to view metadata.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: Active Branches & Remotes */}
        {activeSubTab === 'branches' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Local Branches ({repo.branches.length})</span>
                <span className="text-[11px] text-slate-500 font-mono">HEAD: {repo.currentBranch}</span>
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {repo.branches.map((b) => (
                  <div
                    key={b}
                    className={`p-2.5 rounded border flex items-center justify-between ${
                      b === repo.currentBranch
                        ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{b}</span>
                      {b === repo.defaultBranch && (
                        <span className="text-[10px] text-slate-500 uppercase">default</span>
                      )}
                    </div>
                    {b !== repo.currentBranch && (
                      <button
                        onClick={() => handleGitAction('checkout', b)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                      >
                        Checkout
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200">Remote Configurations (origin)</h3>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">FETCH URL</span>
                  <span className="text-sky-400 break-all">{repo.htmlUrl}.git</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PUSH URL</span>
                  <span className="text-sky-400 break-all">{repo.htmlUrl}.git</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">LOCAL ROOT</span>
                  <span className="text-amber-400">{repo.localPath}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
