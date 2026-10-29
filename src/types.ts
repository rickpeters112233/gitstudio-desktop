export interface RepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar?: string;
  group: 'GestaltCE' | 'Tribernachi-Foundation' | 'rickpeters112233' | 'Custom';
  localPath: string;
  defaultBranch: string;
  currentBranch: string;
  branches: string[];
  status: 'up_to_date' | 'behind' | 'ahead' | 'modified' | 'conflict' | 'uncloned' | 'archived';
  pendingChangesCount: number;
  pendingChanges: { file: string; status: 'M' | 'A' | 'D' | 'U'; staged: boolean }[];
  lastSync: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  description: string;
  htmlUrl: string;
}

export interface CommitItem {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorEmail: string;
  authorAvatar?: string;
  date: string;
  url: string;
}

export interface GitReport {
  id: string;
  type: 'pull_all' | 'daily_report';
  timestamp: string;
  path: string;
  title: string;
  summary: {
    total: number;
    updated: number;
    upToDate: number;
    clonedNew: number;
    switchedBranch: number;
    failed: number;
  };
  log: string;
  htmlContent: string;
}

export interface UserProfile {
  username: string;
  email: string;
  avatarUrl: string;
  organizations: string[];
  workspaces: { name: string; path: string; group: string }[];
  githubConnected: boolean;
}

export interface DiagnosticResult {
  summary: string;
  rootCause: string;
  recommendedFix: string;
  suggestedCommands: string[];
  preventativeTip: string;
  severity: 'critical' | 'warning' | 'info';
}
