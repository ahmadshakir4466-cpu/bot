/**
 * Historical Backtesting Engine
 * Specification: Prompt 6
 *
 * RIGOROUS METHODOLOGY:
 * - Uses exact same IndicatorCalculator, EmaRsiAtrStrategy and RiskManager as forward bot
 * - Absolute look-ahead prohibition: signal formed at bar t close triggers entry at bar t+1 open
 * - Indicator warmup executed prior to evaluation start
 * - Chronological split: 60% Development, 20% Validation, 20% Untouched Holdout
 * - Adverse order assumption: if both Stop and Target touched in same bar, Stop is executed first
 * - Realistic slippage (0.05%) and taker fees (0.06%) applied
 * - Strictly isolated from live/demo exchange transport
 */

import { PerformanceCalculator } from '../analytics/performance-calculator.ts';
import { Candle, EmaRsiAtrStrategy } from '../strategy/ema-rsi-atr.ts';
import { BITGET_SPECS, RiskManager } from '../strategy/risk-manager.ts';
import { BacktestResult, BotStrategyConfig, ClosedTrade } from '../types.ts';

export class BacktestEngine {
  /**
   * Run historical simulation across 15m and 1h historical candles
   */
  public static runSimulation({
    userId,
    symbol,
    candles15m,
    candles1h,
    initialCapitalUsdt = 10000,
    config,
  }: {
    userId: string;
    symbol: 'BTCUSDT' | 'ETHUSDT';
    candles15m: Candle[];
    candles1h: Candle[];
    initialCapitalUsdt?: number;
    config: BotStrategyConfig;
  }): BacktestResult {
    const clean15m = EmaRsiAtrStrategy.sanitizeCandles(candles15m);
    const clean1h = EmaRsiAtrStrategy.sanitizeCandles(candles1h);

    const trades: ClosedTrade[] = [];
    const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];

    let currentEquity = initialCapitalUsdt;
    let peakEquity = initialCapitalUsdt;

    // Minimum warmup index: 200 15m bars
    const startIndex = Math.max(200, clean15m.length > 500 ? 200 : Math.floor(clean15m.length * 0.2));

    let activeTrade: {
      direction: 'LONG' | 'SHORT';
      entryPrice: number;
      stopPrice: number;
      takeProfitPrice: number;
      size: number;
      openedAt: string;
      entryBarIndex: number;
      costPerUnit: number;
      clientOid: string;
    } | null = null;

    let dailyTradesCount = 0;
    let consecutiveLosses = 0;
    let dayStartEquity = currentEquity;
    let currentUtcDay = new Date(clean15m[0]?.timestamp || Date.now()).getUTCDate();

    // Iterate through historical 15m bars
    for (let i = startIndex; i < clean15m.length - 1; i++) {
      const currentBar = clean15m[i];
      const nextBar = clean15m[i + 1]; // Entry execution happens at bar i+1 open
      const barDate = new Date(currentBar.timestamp);

      // Check daily UTC reset
      if (barDate.getUTCDate() !== currentUtcDay) {
        currentUtcDay = barDate.getUTCDate();
        dailyTradesCount = 0;
        dayStartEquity = currentEquity;
      }

      const dailyLossPercent =
        dayStartEquity > 0 ? ((dayStartEquity - currentEquity) / dayStartEquity) * 100 : 0;
      const isDailyHalted = dailyLossPercent >= config.maxDailyLossPercent;

      // 1. Manage Active Trade Exit if open
      if (activeTrade) {
        const barsInTrade = i - activeTrade.entryBarIndex;
        let exitTriggered = false;
        let exitPrice = 0;
        let exitReason: ClosedTrade['exitReason'] = 'BAR_TIMEOUT';

        // Check if Stop Loss or Take Profit touched in this bar's high/low
        if (activeTrade.direction === 'LONG') {
          const hitStop = currentBar.low <= activeTrade.stopPrice;
          const hitTarget = currentBar.high >= activeTrade.takeProfitPrice;

          if (hitStop && hitTarget) {
            // Adverse assumption: Stop loss executed first
            exitTriggered = true;
            exitPrice = activeTrade.stopPrice * (1 - config.assumedSlippage / 100);
            exitReason = 'STOP_LOSS';
          } else if (hitStop) {
            exitTriggered = true;
            exitPrice = activeTrade.stopPrice * (1 - config.assumedSlippage / 100);
            exitReason = 'STOP_LOSS';
          } else if (hitTarget) {
            exitTriggered = true;
            exitPrice = activeTrade.takeProfitPrice * (1 - config.assumedSlippage / 100);
            exitReason = 'TAKE_PROFIT';
          }
        } else {
          // SHORT
          const hitStop = currentBar.high >= activeTrade.stopPrice;
          const hitTarget = currentBar.low <= activeTrade.takeProfitPrice;

          if (hitStop && hitTarget) {
            // Adverse assumption: Stop hit first
            exitTriggered = true;
            exitPrice = activeTrade.stopPrice * (1 + config.assumedSlippage / 100);
            exitReason = 'STOP_LOSS';
          } else if (hitStop) {
            exitTriggered = true;
            exitPrice = activeTrade.stopPrice * (1 + config.assumedSlippage / 100);
            exitReason = 'STOP_LOSS';
          } else if (hitTarget) {
            exitTriggered = true;
            exitPrice = activeTrade.takeProfitPrice * (1 + config.assumedSlippage / 100);
            exitReason = 'TAKE_PROFIT';
          }
        }

        // Check 96-bar timeout
        if (!exitTriggered && barsInTrade >= config.maxBarsInPosition) {
          exitTriggered = true;
          exitPrice = currentBar.close;
          exitReason = 'BAR_TIMEOUT';
        }

        if (exitTriggered) {
          // Calculate Realized PnL with fees and slippage
          const notionalEntry = activeTrade.size * activeTrade.entryPrice;
          const notionalExit = activeTrade.size * exitPrice;

          const rawPnl =
            activeTrade.direction === 'LONG'
              ? (exitPrice - activeTrade.entryPrice) * activeTrade.size
              : (activeTrade.entryPrice - exitPrice) * activeTrade.size;

          const entryFee = notionalEntry * (config.assumedTakerFee / 100);
          const exitFee = notionalExit * (config.assumedTakerFee / 100);
          const totalFees = entryFee + exitFee;
          const netPnl = rawPnl - totalFees;

          currentEquity += netPnl;
          if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
          }
          const drawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;

          if (netPnl < 0) {
            consecutiveLosses++;
          } else if (netPnl > 0) {
            consecutiveLosses = 0;
          }

          trades.push({
            id: `bt_trade_${trades.length + 1}`,
            runId: `bt_${symbol}_${Date.now()}`,
            userId,
            environment: 'HISTORICAL_BACKTEST',
            symbol,
            direction: activeTrade.direction,
            entryPrice: activeTrade.entryPrice,
            exitPrice,
            size: activeTrade.size,
            openedAt: activeTrade.openedAt,
            closedAt: new Date(currentBar.timestamp).toISOString(),
            holdDurationSeconds: barsInTrade * 15 * 60,
            holdBars: barsInTrade,
            grossPnl: Number(rawPnl.toFixed(2)),
            feesPaid: Number(totalFees.toFixed(2)),
            fundingPaid: 0,
            netPnl: Number(netPnl.toFixed(2)),
            returnPercent: Number(((netPnl / notionalEntry) * 100).toFixed(2)),
            exitReason,
            status: 'FINALIZED',
            clientOids: [activeTrade.clientOid],
          });

          equityCurve.push({
            timestamp: new Date(currentBar.timestamp).toISOString(),
            equity: Number(currentEquity.toFixed(2)),
            drawdown: Number(drawdown.toFixed(2)),
          });

          activeTrade = null;
        }
      }

      // 2. Evaluate Signals on fully closed bar slice [0...i]
      if (!activeTrade) {
        const slice15m = clean15m.slice(0, i + 1);
        const candle15mClose = currentBar.timestamp + 15 * 60 * 1000;
        const slice1h = clean1h.filter((c) => c.timestamp + 60 * 60 * 1000 <= candle15mClose);

        const decision = EmaRsiAtrStrategy.evaluate({
          runId: 'bt_eval',
          symbol,
          candles15m: slice15m,
          candles1h: slice1h,
          evaluationTime: candle15mClose,
        });

        if (decision.direction === 'LONG' || decision.direction === 'SHORT') {
          // Pre-entry Risk Sizing
          const bidPrice = nextBar.open;
          const askPrice = nextBar.open * (1 + 0.0004); // simulated spread 0.04%

          const sizing = RiskManager.calculatePositionSize({
            symbol,
            direction: decision.direction,
            entryPrice: nextBar.open,
            atr14: decision.indicators.atr14,
            demoEquityUsdt: currentEquity,
            availableMarginUsdt: currentEquity * 0.9,
            bidPrice,
            askPrice,
            config,
            activePositionsCount: 0,
            dailyTradesCount,
            consecutiveLosses,
            dailyLossPercent,
            isDailyHalted,
          });

          if (sizing.allowed && sizing.calculatedQuantity > 0) {
            // Apply entry slippage
            const executedEntryPrice =
              decision.direction === 'LONG'
                ? nextBar.open * (1 + config.assumedSlippage / 100)
                : nextBar.open * (1 - config.assumedSlippage / 100);

            const specs = BITGET_SPECS[symbol];
            activeTrade = {
              direction: decision.direction,
              entryPrice: RiskManager.roundPrice(executedEntryPrice, specs.priceDecimals),
              stopPrice: sizing.stopPrice,
              takeProfitPrice: sizing.takeProfitPrice,
              size: sizing.calculatedQuantity,
              openedAt: new Date(nextBar.timestamp).toISOString(),
              entryBarIndex: i + 1,
              costPerUnit: sizing.riskDistanceD,
              clientOid: `bt_oid_${Date.now()}_${i}`,
            };

            dailyTradesCount++;
          }
        }
      }
    }

    // Chronological Split: 60% Development, 20% Validation, 20% Untouched Holdout
    const totalTradesCount = trades.length;
    const splitIndex1 = Math.floor(totalTradesCount * 0.6);
    const splitIndex2 = Math.floor(totalTradesCount * 0.8);

    const devTrades = trades.slice(0, splitIndex1);
    const valTrades = trades.slice(splitIndex1, splitIndex2);
    const holdoutTrades = trades.slice(splitIndex2);

    const devMetrics = PerformanceCalculator.calculateMetrics(devTrades, 'DEVELOPMENT_SAMPLE_60%');
    const valMetrics = PerformanceCalculator.calculateMetrics(valTrades, 'VALIDATION_SAMPLE_20%');
    const holdoutMetrics = PerformanceCalculator.calculateMetrics(
      holdoutTrades,
      'UNTOUCHED_HOLDOUT_20%'
    );
    const combinedMetrics = PerformanceCalculator.calculateMetrics(trades, 'COMBINED_SAMPLE_100%');

    return {
      id: `bt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      symbol,
      dateRange: {
        start: new Date(clean15m[0]?.timestamp || Date.now()).toISOString(),
        end: new Date(clean15m[clean15m.length - 1]?.timestamp || Date.now()).toISOString(),
      },
      totalCandles15m: clean15m.length,
      totalCandles1h: clean1h.length,
      developmentSample: devMetrics,
      validationSample: valMetrics,
      holdoutSample: holdoutMetrics,
      combinedMetrics,
      assumptions: {
        takerFeePercent: config.assumedTakerFee,
        slippagePercent: config.assumedSlippage,
        fundingRateEstimated: 0.01,
        executionLatencyBars: 1, // Bar t signal -> Bar t+1 open execution
      },
      trades,
      equityCurve,
      createdAt: new Date().toISOString(),
    };
  }
}
