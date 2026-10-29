import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Folder, GitBranch, AlertCircle, ArrowUpRight, ArrowDownLeft, Clock, Filter } from 'lucide-react';
import { RepoItem } from '../types';

interface SidebarProps {
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
  onSelectRepo: (repo: RepoItem) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  repos,
  selectedRepo,
  onSelectRepo,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'modified' | 'ahead' | 'conflict'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.localPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.currentBranch.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'modified') return r.status === 'modified' || r.pendingChangesCount > 0;
      if (statusFilter === 'ahead') return r.status === 'ahead' || r.status === 'behind';
      if (statusFilter === 'conflict') return r.status === 'conflict';
      return true;
    });
  }, [repos, searchTerm, statusFilter]);

  // Grouped repositories
  const groups = useMemo(() => {
    const map: Record<string, { label: string; path: string; items: RepoItem[] }> = {
      GestaltCE: { label: 'GestaltCE', path: 'c:/git', items: [] },
      'Tribernachi-Foundation': { label: 'Tribernachi Foundation', path: 'c:/git/trib', items: [] },
      rickpeters112233: { label: 'Rick Peters', path: 'c:/git/rick', items: [] },
    };

    filteredRepos.forEach((r) => {
      if (map[r.group]) {
        map[r.group].items.push(r);
      } else {
        if (!map['Custom']) {
          map['Custom'] = { label: 'Other Repositories', path: 'Custom', items: [] };
        }
        map['Custom'].items.push(r);
      }
    });

    return map;
  }, [filteredRepos]);

  const totalCount = repos.length;
  const modifiedCount = repos.filter((r) => r.pendingChangesCount > 0 || r.status === 'modified').length;
  const conflictCount = repos.filter((r) => r.status === 'conflict').length;

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col h-full shrink-0 select-none">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Segmented Controls (anti-pill) */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded border border-slate-800/80 text-[11px]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-1 px-1.5 rounded transition-colors text-center font-mono tabular-nums ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('modified')}
            className={`flex-1 py-1 px-1.5 rounded transition-colors text-center font-mono tabular-nums ${
              statusFilter === 'modified'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Modified ({modifiedCount})
          </button>
          {conflictCount > 0 && (
            <button
              onClick={() => setStatusFilter('conflict')}
              className={`flex-1 py-1 px-1.5 rounded transition-colors text-center font-mono tabular-nums ${
                statusFilter === 'conflict'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 font-medium'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Alerts ({conflictCount})
            </button>
          )}
        </div>
      </div>

      {/* Repositories Tree List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {isLoading ? (
          <div className="p-4 text-center space-y-2">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Syncing repositories from GitHub...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No repositories found matching current criteria.
          </div>
        ) : (
          Object.entries(groups).map(([key, groupData]) => {
            const isCollapsed = collapsedGroups[key];
            if (groupData.items.length === 0 && searchTerm) return null;

            return (
              <div key={key} className="space-y-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-900/60 text-left text-xs font-medium text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                    <span className="truncate">{groupData.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 shrink-0">
                    <span className="text-[10px] text-slate-400">{groupData.path}</span>
                    <span className="tabular-nums">[{groupData.items.length}]</span>
                  </div>
                </button>

                {/* Group Repositories */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pl-3 border-l border-slate-800/80 ml-3">
                    {groupData.items.map((repo) => {
                      const isSelected = selectedRepo?.id === repo.id;
                      return (
                        <div
                          key={repo.id}
                          onClick={() => onSelectRepo(repo)}
                          className={`group cursor-pointer px-2.5 py-2 rounded text-xs transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-mono">{repo.name}</span>
                              {repo.isPrivate && (
                                <span className="text-[9px] text-slate-500 uppercase">lock</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <GitBranch className="w-2.5 h-2.5 text-slate-400" />
                                {repo.currentBranch}
                              </span>
                              <span>·</span>
                              <span className="font-mono text-[10px] truncate max-w-[110px]">
                                {repo.localPath.replace('c:/git', '~')}
                              </span>
                            </div>
                          </div>

                          {/* Status Tag without heavy pills */}
                          <div className="shrink-0 flex items-center gap-1 font-mono text-[11px]">
                            {repo.status === 'conflict' && (
                              <span
                                title="Repository / branch collision or remote error"
                                className="text-rose-400 flex items-center gap-0.5"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {repo.status === 'modified' && (
                              <span
                                title="Pending uncommitted changes"
                                className="text-amber-400 flex items-center gap-0.5 tabular-nums"
                              >
                                *{repo.pendingChangesCount || 1}
                              </span>
                            )}
                            {repo.status === 'ahead' && (
                              <span
                                title="Ahead of remote origin"
                                className="text-sky-400 flex items-center gap-0.5"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {repo.status === 'up_to_date' && (
                              <span
                                title="Synchronized with origin"
                                className="text-slate-600 group-hover:text-emerald-500"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer with Path Mapping info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 text-[11px] text-slate-500 font-mono space-y-1">
        <div className="flex justify-between items-center text-slate-400">
          <span>GestaltCE</span>
          <span>c:\git</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Tribernachi</span>
          <span>c:\git\trib</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>rickpeters112233</span>
          <span>c:\git\rick</span>
        </div>
      </div>
    </aside>
  );
};
