import React from 'react';
import { Sliders, Shield, AlertTriangle, FileCode } from 'lucide-react';
import { BotStrategyConfig } from '../../shared/types.ts';

interface BotSettingsPageProps {
  config: BotStrategyConfig | null;
}

export const BotSettingsPage: React.FC<BotSettingsPageProps> = ({ config }) => {
  const cfg = config || {
    version: 'EMA-RSI-ATR-01',
    symbolPrimary: 'BTCUSDT',
    symbolSecondary: 'ETHUSDT',
    signalTimeframe: '15m',
    trendTimeframe: '1h',
    warmupCandles1h: 400,
    warmupCandles15m: 200,
    emaFastPeriod: 20,
    emaSlowPeriod: 50,
    emaTrendPeriod: 200,
    rsiPeriod: 14,
    rsiLongMin: 50,
    rsiLongMax: 70,
    rsiShortMin: 30,
    rsiShortMax: 50,
    atrPeriod: 14,
    stopMultiplier: 1.5,
    takeProfitMultiplier: 2.0,
    maxBarsInPosition: 96,
    riskBudgetPercent: 0.25,
    maxLeverage: 2,
    maxNotionalPercent: 50,
    maxTradesPerDay: 4,
    maxConsecutiveLosses: 3,
    maxDailyLossPercent: 2.0,
    maxSpreadPercent: 0.10,
    maxBookImpactPercent: 0.10,
    assumedTakerFee: 0.06,
    assumedSlippage: 0.05,
    signalExpirySeconds: 60,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Strategy & Risk Rules Specification</h2>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/80 border border-cyan-800 text-cyan-300">
            {cfg.version}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Audited parameters for the baseline research strategy. All rules are deterministically enforced
          in code before any order is submitted.
        </p>
      </div>

      {/* Baseline Disclaimer */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">Baseline Evaluation Research Notice:</div>
          <p className="text-slate-400 leading-relaxed">
            This strategy specification serves as an evaluation baseline. The actual live edge or win rate
            is unproven until validated through forward exchange demo logging. Martingale, grid pyramiding,
            averaging down, or automatic leverage increases are strictly prohibited by system architecture.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signal & Indicator Rules */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Indicator & Signal Parameters</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Signal Timeframe:</span>
              <span className="font-mono text-white">{cfg.signalTimeframe} (Closed bars only)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Trend Filter Timeframe:</span>
              <span className="font-mono text-white">{cfg.trendTimeframe} (Aligned with signal close)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Warmup Requirement:</span>
              <span className="font-mono text-cyan-300">
                {cfg.warmupCandles1h} 1h bars, {cfg.warmupCandles15m} 15m bars
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Fast EMA / Slow EMA:</span>
              <span className="font-mono text-white">EMA {cfg.emaFastPeriod} / EMA {cfg.emaSlowPeriod}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Trend EMA (1h):</span>
              <span className="font-mono text-white">EMA {cfg.emaTrendPeriod}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Wilder RSI Period:</span>
              <span className="font-mono text-white">{cfg.rsiPeriod}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">RSI Range Bounds:</span>
              <span className="font-mono text-white">
                Long: [{cfg.rsiLongMin} - {cfg.rsiLongMax}] | Short: [{cfg.rsiShortMin} - {cfg.rsiShortMax}]
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Stop Loss Distance:</span>
              <span className="font-mono text-white">{cfg.stopMultiplier} × ATR({cfg.atrPeriod})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Take Profit Distance:</span>
              <span className="font-mono text-white">{cfg.takeProfitMultiplier} × Stop Distance (R:R 2.0)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Maximum Position Timeout:</span>
              <span className="font-mono text-amber-300">{cfg.maxBarsInPosition} bars (24 hours)</span>
            </div>
          </div>
        </div>

        {/* Risk & Safety Boundaries */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Capital Protection & Risk Limits</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Planned Risk Budget:</span>
              <span className="font-mono text-emerald-400">{cfg.riskBudgetPercent}% of demo equity</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Maximum Leverage:</span>
              <span className="font-mono text-white">{cfg.maxLeverage}x Isolated (One-Way)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Maximum Notional Bound:</span>
              <span className="font-mono text-white">{cfg.maxNotionalPercent}% of demo equity</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Max Filled Entries / UTC Day:</span>
              <span className="font-mono text-white">{cfg.maxTradesPerDay} entries</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Consecutive Loss Latch Halt:</span>
              <span className="font-mono text-rose-400">{cfg.maxConsecutiveLosses} consecutive losses</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Daily Drawdown Latch Halt:</span>
              <span className="font-mono text-rose-400">{cfg.maxDailyLossPercent}% from day-start equity</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Max Allowable Spread:</span>
              <span className="font-mono text-white">{(cfg.maxSpreadPercent * 100).toFixed(2)}% of mid</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Assumed Taker Fee:</span>
              <span className="font-mono text-white">{cfg.assumedTakerFee}% per side</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Assumed Slippage:</span>
              <span className="font-mono text-white">{cfg.assumedSlippage}% per side</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
