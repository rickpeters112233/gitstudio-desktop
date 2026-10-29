import React from 'react';
import { GitBranch, Terminal, ShieldAlert, Layers, RefreshCw, FolderGit2, CheckCircle2, Download, HelpCircle } from 'lucide-react';
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
      a.download = 'gitstudio-desktop.zip';
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
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between gap-8 shrink-0 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 font-bold">
          <GitBranch className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            GitStudio Desktop
          </span>
          <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
            v2.4.0 · C:\git
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Tabs (Single line, whitespace-nowrap) */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Repository Dashboard</span>
          {activeRepo && (
            <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.2 bg-amber-950/50 rounded border border-amber-800/60 max-w-[140px] truncate">
              {activeRepo.name}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tools'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Git Tools (Pull All & Daily Report)</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'terminal'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Terminal CLI</span>
        </button>

        <button
          onClick={() => setActiveTab('troubleshoot')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'troubleshoot'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Troubleshooting Agent</span>
        </button>
      </nav>

      {/* Zone 3: Account & Primary Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onRefreshRepos}
          disabled={isRefreshing}
          title="Refresh All Repositories"
          className="p-2 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm whitespace-nowrap shrink-0 disabled:opacity-50"
          title="Download complete project ZIP file to run on your desktop"
        >
          <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
          <span>{isDownloading ? 'Downloading...' : 'Download App (.zip)'}</span>
        </button>

        <button
          onClick={onOpenRunGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          title="View instructions on running locally"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How to Run</span>
        </button>

        <button
          onClick={onOpenCloneModal}
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          + Clone / Add Repo
        </button>

        {profile && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="w-7 h-7 rounded-full border border-slate-700"
            />
            <div className="flex flex-col text-right">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                {profile.username}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-mono">
                <CheckCircle2 className="w-2.5 h-2.5" /> Connected
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
