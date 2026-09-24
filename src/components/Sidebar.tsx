import React from 'react';
import {
  LayoutDashboard,
  PlugZap,
  Sliders,
  Layers,
  ArrowLeftRight,
  History,
  FileText,
  BarChart3,
  FlaskConical,
  Globe,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { UserRole } from '../../shared/types.ts';

export type TabId =
  | 'overview'
  | 'connect'
  | 'settings'
  | 'positions'
  | 'orders'
  | 'trades'
  | 'logs'
  | 'performance'
  | 'backtest'
  | 'showcase'
  | 'admin'
  | 'verification';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userRole?: UserRole;
  openPositionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  openPositionsCount,
}) => {
  const navItems: Array<{
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'connect', label: 'Connect Exchange', icon: PlugZap },
    { id: 'settings', label: 'Bot Settings', icon: Sliders },
    {
      id: 'positions',
      label: 'Positions',
      icon: Layers,
      badge: openPositionsCount > 0 ? openPositionsCount : undefined,
    },
    { id: 'orders', label: 'Orders', icon: ArrowLeftRight },
    { id: 'trades', label: 'Closed Trades', icon: History },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'logs', label: 'Activity Logs', icon: FileText },
    { id: 'backtest', label: 'Historical Backtest', icon: FlaskConical },
    { id: 'showcase', label: 'Demo Showcase', icon: Globe },
    { id: 'verification', label: 'Verification & Guide', icon: CheckCircle2 },
    { id: 'admin', label: 'Admin Vault', icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <aside className="w-full lg:w-60 bg-[#0E131F] border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Trading Terminal
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && userRole !== 'admin') {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-800/80 bg-[#090D15]">
        <div className="text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Futures Lab v1.0.0</div>
          <div>Mode: <span className="font-mono text-cyan-400">EXCHANGE_DEMO</span></div>
          <div className="text-[10px] text-slate-400">paptrading: 1 header enforced</div>
        </div>
      </div>
    </aside>
  );
};
