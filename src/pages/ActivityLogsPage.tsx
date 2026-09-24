import React, { useState } from 'react';
import { FileText, Download, Filter, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { ExecutionEvent } from '../../shared/types.ts';

interface ActivityLogsPageProps {
  logs: ExecutionEvent[];
  token?: string;
}

export const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({ logs, token }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filtered = logs.filter(
    (l) => severityFilter === 'ALL' || l.severity === severityFilter
  );

  const downloadCsv = () => {
    window.location.href = `/api/export/logs.csv?token=${token}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Execution Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Append-only telemetry stream of connector operations, orders, risk evaluations, and heartbeats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <button
            onClick={downloadCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0F1422] border border-slate-800 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No logs match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-[600px] overflow-y-auto">
            {filtered.map((log) => {
              const isError = log.severity === 'ERROR' || log.severity === 'CRITICAL';
              const isWarn = log.severity === 'WARN';

              return (
                <div
                  key={log.id}
                  className="p-3 hover:bg-slate-900/40 flex items-start gap-3 transition-colors"
                >
                  <div className="pt-0.5 shrink-0">
                    {isError ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isError
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : isWarn
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.severity}
                      </span>
                      <span className="text-[10px] uppercase text-cyan-400/80 bg-cyan-950/40 px-1 rounded border border-cyan-900/60">
                        {log.category}
                      </span>
                      {log.symbol && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {log.symbol}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-200 text-xs break-words">{log.message}</div>
                    {log.details && (
                      <pre className="mt-1 text-[10px] text-slate-400 bg-slate-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
