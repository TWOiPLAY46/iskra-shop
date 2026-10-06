import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Clock, MapPin, RefreshCw, AlertCircle, ExternalLink, ChevronDown, ChevronUp, Copy, Check, Calendar, ArrowRight } from 'lucide-react';
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
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCopyTTN = () => {
    if (!ttnNumber) return;
    navigator.clipboard.writeText(ttnNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!ttnNumber) return null;

  const isDelivered = trackingData?.statusCategory === 'delivered' || order.status === 'Доставлено';
  const isArrived = trackingData?.statusCategory === 'arrived';

  // Step index for 4-phase delivery stepper
  // 0: Created/Sender, 1: In transit, 2: Arrived at branch, 3: Delivered
  const currentStep = isDelivered ? 3 : isArrived ? 2 : 1;

  const getTheme = () => {
    if (isDelivered) {
      return {
        cardBg: 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30 shadow-emerald-950/20',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        badgeText: 'text-emerald-400',
        dotBg: 'bg-emerald-400',
        stepActive: 'bg-emerald-500 text-white',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      };
    }
    if (isArrived) {
      return {
        cardBg: 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/30 shadow-amber-950/20',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        badgeText: 'text-amber-400',
        dotBg: 'bg-amber-400 animate-pulse',
        stepActive: 'bg-amber-500 text-white',
        icon: <MapPin className="w-4 h-4 text-amber-400" />
      };
    }
    return {
      cardBg: 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-700/80 shadow-slate-950/20',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      badgeText: 'text-sky-400',
      dotBg: 'bg-rose-500 animate-pulse',
      stepActive: 'bg-red-600 text-white',
      icon: <Truck className="w-4 h-4 text-rose-400" />
    };
  };

  const theme = getTheme();

  return (
    <div className={`rounded-2xl border ${theme.cardBg} shadow-lg overflow-hidden text-xs transition-all`}>
      {/* Top Banner: Carrier + TTN + Actions */}
      <div className="p-3.5 sm:p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-red-600/30 tracking-tighter">
            НП
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white tracking-wide text-xs">
                Нова Пошта
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono font-bold text-[11px]">
                {ttnNumber}
                <button
                  type="button"
                  onClick={handleCopyTTN}
                  className="hover:text-white transition-colors cursor-pointer ml-0.5"
                  title="Скопіювати номер ТТН"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400 hover:text-white" />}
                </button>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live трекінг
              </span>
            </div>

            {trackingData && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`font-bold ${theme.badgeText} text-xs flex items-center gap-1`}>
                  {theme.icon}
                  {trackingData.status}
                </span>
                {trackingData.scheduledDeliveryDate && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Орієнтовно: <strong className="text-slate-300">{trackingData.scheduledDeliveryDate}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={loadTracking}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
            title="Оновити дані з сервера Нової Пошти"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>{isExpanded ? 'Згорнути' : 'Маршрут'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <a
            href={`https://tracking.novaposhta.ua/#/uk/document/${ttnNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/25 cursor-pointer"
          >
            <span>На сайт НП</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Mini Visual Delivery Stepper */}
      <div className="px-4 py-3 bg-black/20 border-b border-white/5">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { label: 'Оформлено', desc: 'Склад ISKRA', step: 0 },
            { label: 'В дорозі', desc: 'Прямує в місто', step: 1 },
            { label: 'У відділенні', desc: 'Готово до видачі', step: 2 },
            { label: 'Отримано', desc: 'Завершено', step: 3 },
          ].map((item, idx) => {
            const isCompleted = currentStep >= item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-full flex items-center mb-1">
                  <div className={`h-1 flex-1 rounded-full ${idx === 0 ? 'opacity-0' : isCompleted ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                    isCompleted 
                      ? 'bg-emerald-500 text-slate-950 shadow-xs ring-2 ring-emerald-500/20' 
                      : isCurrent 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div className={`h-1 flex-1 rounded-full ${idx === 3 ? 'opacity-0' : currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                </div>
                <span className={`text-[10px] sm:text-[11px] font-bold tracking-tight truncate max-w-full ${isCompleted ? 'text-white' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                <span className="hidden sm:block text-[9px] text-slate-400/80 truncate max-w-full">
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route & Destination Information */}
      <div className="p-3.5 sm:p-4 bg-slate-950/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Маршрут доставки:</span>
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>{trackingData?.citySender || 'с-ще. Оратів'}</span>
              <ArrowRight className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-white">{trackingData?.cityRecipient || order.city || 'Ваше місто'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 sm:col-span-2">
          <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <Truck className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Пункт видачі / Адреса:</span>
            <span className="font-semibold text-slate-300 truncate block">
              {trackingData?.warehouseRecipient || order.delivery.replace(/Нова Пошта.*?:/i, '').trim() || 'Відділення Нової Пошти'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && trackingData && (
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] animate-in fade-in duration-150">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">Відправник:</span>
            <span className="text-slate-200">Магазин «ISKRA» (Оратів)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">Одержувач:</span>
            <span className="text-slate-200">{order.fio || 'Покупець'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold">Останнє оновлення:</span>
            <span className="font-mono text-slate-300">
              Сьогодні о {trackingData.lastUpdated}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

