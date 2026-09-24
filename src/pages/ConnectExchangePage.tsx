import React, { useState } from 'react';
import {
  PlugZap,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Radio,
  Clock,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { ConnectorDevice, ExchangeConnectionMetadata } from '../../shared/types.ts';
import { safeFetchJson } from '../utils/api.ts';

interface ConnectExchangePageProps {
  devices: ConnectorDevice[];
  metadata: ExchangeConnectionMetadata | null;
  onRefresh: () => void;
  token?: string;
}

export const ConnectExchangePage: React.FC<ConnectExchangePageProps> = ({
  devices,
  metadata,
  onRefresh,
  token,
}) => {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Test Connection Dialog State
  const [testApiKey, setTestApiKey] = useState('');
  const [testSecret, setTestSecret] = useState('');
  const [testPassphrase, setTestPassphrase] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const data = await safeFetchJson<{ pairingCode: string }>('/api/connector/pairing-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (data?.pairingCode) {
        setPairingCode(data.pairingCode);
      }
    } catch {
      // Ignore
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runReadonlyTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const data = await safeFetchJson<{ success: boolean; result: any; error?: string }>('/api/connector/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: testApiKey,
          apiSecret: testSecret,
          passphrase: testPassphrase,
        }),
      });

      if (!data.success) {
        throw new Error(data.error || 'Connection test failed');
      }

      setTestResult(data.result);
      onRefresh();
    } catch (err: unknown) {
      setTestError((err as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-cyan-400" />
          <span>Connect Bitget UTA v3 Demo Exchange</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Zero-risk local connector architecture. Your Bitget Demo API secrets remain safely on your computer.
        </p>
      </div>

      {/* Architecture Disclaimer */}
      <div className="p-4 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 space-y-2">
        <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Local Connector Secret Isolation</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Bitget general terms prohibit cloud API key storage and resale. In Futures Lab, the trading
          engine and exchange keys run exclusively on your machine via our Node.js connector CLI. The
          cloud terminal receives only sanitized events and telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1 & 2: Local Connector Pairing Flow */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-mono">
                1
              </span>
              <span>Pair Local Connector Device</span>
            </h3>
            <button
              onClick={onRefresh}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Generate a short-lived one-time pairing code to authenticate your local worker CLI.
          </p>

          {pairingCode ? (
            <div className="p-4 rounded bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-[11px] font-semibold uppercase text-slate-400">
                Your 6-Digit Pairing Code (Valid 10 min)
              </div>
              <div className="font-mono text-3xl font-extrabold text-cyan-400 tracking-widest">
                {pairingCode}
              </div>
              <div className="pt-2 text-left space-y-1.5 text-xs text-slate-300">
                <div className="font-medium text-slate-200">Terminal Instructions:</div>
                <div className="p-2 rounded bg-black/60 font-mono text-[11px] text-cyan-300 flex items-center justify-between">
                  <span>npm run connector</span>
                  <button
                    onClick={() => copyToClipboard('npm run connector')}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  Select <code className="text-cyan-300 font-mono">pair</code>, enter this code, then select{' '}
                  <code className="text-cyan-300 font-mono">set-keys</code>.
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Generate New Pairing Code'}</span>
            </button>
          )}

          {/* Connected Devices Table */}
          <div className="pt-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Paired Devices ({devices.length})
            </div>
            {devices.length === 0 ? (
              <div className="p-3 rounded bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                No local connector devices paired yet.
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Radio
                        className={`w-3.5 h-3.5 ${
                          dev.status === 'online' ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-slate-200">{dev.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {dev.clientVersion} • IP: {dev.ipAddress}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono capitalize ${
                        dev.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {dev.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Interactive Read-only "Test Connection" */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-mono">
                2
              </span>
              <span>Read-Only Connection Test</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ZERO ORDERS PLACED
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Validate Bitget Demo credentials, verify <code className="text-cyan-300 font-mono">paptrading: 1</code> demo routing,
            measure clock sync offset, latency, and read account demo equity without executing trades.
          </p>

          <form onSubmit={runReadonlyTest} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Bitget Demo API Key
              </label>
              <input
                type="text"
                required
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder="bg_demo_..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  required
                  value={testSecret}
                  onChange={(e) => setTestSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Passphrase
                </label>
                <input
                  type="password"
                  required
                  value={testPassphrase}
                  onChange={(e) => setTestPassphrase(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isTesting}
              className="w-full py-2 px-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Validating Connection...' : 'Run Read-Only Test Connection'}</span>
            </button>
          </form>

          {testError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Test Connection Failed</div>
                <div>{testError}</div>
              </div>
            </div>
          )}

          {testResult && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Bitget Demo Connection Verified (Read-Only)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-emerald-500/20">
                <div>Routing: paptrading: 1</div>
                <div>Server Offset: {testResult.serverTimeSyncMs} ms</div>
                <div>Latency: {testResult.roundTripLatencyMs} ms</div>
                <div>Demo Balance: ${testResult.balanceUsdt?.toFixed(2)}</div>
                <div>Position Mode: {testResult.positionMode}</div>
                <div>Margin Mode: {testResult.marginMode}</div>
                <div>BTC Spread: {testResult.marketFreshness?.spreadPercent?.toFixed(3)}%</div>
                <div>BTC Price: ${testResult.marketFreshness?.lastPrice?.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions & Security Checklist */}
      <div className="bg-[#0F1422] border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white mb-3">
          Bitget Demo Key Setup Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Required Permissions</span>
            </div>
            <p className="text-slate-400">
              Demo trading mode enabled, Futures Orders read/write, Account Read access.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="font-semibold text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Prohibited Permissions</span>
            </div>
            <p className="text-slate-400">
              Withdrawal & Transfer permissions must NEVER be granted to any trading bot.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="font-semibold text-cyan-400 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Official Bitget Guide</span>
            </div>
            <a
              href="https://www.bitget.com/docs/uta/demo-trading/rest-api"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline block truncate"
            >
              https://www.bitget.com/docs/uta/demo-trading/rest-api
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
