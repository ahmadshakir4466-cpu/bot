/**
 * Risk Management and Sizing Module
 * Specification: Prompt 3 & 4
 *
 * UNCOMPROMISING RISK BOUNDARIES:
 * - 0.25% dedicated equity risk budget
 * - 2x maximum leverage, isolated margin, one-way mode
 * - 50% maximum notional bound
 * - Fee (0.06%) & slippage (0.05%) modeled per unit in sizing
 * - Quantization: round down to step size; if below min size, SKIP (never round up)
 * - Maximum 4 filled entries per UTC day
 * - Halted on 3 consecutive losses
 * - Halted on 2.0% daily equity drawdown (including unrealized PnL)
 * - Bid/Ask spread limit <= 0.10%
 * - Priority: BTCUSDT then ETHUSDT
 */

import { BotStrategyConfig } from '../types.ts';

export interface SizingInput {
  symbol: 'BTCUSDT' | 'ETHUSDT';
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  atr14: number;
  demoEquityUsdt: number;
  availableMarginUsdt: number;
  bidPrice: number;
  askPrice: number;
  config: BotStrategyConfig;
  activePositionsCount: number;
  dailyTradesCount: number;
  consecutiveLosses: number;
  dailyLossPercent: number;
  isDailyHalted: boolean;
}

export interface SizingResult {
  allowed: boolean;
  rejectReason?: string;
  calculatedQuantity: number;
  stopPrice: number;
  takeProfitPrice: number;
  riskDistanceD: number;
  notionalValueUsdt: number;
  requiredMarginUsdt: number;
  effectiveRiskUsdt: number;
}

export interface InstrumentSpecs {
  symbol: string;
  minQuantity: number;
  quantityStep: number;
  priceDecimals: number;
  quantityDecimals: number;
}

export const BITGET_SPECS: Record<'BTCUSDT' | 'ETHUSDT', InstrumentSpecs> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    minQuantity: 0.001,
    quantityStep: 0.001,
    priceDecimals: 1,
    quantityDecimals: 3,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    minQuantity: 0.01,
    quantityStep: 0.01,
    priceDecimals: 2,
    quantityDecimals: 2,
  },
};

export class RiskManager {
  /**
   * Quantize quantity down to the instrument step
   */
  public static quantizeQuantity(qty: number, step: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    const stepped = Math.floor(qty / step) * step;
    return Math.floor(stepped * factor) / factor;
  }

  /**
   * Round price to symbol decimals
   */
  public static roundPrice(price: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(price * factor) / factor;
  }

  /**
   * Perform comprehensive pre-entry risk verification and position sizing
   */
  public static calculatePositionSize(input: SizingInput): SizingResult {
    const {
      symbol,
      direction,
      entryPrice,
      atr14,
      demoEquityUsdt,
      availableMarginUsdt,
      bidPrice,
      askPrice,
      config,
      activePositionsCount,
      dailyTradesCount,
      consecutiveLosses,
      dailyLossPercent,
      isDailyHalted,
    } = input;

    // 1. Operational & Halt Checks
    if (isDailyHalted) {
      return {
        allowed: false,
        rejectReason: 'Bot is in latched daily halt. Trading paused until explicit reset or next UTC day.',
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    if (consecutiveLosses >= config.maxConsecutiveLosses) {
      return {
        allowed: false,
        rejectReason: `Consecutive loss limit reached (${consecutiveLosses}/${config.maxConsecutiveLosses}). Trading halted for protection.`,
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    if (dailyLossPercent >= config.maxDailyLossPercent) {
      return {
        allowed: false,
        rejectReason: `Daily loss limit reached (${dailyLossPercent.toFixed(2)}% >= ${config.maxDailyLossPercent}%). Daily protection latched.`,
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    if (dailyTradesCount >= config.maxTradesPerDay) {
      return {
        allowed: false,
        rejectReason: `Daily trade limit reached (${dailyTradesCount}/${config.maxTradesPerDay} filled entries).`,
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    if (activePositionsCount >= 1) {
      return {
        allowed: false,
        rejectReason: `Single position rule: Account already has ${activePositionsCount} active bot position. Maximum 1 position allowed across symbols.`,
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    // 2. Market Freshness & Spread Check
    const midPrice = (bidPrice + askPrice) / 2;
    if (midPrice <= 0) {
      return {
        allowed: false,
        rejectReason: 'Invalid market mid price (<= 0).',
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    const spreadPercent = ((askPrice - bidPrice) / midPrice) * 100;
    if (spreadPercent > config.maxSpreadPercent * 100) {
      return {
        allowed: false,
        rejectReason: `Market spread too wide (${spreadPercent.toFixed(3)}% > ${config.maxSpreadPercent * 100}% max allowed). Execution skipped to protect fill quality.`,
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    // 3. Stop Distance & Target Calculation
    // D = 1.5 * ATR14
    const riskDistanceD = config.stopMultiplier * atr14;
    if (riskDistanceD <= 0) {
      return {
        allowed: false,
        rejectReason: 'ATR14 value invalid or zero. Risk distance cannot be determined.',
        calculatedQuantity: 0,
        stopPrice: 0,
        takeProfitPrice: 0,
        riskDistanceD: 0,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    const specs = BITGET_SPECS[symbol];
    let rawStop = 0;
    let rawTarget = 0;

    if (direction === 'LONG') {
      rawStop = entryPrice - riskDistanceD;
      rawTarget = entryPrice + config.takeProfitMultiplier * riskDistanceD;
    } else {
      rawStop = entryPrice + riskDistanceD;
      rawTarget = entryPrice - config.takeProfitMultiplier * riskDistanceD;
    }

    const stopPrice = this.roundPrice(rawStop, specs.priceDecimals);
    const takeProfitPrice = this.roundPrice(rawTarget, specs.priceDecimals);

    // 4. Exact Position Sizing Math
    // Planned risk budget = 0.25% of dedicated demo equity
    const riskBudgetUsdt = demoEquityUsdt * (config.riskBudgetPercent / 100);

    // Cost model per unit: distance D + estimated taker fee (0.06% * entry + 0.06% * stop) + estimated slippage (0.05% * entry + 0.05% * stop)
    const takerFeeRate = config.assumedTakerFee / 100;
    const slippageRate = config.assumedSlippage / 100;
    const roundTripFrictionRate = 2 * (takerFeeRate + slippageRate);
    const costPerUnit = riskDistanceD + entryPrice * roundTripFrictionRate;

    if (costPerUnit <= 0) {
      return {
        allowed: false,
        rejectReason: 'Cost per unit calculation resulted in <= 0.',
        calculatedQuantity: 0,
        stopPrice,
        takeProfitPrice,
        riskDistanceD,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    let calculatedQuantity = riskBudgetUsdt / costPerUnit;

    // 5. Constraints & Bounds
    // Bound 1: Max Notional = 50% of dedicated demo equity
    const maxNotionalAllowed = demoEquityUsdt * (config.maxNotionalPercent / 100);
    const maxQtyByNotional = maxNotionalAllowed / entryPrice;
    calculatedQuantity = Math.min(calculatedQuantity, maxQtyByNotional);

    // Bound 2: Available Margin (with 2x leverage, required margin is notional / 2)
    const maxQtyByMargin = (availableMarginUsdt * config.maxLeverage * 0.95) / entryPrice; // 5% buffer
    calculatedQuantity = Math.min(calculatedQuantity, maxQtyByMargin);

    // Quantize downwards to exchange step
    calculatedQuantity = this.quantizeQuantity(
      calculatedQuantity,
      specs.quantityStep,
      specs.quantityDecimals
    );

    // Check minimum quantity: Prompt 3 rule: "If below the minimum, SKIP rather than increasing risk."
    if (calculatedQuantity < specs.minQuantity) {
      return {
        allowed: false,
        rejectReason: `Calculated size (${calculatedQuantity} ${symbol}) is below exchange minimum (${specs.minQuantity}). Sizing skipped to prevent enlarging risk budget.`,
        calculatedQuantity: 0,
        stopPrice,
        takeProfitPrice,
        riskDistanceD,
        notionalValueUsdt: 0,
        requiredMarginUsdt: 0,
        effectiveRiskUsdt: 0,
      };
    }

    const notionalValueUsdt = calculatedQuantity * entryPrice;
    const requiredMarginUsdt = notionalValueUsdt / config.maxLeverage;
    const effectiveRiskUsdt = calculatedQuantity * costPerUnit;

    return {
      allowed: true,
      calculatedQuantity,
      stopPrice,
      takeProfitPrice,
      riskDistanceD,
      notionalValueUsdt,
      requiredMarginUsdt,
      effectiveRiskUsdt,
    };
  }
}
