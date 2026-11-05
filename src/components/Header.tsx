import React from 'react';
import { GitBranch, Terminal, ShieldAlert, Layers, RefreshCw, FolderGit2, CheckCircle2, Download, HelpCircle, Key, AlertTriangle } from 'lucide-react';
import { UserProfile, RepoItem } from '../types';

interface HeaderProps {
  profile: UserProfile | null;
  activeTab: 'dashboard' | 'tools' | 'terminal' | 'troubleshoot';
  setActiveTab: (tab: 'dashboard' | 'tools' | 'terminal' | 'troubleshoot') => void;
  activeRepo: RepoItem | null;
  onRefreshRepos: () => void;
  isRefreshing: boolean;
  onOpenCloneModal: () => void;
  onOpenRunGuide: () => void;
  onOpenTokenModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  activeRepo,
  onRefreshRepos,
  isRefreshing,
  onOpenCloneModal,
  onOpenRunGuide,
  onOpenTokenModal,
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/download/zip');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gitstudio-desktop_v2.5.2.zip';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 500);
    } catch (err) {
      window.location.href = '/api/download/zip';
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-3 flex items-center justify-between gap-3 overflow-x-auto overflow-y-hidden select-none shrink-0 scrollbar-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 font-bold">
          <GitBranch className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            GitStudio Desktop
          </span>
          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
            v2.4.0 · C:\git
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Tabs (Single line, compact) */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          title="Repository Dashboard"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          {activeRepo && (
            <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.2 bg-amber-950/50 rounded border border-amber-800/60 max-w-[110px] truncate">
              {activeRepo.name}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          title="Git Tools (Batch Pull All & Daily Report)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tools'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Git Tools</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          title="Terminal CLI"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'terminal'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Terminal</span>
        </button>

        <button
          onClick={() => setActiveTab('troubleshoot')}
          title="Troubleshooting Agent"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'troubleshoot'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Troubleshoot</span>
        </button>
      </nav>

      {/* Zone 3: Account & Primary Actions (Prioritizing API/Token button first) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRefreshRepos}
          disabled={isRefreshing}
          title="Refresh All Repositories"
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* PRIMARY: API / Personal Access Token Button placed up front */}
        <button
          onClick={onOpenTokenModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
            profile?.tokenStatus === 'valid'
              ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/80 shadow-sm'
              : profile?.tokenStatus === 'invalid'
              ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800 animate-pulse'
              : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/80'
          }`}
          title="Configure GitHub API Key / Personal Access Token"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {profile?.tokenStatus === 'valid'
              ? 'API: Active'
              : profile?.tokenStatus === 'invalid'
              ? 'API: 401 Error'
              : 'API / Token'}
          </span>
        </button>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm whitespace-nowrap shrink-0 disabled:opacity-50"
          title="Download complete project ZIP file to run on your desktop"
        >
          <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
          <span>{isDownloading ? 'Downloading...' : 'Download ZIP'}</span>
        </button>

        <button
          onClick={onOpenRunGuide}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors whitespace-nowrap shrink-0"
          title="View instructions on running locally"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
          <span>Guide</span>
        </button>

        <button
          onClick={onOpenCloneModal}
          className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors whitespace-nowrap shrink-0"
        >
          + Clone
        </button>

        {profile && (
          <button
            onClick={onOpenTokenModal}
            className="flex items-center gap-1.5 pl-2 border-l border-slate-800 hover:bg-slate-900/50 p-1 rounded transition-colors text-left"
            title="GitHub Account & Token Settings"
          >
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="w-6 h-6 rounded-full border border-slate-700"
            />
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-medium text-slate-200 leading-tight truncate max-w-[100px]">
                {profile.username}
              </span>
              <span
                className={`text-[9px] flex items-center justify-end gap-1 font-mono ${
                  profile.tokenStatus === 'valid'
                    ? 'text-emerald-400'
                    : profile.tokenStatus === 'invalid'
                    ? 'text-rose-400 font-semibold'
                    : 'text-amber-400'
                }`}
              >
                {profile.tokenStatus === 'valid' ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5" /> OK
                  </>
                ) : profile.tokenStatus === 'invalid' ? (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5" /> 401
                  </>
                ) : (
                  'Public'
                )}
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
