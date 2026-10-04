import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Clock, MapPin, RefreshCw, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { trackNovaPoshtaTTN, TTNTrackingResult } from '../services/deliveryService';
import { Order, OrderStatus } from '../types/store';

interface LiveTrackingWidgetProps {
  order: Order;
  apiKey?: string;
  onStatusAutoUpdate?: (orderId: string, newStatus: OrderStatus) => void;
  compact?: boolean;
}

export const LiveTrackingWidget: React.FC<LiveTrackingWidgetProps> = ({
  order,
  apiKey,
  onStatusAutoUpdate,
  compact = false
}) => {
  const [trackingData, setTrackingData] = useState<TTNTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const ttnNumber = order.ttn?.trim();

  const loadTracking = async () => {
    if (!ttnNumber) return;
    setIsLoading(true);
    try {
      const res = await trackNovaPoshtaTTN(
        ttnNumber, 
        order.phone, 
        apiKey, 
        order.date, 
        order.status, 
        order.city,
        order.isPaid,
        order.paymentMethod
      );
      setTrackingData(res);

      // Auto update order status in store/cloud if status progressed
      if (res.isSuccess && onStatusAutoUpdate) {
        if (res.statusCategory === 'delivered' && order.status !== 'Доставлено') {
          onStatusAutoUpdate(order.id, 'Доставлено');
        } else if (res.statusCategory === 'in_transit' && order.status !== 'Відправлено' && order.status !== 'Доставлено') {
          onStatusAutoUpdate(order.id, 'Відправлено');
        }
      }
    } catch (e) {
      console.warn('Tracking query error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
  }, [ttnNumber, apiKey, order.status, order.isPaid, order.paymentMethod]);

  if (!ttnNumber) return null;

  const getCategoryTheme = (category?: TTNTrackingResult['statusCategory']) => {
    switch (category) {
      case 'delivered':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'text-emerald-900',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        };
      case 'arrived':
        return {
          bg: 'bg-amber-50 border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'text-amber-900',
          icon: <MapPin className="w-4 h-4 text-amber-600" />
        };
      default:
        return {
          bg: 'bg-sky-50 border-sky-200',
          badge: 'bg-sky-100 text-sky-800 border-sky-300',
          text: 'text-sky-900',
          icon: <Truck className="w-4 h-4 text-sky-600" />
        };
    }
  };

  const theme = getCategoryTheme(trackingData?.statusCategory);

  return (
    <div className={`rounded-xl border ${theme.bg} overflow-hidden text-xs transition-all`}>
      {/* Header bar */}
      <div className="p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200/80">
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">Експрес-накладна:</span>
              <span className="font-mono font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200">
                {ttnNumber}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Нова Пошта Live</span>
            </div>
            
            {trackingData && (
              <div className={`mt-0.5 font-bold ${theme.text} flex items-center gap-1.5 text-[11px]`}>
                <span>{trackingData.status}</span>
                {trackingData.scheduledDeliveryDate && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    · Орієнтовно: {trackingData.scheduledDeliveryDate}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.status !== 'Доставлено' && onStatusAutoUpdate && (
            <button
              type="button"
              onClick={() => onStatusAutoUpdate(order.id, 'Доставлено')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Підтвердити отримання посилки покупцем"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Посилку отримано</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadTracking}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title="Оновити статус з сервера Нової Пошти"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
          >
            <span>Деталі</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <a
            href={`https://tracking.novaposhta.ua/#/uk/document/${ttnNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
          >
            <span>Сайт НП</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && trackingData && (
        <div className="bg-white/80 p-3 sm:p-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px]">Маршрут:</span>
            <span className="font-semibold text-slate-800">
              {trackingData.citySender || 'с-ще. Оратів'} ➔ {trackingData.cityRecipient || order.city || 'Ваше місто'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">Пункт видачі:</span>
            <span className="font-semibold text-slate-800 truncate block">
              {trackingData.warehouseRecipient || order.delivery.replace(/Нова Пошта.*?:/i, '').trim()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">Останнє оновлення:</span>
            <span className="font-mono text-slate-700">
              Сьогодні о {trackingData.lastUpdated} (автоматично)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
