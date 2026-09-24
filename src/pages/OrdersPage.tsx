import React from 'react';
import { ArrowLeftRight, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ExchangeOrder } from '../../shared/types.ts';

interface OrdersPageProps {
  orders: ExchangeOrder[];
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ orders }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          <span>Exchange Orders & State Machine</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Durable state transitions: CREATED → SUBMITTING → ACKNOWLEDGED → FILLED / REJECTED.
          Every order uses an idempotent client order ID.
        </p>
      </div>

      <div className="bg-[#0F1422] border border-slate-800 rounded-lg overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No exchange orders placed yet. Orders will be displayed with full execution lifecycle telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Client OID</th>
                  <th className="py-2.5 px-3">Exchange ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Filled</th>
                  <th className="py-2.5 px-3">Avg Price</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {orders.map((ord) => {
                  const isBuy = ord.side.toLowerCase() === 'buy';
                  const isFilled = ord.status === 'FILLED';
                  const isRejected = ord.status === 'REJECTED';

                  return (
                    <tr key={ord.clientOid} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2.5 px-3 text-cyan-300 truncate max-w-[140px]" title={ord.clientOid}>
                        {ord.clientOid}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {ord.exchangeOrderId || 'Pending'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">{ord.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-slate-400">{ord.orderType}</td>
                      <td className="py-2.5 px-3">{ord.size}</td>
                      <td className="py-2.5 px-3 text-slate-200">{ord.filledSize || 0}</td>
                      <td className="py-2.5 px-3">
                        {ord.avgFillPrice ? `$${ord.avgFillPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isFilled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-amber-300 border border-slate-700'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(ord.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
