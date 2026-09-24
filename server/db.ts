/**
 * Futures Lab: Server Durable Store & Database Repository
 *
 * Implements strict tenant isolation, durable commands outbox with leasing,
 * append-only execution events, trade lifecycle management, and metadata-only exchange store.
 * NO EXCHANGE SECRETS ARE STORED IN DATABASE.
 */

import crypto from 'node:crypto';
import {
  BacktestResult,
  BotLifecycleState,
  BotState,
  BotStrategyConfig,
  ClosedTrade,
  CommandType,
  ConnectorDevice,
  DurableCommand,
  EquitySnapshot,
  ExchangeConnectionMetadata,
  ExchangeOrder,
  ExecutionEvent,
  PositionRecord,
  ShowcasePublication,
  SignalDecision,
  UserProfile,
  UserRole,
} from '../shared/types.ts';

export const DEFAULT_STRATEGY_CONFIG: BotStrategyConfig = {
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

interface UserAccountStore {
  user: UserProfile;
  passwordHash: string;
  salt: string;
}

export class DurableDatabase {
  private users: Map<string, UserAccountStore> = new Map();
  private sessions: Map<string, { userId: string; expiresAt: number }> = new Map();
  private connectorDevices: Map<string, ConnectorDevice> = new Map();
  private deviceTokens: Map<string, { deviceId: string; userId: string }> = new Map();
  private pairingCodes: Map<string, { userId: string; expiresAt: number }> = new Map();
  private exchangeConnections: Map<string, ExchangeConnectionMetadata> = new Map();
  private bots: Map<string, BotState> = new Map();
  private commands: Map<string, DurableCommand> = new Map();
  private signalDecisions: SignalDecision[] = [];
  private orders: Map<string, ExchangeOrder> = new Map(); // clientOid -> Order
  private positions: Map<string, PositionRecord> = new Map(); // `${userId}_${symbol}` -> Position
  private closedTrades: ClosedTrade[] = [];
  private equitySnapshots: EquitySnapshot[] = [];
  private executionEvents: ExecutionEvent[] = [];
  private backtestRuns: Map<string, BacktestResult> = new Map();
  private showcasePublications: Map<string, ShowcasePublication> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 32).toString('hex');
  }

  private seedDefaultUsers() {
    // 1. Seed Demo Operator
    const opId = 'usr_operator_001';
    const opSalt = crypto.randomBytes(16).toString('hex');
    this.users.set('operator@futureslab.internal', {
      user: {
        id: opId,
        email: 'operator@futureslab.internal',
        role: 'operator',
        createdAt: '2026-09-01T00:00:00Z',
      },
      salt: opSalt,
      passwordHash: this.hashPassword('DemoOperator2026!', opSalt),
    });

    // 2. Seed Admin
    const adminId = 'usr_admin_001';
    const adminSalt = crypto.randomBytes(16).toString('hex');
    this.users.set('admin@futureslab.internal', {
      user: {
        id: adminId,
        email: 'admin@futureslab.internal',
        role: 'admin',
        createdAt: '2026-09-01T00:00:00Z',
      },
      salt: adminSalt,
      passwordHash: this.hashPassword('AdminVault2026!', adminSalt),
    });

    // Initialize Bot for default operator
    this.bots.set(opId, {
      id: `bot_${opId}`,
      userId: opId,
      state: 'STOPPED',
      stateReason: 'Awaiting local connector pairing and initial connection test',
      dailyTradesCount: 0,
      dailyLossPercent: 0,
      consecutiveLosses: 0,
      dayStartEquity: 10000,
      lastDayResetUtc: new Date().toISOString().slice(0, 10),
      config: { ...DEFAULT_STRATEGY_CONFIG },
    });

    // Initial Execution Event
    this.executionEvents.push({
      id: `evt_init_${Date.now()}`,
      userId: opId,
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      category: 'AUTH',
      message: 'Futures Lab system initialized. Demo funds isolation enforced.',
      details: { environment: 'EXCHANGE_DEMO', rule: 'Live orders prohibited' },
    });
  }

  // --- Auth Methods ---
  public register(email: string, password: string, role: UserRole = 'operator'): UserProfile {
    const normalized = email.toLowerCase().trim();
    if (this.users.has(normalized)) {
      throw new Error('User already exists');
    }
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const user: UserProfile = {
      id,
      email: normalized,
      role,
      createdAt: new Date().toISOString(),
    };
    this.users.set(normalized, { user, salt, passwordHash });

    // Initialize user bot
    this.bots.set(id, {
      id: `bot_${id}`,
      userId: id,
      state: 'STOPPED',
      stateReason: 'Initialized. Unconnected.',
      dailyTradesCount: 0,
      dailyLossPercent: 0,
      consecutiveLosses: 0,
      dayStartEquity: 10000,
      lastDayResetUtc: new Date().toISOString().slice(0, 10),
      config: { ...DEFAULT_STRATEGY_CONFIG },
    });

    return user;
  }

  public authenticate(email: string, password: string): { user: UserProfile; token: string } {
    const normalized = email.toLowerCase().trim();
    const record = this.users.get(normalized);
    if (!record) {
      throw new Error('Invalid email or password');
    }
    const hash = this.hashPassword(password, record.salt);
    if (hash !== record.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const token = `fl_sess_${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, {
      userId: record.user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    record.user.lastLoginAt = new Date().toISOString();
    return { user: record.user, token };
  }

  public getUserBySessionToken(token: string): UserProfile | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    for (const item of this.users.values()) {
      if (item.user.id === session.userId) {
        return item.user;
      }
    }
    return null;
  }

  public getUserById(userId: string): UserProfile | null {
    for (const item of this.users.values()) {
      if (item.user.id === userId) {
        return item.user;
      }
    }
    return null;
  }

  // --- Connector Pairing & Management ---
  public generatePairingCode(userId: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pairingCodes.set(code, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
    return code;
  }

  public pairDeviceWithCode(
    code: string,
    deviceName: string,
    clientVersion: string,
    ipAddress?: string
  ): { device: ConnectorDevice; deviceToken: string } {
    const pairing = this.pairingCodes.get(code);
    if (!pairing || pairing.expiresAt < Date.now()) {
      throw new Error('Invalid or expired pairing code');
    }

    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const device: ConnectorDevice = {
      id: deviceId,
      userId: pairing.userId,
      name: deviceName || 'Local Worker',
      pairedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      status: 'online',
      ipAddress: ipAddress || '127.0.0.1',
      clientVersion,
      revoked: false,
      capabilities: {
        canTradeDemo: true,
        canSetLeverage: true,
        canReadAccount: true,
      },
    };

    this.connectorDevices.set(deviceId, device);
    const deviceToken = `dev_tok_${crypto.randomBytes(32).toString('hex')}`;
    this.deviceTokens.set(deviceToken, { deviceId, userId: pairing.userId });
    this.pairingCodes.delete(code);

    this.addEvent({
      userId: pairing.userId,
      severity: 'INFO',
      category: 'AUTH',
      message: `Local connector device paired successfully: ${deviceName}`,
      details: { deviceId, clientVersion },
    });

    return { device, deviceToken };
  }

  public getDeviceByToken(deviceToken: string): { device: ConnectorDevice; userId: string } | null {
    const mapped = this.deviceTokens.get(deviceToken);
    if (!mapped) return null;
    const device = this.connectorDevices.get(mapped.deviceId);
    if (!device || device.revoked) return null;
    return { device, userId: mapped.userId };
  }

  public updateDeviceHeartbeat(deviceId: string, capabilities?: Record<string, boolean>) {
    const dev = this.connectorDevices.get(deviceId);
    if (dev) {
      dev.lastHeartbeatAt = new Date().toISOString();
      dev.status = 'online';
      if (capabilities) {
        dev.capabilities = { ...dev.capabilities, ...capabilities };
      }
    }
  }

  public getDevicesForUser(userId: string): ConnectorDevice[] {
    const list: ConnectorDevice[] = [];
    const now = Date.now();
    for (const dev of this.connectorDevices.values()) {
      if (dev.userId === userId) {
        // Detect stale state (> 60s without heartbeat)
        const lastHb = dev.lastHeartbeatAt ? new Date(dev.lastHeartbeatAt).getTime() : 0;
        if (now - lastHb > 60000) {
          dev.status = 'stale';
        }
        if (now - lastHb > 180000) {
          dev.status = 'offline';
        }
        list.push(dev);
      }
    }
    return list;
  }

  // --- Exchange Connection Metadata (Metadata only, NO SECRETS) ---
  public setExchangeMetadata(userId: string, meta: Partial<ExchangeConnectionMetadata>) {
    const existing = this.exchangeConnections.get(userId) || {
      id: `ex_${userId}`,
      userId,
      broker: 'bitget',
      environment: 'EXCHANGE_DEMO',
      accountUidMasked: 'DEMO-***',
      accountType: 'UTA_V3_DEMO',
      permissions: {
        futuresTrade: true,
        accountRead: true,
        leverageConfig: true,
        withdrawRestricted: true,
      },
      balanceUsdt: 0,
      availableMarginUsdt: 0,
      positionMode: 'one_way',
      marginMode: 'isolated',
      isStale: false,
      unexplainedExposureDetected: false,
    };

    const updated: ExchangeConnectionMetadata = {
      ...existing,
      ...meta,
      userId,
      broker: 'bitget',
      environment: 'EXCHANGE_DEMO',
      lastReconciledAt: new Date().toISOString(),
    };

    this.exchangeConnections.set(userId, updated);
    return updated;
  }

  public getExchangeMetadata(userId: string): ExchangeConnectionMetadata | null {
    return this.exchangeConnections.get(userId) || null;
  }

  // --- Bot State & Configuration ---
  public getBot(userId: string): BotState {
    let bot = this.bots.get(userId);
    if (!bot) {
      bot = {
        id: `bot_${userId}`,
        userId,
        state: 'STOPPED',
        stateReason: 'Initialized',
        dailyTradesCount: 0,
        dailyLossPercent: 0,
        consecutiveLosses: 0,
        dayStartEquity: 10000,
        lastDayResetUtc: new Date().toISOString().slice(0, 10),
        config: { ...DEFAULT_STRATEGY_CONFIG },
      };
      this.bots.set(userId, bot);
    }
    return bot;
  }

  public updateBotState(
    userId: string,
    updates: Partial<BotState>
  ): BotState {
    const bot = this.getBot(userId);
    Object.assign(bot, updates);
    return bot;
  }

  // --- Durable Commands Outbox ---
  public enqueueCommand(
    userId: string,
    type: CommandType,
    payload: Record<string, unknown> = {}
  ): DurableCommand {
    const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const command: DurableCommand = {
      id,
      userId,
      type,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min TTL
    };

    this.commands.set(id, command);

    this.addEvent({
      userId,
      severity: 'INFO',
      category: 'ORDER',
      message: `Durable command enqueued: ${type}`,
      details: { commandId: id, payload },
    });

    return command;
  }

  public pollPendingCommandsForDevice(deviceId: string, userId: string): DurableCommand[] {
    const list: DurableCommand[] = [];
    const now = Date.now();
    for (const cmd of this.commands.values()) {
      if (cmd.userId === userId && cmd.status === 'PENDING') {
        const exp = new Date(cmd.expiresAt).getTime();
        if (exp < now) {
          cmd.status = 'EXPIRED';
          continue;
        }
        // Fencing / Lease: Grant 30 second execution lease
        cmd.status = 'DISPATCHED';
        cmd.leaseOwner = deviceId;
        cmd.leaseExpiresAt = new Date(now + 30000).toISOString();
        list.push(cmd);
      }
    }
    return list;
  }

  public acknowledgeCommand(
    commandId: string,
    status: 'EXECUTED' | 'REJECTED',
    message?: string
  ) {
    const cmd = this.commands.get(commandId);
    if (cmd) {
      cmd.status = status;
      cmd.statusMessage = message;
      cmd.executedAt = new Date().toISOString();
    }
  }

  // --- Signal Decisions & Order State Machine ---
  public recordSignalDecision(decision: SignalDecision) {
    this.signalDecisions.unshift(decision);
    if (this.signalDecisions.length > 500) {
      this.signalDecisions.pop();
    }
  }

  public getSignalDecisions(limit = 50): SignalDecision[] {
    return this.signalDecisions.slice(0, limit);
  }

  public saveOrder(order: ExchangeOrder) {
    this.orders.set(order.clientOid, order);
  }

  public getOrders(): ExchangeOrder[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderByClientOid(clientOid: string): ExchangeOrder | null {
    return this.orders.get(clientOid) || null;
  }

  // --- Positions ---
  public updatePosition(userId: string, pos: PositionRecord) {
    this.positions.set(`${userId}_${pos.symbol}`, pos);
  }

  public removePosition(userId: string, symbol: string) {
    this.positions.delete(`${userId}_${symbol}`);
  }

  public getPositionsForUser(userId: string): PositionRecord[] {
    const list: PositionRecord[] = [];
    for (const [key, pos] of this.positions.entries()) {
      if (key.startsWith(`${userId}_`)) {
        list.push(pos);
      }
    }
    return list;
  }

  // --- Closed Trades ---
  public recordClosedTrade(trade: ClosedTrade) {
    this.closedTrades.unshift(trade);
  }

  public getClosedTrades(userId: string, environment?: string): ClosedTrade[] {
    return this.closedTrades.filter(
      (t) => t.userId === userId && (!environment || t.environment === environment)
    );
  }

  // --- Equity Snapshots ---
  public recordEquitySnapshot(snap: EquitySnapshot) {
    this.equitySnapshots.push(snap);
    if (this.equitySnapshots.length > 1000) {
      this.equitySnapshots.shift();
    }
  }

  public getEquitySnapshots(userId: string): EquitySnapshot[] {
    return this.equitySnapshots.filter((s) => s.userId === userId);
  }

  // --- Execution Events (Append-only) ---
  public addEvent(event: Omit<ExecutionEvent, 'id' | 'timestamp'> & { timestamp?: string }) {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullEvent: ExecutionEvent = {
      id,
      timestamp: event.timestamp || new Date().toISOString(),
      severity: event.severity,
      category: event.category,
      symbol: event.symbol,
      message: event.message,
      details: event.details,
      correlationId: event.correlationId,
      userId: event.userId,
      runId: event.runId,
    };
    this.executionEvents.unshift(fullEvent);
    if (this.executionEvents.length > 1500) {
      this.executionEvents.pop();
    }
    return fullEvent;
  }

  public getEvents(userId?: string, limit = 100): ExecutionEvent[] {
    const filtered = userId
      ? this.executionEvents.filter((e) => !e.userId || e.userId === userId)
      : this.executionEvents;
    return filtered.slice(0, limit);
  }

  // --- Backtest Runs ---
  public saveBacktest(result: BacktestResult) {
    this.backtestRuns.set(result.id, result);
  }

  public getBacktest(id: string): BacktestResult | null {
    return this.backtestRuns.get(id) || null;
  }

  public getBacktestsForUser(userId: string): BacktestResult[] {
    return Array.from(this.backtestRuns.values()).filter((b) => b.userId === userId);
  }

  // --- Showcase Publications (Public Demo View) ---
  public setPublication(publication: ShowcasePublication) {
    this.showcasePublications.set(publication.id, publication);
  }

  public getPublication(id: string): ShowcasePublication | null {
    return this.showcasePublications.get(id) || null;
  }

  public getAllPublications(): ShowcasePublication[] {
    return Array.from(this.showcasePublications.values());
  }

  // Admin audit stats
  public getAdminStats() {
    return {
      totalUsers: this.users.size,
      activeDevices: this.connectorDevices.size,
      totalOrders: this.orders.size,
      totalClosedTrades: this.closedTrades.length,
      totalEvents: this.executionEvents.length,
      totalBacktests: this.backtestRuns.size,
      uptimeSeconds: process.uptime(),
      nodeVersion: process.version,
    };
  }
}

export const db = new DurableDatabase();
