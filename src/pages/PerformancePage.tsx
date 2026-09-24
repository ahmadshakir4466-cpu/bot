import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle,
  Scale,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { PerformanceMetrics } from '../../shared/types.ts';

interface PerformancePageProps {
  metrics: PerformanceMetrics | null;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({ metrics }) => {
  const N = metrics?.totalTrades || 0;
  const hasTrades = N > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>Accurate Win/Loss & Statistical Evidence</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Unbiased performance accounting. Incomplete samples report N/A rather than fabricated 0% metrics.
        </p>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Finalized Trades (N)</div>
          <div className="mt-1 text-xl font-bold font-mono text-white">{N}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">Denominator</div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Win Rate</div>
          <div className="mt-1 text-xl font-bold font-mono text-cyan-400">
            {hasTrades && metrics && metrics.winRatePercent !== null
              ? `${metrics.winRatePercent.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {metrics?.wins || 0} Wins
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Loss Rate</div>
          <div className="mt-1 text-xl font-bold font-mono text-rose-400">
            {hasTrades && metrics && metrics.lossRatePercent !== null
              ? `${metrics.lossRatePercent.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {metrics?.losses || 0} Losses
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Breakeven Rate</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-300">
            {hasTrades && metrics && metrics.breakevenRatePercent !== null
              ? `${metrics.breakevenRatePercent.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {metrics?.breakevens || 0} Breakeven
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Net Profit Factor</div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-400">
            {hasTrades && metrics?.profitFactor !== null && metrics?.profitFactor !== undefined
              ? metrics.profitFactor.toFixed(2)
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Post-Fee Cashflow</div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Expectancy</div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {hasTrades && metrics?.expectancyUsdt !== null && metrics?.expectancyUsdt !== undefined
              ? `${metrics.expectancyUsdt >= 0 ? '+' : ''}$${metrics.expectancyUsdt.toFixed(2)}`
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Per Closed Trade</div>
        </div>
      </div>

      {/* Evidence & Sample Size Progress */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Statistical Evidence Progress</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              100 closed trades recommended before drawing initial statistical conclusions.
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono font-bold self-start sm:self-auto ${
              N < 100
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {metrics?.sampleSizeEvaluation?.evidenceMarker || 'Limited evidence (< 100 trades)'}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span>Progress: {N} / 100 trades</span>
            <span>{Math.min(100, Math.round((N / 100) * 100))}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((N / 100) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* Wilson Score 95% Confidence Interval */}
        <div className="p-3.5 rounded bg-slate-900 border border-slate-800 text-xs space-y-1.5">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span>Wilson Score 95% Confidence Interval for Win Rate:</span>
            <span className="font-mono text-cyan-300">
              {metrics?.confidenceInterval95?.lowerPercent !== null &&
              metrics?.confidenceInterval95?.upperPercent !== null &&
              metrics?.confidenceInterval95?.lowerPercent !== undefined
                ? `[${metrics.confidenceInterval95.lowerPercent}% — ${metrics.confidenceInterval95.upperPercent}%]`
                : 'Insufficient sample size'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong>Caveat:</strong> Standard confidence intervals assume independent identically
            distributed Bernoulli trials. Financial market returns exhibit serial correlation, volatility
            clustering, and regime changes; true estimation error may exceed this interval.
          </p>
        </div>
      </div>

      {/* Detailed Risk & Streaks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
            Trade Distribution & Cashflows
          </h3>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Net Realized PnL:</span>
            <span className="font-mono text-white">${(metrics?.netRealizedPnl || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Fees Paid:</span>
            <span className="font-mono text-rose-400">-${(metrics?.totalFees || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Funding Cashflow:</span>
            <span className="font-mono text-slate-300">${(metrics?.totalFunding || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Average Win:</span>
            <span className="font-mono text-emerald-400">
              {metrics?.averageWin ? `$${metrics.averageWin.toFixed(2)}` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Average Loss:</span>
            <span className="font-mono text-rose-400">
              {metrics?.averageLoss ? `-$${metrics.averageLoss.toFixed(2)}` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
            Drawdown & Consecutive Streaks
          </h3>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Max Peak-to-Trough Drawdown:</span>
            <span className="font-mono text-rose-400">
              {(metrics?.maxDrawdownPercent || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Longest Win Streak:</span>
            <span className="font-mono text-emerald-400">{metrics?.longestWinStreak || 0} trades</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Longest Loss Streak:</span>
            <span className="font-mono text-rose-400">{metrics?.longestLossStreak || 0} trades</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Current Active Streak:</span>
            <span className="font-mono text-slate-200">
              {metrics?.currentStreak && metrics.currentStreak > 0
                ? `+${metrics.currentStreak} Wins`
                : metrics?.currentStreak && metrics.currentStreak < 0
                ? `${metrics.currentStreak} Losses`
                : 'Flat'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Provisional Trades:</span>
            <span className="font-mono text-slate-300">
              {metrics?.provisionalTradesCount || 0} trades awaiting final settlement
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
