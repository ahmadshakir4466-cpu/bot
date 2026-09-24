import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, TabId } from './components/Sidebar.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { ConnectExchangePage } from './pages/ConnectExchangePage.tsx';
import { BotSettingsPage } from './pages/BotSettingsPage.tsx';
import { PositionsPage } from './pages/PositionsPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { ClosedTradesPage } from './pages/ClosedTradesPage.tsx';
import { PerformancePage } from './pages/PerformancePage.tsx';
import { ActivityLogsPage } from './pages/ActivityLogsPage.tsx';
import { BacktestPage } from './pages/BacktestPage.tsx';
import { DemoShowcasePage } from './pages/DemoShowcasePage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { VerificationPage } from './pages/VerificationPage.tsx';
import { AuthModal } from './pages/AuthModal.tsx';
import {
  BotState,
  ClosedTrade,
  ConnectorDevice,
  ExchangeConnectionMetadata,
  ExchangeOrder,
  ExecutionEvent,
  PerformanceMetrics,
  PositionRecord,
  SignalDecision,
  UserProfile,
} from '../shared/types.ts';
import { safeFetchJson, safePollJson } from './utils/api.ts';
import { Wrench, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // Core Data States
  const [botState, setBotState] = useState<BotState | null>(null);
  const [metadata, setMetadata] = useState<ExchangeConnectionMetadata | null>(null);
  const [devices, setDevices] = useState<ConnectorDevice[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [latestDecision, setLatestDecision] = useState<SignalDecision | null>(null);
  const [logs, setLogs] = useState<ExecutionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize or Auto-Login as Demo Operator
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('fl_session_token');
      if (storedToken) {
        try {
          const data = await safeFetchJson<{ user: UserProfile }>('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (data?.user) {
            setUser(data.user);
            setSessionToken(storedToken);
            return;
          }
        } catch {
          // Fall through to demo login
        }
      }

      // Default to demo operator for immediate evaluation
      try {
        const data = await safeFetchJson<{ user: UserProfile; token: string }>('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'operator' }),
        });
        if (data?.user && data?.token) {
          setUser(data.user);
          setSessionToken(data.token);
          localStorage.setItem('fl_session_token', data.token);
        }
      } catch (e) {
        console.error('Initial login error:', e);
      }
    };

    initAuth();
  }, []);

  // Polling Dashboard Data
  const refreshData = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const headers = { Authorization: `Bearer ${sessionToken}` };

      const [resStatus, resPositions, resOrders, resTrades, resPerf, resDecisions, resLogs, resDevices] =
        await Promise.all([
          safePollJson<{ bot: BotState; metadata: ExchangeConnectionMetadata }>('/api/bot/status', { headers }),
          safePollJson<{ positions: PositionRecord[] }>('/api/positions', { headers }),
          safePollJson<{ orders: ExchangeOrder[] }>('/api/orders', { headers }),
          safePollJson<{ trades: ClosedTrade[] }>('/api/trades', { headers }),
          safePollJson<{ metrics: PerformanceMetrics }>('/api/performance', { headers }),
          safePollJson<{ decisions: SignalDecision[] }>('/api/decisions', { headers }),
          safePollJson<{ logs: ExecutionEvent[] }>('/api/logs', { headers }),
          safePollJson<{ devices: ConnectorDevice[] }>('/api/connector/devices', { headers }),
        ]);

      if (resStatus) {
        setBotState(resStatus.bot);
        setMetadata(resStatus.metadata);
      }
      if (resPositions) setPositions(resPositions.positions || []);
      if (resOrders) setOrders(resOrders.orders || []);
      if (resTrades) setTrades(resTrades.trades || []);
      if (resPerf) setMetrics(resPerf.metrics || null);
      if (resDecisions?.decisions?.length) setLatestDecision(resDecisions.decisions[0]);
      if (resLogs) setLogs(resLogs.logs || []);
      if (resDevices) setDevices(resDevices.devices || []);
    } catch {
      // Ignore background network interruptions
    }
  }, [sessionToken]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Send Bot Commands
  const handleSendCommand = async (type: string, payload = {}) => {
    if (!sessionToken) {
      setAuthModalOpen(true);
      return;
    }
    setIsLoading(true);
    try {
      await safeFetchJson('/api/bot/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ type, payload }),
      });
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Diagnostic Demo Round-Trip
  const runDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticResult(null);
    try {
      await safeFetchJson('/api/bot/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ type: 'RUN_DIAGNOSTIC' }),
      });
      setDiagnosticResult(
        'Diagnostic command enqueued successfully. Local connector will execute preflight, place minimum demo entry, verify fill, place reduce-only exit, and reconcile flat. Excluded from strategy statistics.'
      );
      await refreshData();
    } catch (err: unknown) {
      setDiagnosticResult(`Error: ${(err as Error).message}`);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('fl_session_token');
    setAuthModalOpen(true);
  };

  const activeDevice = devices.find((d) => d.status === 'online') || devices[0] || null;

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        connectorStatus={activeDevice ? activeDevice.status : 'offline'}
        lastHeartbeat={activeDevice?.lastHeartbeatAt}
        activeStrategy={botState?.config?.version || 'EMA-RSI-ATR-01'}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={user?.role}
          openPositionsCount={positions.length}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden">
          {activeTab === 'overview' && (
            <OverviewPage
              botState={botState}
              metadata={metadata}
              activeDevice={activeDevice}
              metrics={metrics}
              activePositions={positions}
              latestDecision={latestDecision}
              onSendCommand={handleSendCommand}
              onNavigateTab={(t) => setActiveTab(t as TabId)}
              onOpenDiagnostic={() => setDiagnosticModalOpen(true)}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'connect' && (
            <ConnectExchangePage
              devices={devices}
              metadata={metadata}
              onRefresh={refreshData}
              token={sessionToken || undefined}
            />
          )}

          {activeTab === 'settings' && (
            <BotSettingsPage config={botState?.config || null} />
          )}

          {activeTab === 'positions' && (
            <PositionsPage
              positions={positions}
              onEmergencyClose={() => handleSendCommand('EMERGENCY_CLOSE')}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'orders' && <OrdersPage orders={orders} />}

          {activeTab === 'trades' && (
            <ClosedTradesPage trades={trades} token={sessionToken || undefined} />
          )}

          {activeTab === 'performance' && (
            <PerformancePage metrics={metrics} />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsPage logs={logs} token={sessionToken || undefined} />
          )}

          {activeTab === 'backtest' && (
            <BacktestPage token={sessionToken || undefined} />
          )}

          {activeTab === 'showcase' && (
            <DemoShowcasePage
              metrics={metrics}
              token={sessionToken || undefined}
              userId={user?.id}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPage token={sessionToken || undefined} />
          )}

          {activeTab === 'verification' && <VerificationPage />}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u, tok) => {
          setUser(u);
          setSessionToken(tok);
          localStorage.setItem('fl_session_token', tok);
          refreshData();
        }}
      />

      {/* Diagnostic Round-Trip Modal */}
      {diagnosticModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0F1422] border border-cyan-800/80 rounded-lg p-6 relative">
            <button
              onClick={() => setDiagnosticModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Diagnostic Demo Round Trip</h3>
                <p className="text-xs text-slate-400">Isolated 1-cycle test of Bitget order transport</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This initiates an explicit <strong>DIAGNOSTIC_DEMO</strong> round trip: preflight checks,
              minimum size order (0.001 BTC), verified fill, immediate reduce-only closure, and reconciliation.
              It is <strong>strictly excluded</strong> from strategy statistics and win rates.
            </p>

            {diagnosticResult && (
              <div className="p-3 mb-4 rounded bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono">
                {diagnosticResult}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDiagnosticModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={runDiagnostic}
                disabled={diagnosticLoading}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{diagnosticLoading ? 'Executing Round Trip...' : 'Confirm Diagnostic Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
