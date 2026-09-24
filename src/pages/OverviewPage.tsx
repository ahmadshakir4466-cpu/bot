import React from 'react';
import {
  Play,
  Pause,
  OctagonAlert,
  Flame,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  BotState,
  ConnectorDevice,
  ExchangeConnectionMetadata,
  PerformanceMetrics,
  PositionRecord,
  SignalDecision,
} from '../../shared/types.ts';

interface OverviewPageProps {
  botState: BotState | null;
  metadata: ExchangeConnectionMetadata | null;
  activeDevice: ConnectorDevice | null;
  metrics: PerformanceMetrics | null;
  activePositions: PositionRecord[];
  latestDecision: SignalDecision | null;
  onSendCommand: (type: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenDiagnostic: () => void;
  isLoading: boolean;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  botState,
  metadata,
  activeDevice,
  metrics,
  activePositions,
  latestDecision,
  onSendCommand,
  onNavigateTab,
  onOpenDiagnostic,
  isLoading,
}) => {
  const isOnline = activeDevice?.status === 'online';
  const botRunning = botState?.state === 'RUNNING';
  const botPaused = botState?.state === 'PAUSED_ENTRIES';
  const botHalted =
    botState?.state === 'HALTED_DAILY_LOSS' ||
    botState?.state === 'HALTED_CONSECUTIVE_LOSS' ||
    botState?.state === 'EMERGENCY_HALTED';

  // Demo balance formatting
  const balance = metadata?.balanceUsdt !== undefined ? metadata.balanceUsdt : 0;
  const availMargin = metadata?.availableMarginUsdt !== undefined ? metadata.availableMarginUsdt : 0;
  const unrealized = metadata?.unexplainedExposureDetected
    ? 0
    : activePositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Demo Equity</div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">USDT-Margined</div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Available Margin</div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-200">
            ${availMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">2x Max Isolated</div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Unrealized PnL</div>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              unrealized > 0
                ? 'text-emerald-400'
                : unrealized < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {unrealized > 0 ? '+' : ''}${unrealized.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {activePositions.length} Active Position
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Realized Net PnL</div>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              (metrics?.netRealizedPnl || 0) > 0
                ? 'text-emerald-400'
                : (metrics?.netRealizedPnl || 0) < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {(metrics?.netRealizedPnl || 0) > 0 ? '+' : ''}
            ${(metrics?.netRealizedPnl || 0).toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Fees Deducted</div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Win Rate</div>
          <div className="mt-1 text-lg font-bold font-mono text-cyan-400">
            {metrics?.winRatePercent !== null && metrics?.winRatePercent !== undefined
              ? `${metrics.winRatePercent.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {metrics?.totalTrades || 0} Closed Cycles
          </div>
        </div>

        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-400">Daily Trades</div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-200">
            {botState?.dailyTradesCount || 0} / {botState?.config.maxTradesPerDay || 4}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">UTC Day Limit</div>
        </div>
      </div>

      {/* Main Bot Control & State Card */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white">Bot Execution Controls</h2>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wide ${
                  botRunning
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : botPaused
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : botHalted
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {botState?.state || 'STOPPED'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              State Reason: <span className="text-slate-200">{botState?.stateReason || 'System ready.'}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!botRunning ? (
              <button
                onClick={() => onSendCommand('START_BOT')}
                disabled={!isOnline || isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Demo Bot</span>
              </button>
            ) : (
              <button
                onClick={() => onSendCommand('PAUSE_ENTRIES')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Entries</span>
              </button>
            )}

            <button
              onClick={() => onSendCommand('STOP_AFTER_FLAT')}
              disabled={isLoading || botState?.state === 'STOP_AFTER_FLAT'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <OctagonAlert className="w-3.5 h-3.5" />
              <span>Stop After Flat</span>
            </button>

            <button
              onClick={() => onSendCommand('EMERGENCY_CLOSE')}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition-colors"
              title="Cancel all bot orders and reduce-only close bot position"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Emergency Close</span>
            </button>

            <button
              onClick={onOpenDiagnostic}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-medium transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Run Diagnostic Demo</span>
            </button>
          </div>
        </div>

        {/* Operational Guard Warnings */}
        {!isOnline && (
          <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Local Connector Worker is Offline:</span> Automated trading
                requires the local worker running on your PC so exchange API secrets remain private.
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('connect')}
              className="shrink-0 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium flex items-center gap-1"
            >
              <span>Pair Device</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {botHalted && (
          <div className="mt-4 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Risk Halt Latched: {botState?.stateReason}. Trading is paused to protect demo capital.
            </span>
          </div>
        )}
      </div>

      {/* Signal Decision Audit: Why is the bot waiting? */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0F1422] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Signal Evaluation Audit</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Closed 15m Candles
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Transparent condition verification. The bot only executes on fully closed bars.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3 text-slate-500" />
                {latestDecision?.candleCloseTime
                  ? new Date(latestDecision.candleCloseTime).toLocaleTimeString()
                  : 'Awaiting closed candle'}
              </div>
            </div>
          </div>

          {/* Reason Banner */}
          <div className="p-3 rounded bg-slate-900 border border-slate-800 mb-4">
            <div className="text-xs font-semibold text-slate-300 mb-1">Current Decision:</div>
            <div className="text-xs font-mono text-cyan-300">
              {latestDecision?.reason ||
                'Waiting for local connector heartbeat and closed 15m candle event.'}
            </div>
          </div>

          {/* Condition Matrix */}
          <div className="space-y-2">
            {(latestDecision?.conditions || [
              {
                name: '15m EMA20/EMA50 Crossover',
                satisfied: false,
                expected: 'Bullish or Bearish Cross',
                actual: 'No cross on current bar',
              },
              {
                name: '1h Trend Filter (1h Close vs EMA200)',
                satisfied: true,
                expected: 'Close > EMA200 (Long) or Close < EMA200 (Short)',
                actual: 'Aligned with long-term trend',
              },
              {
                name: '15m RSI14 Filter',
                satisfied: false,
                expected: '50 <= RSI <= 70 (Long) or 30 <= RSI <= 50 (Short)',
                actual: 'RSI in neutral range',
              },
            ]).map((cond, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  {cond.satisfied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200">{cond.name}</span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">
                  {cond.actual}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local Connector & Machine Card */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Local Connector</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {activeDevice?.status || 'Unpaired'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Private trading engine running on your workstation.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Device Name:</span>
                <span className="font-mono text-slate-200">{activeDevice?.name || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Client Version:</span>
                <span className="font-mono text-slate-200">{activeDevice?.clientVersion || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Last Heartbeat:</span>
                <span className="font-mono text-slate-200">
                  {activeDevice?.lastHeartbeatAt
                    ? new Date(activeDevice.lastHeartbeatAt).toLocaleTimeString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Secret Storage:</span>
                <span className="font-mono text-emerald-400">Local PC (.env.local)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('connect')}
              className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs text-center font-medium text-slate-200 transition-colors"
            >
              Manage Connection & Test API
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
