import React, { useState } from 'react';
import { X, Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { UserProfile } from '../../shared/types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onSuccess(data.user, data.token);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'operator' | 'admin') => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Quick login failed');
      }
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0F1422] border border-slate-800 rounded-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isRegister ? 'Create Account' : 'Futures Lab Sign In'}
            </h2>
            <p className="text-xs text-slate-400">
              Multi-user demo trading terminal authentication
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Quick Demo Switcher */}
        <div className="mb-5 p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Instant Evaluation Accounts</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('operator')}
              disabled={loading}
              className="py-1.5 px-2 rounded bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 text-xs font-medium text-left transition-colors"
            >
              <div className="font-semibold text-white">Demo Operator</div>
              <div className="text-[10px] text-cyan-400/80 font-mono">operator@...</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
              className="py-1.5 px-2 rounded bg-purple-950/80 hover:bg-purple-900/80 border border-purple-800/80 text-purple-300 text-xs font-medium text-left transition-colors"
            >
              <div className="font-semibold text-white">System Admin</div>
              <div className="text-[10px] text-purple-400/80 font-mono">admin@...</div>
            </button>
          </div>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0F1422] px-2 text-slate-400 text-[10px] tracking-wider">
              Or credentials
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@domain.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Sign In'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
