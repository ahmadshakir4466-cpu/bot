import React, { useState } from 'react';
import { FlaskConical, Play, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { BacktestResult } from '../../shared/types.ts';
import { safeFetchJson } from '../utils/api.ts';

interface BacktestPageProps {
  token?: string;
}

export const BacktestPage: React.FC<BacktestPageProps> = ({ token }) => {
  const [symbol, setSymbol] = useState<'BTCUSDT' | 'ETHUSDT'>('BTCUSDT');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [isRunning, setIsRunning] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const data = await safeFetchJson<{ result: BacktestResult }>('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol, initialCapital }),
      });

      setBacktestResult(data.result);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-cyan-400" />
          <span>Historical Backtest Simulation</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulated walk-forward execution on genuine historical Bitget candles with zero look-ahead bias.
        </p>
      </div>

      {/* Mandatory Backtest Disclaimer */}
      <div className="p-4 rounded-lg bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-purple-300">
            SIMULATION ONLY — NOT EXCHANGE-EXECUTED DEMO RESULTS
          </div>
          <p className="text-slate-300 leading-relaxed">
            Historical simulations test code consistency and parameter sensitivity. They do not simulate
            real-time order queue priority, partial fills, or unexpected exchange outages. Simulated results
            are never combined into the forward demo ledger.
          </p>
        </div>
      </div>

      {/* Controls & Runner Card */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="BTCUSDT">BTCUSDT (Primary)</option>
              <option value="ETHUSDT">ETHUSDT (Secondary)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Simulated Initial Capital
            </label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runBacktest}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Simulating Historical Bars...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Backtest Results Split */}
      {backtestResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Development Sample 60% */}
            <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">In-Sample Development</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Earliest 60%
                </span>
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Trades:</span>
                  <span className="text-white">{backtestResult.developmentSample.totalTrades}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Win Rate:</span>
                  <span className="text-cyan-400">
                    {backtestResult.developmentSample.winRatePercent !== null
                      ? `${backtestResult.developmentSample.winRatePercent.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Net PnL:</span>
                  <span
                    className={
                      backtestResult.developmentSample.netRealizedPnl >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    ${backtestResult.developmentSample.netRealizedPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Profit Factor:</span>
                  <span className="text-white">
                    {backtestResult.developmentSample.profitFactor?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Sample 20% */}
            <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Out-of-Sample Validation</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Middle 20%
                </span>
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Trades:</span>
                  <span className="text-white">{backtestResult.validationSample.totalTrades}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Win Rate:</span>
                  <span className="text-cyan-400">
                    {backtestResult.validationSample.winRatePercent !== null
                      ? `${backtestResult.validationSample.winRatePercent.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Net PnL:</span>
                  <span
                    className={
                      backtestResult.validationSample.netRealizedPnl >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    ${backtestResult.validationSample.netRealizedPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Profit Factor:</span>
                  <span className="text-white">
                    {backtestResult.validationSample.profitFactor?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Holdout Sample 20% */}
            <div className="bg-[#0F1422] border border-cyan-900/60 rounded-lg p-4 space-y-2 bg-cyan-950/20">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-900/60">
                <span className="text-xs font-bold text-cyan-300">Untouched Holdout</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-200">
                  Final 20%
                </span>
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Trades:</span>
                  <span className="text-white">{backtestResult.holdoutSample.totalTrades}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Win Rate:</span>
                  <span className="text-cyan-400">
                    {backtestResult.holdoutSample.winRatePercent !== null
                      ? `${backtestResult.holdoutSample.winRatePercent.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Net PnL:</span>
                  <span
                    className={
                      backtestResult.holdoutSample.netRealizedPnl >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    ${backtestResult.holdoutSample.netRealizedPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Profit Factor:</span>
                  <span className="text-white">
                    {backtestResult.holdoutSample.profitFactor?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Trades Ledger */}
          <div className="bg-[#0F1422] border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
              <span>Simulated Trades ({backtestResult.trades.length})</span>
              <span className="text-[10px] font-mono text-slate-400">
                Fee (0.06%) & Slippage (0.05%) Deducted
              </span>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs font-mono text-[11px]">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Side</th>
                    <th className="p-2">Entry</th>
                    <th className="p-2">Exit</th>
                    <th className="p-2">Hold</th>
                    <th className="p-2">Net PnL</th>
                    <th className="p-2">Exit Reason</th>
                    <th className="p-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {backtestResult.trades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold uppercase text-[10px]">
                        <span className={t.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2">${t.entryPrice.toLocaleString()}</td>
                      <td className="p-2">${t.exitPrice.toLocaleString()}</td>
                      <td className="p-2 text-slate-400">{t.holdBars}b</td>
                      <td className="p-2 font-bold">
                        <span className={t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.netPnl >= 0 ? '+' : ''}${t.netPnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-[10px] text-slate-400 uppercase">{t.exitReason}</td>
                      <td className="p-2 text-slate-400">
                        {new Date(t.openedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
