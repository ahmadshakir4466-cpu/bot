import React, { useEffect, useState } from 'react';
import { ShieldCheck, Server, Users, Radio, Database, Clock, Lock } from 'lucide-react';
import { ExecutionEvent } from '../../shared/types.ts';
import { safeFetchJson } from '../utils/api.ts';

interface AdminPageProps {
  token?: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ token }) => {
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<ExecutionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [dataStats, dataAudit] = await Promise.all([
          safeFetchJson<{ stats: any }>('/api/admin/overview', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          safeFetchJson<{ events: ExecutionEvent[] }>('/api/admin/audit', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(dataStats.stats);
        setAuditLogs(dataAudit.events || []);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [token]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading system administration telemetry...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#0F1422] border border-rose-900/60 rounded-lg text-center space-y-3">
        <Lock className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-sm font-bold text-rose-300">Access Restricted</div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
        <p className="text-[11px] text-slate-400">
          Sign in using the seeded Admin account (admin@futureslab.internal) to access this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <span>System Administration Vault</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Internal system health, multi-tenant isolation audit, and global execution telemetry.
        </p>
      </div>

      {/* Admin KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Total Tenants</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {stats?.totalUsers || 1}
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paired Devices</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {stats?.activeDevices || 0}
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Orders Logged</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {stats?.totalOrders || 0}
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>Closed Cycles</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {stats?.totalClosedTrades || 0}
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Server Uptime</span>
          </div>
          <div className="mt-1 text-sm font-bold font-mono text-white">
            {Math.floor(stats?.uptimeSeconds || 0)}s
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400">Node Runtime</div>
          <div className="mt-1 text-sm font-bold font-mono text-cyan-300">
            {stats?.nodeVersion || 'v22.x'}
          </div>
        </div>
      </div>

      {/* Global Audit Events Table */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-white">
          System-Wide Execution Events ({auditLogs.length})
        </div>
        <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-[500px] overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3 flex items-start justify-between text-[11px]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                    {log.severity}
                  </span>
                  <span className="text-cyan-400">{log.category}</span>
                  <span className="text-slate-400">Tenant: {log.userId || 'system'}</span>
                </div>
                <div className="text-slate-200">{log.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
