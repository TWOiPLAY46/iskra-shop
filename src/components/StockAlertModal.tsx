import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Phone, 
  User, 
  ShieldCheck, 
  AlertCircle,
  Zap,
  Droplets,
  MessageSquare,
  MessageCircle,
  Send
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getSafeImageUrl } from '../utils/assetImages';
import { formatPriceUnit } from '../utils/unitFormatter';

export const StockAlertModal: React.FC = () => {
  const { 
    stockAlertModalProduct, 
    closeStockAlertModal, 
    addStockAlert,
    currentClientPhone,
    currentClient
  } = useStore();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [telegramUser, setTelegramUser] = useState('');
  const [notifyMethod, setNotifyMethod] = useState<'sms' | 'viber' | 'telegram' | 'whatsapp' | 'call'>('viber');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill client data if authenticated
  useEffect(() => {
    if (stockAlertModalProduct) {
      setIsSuccess(false);
      setError(null);
      if (currentClientPhone) {
        const clean = currentClientPhone.replace(/^\+380/, '').replace(/^380/, '');
        setPhone(clean);
      } else {
        setPhone('');
      }
      setName(currentClient?.name || '');
    }
  }, [stockAlertModalProduct, currentClientPhone, currentClient]);

  if (!stockAlertModalProduct) return null;

  const isPlumbing = 
    stockAlertModalProduct.category?.toLowerCase().includes('сантех') ||
    stockAlertModalProduct.category?.toLowerCase().includes('змішувач') ||
    stockAlertModalProduct.category?.toLowerCase().includes('труб') ||
    stockAlertModalProduct.category?.toLowerCase().includes('фітинг');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 9) {
      setError('Будь ласка, введіть коректний номер телефону (наприклад: 097 123 45 67)');
      return;
    }

    const fullPhone = clean.startsWith('380') 
      ? `+${clean}` 
      : clean.startsWith('0') 
      ? `+38${clean}` 
      : `+380${clean}`;

    setIsSubmitting(true);
    try {
      await addStockAlert(
        stockAlertModalProduct.id,
        stockAlertModalProduct.name,
        fullPhone,
        name.trim() || undefined,
        stockAlertModalProduct.sku,
        stockAlertModalProduct.image,
        stockAlertModalProduct.price,
        notifyMethod,
        telegramUser.trim() || undefined
      );
      setIsSuccess(true);
    } catch {
      setError('Не вдалося надіслати запит. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={closeStockAlertModal}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled to match Checkout & Store dark bar */}
        <div className="relative bg-slate-900 text-white px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800">
          <button
            type="button"
            onClick={closeStockAlertModal}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Служба наявності · ISKRA
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-display leading-tight text-white">
                Повідомити про наявність
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mt-2">
            Ми повідомимо вас вибраним способом, щойно товар надійде на склад магазину.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Target Product Preview Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/90">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
              {stockAlertModalProduct.image && stockAlertModalProduct.image.trim() !== '' ? (
                <img
                  src={getSafeImageUrl(stockAlertModalProduct.image)}
                  alt={stockAlertModalProduct.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : isPlumbing ? (
                <Droplets className="w-6 h-6 text-slate-400 stroke-[1.5]" />
              ) : (
                <Zap className="w-6 h-6 text-slate-400 stroke-[1.5]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
                {stockAlertModalProduct.sku && (
                  <>
                    <span className="font-mono text-slate-400 font-semibold truncate">
                      {stockAlertModalProduct.sku}
                    </span>
                    <span className="text-slate-300">·</span>
                  </>
                )}
                <span className="font-bold text-rose-600">
                  Закінчився
                </span>
              </div>
              <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 line-clamp-1 leading-snug">
                {stockAlertModalProduct.name}
              </h4>
              <div className="text-xs font-black text-slate-900 mt-0.5">
                {stockAlertModalProduct.price} грн{' '}
                <span className="text-[10px] font-normal text-slate-500">
                  {formatPriceUnit(stockAlertModalProduct.unit)}
                </span>
              </div>
            </div>
          </div>

          {/* Form or Success State */}
          {isSuccess ? (
            <div className="py-4 text-center space-y-3.5 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-sm">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Запит успішно зафіксовано!
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto mt-1">
                  Ми надішлемо вам сповіщення за номером <span className="font-bold text-slate-900 font-mono">{phone}</span>, як тільки товар з'явиться на складі.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeStockAlertModal}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  Зрозуміло, продовжити покупки
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Номер телефону <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all overflow-hidden">
                  <div className="pl-3 pr-2 flex items-center pointer-events-none text-slate-500 text-xs font-bold shrink-0 select-none">
                    <span>+380</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200 shrink-0" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="97 123 45 67"
                    className="w-full pl-2.5 pr-9 py-2.5 bg-transparent text-xs sm:text-sm font-semibold outline-none text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Для відправки сповіщення (Viber, Telegram, WhatsApp чи SMS)
                </p>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ваше ім'я (необов'язково)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше ім'я"
                    className="w-full pl-3.5 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Preferred notification method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Бажаний спосіб сповіщення:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNotifyMethod('viber')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      notifyMethod === 'viber'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageCircle className={`w-3.5 h-3.5 ${notifyMethod === 'viber' ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span>Viber</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyMethod('telegram')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      notifyMethod === 'telegram'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${notifyMethod === 'telegram' ? 'text-sky-400' : 'text-sky-500'}`} />
                    <span>Telegram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyMethod('whatsapp')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      notifyMethod === 'whatsapp'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <svg className={`w-3.5 h-3.5 fill-current ${notifyMethod === 'whatsapp' ? 'text-emerald-400' : 'text-emerald-600'}`} viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyMethod('sms')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      notifyMethod === 'sms'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 ${notifyMethod === 'sms' ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyMethod('call')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:col-span-2 ${
                      notifyMethod === 'call'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Phone className={`w-3.5 h-3.5 ${notifyMethod === 'call' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Дзвінок менеджера</span>
                  </button>
                </div>

                {notifyMethod === 'telegram' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 animate-in fade-in">
                    <label className="block text-[11px] font-semibold text-sky-950 mb-1">
                      Ваш Telegram username (необов'язково):
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-600 font-bold text-xs">
                        @
                      </div>
                      <input
                        type="text"
                        value={telegramUser}
                        onChange={(e) => setTelegramUser(e.target.value.replace(/^@/, ''))}
                        placeholder="username"
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-sky-300 rounded-lg text-xs outline-none focus:border-sky-500 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeStockAlertModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 border border-amber-400"
                >
                  {isSubmitting ? (
                    <span>Збереження...</span>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 fill-slate-950" />
                      <span>Повідомити, коли з'явиться</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Без спаму. Номер використовується лише для сповіщення про цей товар.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
