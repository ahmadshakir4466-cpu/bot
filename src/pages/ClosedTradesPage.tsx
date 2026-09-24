import React from 'react';
import { History, Download, ArrowUpRight, ArrowDownRight, Clock, Info } from 'lucide-react';
import { ClosedTrade } from '../../shared/types.ts';

interface ClosedTradesPageProps {
  trades: ClosedTrade[];
  token?: string;
}

export const ClosedTradesPage: React.FC<ClosedTradesPageProps> = ({ trades, token }) => {
  const downloadCsv = () => {
    window.location.href = `/api/export/trades.csv?token=${token}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Closed Strategy Trades Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete position cycles reconciled across all entries, exits, fees, and funding cashflows.
          </p>
        </div>

        <button
          onClick={downloadCsv}
          disabled={trades.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Accounting Rule Disclosure */}
      <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Strict Win/Loss Definition: </span>
          Net PnL = Gross Realized PnL − Fees + Signed Funding. A positive gross trade that turns negative
          after exchange fees is accounted strictly as a <strong className="text-rose-400">LOSS</strong>.
          Provisional trades with pending settlement remain visibly labeled.
        </div>
      </div>

      <div className="bg-[#0F1422] border border-slate-800 rounded-lg overflow-hidden">
        {trades.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No closed trades yet. Reconciled trades will appear here after execution exit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Entry</th>
                  <th className="py-2.5 px-3">Exit</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Hold</th>
                  <th className="py-2.5 px-3">Gross</th>
                  <th className="py-2.5 px-3">Fees</th>
                  <th className="py-2.5 px-3">Net PnL</th>
                  <th className="py-2.5 px-3">Exit Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {trades.map((t) => {
                  const isLong = t.direction.toLowerCase() === 'long';
                  const isWin = t.netPnl > 0;
                  const isLoss = t.netPnl < 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2.5 px-3 font-semibold text-white">{t.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            isLong
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">${t.entryPrice?.toLocaleString()}</td>
                      <td className="py-2.5 px-3">${t.exitPrice?.toLocaleString()}</td>
                      <td className="py-2.5 px-3">{t.size}</td>
                      <td className="py-2.5 px-3 text-slate-400">{t.holdBars}b</td>
                      <td className="py-2.5 px-3">${t.grossPnl.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-rose-400/90">-${t.feesPaid.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold ${
                            isWin
                              ? 'text-emerald-400'
                              : isLoss
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {isWin ? '+' : ''}${t.netPnl.toFixed(2)} ({t.returnPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">
                        {t.exitReason}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            t.status === 'FINALIZED'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(t.closedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
