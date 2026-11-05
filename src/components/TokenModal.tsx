import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, RefreshCw, Shield, ExternalLink, Trash2 } from 'lucide-react';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdated: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({ isOpen, onClose, onTokenUpdated }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [tokenSnippet, setTokenSnippet] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'missing'>('missing');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTokenStatus();
    }
  }, [isOpen]);

  const loadTokenStatus = async () => {
    try {
      const res = await fetch('/api/auth/token');
      const data = await res.json();
      setHasToken(data.hasToken);
      setTokenStatus(data.tokenStatus || (data.hasToken ? 'valid' : 'missing'));
      setTokenSnippet(data.tokenSnippet || '');
      if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      console.warn('Could not load token info:', err.message);
    }
  };

  if (!isOpen) return null;

  const handleSaveToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter a GitHub Personal Access Token (starts with ghp_ or github_pat_)');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Token validation failed. Verify your token permissions.');
        setTokenStatus('invalid');
      } else {
        setSuccessMessage(data.message || 'Token verified and connected!');
        setTokenStatus('valid');
        setHasToken(true);
        setTokenSnippet(`${tokenInput.trim().slice(0, 4)}...${tokenInput.trim().slice(-4)}`);
        setTokenInput('');
        onTokenUpdated();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearToken = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '' }),
      });
      const data = await res.json();
      setHasToken(false);
      setTokenSnippet('');
      setTokenStatus('missing');
      setSuccessMessage(data.message || 'Token removed. Running in catalog fallback mode.');
      onTokenUpdated();
    } catch (err: any) {
      setErrorMessage('Failed to clear token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-mono">
                GitHub Personal Access Token (PAT)
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Connect your account for full access to private organization repositories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Shield
                className={`w-4 h-4 ${
                  tokenStatus === 'valid'
                    ? 'text-emerald-400'
                    : tokenStatus === 'invalid'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              />
              <div className="text-xs">
                <span className="text-slate-400 block font-mono text-[10px] uppercase tracking-wider">
                  Authentication Status
                </span>
                <span className="font-semibold text-slate-200">
                  {tokenStatus === 'valid'
                    ? 'Connected & Authenticated'
                    : tokenStatus === 'invalid'
                    ? 'Token Expired / Unauthorized (401)'
                    : 'Catalog Mode (No Token Configured)'}
                </span>
              </div>
            </div>

            {hasToken && (
              <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300">
                {tokenSnippet}
              </span>
            )}
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium block">Authentication Notice</span>
                <p className="text-rose-200/90 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium block">Success</span>
                <p className="text-emerald-200/90 text-[11px] leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Token Input Form */}
          <form onSubmit={handleSaveToken} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                Paste New Personal Access Token
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Tokens require <strong className="text-slate-300 font-mono">repo</strong> and{' '}
                <strong className="text-slate-300 font-mono">read:org</strong> scopes to sync GestaltCE, Tribernachi Foundation, and personal private repositories.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=GitStudio%20Desktop"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono transition-colors"
              >
                <span>Generate token on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                {hasToken && (
                  <button
                    type="button"
                    onClick={handleClearToken}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !tokenInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Verifying...' : 'Save & Connect'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
