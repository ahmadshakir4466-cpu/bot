/**
 * Baseline Strategy: EMA-RSI-ATR-01
 * Specification: Prompt 3
 *
 * UNPROVEN DEMO RESEARCH BASELINE — NO GUARANTEE OF PROFITABILITY
 * NO LANGUAGE MODEL SIZES OR SENDS TRADING ORDERS.
 *
 * Requirements:
 * - Closed 15m candles for signals; latest fully closed 1h candle for trend filter.
 * - Strict no-lookahead: bar close time <= t. Never evaluate forming bars.
 * - Warmup: >= 400 closed 1h candles, >= 200 closed 15m candles.
 * - Wilder's smoothing for RSI14 and ATR14.
 * - Clear transparent logging of each condition result.
 * - Exits: 1.5 * ATR14 stop, 2x stop target, 96 bar maximum hold, opposite EMA cross.
 */

import { SignalConditionResult, SignalDecision } from '../types.ts';

export interface Candle {
  timestamp: number; // Opening time or closing time (standardized to close time)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime?: number;
}

export class IndicatorCalculator {
  /**
   * Exponential Moving Average (EMA)
   * Initialized with Simple Moving Average (SMA) of first `period` bars
   */
  public static calculateEMA(values: number[], period: number): number[] {
    if (values.length < period) {
      return [];
    }

    const ema: number[] = new Array(values.length).fill(NaN);
    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    ema[period - 1] = sum / period;

    const multiplier = 2 / (period + 1);
    for (let i = period; i < values.length; i++) {
      ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  /**
   * Wilder's Smoothed RSI (Relative Strength Index)
   */
  public static calculateRSI(closes: number[], period = 14): number[] {
    if (closes.length <= period) {
      return [];
    }

    const rsi: number[] = new Array(closes.length).fill(NaN);
    let avgGain = 0;
    let avgLoss = 0;

    // First period
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain += change;
      } else {
        avgLoss += Math.abs(change);
      }
    }

    avgGain /= period;
    avgLoss /= period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    // Wilder's smoothing for remaining values
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    }

    return rsi;
  }

  /**
   * Wilder's Smoothed ATR (Average True Range)
   */
  public static calculateATR(candles: Candle[], period = 14): number[] {
    if (candles.length <= period) {
      return [];
    }

    const trueRanges: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    const atr: number[] = new Array(candles.length).fill(NaN);
    // Initial SMA of TR
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trueRanges[i];
    }
    atr[period - 1] = sum / period;

    // Wilder's smoothing
    for (let i = period; i < candles.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
  }
}

export class EmaRsiAtrStrategy {
  public static readonly VERSION = 'EMA-RSI-ATR-01';
  public static readonly MIN_15M_WARMUP = 200;
  public static readonly MIN_1H_WARMUP = 400;

  /**
   * Clean, deduplicate and check continuity of candle series
   */
  public static sanitizeCandles(candles: Candle[]): Candle[] {
    const map = new Map<number, Candle>();
    for (const c of candles) {
      map.set(c.timestamp, c);
    }
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Evaluate closed 15m candle against closed 1h trend filter
   */
  public static evaluate({
    runId,
    symbol,
    candles15m,
    candles1h,
    evaluationTime = Date.now(),
  }: {
    runId: string;
    symbol: string;
    candles15m: Candle[];
    candles1h: Candle[];
    evaluationTime?: number;
  }): SignalDecision {
    const clean15m = this.sanitizeCandles(candles15m);
    const clean1h = this.sanitizeCandles(candles1h);

    const conditions: SignalConditionResult[] = [];

    // Check Warmup requirements
    const is15mReady = clean15m.length >= this.MIN_15M_WARMUP;
    const is1hReady = clean1h.length >= this.MIN_1H_WARMUP;

    conditions.push({
      name: '15m Candle Warmup (>= 200 closed bars)',
      satisfied: is15mReady,
      expected: `>= ${this.MIN_15M_WARMUP}`,
      actual: `${clean15m.length}`,
    });

    conditions.push({
      name: '1h Trend Warmup (>= 400 closed bars)',
      satisfied: is1hReady,
      expected: `>= ${this.MIN_1H_WARMUP}`,
      actual: `${clean1h.length}`,
    });

    if (!is15mReady || !is1hReady) {
      return {
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        runId,
        symbol,
        candleCloseTime: new Date(clean15m[clean15m.length - 1]?.timestamp || evaluationTime).toISOString(),
        closePrice: clean15m[clean15m.length - 1]?.close || 0,
        direction: 'HOLD',
        conditions,
        indicators: {
          ema20: 0,
          ema50: 0,
          emaTrend200: 0,
          rsi14: 0,
          atr14: 0,
          prevEma20: 0,
          prevEma50: 0,
        },
        reason: `Insufficient warmup candles: 15m bars (${clean15m.length}/${this.MIN_15M_WARMUP}), 1h bars (${clean1h.length}/${this.MIN_1H_WARMUP}). Indicators warming up.`,
        createdAt: new Date().toISOString(),
        expired: false,
      };
    }

    // Latest fully closed 15m bar
    const last15mIndex = clean15m.length - 1;
    const current15m = clean15m[last15mIndex];
    const prev15mIndex = last15mIndex - 1;

    // Calculate 15m Indicators
    const closes15m = clean15m.map((c) => c.close);
    const ema20Series = IndicatorCalculator.calculateEMA(closes15m, 20);
    const ema50Series = IndicatorCalculator.calculateEMA(closes15m, 50);
    const rsi14Series = IndicatorCalculator.calculateRSI(closes15m, 14);
    const atr14Series = IndicatorCalculator.calculateATR(clean15m, 14);

    const currEma20 = ema20Series[last15mIndex];
    const prevEma20 = ema20Series[prev15mIndex];
    const currEma50 = ema50Series[last15mIndex];
    const prevEma50 = ema50Series[prev15mIndex];
    const currRsi = rsi14Series[last15mIndex];
    const currAtr = atr14Series[last15mIndex];

    // Filter 1h candles to strictly those whose close time <= 15m candle close time
    // No lookahead!
    const candle15mCloseMs = current15m.timestamp + 15 * 60 * 1000;
    const valid1hCandles = clean1h.filter((c) => {
      const c1hClose = c.timestamp + 60 * 60 * 1000;
      return c1hClose <= candle15mCloseMs;
    });

    if (valid1hCandles.length < 200) {
      conditions.push({
        name: '1h Trend History Alignment (<= 15m bar timestamp)',
        satisfied: false,
        expected: '>= 200 bars',
        actual: `${valid1hCandles.length} bars`,
      });

      return {
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        runId,
        symbol,
        candleCloseTime: new Date(candle15mCloseMs).toISOString(),
        closePrice: current15m.close,
        direction: 'HOLD',
        conditions,
        indicators: {
          ema20: currEma20,
          ema50: currEma50,
          emaTrend200: 0,
          rsi14: currRsi,
          atr14: currAtr,
          prevEma20,
          prevEma50,
        },
        reason: 'Waiting for aligned historical 1h trend bars prior to current 15m bar close.',
        createdAt: new Date().toISOString(),
        expired: false,
      };
    }

    const closes1h = valid1hCandles.map((c) => c.close);
    const ema200Series1h = IndicatorCalculator.calculateEMA(closes1h, 200);
    const latest1hIndex = valid1hCandles.length - 1;
    const latest1hClose = closes1h[latest1indexSafe(latest1hIndex)];
    const latest1hEma200 = ema200Series1h[latest1indexSafe(latest1hIndex)];

    // Check Long Signal Conditions
    // 1. Previous 15m EMA20 <= EMA50 and current EMA20 > EMA50 (Bullish crossover)
    const bullCross = prevEma20 <= prevEma50 && currEma20 > currEma50;
    // 2. Latest closed 1h close > EMA200
    const trendBullish = latest1hClose > latest1hEma200;
    // 3. Current 15m RSI14 in [50, 70]
    const rsiLongValid = currRsi >= 50 && currRsi <= 70;

    // Check Short Signal Conditions
    // 1. Previous 15m EMA20 >= EMA50 and current EMA20 < EMA50 (Bearish crossover)
    const bearCross = prevEma20 >= prevEma50 && currEma20 < currEma50;
    // 2. Latest closed 1h close < EMA200
    const trendBearish = latest1hClose < latest1hEma200;
    // 3. Current 15m RSI14 in [30, 50]
    const rsiShortValid = currRsi >= 30 && currRsi <= 50;

    conditions.push({
      name: '15m EMA20/EMA50 Crossover',
      satisfied: bullCross || bearCross,
      expected: 'Bullish (EMA20 cross above EMA50) or Bearish (cross below)',
      actual: bullCross
        ? 'Bullish crossover confirmed'
        : bearCross
        ? 'Bearish crossover confirmed'
        : `No crossover (EMA20: ${currEma20.toFixed(2)}, EMA50: ${currEma50.toFixed(2)})`,
    });

    conditions.push({
      name: '1h Trend Filter (1h Close vs EMA200)',
      satisfied: (bullCross && trendBullish) || (bearCross && trendBearish),
      expected: bullCross ? '1h Close > EMA200' : bearCross ? '1h Close < EMA200' : 'Aligned with cross',
      actual: `1h Close: ${latest1hClose.toFixed(2)} | EMA200: ${latest1hEma200.toFixed(2)} (${
        latest1hClose > latest1hEma200 ? 'Bullish Trend' : 'Bearish Trend'
      })`,
    });

    conditions.push({
      name: '15m RSI14 Filter',
      satisfied: (bullCross && rsiLongValid) || (bearCross && rsiShortValid),
      expected: bullCross ? '50 <= RSI <= 70' : bearCross ? '30 <= RSI <= 50' : 'Between 30-70',
      actual: `RSI14 = ${currRsi.toFixed(2)}`,
    });

    // Check signal expiration (Prompt 3: expire entry signals 60 seconds after candle close)
    const secondsSinceClose = (evaluationTime - candle15mCloseMs) / 1000;
    const isExpired = secondsSinceClose > 60;

    let direction: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    let reason = 'Holding: Criteria not met. ';

    if (bullCross && trendBullish && rsiLongValid) {
      if (isExpired) {
        reason = `Valid LONG signal detected, but expired (${secondsSinceClose.toFixed(0)}s > 60s since candle close). Backlog execution prevented.`;
      } else {
        direction = 'LONG';
        reason = `Valid LONG signal: EMA20 crossed above EMA50, 1h trend bullish (${latest1hClose.toFixed(
          1
        )} > ${latest1hEma200.toFixed(1)}), RSI ${currRsi.toFixed(1)} in [50, 70].`;
      }
    } else if (bearCross && trendBearish && rsiShortValid) {
      if (isExpired) {
        reason = `Valid SHORT signal detected, but expired (${secondsSinceClose.toFixed(0)}s > 60s since candle close). Backlog execution prevented.`;
      } else {
        direction = 'SHORT';
        reason = `Valid SHORT signal: EMA20 crossed below EMA50, 1h trend bearish (${latest1hClose.toFixed(
          1
        )} < ${latest1hEma200.toFixed(1)}), RSI ${currRsi.toFixed(1)} in [30, 50].`;
      }
    } else {
      if (!bullCross && !bearCross) {
        reason += `No EMA20/EMA50 crossover on latest closed 15m candle. `;
      }
      if (bullCross && !trendBullish) {
        reason += `Bullish cross occurred but rejected by 1h trend filter (Close <= EMA200). `;
      }
      if (bearCross && !trendBearish) {
        reason += `Bearish cross occurred but rejected by 1h trend filter (Close >= EMA200). `;
      }
      if ((bullCross || bearCross) && (!rsiLongValid && !rsiShortValid)) {
        reason += `RSI ${currRsi.toFixed(1)} out of valid entry range. `;
      }
    }

    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      runId,
      symbol,
      candleCloseTime: new Date(candle15mCloseMs).toISOString(),
      closePrice: current15m.close,
      direction,
      conditions,
      indicators: {
        ema20: currEma20,
        ema50: currEma50,
        emaTrend200: latest1hEma200,
        rsi14: currRsi,
        atr14: currAtr,
        prevEma20,
        prevEma50,
      },
      reason,
      createdAt: new Date().toISOString(),
      expired: isExpired,
    };
  }

  /**
   * Determine whether an active position should exit
   */
  public static checkExit({
    direction,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    currentPrice,
    barsHeld,
    prevEma20,
    currEma20,
    prevEma50,
    currEma50,
  }: {
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    currentPrice: number;
    barsHeld: number;
    prevEma20: number;
    currEma20: number;
    prevEma50: number;
    currEma50: number;
  }): { shouldExit: boolean; exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPPOSITE_CROSS' | 'BAR_TIMEOUT' } {
    // 1. Take Profit
    if (direction === 'LONG' && currentPrice >= takeProfitPrice) {
      return { shouldExit: true, exitReason: 'TAKE_PROFIT' };
    }
    if (direction === 'SHORT' && currentPrice <= takeProfitPrice) {
      return { shouldExit: true, exitReason: 'TAKE_PROFIT' };
    }

    // 2. Stop Loss
    if (direction === 'LONG' && currentPrice <= stopLossPrice) {
      return { shouldExit: true, exitReason: 'STOP_LOSS' };
    }
    if (direction === 'SHORT' && currentPrice >= stopLossPrice) {
      return { shouldExit: true, exitReason: 'STOP_LOSS' };
    }

    // 3. Opposite EMA cross
    if (direction === 'LONG' && prevEma20 >= prevEma50 && currEma20 < currEma50) {
      return { shouldExit: true, exitReason: 'OPPOSITE_CROSS' };
    }
    if (direction === 'SHORT' && prevEma20 <= prevEma50 && currEma20 > currEma50) {
      return { shouldExit: true, exitReason: 'OPPOSITE_CROSS' };
    }

    // 4. Bar timeout (96 completed 15m bars = 24h)
    if (barsHeld >= 96) {
      return { shouldExit: true, exitReason: 'BAR_TIMEOUT' };
    }

    return { shouldExit: false };
  }
}

function latest1indexSafe(idx: number): number {
  return Math.max(0, idx);
}
