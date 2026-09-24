import React, { useState } from 'react';
import { Layers, ShieldCheck, Flame, AlertCircle } from 'lucide-react';
import { PositionRecord } from '../../shared/types.ts';

interface PositionsPageProps {
  positions: PositionRecord[];
  onEmergencyClose: (symbol: string) => void;
  isLoading: boolean;
}

export const PositionsPage: React.FC<PositionsPageProps> = ({
  positions,
  onEmergencyClose,
  isLoading,
}) => {
  const [confirmSymbol, setConfirmSymbol] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Active Bot Positions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Single position policy: At most 1 bot position is permitted across both BTCUSDT and ETHUSDT.
          </p>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Layers className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-slate-300">
            No Active Bot Positions
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Account is currently flat. The strategy engine is monitoring closed 15m candles
            for valid EMA crossover, trend alignment, and RSI setups.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((pos) => {
            const isLong = pos.holdSide.toLowerCase() === 'long';
            const pnl = pos.unrealizedPnl || 0;
            const notional = pos.totalSize * (pos.markPrice || pos.averageOpenPrice);
            const pnlPct = notional > 0 ? (pnl / notional) * 100 : 0;

            return (
              <div
                key={pos.id || pos.symbol}
                className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-white">{pos.symbol}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                        isLong
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {pos.holdSide} {pos.leverage}x
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                      {pos.marginMode}
                    </span>
                    {pos.protectionVerified && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>SL/TP Verified</span>
                      </span>
                    )}
                  </div>

                  <div>
                    {confirmSymbol === pos.symbol ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400">Confirm Close?</span>
                        <button
                          onClick={() => {
                            onEmergencyClose(pos.symbol);
                            setConfirmSymbol(null);
                          }}
                          disabled={isLoading}
                          className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                        >
                          Yes, Reduce-Only Close
                        </button>
                        <button
                          onClick={() => setConfirmSymbol(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmSymbol(pos.symbol)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-medium transition-colors"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Emergency Close Position</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Size</span>
                    <span className="font-mono text-white font-medium">
                      {pos.totalSize} {pos.symbol.replace('USDT', '')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Entry Price</span>
                    <span className="font-mono text-white font-medium">
                      ${pos.averageOpenPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mark Price</span>
                    <span className="font-mono text-white font-medium">
                      ${pos.markPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Stop-Loss (SL)</span>
                    <span className="font-mono text-rose-400 font-medium">
                      ${pos.stopLossPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Take-Profit (TP)</span>
                    <span className="font-mono text-emerald-400 font-medium">
                      ${pos.takeProfitPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Hold Bars</span>
                    <span className="font-mono text-amber-300 font-medium">
                      {pos.barsHeld || 0} / 96 bars
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Unrealized PnL</span>
                    <span
                      className={`font-mono font-bold ${
                        pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
