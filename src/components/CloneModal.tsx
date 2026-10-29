import React, { useState } from 'react';
import { X, FolderGit2, Check, DownloadCloud } from 'lucide-react';
import { RepoItem } from '../types';

interface CloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoAdded: (repo: RepoItem) => void;
}

export const CloneModal: React.FC<CloneModalProps> = ({ isOpen, onClose, onRepoAdded }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [targetGroup, setTargetGroup] = useState<'GestaltCE' | 'Tribernachi-Foundation' | 'rickpeters112233'>('GestaltCE');
  const [isCloning, setIsCloning] = useState(false);

  if (!isOpen) return null;

  const getBasePath = (group: string) => {
    switch (group) {
      case 'Tribernachi-Foundation':
        return 'c:/git/trib';
      case 'rickpeters112233':
        return 'c:/git/rick';
      default:
        return 'c:/git';
    }
  };

  const handleUrlChange = (val: string) => {
    setRepoUrl(val);
    const cleaned = val.replace(/\.git$/, '').trim();
    const parts = cleaned.split('/');
    if (parts.length > 0 && parts[parts.length - 1]) {
      setRepoName(parts[parts.length - 1]);
    }
    if (val.includes('Tribernachi')) {
      setTargetGroup('Tribernachi-Foundation');
    } else if (val.includes('rickpeters112233')) {
      setTargetGroup('rickpeters112233');
    } else if (val.includes('GestaltCE')) {
      setTargetGroup('GestaltCE');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) return;

    setIsCloning(true);
    setTimeout(() => {
      const newRepo: RepoItem = {
        id: Date.now(),
        name: repoName.trim(),
        fullName: `${targetGroup}/${repoName.trim()}`,
        owner: targetGroup,
        group: targetGroup,
        localPath: `${getBasePath(targetGroup)}/${repoName.trim()}`,
        defaultBranch: 'main',
        currentBranch: 'main',
        branches: ['main', 'dev'],
        status: 'up_to_date',
        pendingChangesCount: 0,
        pendingChanges: [],
        lastSync: new Date().toISOString(),
        stars: 1,
        forks: 0,
        isPrivate: false,
        description: `Cloned into ${getBasePath(targetGroup)} from ${repoUrl || 'local source'}`,
        htmlUrl: repoUrl || `https://github.com/${targetGroup}/${repoName.trim()}`,
      };

      onRepoAdded(newRepo);
      setIsCloning(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <FolderGit2 className="w-4 h-4 text-amber-400" />
            <span>Clone or Register Local Repository</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Repository Remote URL or GitHub Link
            </label>
            <input
              type="text"
              placeholder="https://github.com/GestaltCE/new-repo.git"
              value={repoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Repository Name
            </label>
            <input
              type="text"
              placeholder="e.g. signal-engine"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Target Workspace Directory
            </label>
            <select
              value={targetGroup}
              onChange={(e: any) => setTargetGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700 cursor-pointer"
            >
              <option value="GestaltCE">GestaltCE · c:/git</option>
              <option value="Tribernachi-Foundation">Tribernachi Foundation · c:/git/trib</option>
              <option value="rickpeters112233">rickpeters112233 · c:/git/rick</option>
            </select>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Destination Path:</span>
              <span className="text-amber-400">{getBasePath(targetGroup)}/{repoName || '...'}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCloning || !repoName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isCloning ? 'animate-bounce' : ''}`} />
              <span>{isCloning ? 'Cloning...' : 'Clone Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
