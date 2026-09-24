/**
 * Futures Lab — Core Types & Domain Interfaces
 * Strictly enforces environment isolation: EXCHANGE_DEMO, HISTORICAL_BACKTEST, DIAGNOSTIC_DEMO.
 * LIVE TRADING IS STRUCTURALLY IMPOSSIBLE AND PROHIBITED.
 */

export type ExecutionEnvironment = 'EXCHANGE_DEMO' | 'HISTORICAL_BACKTEST' | 'DIAGNOSTIC_DEMO';

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
}

export type ConnectorStatus = 'online' | 'offline' | 'stale';

export interface ConnectorDevice {
  id: string;
  userId: string;
  name: string;
  pairingCode?: string;
  pairingCodeExpiresAt?: string;
  pairedAt?: string;
  lastHeartbeatAt?: string;
  status: ConnectorStatus;
  ipAddress?: string;
  clientVersion: string;
  revoked: boolean;
  capabilities: {
    canTradeDemo: boolean;
    canSetLeverage: boolean;
    canReadAccount: boolean;
  };
}

export interface ExchangeConnectionMetadata {
  id: string;
  userId: string;
  broker: 'bitget';
  environment: 'EXCHANGE_DEMO';
  accountUidMasked: string;
  accountType: 'UTA_V3_DEMO';
  verifiedAt?: string;
  permissions: {
    futuresTrade: boolean;
    accountRead: boolean;
    leverageConfig: boolean;
    withdrawRestricted: boolean;
  };
  balanceUsdt?: number;
  availableMarginUsdt?: number;
  positionMode?: 'one_way' | 'hedge';
  marginMode?: 'isolated' | 'cross';
  lastReconciledAt?: string;
  isStale: boolean;
  unexplainedExposureDetected?: boolean;
}

export type BotLifecycleState =
  | 'STOPPED'
  | 'RUNNING'
  | 'PAUSED_ENTRIES'
  | 'STOP_AFTER_FLAT'
  | 'HALTED_DAILY_LOSS'
  | 'HALTED_CONSECUTIVE_LOSS'
  | 'EMERGENCY_HALTED';

export interface BotStrategyConfig {
  version: 'EMA-RSI-ATR-01';
  symbolPrimary: 'BTCUSDT';
  symbolSecondary: 'ETHUSDT';
  signalTimeframe: '15m';
  trendTimeframe: '1h';
  warmupCandles1h: number; // >= 400
  warmupCandles15m: number; // >= 200
  emaFastPeriod: number; // 20
  emaSlowPeriod: number; // 50
  emaTrendPeriod: number; // 200
  rsiPeriod: number; // 14
  rsiLongMin: number; // 50
  rsiLongMax: number; // 70
  rsiShortMin: number; // 30
  rsiShortMax: number; // 50
  atrPeriod: number; // 14
  stopMultiplier: number; // 1.5 * ATR14
  takeProfitMultiplier: number; // 2.0 * stop distance
  maxBarsInPosition: number; // 96 bars (24h on 15m)
  riskBudgetPercent: number; // 0.25% of dedicated demo equity
  maxLeverage: number; // 2x
  maxNotionalPercent: number; // 50% of demo equity
  maxTradesPerDay: number; // 4
  maxConsecutiveLosses: number; // 3
  maxDailyLossPercent: number; // 2.0%
  maxSpreadPercent: number; // 0.10%
  maxBookImpactPercent: number; // 0.10%
  assumedTakerFee: number; // 0.06%
  assumedSlippage: number; // 0.05%
  signalExpirySeconds: number; // 60s
}

export interface BotState {
  id: string;
  userId: string;
  state: BotLifecycleState;
  stateReason: string;
  currentRunId?: string;
  startedAt?: string;
  pausedAt?: string;
  stoppedAt?: string;
  dailyTradesCount: number;
  dailyLossPercent: number;
  consecutiveLosses: number;
  dayStartEquity: number;
  lastDayResetUtc: string;
  config: BotStrategyConfig;
  lastHeartbeatAt?: string;
}

export type CommandType =
  | 'START_BOT'
  | 'PAUSE_ENTRIES'
  | 'STOP_AFTER_FLAT'
  | 'EMERGENCY_CLOSE'
  | 'GLOBAL_HALT'
  | 'RUN_DIAGNOSTIC';

export type CommandStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';

export interface DurableCommand {
  id: string;
  userId: string;
  deviceId?: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  statusMessage?: string;
  createdAt: string;
  expiresAt: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  executedAt?: string;
}

export interface SignalConditionResult {
  name: string;
  satisfied: boolean;
  expected: string;
  actual: string;
}

export interface SignalDecision {
  id: string;
  runId: string;
  symbol: string;
  candleCloseTime: string;
  closePrice: number;
  direction: 'LONG' | 'SHORT' | 'HOLD';
  conditions: SignalConditionResult[];
  indicators: {
    ema20: number;
    ema50: number;
    emaTrend200: number;
    rsi14: number;
    atr14: number;
    prevEma20: number;
    prevEma50: number;
  };
  reason: string;
  createdAt: string;
  expired: boolean;
}

export interface OrderIntent {
  id: string;
  clientOid: string;
  runId: string;
  userId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  intendedPrice: number;
  stopPrice: number;
  takeProfitPrice: number;
  riskAmountUsdt: number;
  calculatedQuantity: number;
  environment: ExecutionEnvironment;
  createdAt: string;
}

export type OrderStatus =
  | 'CREATED'
  | 'SUBMITTING'
  | 'UNKNOWN'
  | 'ACKNOWLEDGED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCEL_PENDING'
  | 'CANCELED'
  | 'REJECTED';

export interface ExchangeOrder {
  id: string;
  clientOid: string;
  exchangeOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  reduceOnly: boolean;
  price?: number;
  size: number;
  filledSize: number;
  avgFillPrice?: number;
  status: OrderStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionRecord {
  id: string;
  symbol: string;
  holdSide: 'long' | 'short';
  totalSize: number;
  availableSize: number;
  averageOpenPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  liquidationPrice?: number;
  leverage: number;
  marginMode: 'isolated' | 'cross';
  entryTime: string;
  barsHeld: number;
  stopLossOrderId?: string;
  stopLossPrice?: number;
  takeProfitOrderId?: string;
  takeProfitPrice?: number;
  protectionVerified: boolean;
  updatedAt: string;
}

export interface ClosedTrade {
  id: string;
  runId: string;
  userId: string;
  environment: ExecutionEnvironment;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  openedAt: string;
  closedAt: string;
  holdDurationSeconds: number;
  holdBars: number;
  grossPnl: number;
  feesPaid: number;
  fundingPaid: number;
  netPnl: number;
  returnPercent: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPPOSITE_CROSS' | 'BAR_TIMEOUT' | 'EMERGENCY_CLOSE' | 'DIAGNOSTIC_EXIT';
  status: 'FINALIZED' | 'PROVISIONAL';
  provisionalReason?: string;
  clientOids: string[];
}

export interface EquitySnapshot {
  id: string;
  runId: string;
  userId: string;
  timestamp: string;
  balance: number;
  unrealizedPnl: number;
  equity: number;
  unitizedNav: number;
  peakNav: number;
  drawdownPercent: number;
  externalCashflow: number;
}

export type EventSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface ExecutionEvent {
  id: string;
  runId?: string;
  userId?: string;
  timestamp: string;
  severity: EventSeverity;
  category: 'AUTH' | 'SIGNAL' | 'RISK' | 'ORDER' | 'FILL' | 'RECONCILE' | 'HEARTBEAT' | 'DIAGNOSTIC';
  symbol?: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

export interface PerformanceMetrics {
  cohortName: string;
  totalTrades: number; // N
  wins: number;
  losses: number;
  breakevens: number;
  winRatePercent: number | null; // null if N = 0
  lossRatePercent: number | null;
  breakevenRatePercent: number | null;
  netRealizedPnl: number;
  totalFees: number;
  totalFunding: number;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  payoffRatio: number | null;
  expectancyUsdt: number | null;
  maxDrawdownPercent: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  provisionalTradesCount: number;
  confidenceInterval95: {
    lowerPercent: number | null;
    upperPercent: number | null;
    method: string;
    caveat: string;
  };
  sampleSizeEvaluation: {
    closedTradesCount: number;
    recommendedTarget: number; // 100
    progressPercent: number;
    evidenceMarker: 'Limited evidence (< 100 trades)' | 'Sufficient statistical sample';
  };
  lastReconciledAt?: string;
}

export interface BacktestResult {
  id: string;
  userId: string;
  symbol: string;
  dateRange: { start: string; end: string };
  totalCandles15m: number;
  totalCandles1h: number;
  developmentSample: PerformanceMetrics; // 60%
  validationSample: PerformanceMetrics; // 20%
  holdoutSample: PerformanceMetrics; // 20% untouched
  combinedMetrics: PerformanceMetrics;
  assumptions: {
    takerFeePercent: number;
    slippagePercent: number;
    fundingRateEstimated: number;
    executionLatencyBars: number;
  };
  trades: ClosedTrade[];
  equityCurve: { timestamp: string; equity: number; drawdown: number }[];
  createdAt: string;
}

export interface ShowcasePublication {
  id: string;
  runId: string;
  userId: string;
  isPublished: boolean;
  publishedAt?: string;
  title: string;
  environment: 'EXCHANGE_DEMO';
  declaredPeriod: { start: string; end: string };
  allowedSymbols: string[];
  metrics: PerformanceMetrics;
  recentAnonymizedTrades: Array<{
    symbol: string;
    direction: 'LONG' | 'SHORT';
    openedAt: string;
    closedAt: string;
    netPnl: number;
    exitReason: string;
  }>;
  disclaimer: string;
  updatedAt: string;
}
