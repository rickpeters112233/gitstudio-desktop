/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GitTools } from './components/GitTools';
import { TerminalView } from './components/Terminal';
import { Troubleshooter } from './components/Troubleshooter';
import { ReportsModal } from './components/ReportsModal';
import { CloneModal } from './components/CloneModal';
import { RunGuideModal } from './components/RunGuideModal';
import { RepoItem, UserProfile, GitReport } from './types';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tools' | 'terminal' | 'troubleshoot'>('dashboard');

  // Inter-component navigation parameters
  const [terminalInitialCmd, setTerminalInitialCmd] = useState<string>('');
  const [troubleshootSnippet, setTroubleshootSnippet] = useState<string>('');
  const [activeReportModal, setActiveReportModal] = useState<GitReport | null>(null);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isRunGuideOpen, setIsRunGuideOpen] = useState(false);

  // Fetch initial profile & repositories
  useEffect(() => {
    // 1. Fetch Profile
    fetch('/api/auth/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => console.error('Failed to load profile', err));

    // 2. Fetch Repositories
    loadRepositories(false);
  }, []);

  const loadRepositories = async (force: boolean = false) => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch(`/api/repos?refresh=${force ? 'true' : 'false'}`);
      const data: RepoItem[] = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
        if (data.length > 0 && !selectedRepo) {
          // Select GestaltCE or first repo by default
          const defaultRepo = data.find((r) => r.name === 'TMS' || r.name === 'tce') || data[0];
          setSelectedRepo(defaultRepo);
        }
      }
    } catch (err) {
      console.error('Failed to load repos', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Switch to Terminal with an optional command
  const handleOpenTerminal = (command?: string) => {
    if (command) {
      setTerminalInitialCmd(command);
    }
    setActiveTab('terminal');
  };

  // Switch to Troubleshooter with an error snippet
  const handleOpenTroubleshoot = (errorSnippet?: string) => {
    if (errorSnippet) {
      setTroubleshootSnippet(errorSnippet);
    }
    setActiveTab('troubleshoot');
  };

  // Add cloned repo
  const handleRepoAdded = (newRepo: RepoItem) => {
    setRepos((prev) => [newRepo, ...prev]);
    setSelectedRepo(newRepo);
    setActiveTab('dashboard');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Top Bar Contract (Wordmark + Tabs + User) */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRepo={selectedRepo}
        onRefreshRepos={() => loadRepositories(true)}
        isRefreshing={isLoadingRepos}
        onOpenCloneModal={() => setIsCloneModalOpen(true)}
        onOpenRunGuide={() => setIsRunGuideOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Repository Navigation & Grouping */}
        <Sidebar
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={(repo) => {
            setSelectedRepo(repo);
            setActiveTab('dashboard');
          }}
          isLoading={isLoadingRepos}
        />

        {/* Center Canvas: Active View */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
          {activeTab === 'dashboard' && (
            <Dashboard
              repo={selectedRepo}
              onOpenTerminal={handleOpenTerminal}
              onOpenTroubleshoot={handleOpenTroubleshoot}
              onRepoUpdated={() => loadRepositories(false)}
            />
          )}

          {activeTab === 'tools' && (
            <GitTools
              onOpenReportModal={(report) => setActiveReportModal(report)}
              onOpenTroubleshoot={handleOpenTroubleshoot}
              onOpenTerminal={handleOpenTerminal}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalView
              activeRepo={selectedRepo}
              onOpenTroubleshoot={handleOpenTroubleshoot}
              initialCommand={terminalInitialCmd}
            />
          )}

          {activeTab === 'troubleshoot' && (
            <Troubleshooter
              initialErrorSnippet={troubleshootSnippet}
              activeRepo={selectedRepo}
              onExecuteCommandInTerminal={(cmd) => handleOpenTerminal(cmd)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ReportsModal
        report={activeReportModal}
        onClose={() => setActiveReportModal(null)}
      />

      <CloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onRepoAdded={handleRepoAdded}
      />

      <RunGuideModal
        isOpen={isRunGuideOpen}
        onClose={() => setIsRunGuideOpen(false)}
      />
    </div>
  );
}
