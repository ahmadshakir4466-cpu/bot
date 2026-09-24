import React, { useState } from 'react';
import { Globe, Copy, Check, ShieldCheck, AlertTriangle, Eye, Lock } from 'lucide-react';
import { PerformanceMetrics, ShowcasePublication } from '../../shared/types.ts';

interface DemoShowcasePageProps {
  metrics: PerformanceMetrics | null;
  token?: string;
  userId?: string;
}

export const DemoShowcasePage: React.FC<DemoShowcasePageProps> = ({
  metrics,
  token,
  userId,
}) => {
  const [isPublished, setIsPublished] = useState(false);
  const [title, setTitle] = useState('Futures Lab — Baseline Demo Performance');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const publicUrl = `${window.location.origin}/#showcase_public_${userId || 'usr_operator_001'}`;

  const togglePublish = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/showcase/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isPublished: !isPublished,
          title,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsPublished(data.publication.isPublished);
      }
    } catch {
      // Ignore
    } finally {
      setIsSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          <span>Public Demo Performance Showcase</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Share verified exchange demo statistics with strict allowlist sanitization.
        </p>
      </div>

      {/* Owner Publishing Controls Card */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Showcase Publication Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isPublished
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isPublished ? 'PUBLIC' : 'PRIVATE (DEFAULT)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Publishing is off by default to protect user privacy.
            </p>
          </div>

          <button
            onClick={togglePublish}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPublished
                ? 'bg-rose-700 hover:bg-rose-600 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isPublished ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPublished ? 'Unpublish (Make Private)' : 'Publish Showcase'}</span>
          </button>
        </div>

        {isPublished && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-medium text-slate-300">
              Shareable Public Showcase URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-cyan-300 font-mono focus:outline-none"
              />
              <button
                onClick={copyUrl}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sanitized Public View Preview */}
      <div className="bg-[#0B0F17] border border-cyan-900/50 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
              Public Performance View
            </span>
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
            Bitget Demo Forward Run
          </span>
        </div>

        {/* Sanitized Allowlist Notice */}
        <div className="p-3.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200">Strict Allowlist Sanitization: </span>
            This public view contains only aggregated win/loss statistics and anonymized trade results.
            API keys, secrets, exchange credentials, and raw account balances are strictly omitted.
          </div>
        </div>

        {/* Aggregated KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded bg-[#0F1422] border border-slate-800">
            <div className="text-[11px] text-slate-400">Total Closed Trades</div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {metrics?.totalTrades || 0}
            </div>
          </div>
          <div className="p-3 rounded bg-[#0F1422] border border-slate-800">
            <div className="text-[11px] text-slate-400">Win Rate</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
              {metrics?.winRatePercent !== null && metrics?.winRatePercent !== undefined
                ? `${metrics.winRatePercent.toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
          <div className="p-3 rounded bg-[#0F1422] border border-slate-800">
            <div className="text-[11px] text-slate-400">Net Realized PnL</div>
            <div
              className={`text-lg font-bold font-mono mt-1 ${
                (metrics?.netRealizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(metrics?.netRealizedPnl || 0) >= 0 ? '+' : ''}$
              {(metrics?.netRealizedPnl || 0).toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded bg-[#0F1422] border border-slate-800">
            <div className="text-[11px] text-slate-400">Profit Factor</div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {metrics?.profitFactor?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>

        {/* Mandatory Prominent Disclaimer */}
        <div className="p-4 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Public Evaluation Disclaimer</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Connector-reported Bitget demo results. Virtual funds only. Past performance does not guarantee
            future results. Trading futures carries substantial risk of loss. This software is provided
            strictly for technical demonstration and research evaluation. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
};
