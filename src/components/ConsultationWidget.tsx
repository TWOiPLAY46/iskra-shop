import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  X, 
  Send, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Copy, 
  Check, 
  MessageSquare, 
  Sparkles,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { pushCallbackToFirebase } from '../services/firebaseService';
import { sendSmsViaGateway } from '../utils/smsHelper';
import { 
  formatUkrainianPhone, 
  extractLocalPhoneDigits, 
  getFullInternationalPhone, 
  UKRAINIAN_OPERATOR_CODES 
} from '../utils/phoneFormatter';

export const ConsultationWidget: React.FC = () => {
  const { siteSettings, firebaseConfig, showToast } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'callback' | 'direct'>('callback');
  
  // Callback form states
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('Сантехніка та електрика');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showPromptBadge, setShowPromptBadge] = useState(true);

  // If floating call button is disabled in admin settings, do not render
  if (siteSettings.features?.floatingCallBtn === false) {
    return null;
  }

  // Handle phone format
  const handlePhoneChange = (val: string) => {
    const formatted = formatUkrainianPhone(val);
    setPhone(formatted);
  };

  const handleSetOperatorCode = (code: string) => {
    const digits = extractLocalPhoneDigits(phone);
    const subscriberPart = digits.length > 2 ? digits.slice(2) : '';
    const newFormatted = formatUkrainianPhone(code + subscriberPart);
    setPhone(newFormatted);
  };

  // Countdown timer when callback ordered
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSuccess, countdown]);

  const handleSubmitCallback = (e: React.FormEvent) => {
    e.preventDefault();
    const localDigits = extractLocalPhoneDigits(phone);
    if (!localDigits || localDigits.length < 9) {
      showToast('Введіть повний номер телефону (наприклад: +380 (67) 123-45-67)', 'error');
      return;
    }

    setIsSubmitting(true);
    const fullPhone = getFullInternationalPhone(phone);

    // Save lead/callback request to localStorage for admin/history
    try {
      const existingCallbacks = JSON.parse(localStorage.getItem('iskra_callback_requests') || '[]');
      const newCallback = {
        id: 'cb_' + Date.now(),
        name: name.trim() || 'Клієнт',
        phone: fullPhone,
        topic,
        createdAt: new Date().toISOString(),
        status: 'new'
      };
      existingCallbacks.unshift(newCallback);
      localStorage.setItem('iskra_callback_requests', JSON.stringify(existingCallbacks));

      // Push to Firebase Firestore & RTDB
      if (firebaseConfig?.enabled) {
        pushCallbackToFirebase(firebaseConfig, newCallback).catch(() => {});
      }
    } catch {
      // Ignore storage errors
    }

    // Attempt to notify telegram bot if configured
    if ((siteSettings.callbackTelegramNotify ?? true) && siteSettings.botToken && siteSettings.chatId) {
      const msg = `⚡ *Новий запит на швидку консультацію!*\n👤 Ім'я: ${name || 'Не вказано'}\n📞 Телефон: ${phone}\n📌 Тема: ${topic}\n⏰ Час: ${new Date().toLocaleTimeString('uk-UA')}`;
      fetch(`https://api.telegram.org/bot${siteSettings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: siteSettings.chatId,
          text: msg,
          parse_mode: 'Markdown'
        })
      }).catch(() => {});
    }

    // Send auto SMS if enabled
    if (siteSettings.callbackAutoSmsEnabled && siteSettings.smsGateway && siteSettings.smsGateway !== 'none') {
      const text = siteSettings.callbackSmsTemplate || `⚡ Магазин ISKRA\nДякуємо за запит на консультацію! Наш фахівець зв'яжеться з вами протягом 2-3 хвилин.`;
      sendSmsViaGateway({
        phone: fullPhone,
        text,
        gateway: siteSettings.smsGateway,
        apiKey: siteSettings.smsApiKey || '',
        senderName: siteSettings.smsSenderName || 'ISKRA'
      }).catch(() => {});
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setCountdown(30);
      showToast('Запит на консультацію успішно надіслано! Менеджер вже набирає номер.', 'success');
    }, 600);
  };

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(siteSettings.phone);
    setCopiedPhone(true);
    showToast('Номер телефону скопійовано', 'info');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const rawCleanPhone = siteSettings.phone.replace(/[^0-9+]/g, '');

  return (
    <>
      {/* Floating Pulsating Consultation Button in bottom-right corner */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-3">
        {/* Pulsing prompt badge/speech pill */}
        {!isOpen && showPromptBadge && (
          <div 
            onClick={() => setIsOpen(true)}
            className="cursor-pointer group hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-md text-slate-800 px-3.5 py-2 rounded-2xl shadow-xl shadow-slate-900/10 border border-emerald-100 hover:border-emerald-300 transition-all hover:scale-105 select-none"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-left leading-tight">
              <p className="text-[13px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Консультація
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Відповімо за 30 сек 👋
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPromptBadge(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 ml-0.5"
              title="Сховати підказку"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* The Pulsating Green Button Container */}
        <div className="relative flex items-center justify-center">
          {/* Animated concentric radar pulse rings */}
          <div className="absolute w-14 h-14 rounded-full bg-emerald-500/30 consultation-pulse-ring-1 pointer-events-none" />
          <div className="absolute w-14 h-14 rounded-full bg-emerald-500/25 consultation-pulse-ring-2 pointer-events-none" />
          <div className="absolute w-14 h-14 rounded-full bg-emerald-500/20 consultation-pulse-ring-3 pointer-events-none" />

          {/* Core Green Action Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="consultation-btn-pulse relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-gradient-to-tr from-emerald-600 via-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-2xl shadow-emerald-600/50 flex items-center justify-center transition-transform active:scale-95 z-10 focus:outline-none"
            title="Швидка консультація та дзвінок фахівця"
            aria-label="Кнопка швидкої консультації"
          >
            {isOpen ? (
              <X className="w-7 h-7 text-white stroke-[2.5]" />
            ) : (
              <div className="consultation-phone-wiggle flex items-center justify-center">
                <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Consultation Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs transition-opacity">
          {/* Modal Container */}
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-600 text-white p-5">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Закрити"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Headphones className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight font-display">
                    Швидка консультація
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                    </span>
                    <span className="text-xs text-emerald-100 font-medium">
                      Менеджер онлайн • зв'язок за 30 сек
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl bg-emerald-800/40 p-1 mt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setActiveTab('callback'); setIsSuccess(false); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'callback'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Передзвоніть мені
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('direct')}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'direct'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Прямий зв'язок
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {activeTab === 'callback' ? (
                <>
                  {isSuccess ? (
                    <div className="text-center py-4 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">
                          Дякуємо{name ? `, ${name}` : ''}!
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                          Запит успішно надіслано. Наш фахівець з сантехніки та електрики вже набирає ваш номер:
                        </p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">
                          {phone}
                        </p>
                      </div>

                      {/* Live countdown */}
                      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 max-w-xs mx-auto">
                        <p className="text-xs text-emerald-800 font-medium">Очікуваний час з'єднання:</p>
                        <div className="text-2xl font-black text-emerald-700 tracking-widest mt-1">
                          00:{countdown < 10 ? `0${countdown}` : countdown}
                        </div>
                        <p className="text-[11px] text-emerald-600 mt-1">Будь ласка, тримайте телефон поруч</p>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <a
                          href={`tel:${rawCleanPhone}`}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          Або подзвоніть зараз самі: {siteSettings.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSuccess(false);
                            setPhone('');
                            setName('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 underline"
                        >
                          Надіслати ще один запит
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitCallback} className="space-y-4">
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Вкажіть ваш номер телефону, і черговий консультант безкоштовно зв'яжеться з вами за 30 секунд.
                        </span>
                      </div>

                      {/* Phone input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Номер телефону <span className="text-rose-500">*</span></span>
                          <span className="text-[10px] font-semibold text-emerald-700">Приклад: +380 (67)...</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+380 (67) 000-00-00"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        </div>
                        
                        {/* Operator quick code selector */}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[10px] text-slate-500">
                          <span className="text-slate-400">Код:</span>
                          {UKRAINIAN_OPERATOR_CODES.slice(0, 5).map((op) => (
                            <button
                              key={op.code}
                              type="button"
                              onClick={() => handleSetOperatorCode(op.code)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded text-slate-700 font-mono font-semibold transition-colors border border-slate-200"
                              title={`${op.name} (${op.code})`}
                            >
                              {op.code}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Name input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Ваше ім'я (необов'язково)
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Як до вас звертатися?"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Quick Topics */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Що вас цікавить?
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            '🚰 Сантехніка & Крани',
                            '⚡ Кабель & Автомати',
                            '📦 Наявність & Опт',
                            '💳 Оплата & Доставка'
                          ].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTopic(t)}
                              className={`py-2 px-2.5 rounded-xl border text-left font-medium transition-all ${
                                topic === t
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Надсилаємо запит...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            {siteSettings.callbackText || 'Замовити дзвінок за 30 сек'}
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Конфіденційність гарантовано. Без спаму.</span>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                /* Direct Contact Tab */
                <div className="space-y-4">
                  {/* Phone Call Card */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Основний номер
                        </span>
                        <p className="text-lg font-black text-slate-900 mt-0.5">
                          {siteSettings.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copyPhoneNumber}
                        className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
                        title="Скопіювати номер"
                      >
                        {copiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <a
                      href={`tel:${rawCleanPhone}`}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      <Phone className="w-4 h-4" />
                      Зателефонувати зараз
                    </a>
                  </div>

                  {/* Messengers */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2">
                      Швидкі повідомлення у месенджерах:
                    </h5>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Telegram */}
                      <a
                        href={
                          siteSettings.telegram.startsWith('http')
                            ? siteSettings.telegram
                            : `https://t.me/${siteSettings.telegram.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl border border-sky-100 bg-sky-50/70 hover:bg-sky-100 text-sky-800 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Send className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold text-sky-900 group-hover:text-sky-700">
                            Telegram
                          </div>
                          <div className="text-[10px] text-sky-600 truncate">
                            {siteSettings.telegram || 'Чат з інженером'}
                          </div>
                        </div>
                      </a>

                      {/* Viber */}
                      <a
                        href={
                          siteSettings.viber.startsWith('http')
                            ? siteSettings.viber
                            : `viber://chat?number=${siteSettings.viber.replace(/[^0-9]/g, '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl border border-purple-100 bg-purple-50/70 hover:bg-purple-100 text-purple-800 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold text-purple-900 group-hover:text-purple-700">
                            Viber
                          </div>
                          <div className="text-[10px] text-purple-600 truncate">
                            {siteSettings.viber || 'Чат з консультантом'}
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Schedule & Address */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong className="text-slate-800">Графік:</strong> {siteSettings.workHours || 'Пн-Сб: 08:00 - 19:00, Нд: 09:00 - 17:00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong className="text-slate-800">Адреса:</strong> {siteSettings.city}, {siteSettings.address}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
