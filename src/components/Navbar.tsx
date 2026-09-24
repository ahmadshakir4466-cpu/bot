import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Radio,
  Shield,
  User,
  LogOut,
  Terminal,
} from 'lucide-react';
import { UserProfile } from '../../shared/types.ts';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  connectorStatus: 'online' | 'offline' | 'stale';
  lastHeartbeat?: string;
  activeStrategy: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  connectorStatus,
  lastHeartbeat,
  activeStrategy,
}) => {
  const [utcTime, setUtcTime] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(
        now.toUTCString().replace('GMT', 'UTC')
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F17] border-b border-slate-800 text-slate-200">
      {/* Persistent Mandatory Demo Isolation Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold uppercase tracking-wider">Demo — Virtual Funds</span>
          <span className="text-amber-400/60 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-amber-200/80">
            Strict Architecture Isolation: Live trading is prohibited. Exchange orders use Bitget demo routing (paptrading: 1).
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-500" />
            {utcTime || 'UTC 00:00:00'}
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">FUTURES LAB</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                  {activeStrategy}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Bitget UTA v3 Demo Terminal</div>
            </div>
          </div>
        </div>

        {/* Status Indicators & User Account */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connector Heartbeat Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                connectorStatus === 'online'
                  ? 'text-emerald-400 animate-pulse'
                  : connectorStatus === 'stale'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            />
            <span className="text-slate-400 hidden sm:inline">Connector:</span>
            <span
              className={`font-medium capitalize ${
                connectorStatus === 'online'
                  ? 'text-emerald-400'
                  : connectorStatus === 'stale'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {connectorStatus}
            </span>
          </div>

          {/* User Account / Role Switcher */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-slate-300 hidden md:inline truncate max-w-[140px]">
                  {user.email}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Demo Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
