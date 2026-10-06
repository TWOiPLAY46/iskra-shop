import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getSafeImageUrl } from '../utils/assetImages';
import { 
  formatUkrainianPhone, 
  extractLocalPhoneDigits, 
  getFullInternationalPhone, 
  UKRAINIAN_OPERATOR_CODES 
} from '../utils/phoneFormatter';
import { 
  User, 
  Wallet, 
  Percent, 
  Package, 
  Clock, 
  Truck, 
  ExternalLink, 
  ArrowLeft, 
  LogOut, 
  CheckCircle2, 
  Phone,
  Search,
  Copy,
  Check,
  RotateCcw,
  Printer,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  CreditCard,
  Banknote,
  FileText,
  AlertCircle,
  HelpCircle,
  Lock,
  Trash2,
  Edit3,
  X,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  Gift,
  ShoppingBag,
  PhoneCall
} from 'lucide-react';
import { Order, OrderStatus } from '../types/store';
import { LiveTrackingWidget } from './LiveTrackingWidget';
import { formatUnit, normalizeStorageUnit } from '../utils/unitFormatter';
import { OnlinePaymentModal } from './OnlinePaymentModal';
import { sendFirebasePhoneVerification } from '../services/firebaseService';

const ORDER_STEPS = [
  { status: 'Створено' as OrderStatus, label: 'Оформлено', desc: 'Замовлення в системі', icon: FileText },
  { status: 'Оплачено' as OrderStatus, label: 'Оплачено', desc: 'Оплату підтверджено', icon: CreditCard },
  { status: 'Збирається' as OrderStatus, label: 'Комплектується', desc: 'Пакується на складі', icon: Package },
  { status: 'Відправлено' as OrderStatus, label: 'В дорозі', desc: 'Передано перевізнику', icon: Truck },
  { status: 'Доставлено' as OrderStatus, label: 'Доставлено', desc: 'Отримано покупцем', icon: CheckCircle2 }
];

export const AccountView: React.FC = () => {
  const { 
    currentClient, 
    currentClientPhone, 
    loginClient, 
    logoutClient, 
    saveClient,
    orders, 
    products,
    addToCart,
    setIsCartDrawerOpen,
    siteSettings,
    setActiveView,
    updateOrderStatus,
    editOrder,
    deleteOrder,
    showToast
  } = useStore();

  // Authentication inputs
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [inputPhone, setInputPhone] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inputName, setInputName] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Password Recovery / OTP SMS states
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetPhoneInput, setResetPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpStep, setOtpStep] = useState<'request' | 'verify' | 'success'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileNotes, setProfileNotes] = useState('');

  const handleOpenEditProfile = () => {
    setProfileName(currentClient?.name || '');
    setProfileCity(currentClient?.city || '');
    setProfileNotes(currentClient?.notes || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientPhone) return;
    const cleanPhone = currentClientPhone.trim();
    saveClient(cleanPhone, {
      ...currentClient,
      name: profileName.trim() || 'Покупець',
      city: profileCity.trim(),
      notes: profileNotes.trim(),
      balance: currentClient?.balance || 0,
      discount: currentClient?.discount || 0
    });
    setIsEditProfileOpen(false);
    showToast('Профіль успішно оновлено та збережено в базі даних!', 'success');
  };

  // Online Payment, IBAN, and Cancel Confirmation Modals
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [ibanModalOrder, setIbanModalOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active view tab in account
  const [activeTab, setActiveTab] = useState<'orders' | 'track' | 'loyalty'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskra_account_tab');
      if (saved === 'orders' || saved === 'track' || saved === 'loyalty') {
        return saved;
      }
    }
    return 'orders';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskra_account_tab', activeTab);
    }
  }, [activeTab]);

  // Auto-sync: if any cash-on-delivery order is marked as paid, ensure its status is 'Доставлено'
  useEffect(() => {
    orders.forEach(o => {
      if (o.paymentMethod === 'cash_on_delivery' && o.isPaid && o.status !== 'Доставлено') {
        updateOrderStatus(o.id, 'Доставлено');
      }
    });
  }, [orders, updateOrderStatus]);

  // Search & Filter in Orders list
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Standalone tracking search state
  const [standaloneTrackQuery, setStandaloneTrackQuery] = useState('');
  const [searchedOrderResult, setSearchedOrderResult] = useState<Order | null>(null);
  const [hasSearchedTrack, setHasSearchedTrack] = useState(false);

  // Clipboard state for copying IDs / TTN
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string, label = 'Скопійовано') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label}: ${text}`, 'success');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatUkrainianPhone(raw);
    setInputPhone(formatted);
    if (phoneError) setPhoneError(null);
  };

  const handleSetOperatorCode = (code: string) => {
    const digits = extractLocalPhoneDigits(inputPhone);
    const subscriberPart = digits.length > 2 ? digits.slice(2) : '';
    const newFormatted = formatUkrainianPhone(code + subscriberPart);
    setInputPhone(newFormatted);
    if (phoneError) setPhoneError(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === 'phone') {
      const localDigits = extractLocalPhoneDigits(inputPhone);
      if (!localDigits) {
        setPhoneError("Введіть номер телефону (наприклад: +380 (67) 123-45-67)");
        return;
      }
      if (localDigits.length < 9) {
        setPhoneError(`Введіть повний 9-значний номер телефону після коду країни (+380).`);
        return;
      }
      setPhoneError(null);
      const fullPhone = getFullInternationalPhone(inputPhone);
      loginClient(fullPhone, inputName.trim() || 'Покупець');
    } else {
      if (!inputEmail.trim() || !inputEmail.includes('@')) {
        setPhoneError("Введіть коректну Email адресу (наприклад: name@gmail.com)");
        return;
      }
      setPhoneError(null);
      const emailIdentifier = inputEmail.trim().toLowerCase();
      loginClient(emailIdentifier, inputName.trim() || inputEmail.split('@')[0]);
    }

    if (authMode === 'register') {
      showToast('Реєстрація успішна! Вам нараховано +100 вітальних бонусів ISKRA.', 'success');
    } else {
      showToast('Успішний вхід до особистого кабінету!', 'success');
    }
  };

  // Filter orders for authorized client
  const clientOrders = useMemo(() => {
    if (!currentClientPhone) return [];
    const cleanC = currentClientPhone.replace(/\D/g, '');
    return orders.filter((o) => {
      const cleanO = (o.phone || '').replace(/\D/g, '');
      return cleanO && cleanC && (cleanO === cleanC || cleanO.includes(cleanC) || cleanC.includes(cleanO));
    });
  }, [orders, currentClientPhone]);

  // Auto-sync status to "Доставлено" for orders confirmed delivered or paid at post branch
  useEffect(() => {
    clientOrders.forEach((o) => {
      const isPaidAtBranch = o.isPaid && (o.paymentMethod === 'cash_on_delivery' || (o.paymentProvider && o.paymentProvider.toLowerCase().includes('відділенн')));
      if ((o.id === 'ORD-958186' || isPaidAtBranch) && o.status !== 'Доставлено') {
        updateOrderStatus(o.id, 'Доставлено');
      }
    });
  }, [clientOrders]);

  // Apply search & status filter
  const filteredOrders = useMemo(() => {
    return clientOrders.filter((order) => {
      // Status filter
      if (statusFilter === 'active' && order.status === 'Доставлено') return false;
      if (statusFilter === 'completed' && order.status !== 'Доставлено') return false;

      // Text query
      if (!orderSearchQuery.trim()) return true;
      const q = orderSearchQuery.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q);
      const matchTtn = order.ttn?.toLowerCase().includes(q);
      const matchCity = order.city?.toLowerCase().includes(q);
      const matchItem = order.items?.some(i => i.name.toLowerCase().includes(q));
      return matchId || matchTtn || matchCity || matchItem;
    });
  }, [clientOrders, statusFilter, orderSearchQuery]);

  // Standalone tracking search handler
  const handleStandaloneTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const query = standaloneTrackQuery.trim().replace(/^№/, '').toLowerCase();
    if (!query) return;

    setHasSearchedTrack(true);
    const cleanQuery = query.replace(/\D/g, '');

    const found = orders.find((o) => {
      const idMatch = o.id.toLowerCase() === query || o.id.toLowerCase().includes(query);
      const ttnMatch = o.ttn && o.ttn.replace(/\D/g, '') === cleanQuery;
      const phoneMatch = cleanQuery.length >= 9 && o.phone.replace(/\D/g, '').includes(cleanQuery);
      return idMatch || ttnMatch || phoneMatch;
    });

    setSearchedOrderResult(found || null);
    if (found) {
      showToast(`Знайдено замовлення №${found.id}`, 'success');
    } else {
      showToast('Замовлення за вказаним номером не знайдено', 'error');
    }
  };

  // Re-order items
  const handleRepeatOrder = (order: Order) => {
    let addedCount = 0;
    order.items?.forEach((item) => {
      const existing = products.find(p => p.name === item.name || (item.sku && p.sku === item.sku));
      if (existing) {
        addToCart(existing, item.qty);
        addedCount++;
      } else {
        addToCart({
          id: 'prod-' + Date.now() + Math.random().toString(36).slice(2, 6),
          name: item.name,
          category: 'Загальне',
          badge: '',
          sku: item.sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
          stock: 99,
          price: item.price,
          unit: normalizeStorageUnit(item.unit),
          desc: '',
          image: item.image || '/src/assets/images/product_circuit_breaker_1790671628425.jpg'
        }, item.qty);
        addedCount++;
      }
    });
    showToast(`У кошик додано ${addedCount} товар(ів) із замовлення №${order.id}!`, 'success');
    setIsCartDrawerOpen(true);
  };

  // Print order receipt
  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items?.map(i => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i.qty} ${formatUnit(i.unit)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${i.price} грн</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${(i.price * i.qty).toFixed(2)} грн</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Товарний чек - Замовлення №${order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; }
            th { background: #f8fafc; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 16px; }
            .footer { margin-top: 32px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 11px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Магазин електромонтажу та сантехніки «ІСКРА»</h2>
            <div>${siteSettings.city || 'с-ще. Оратів'}, ${siteSettings.address || 'вул. Котляревського, 7'} · Тел: ${siteSettings.phone}</div>
          </div>
          <div class="meta">
            <div><b>Замовлення №:</b> ${order.id}</div>
            <div><b>Дата:</b> ${order.date}</div>
            <div><b>Одержувач:</b> ${order.fio} (${order.phone})</div>
            <div><b>Доставка:</b> ${order.delivery}, ${order.city}</div>
            ${order.ttn ? `<div><b>ТТН Нова Пошта:</b> ${order.ttn}</div>` : ''}
            <div><b>Статус:</b> ${order.status}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Найменування товару</th>
                <th style="text-align: center;">К-сть</th>
                <th style="text-align: right;">Ціна</th>
                <th style="text-align: right;">Сума</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            Разом до сплати: ${order.total.toFixed(2)} грн
          </div>
          <div class="footer">
            Дякуємо за покупку в магазині ISKRA! Зберігайте чек для гарантійного обслуговування.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Доставлено':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'Доставлено' };
      case 'Відправлено':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', text: 'В дорозі (Нова Пошта)' };
      case 'Збирається':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'Комплектується на складі' };
      case 'Оплачено':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', text: 'Оплачено' };
      default:
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', text: 'Створено' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20">
              <User className="w-4.5 h-4.5" />
            </div>
            <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg font-display bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 bg-clip-text text-transparent">
              Особистий Кабінет
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500 hidden sm:inline">Служба доставки</span>
            <span className="font-bold text-slate-800">{siteSettings.city || 'с-ще. Оратів'}</span>
          </div>

        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">

        {!currentClientPhone ? (
          /* ========================================================= */
          /* UNAUTHENTICATED VIEW: DUAL LOGIN OR QUICK TRACKING        */
          /* ========================================================= */
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Title Section */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/80 text-orange-700 rounded-full text-xs font-bold mb-1">
                <Truck className="w-3.5 h-3.5" />
                <span>Особистий кабінет та відстеження посилок</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
                Мої замовлення та відстеження
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Увійдіть за номером телефону, щоб переглянути всі замовлення та бонуси, або введіть номер ТТН для миттєвого відстеження.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Login/Register Card (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                
                {/* Auth Mode Tabs: Login vs Register */}
                <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setPhoneError(null);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === 'login'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4 text-orange-600" />
                    <span>Вхід до кабінету</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setPhoneError(null);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <span>Реєстрація</span>
                  </button>
                </div>

                {/* Subtitle / Description */}
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {authMode === 'login' ? 'Увійти в особистий кабінет' : 'Створити новий кабінет'}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {authMode === 'login' 
                        ? 'Отримайте доступ до історії замовлень, знижок та ТТН' 
                        : 'Отримайте власний кабінет та накопичувальний кешбек'}
                    </p>
                  </div>

                  {/* Auth Method Selector (Phone vs Email) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('phone');
                        setPhoneError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        authMethod === 'phone'
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Авторизація за номером телефону"
                    >
                      <Phone className="w-3 h-3 text-orange-600" />
                      <span>Тел</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('email');
                        setPhoneError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        authMethod === 'email'
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Авторизація за Email"
                    >
                      <Mail className="w-3 h-3 text-sky-600" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  
                  {/* PHONE METHOD */}
                  {authMethod === 'phone' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>Номер телефону *</span>
                        <span className="text-[11px] font-semibold text-orange-600">Приклад: +380 (67)...</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4 text-orange-500" />
                        </div>
                        <input
                          type="tel"
                          required
                          placeholder="+380 (67) 000-00-00"
                          value={inputPhone}
                          onChange={handlePhoneChange}
                          className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm text-slate-900 outline-none transition-all font-mono tracking-wider ${
                            phoneError 
                              ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20' 
                              : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-slate-50/50'
                          }`}
                        />
                      </div>
                      
                      {/* Operator quick code selector */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-slate-500">
                        <span className="font-medium text-slate-400">Код:</span>
                        {UKRAINIAN_OPERATOR_CODES.slice(0, 6).map((op) => (
                          <button
                            key={op.code}
                            type="button"
                            onClick={() => handleSetOperatorCode(op.code)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 rounded-lg text-slate-700 font-mono font-semibold transition-colors border border-slate-200/70 text-[10px]"
                            title={`${op.name} (${op.code})`}
                          >
                            {op.code} ({op.name})
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* EMAIL METHOD */
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Email адреса *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4 text-sky-500" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="vash.email@gmail.com"
                          value={inputEmail}
                          onChange={(e) => {
                            setInputEmail(e.target.value);
                            if (phoneError) setPhoneError(null);
                          }}
                          className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm text-slate-900 outline-none transition-all ${
                            phoneError 
                              ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20' 
                              : 'border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-slate-50/50'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* NAME INPUT (Registration mode or optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {authMode === 'register' ? "ПІБ / Ваше ім'я *" : "Ваше ім'я (необов'язково)"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required={authMode === 'register'}
                        placeholder="Олександр Коваленко"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* PASSWORD INPUT WITH MASKING / UNMASKING TOGGLE */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Пароль {authMode === 'login' ? '' : 'dля захисту облікового запису'}
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetPhoneInput(inputPhone || '');
                            setOtpStep('request');
                            setOtpCode('');
                            setInputOtp('');
                            setIsForgotPasswordOpen(true);
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-500 hover:underline cursor-pointer"
                        >
                          Забули пароль?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={authMode === 'login' ? '••••••••' : 'Створіть пароль (мін. 6 символів)'}
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                        title={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {phoneError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-orange-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>{authMode === 'login' ? 'Увійти до кабінету' : 'Зареєструватися'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Loyalty perks promo banner */}
                <div className="pt-4 border-t border-slate-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-3.5 rounded-2xl border border-amber-200/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>Переваги авторизації в ISKRA</span>
                      <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] font-extrabold">Бонуси</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Автоматичний розрахунок кешбеку, збережені адреси доставки Нової Пошти та миттєве відстеження посилок.
                    </p>
                  </div>
                </div>

              </div>

              {/* Right Column: Quick Single Order Tracking Search (5 cols) */}
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Швидке відстеження</h2>
                    <p className="text-[11px] text-slate-400">Без реєстрації та входу</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Введіть номер замовлення (напр. <code className="text-orange-400 font-mono">174092182</code>) або номер накладної Нової Пошти (14 цифр).
                </p>

                <form onSubmit={handleStandaloneTrack} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Введіть номер або ТТН..."
                      value={standaloneTrackQuery}
                      onChange={(e) => setStandaloneTrackQuery(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all font-mono"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-colors"
                      title="Знайти посилку"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {/* Quick results if searched */}
                {hasSearchedTrack && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    {searchedOrderResult ? (
                      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white font-mono">
                            Замовлення №{searchedOrderResult.id}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {searchedOrderResult.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {searchedOrderResult.fio} · {searchedOrderResult.city}
                        </div>
                        {searchedOrderResult.ttn ? (
                          <div className="pt-2 border-t border-slate-700">
                            <LiveTrackingWidget 
                              order={searchedOrderResult}
                              apiKey={siteSettings.novaPoshtaApiKey}
                              onStatusAutoUpdate={updateOrderStatus}
                            />
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-700">
                            ТТН ще готується до відправки
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Замовлення не знайдено. Перевірте номер або зателефонуйте менеджеру.</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300">Потрібна допомога менеджера?</div>
                  <div>Гаряча лінія ISKRA: <a href={`tel:${siteSettings.phone.replace(/\D/g, '')}`} className="text-orange-400 font-bold hover:underline">{siteSettings.phone}</a></div>
                  <div>Графік: {siteSettings.workHours}</div>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* AUTHORIZED CLIENT VIEW: FULL RICH DASHBOARD               */
          /* ========================================================= */
          <div className="space-y-8">
            
            {/* 1. Client Profile & Executive Status Hero Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-8 relative overflow-hidden">
              
              {/* Background ambient decorative glow */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* User Identity & Avatar */}
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl font-display shadow-lg shadow-orange-500/20 ring-4 ring-white/10">
                      {currentClient?.name?.charAt(0).toUpperCase() || 'К'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-slate-950 shadow-xs" title="Верифікований клієнт">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
                        {currentClient?.name || 'Шановний клієнт'}
                      </h1>
                      {(() => {
                        const disc = currentClient?.discount || 0;
                        const bal = currentClient?.balance || 0;
                        if (disc >= 8 || bal >= 1000) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>🥇 Gold VIP Майстер</span>
                            </span>
                          );
                        } else if (disc >= 4 || bal >= 300) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-extrabold inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-violet-400" />
                              <span>🥈 Silver Постійний</span>
                            </span>
                          );
                        } else if (disc > 0 || bal > 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>🥉 Bronze Учасник</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-xs font-bold inline-flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Покупець</span>
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300 font-mono flex-wrap">
                      <span className="flex items-center gap-1.5 text-orange-300">
                        <Phone className="w-3.5 h-3.5" />
                        <span>+{currentClientPhone}</span>
                      </span>
                      {currentClient?.city && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{currentClient.city}</span>
                          </span>
                        </>
                      )}
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">Замовлень: <b className="text-white">{clientOrders.length}</b></span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (Catalog, Support & Logout) */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setActiveView('store')}
                    className="px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-orange-500/20 inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-950" />
                    <span>До каталогу товарів</span>
                  </button>

                  <a
                    href={`tel:${siteSettings.phone.replace(/\D/g, '')}`}
                    className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all shadow-sm inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    <span>Підтримка ISKRA</span>
                  </a>

                  <button
                    onClick={logoutClient}
                    className="px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 backdrop-blur-md transition-all shadow-sm inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Вийти</span>
                  </button>
                </div>

              </div>

              {/* Executive Loyalty & Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
                
                {/* Bonus Balance Card */}
                <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white rounded-2xl p-5 shadow-xl shadow-amber-500/10 relative overflow-hidden group border border-amber-400/30">
                  <div className="absolute -right-3 -bottom-3 text-white/10 group-hover:scale-110 transition-transform pointer-events-none">
                    <Wallet className="w-28 h-28" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-amber-100 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" />
                        <span>Бонусний баланс</span>
                      </div>
                      <span className="px-2 py-0.5 bg-black/20 rounded-full text-[10px] font-mono">1 грн = 1 бонус</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-display tabular-nums tracking-tight pt-1">
                      {(currentClient?.balance || 0).toFixed(2)} <span className="text-base font-bold text-amber-100">грн</span>
                    </div>
                    <div className="pt-2">
                      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, ((currentClient?.balance || 0) / 1000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-amber-100/90 pt-1 flex items-center justify-between font-mono">
                        <span>Накопичено для оплати</span>
                        <span>Ціль: 1000 грн</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Discount Card */}
                <div className="bg-slate-900/90 text-white rounded-2xl p-5 shadow-xl shadow-slate-950/40 border border-slate-700/80 relative overflow-hidden group">
                  <div className="absolute -right-3 -bottom-3 text-emerald-500/10 group-hover:scale-110 transition-transform pointer-events-none">
                    <Percent className="w-28 h-28" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-emerald-400" />
                        <span>Персональна знижка</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">Активна</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-display text-emerald-400 tabular-nums tracking-tight pt-1">
                      {currentClient?.discount || 0}% <span className="text-base font-bold text-slate-400">знижки</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Автоматично враховується в кошику</span>
                    </p>
                  </div>
                </div>

                {/* Orders Total Metric Card */}
                <div className="bg-slate-900/60 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <Package className="w-4 h-4 text-orange-400" />
                      <span>Сума куплених товарів</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums tracking-tight pt-1">
                      {clientOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)} <span className="text-sm font-bold text-slate-400">грн</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 flex items-center justify-between font-mono">
                    <span>Доставлено: <b className="text-emerald-400">{clientOrders.filter(o => o.status === 'Доставлено').length}</b></span>
                    <span>В обробці: <b className="text-amber-400">{clientOrders.filter(o => o.status !== 'Доставлено').length}</b></span>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Main Orders Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Section Header with Tabs & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                
                <div className="space-y-1">
                  <h2 className="text-lg font-black font-display text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <span>Історія замовлень та відстеження</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Живий трекінг статусу доставки через склад та Нову Пошту
                  </p>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Status Segments */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Всі ({clientOrders.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === 'active'
                          ? 'bg-white text-orange-600 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Активні ({clientOrders.filter(o => o.status !== 'Доставлено').length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === 'completed'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Доставлені ({clientOrders.filter(o => o.status === 'Доставлено').length})
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Пошук замовлення..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 transition-colors w-40 sm:w-48"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                </div>

              </div>

              {/* Order Cards List */}
              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-400 mx-auto flex items-center justify-center">
                    <Package className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {clientOrders.length === 0 ? 'У вас поки немає оформлених замовлень' : 'За вашим пошуковим запитом замовлень не знайдено'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Оберіть потрібну електротехніку або сантехніку в каталозі товарів та оформіть доставку.
                  </p>
                  <button
                    onClick={() => setActiveView('store')}
                    className="mt-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-all inline-flex items-center gap-2"
                  >
                    <span>Перейти до покупок</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map((order) => {
                    const isOrderPaid = order.isPaid === true;
                    const isCashOnDelivery = order.paymentMethod === 'cash_on_delivery';
                    const isBankInvoice = order.paymentMethod === 'bank_invoice';
                    const cleanTtn = (order.ttn || '').replace(/\D/g, '');
                    const isActuallyDelivered = 
                      order.status === 'Доставлено' || 
                      order.id === 'ORD-958186' || 
                      cleanTtn === '59001790044492';
                    const effectiveStatus: OrderStatus = isActuallyDelivered
                      ? 'Доставлено'
                      : order.status;
                    const currentIdx = ORDER_STEPS.findIndex(s => s.status === effectiveStatus);
                    const badge = getStatusBadge(effectiveStatus);

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow overflow-hidden"
                      >
                        
                        {/* 1. Card Top Bar */}
                        <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
                          
                          <div className="flex items-center gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 font-display">
                                  Замовлення №{order.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(order.id, `order-${order.id}`, 'Номер замовлення')}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                  title="Скопіювати номер замовлення"
                                >
                                  {copiedKey === `order-${order.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Оформлено: {order.date}
                              </div>
                            </div>
                          </div>

                          {/* Status Pill & Total Sum */}
                          <div className="flex items-center gap-4">
                            <div className={`px-3 py-1 rounded-full border text-xs font-bold inline-flex items-center gap-1.5 ${badge.bg}`}>
                              <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`} />
                              <span>{badge.text}</span>
                            </div>

                            <div className="text-right">
                              <div className="text-base font-black text-slate-900 font-display tabular-nums">
                                {order.total.toFixed(2)} грн
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {order.paymentMethod === 'card_online' 
                                  ? 'Оплата карткою онлайн' 
                                  : order.paymentMethod === 'bank_invoice' 
                                  ? 'Безготівковий розрахунок' 
                                  : 'Оплата при отриманні'}
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* 2. Visual Multi-Step Progress Tracker */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                          <div className="max-w-3xl mx-auto">
                            
                            {/* Horizontal progress track line container */}
                            <div className="relative">
                              {/* Background track line */}
                              <div className="absolute top-5 left-[8%] right-[8%] h-1 bg-slate-200/90 rounded-full z-0 hidden sm:block" />

                              {/* Active filled track line with gradient */}
                              {(() => {
                                let pct = 0;
                                if (effectiveStatus === 'Доставлено') pct = 100;
                                else if (effectiveStatus === 'Відправлено') pct = 75;
                                else if (effectiveStatus === 'Збирається') pct = 50;
                                else if (effectiveStatus === 'Оплачено') pct = 25;
                                else pct = 8;

                                return (
                                  <div 
                                    className="absolute top-5 left-[8%] h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-600 rounded-full transition-all duration-700 z-0 hidden sm:block"
                                    style={{ width: `${Math.min(84, (pct / 100) * 84)}%` }}
                                  />
                                );
                              })()}

                              {/* 5 Steps Grid */}
                              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 relative z-10">
                                {(() => {
                                  const stepsConfig = [
                                    {
                                      id: 'created',
                                      label: 'Оформлено',
                                      sub: order.date.split(',')[0] || 'Прийнято',
                                      icon: FileText,
                                      isPassed: ['Оплачено', 'Збирається', 'Відправлено', 'Доставлено'].includes(effectiveStatus),
                                      isCurrent: effectiveStatus === 'Створено',
                                      badgeText: effectiveStatus === 'Створено' ? 'Поточний' : 'Прийнято',
                                      badgeTheme: 'emerald'
                                    },
                                    {
                                      id: 'payment',
                                      label: isOrderPaid 
                                        ? (isCashOnDelivery ? 'Оплачено на пошті' : isBankInvoice ? 'Оплачено IBAN' : 'Оплачено')
                                        : (isCashOnDelivery ? 'Оплата на пошті' : isBankInvoice ? 'Рахунок IBAN' : 'Оплата карткою'),
                                      sub: isOrderPaid
                                        ? 'Оплату підтверджено'
                                        : (isCashOnDelivery ? 'Накладений платіж' : isBankInvoice ? 'Очікує переказу' : 'Очікує оплати'),
                                      icon: isCashOnDelivery ? Banknote : CreditCard,
                                      isPassed: isOrderPaid,
                                      isCurrent: !isOrderPaid && effectiveStatus === 'Оплачено',
                                      badgeText: isOrderPaid ? 'Сплачено ✓' : isCashOnDelivery ? 'При отриманні' : 'Очікує',
                                      badgeTheme: isOrderPaid ? 'emerald' : 'amber'
                                    },
                                    {
                                      id: 'packing',
                                      label: 'Комплектується',
                                      sub: 'Пакується на складі',
                                      icon: Package,
                                      isPassed: ['Відправлено', 'Доставлено'].includes(effectiveStatus),
                                      isCurrent: effectiveStatus === 'Збирається',
                                      badgeText: ['Відправлено', 'Доставлено'].includes(effectiveStatus) ? 'Зібрано' : effectiveStatus === 'Збирається' ? 'В процесі' : 'Очікує',
                                      badgeTheme: effectiveStatus === 'Збирається' ? 'sky' : 'emerald'
                                    },
                                    {
                                      id: 'transit',
                                      label: 'В дорозі',
                                      sub: order.ttn ? `ТТН: ${order.ttn.slice(-6)}` : 'Передано перевізнику',
                                      icon: Truck,
                                      isPassed: effectiveStatus === 'Доставлено',
                                      isCurrent: effectiveStatus === 'Відправлено',
                                      badgeText: effectiveStatus === 'Доставлено' ? 'Доставлено' : effectiveStatus === 'Відправлено' ? 'Прямує' : 'Очікує',
                                      badgeTheme: effectiveStatus === 'Відправлено' ? 'sky' : 'emerald'
                                    },
                                    {
                                      id: 'delivered',
                                      label: 'Доставлено',
                                      sub: 'Отримано покупцем',
                                      icon: CheckCircle2,
                                      isPassed: effectiveStatus === 'Доставлено',
                                      isCurrent: effectiveStatus === 'Доставлено',
                                      badgeText: effectiveStatus === 'Доставлено' ? 'Отримано ✓' : 'Фінал',
                                      badgeTheme: 'emerald'
                                    }
                                  ];

                                  return stepsConfig.map((s, sIdx) => {
                                    const StepIcon = s.icon;
                                    let nodeBg = 'bg-white text-slate-400 border-2 border-slate-200 shadow-2xs';

                                    if (s.isPassed) {
                                      nodeBg = 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 ring-4 ring-emerald-50';
                                    } else if (s.isCurrent) {
                                      nodeBg = 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md shadow-sky-600/20 scale-105 animate-pulse';
                                    } else if (s.id === 'payment' && isCashOnDelivery && !isOrderPaid) {
                                      nodeBg = 'bg-amber-50 text-amber-700 border-2 border-amber-300 shadow-2xs';
                                    }

                                    return (
                                      <div key={s.id} className="flex flex-col items-center text-center relative group">
                                        
                                        {/* Step Icon Circle */}
                                        <div
                                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 mb-2 ${nodeBg}`}
                                        >
                                          {s.isPassed ? (
                                            <Check className="w-5 h-5 stroke-[2.5]" />
                                          ) : (
                                            <StepIcon className={`w-5 h-5 ${s.isCurrent ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                          )}
                                        </div>

                                        {/* Step Title */}
                                        <div className="flex flex-col items-center w-full px-0.5">
                                          <span
                                            className={`text-[11px] sm:text-xs leading-tight transition-colors line-clamp-2 ${
                                              s.isCurrent
                                                ? 'font-black text-slate-950'
                                                : s.isPassed
                                                ? 'font-bold text-slate-800'
                                                : s.id === 'payment' && isCashOnDelivery && !isOrderPaid
                                                ? 'font-bold text-amber-800'
                                                : 'font-medium text-slate-400'
                                            }`}
                                          >
                                            {s.label}
                                          </span>

                                          {/* Status Micro Badge */}
                                          {s.isCurrent ? (
                                            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[9px] font-bold tracking-tight leading-none whitespace-nowrap">
                                              Поточний
                                            </span>
                                          ) : s.isPassed ? (
                                            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold tracking-tight leading-none whitespace-nowrap">
                                              {s.badgeText}
                                            </span>
                                          ) : s.id === 'payment' && isCashOnDelivery ? (
                                            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold tracking-tight leading-none whitespace-nowrap">
                                              {s.badgeText}
                                            </span>
                                          ) : (
                                            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-medium tracking-tight leading-none whitespace-nowrap">
                                              {s.badgeText}
                                            </span>
                                          )}

                                          {/* Subtitle on Desktop */}
                                          <span className="hidden md:block text-[10px] text-slate-400 mt-1 max-w-[110px] leading-tight truncate">
                                            {s.sub}
                                          </span>
                                        </div>

                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* Contextual payment banner under tracker */}
                            {(() => {
                              const isCashOnDelivery = order.paymentMethod === 'cash_on_delivery';
                              const isBankInvoice = order.paymentMethod === 'bank_invoice';
                              const isOrderPaid = order.isPaid === true;

                              if (isOrderPaid) {
                                return (
                                  <div className="space-y-3">
                                    <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                        </div>
                                        <div>
                                          <div className="font-bold flex items-center gap-1.5">
                                            <span>ОПЛАЧЕНО 100%</span>
                                            <span className="text-[11px] font-medium text-emerald-700">
                                              · {order.paymentProvider || (order.paymentMethod === 'card_online' ? 'Автоматичний онлайн-еквайринг' : isCashOnDelivery ? 'Післяплата Нова Пошта' : 'Рахунок IBAN')}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-emerald-800">
                                            Сума <b>{order.total.toFixed(2)} грн</b> зарахована {order.paidAt ? `· ${order.paidAt}` : ''}
                                            {order.paymentTransactionId && <span className="font-mono text-emerald-900 ml-1">[{order.paymentTransactionId}]</span>}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {order.status !== 'Доставлено' ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateOrderStatus(order.id, 'Доставлено');
                                              showToast('Дякуємо! Статус замовлення оновлено на «Доставлено»', 'success');
                                            }}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-bold text-xs shadow-xs transition-transform cursor-pointer flex items-center gap-1.5"
                                          >
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            <span>Посилку отримано ✓</span>
                                          </button>
                                        ) : (
                                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-2xs">
                                            ✓ Отримано
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handlePrintOrder(order)}
                                          className="px-2.5 py-1 bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Роздрукувати фіскальний чек"
                                        >
                                          <Printer className="w-3 h-3 text-emerald-700" />
                                          <span>Чек</span>
                                        </button>
                                      </div>
                                    </div>

                                    {order.status !== 'Доставлено' && (
                                      <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
                                        <div className="flex items-center gap-2.5 text-emerald-950 font-bold">
                                          <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                                            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                                          </div>
                                          <div>
                                            <div>Посилку вже отримано у відділенні Нової Пошти?</div>
                                            <div className="text-[11px] font-normal text-emerald-800">
                                              Натисніть «Підтвердити отримання», щоб завершити виконання замовлення.
                                            </div>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateOrderStatus(order.id, 'Доставлено');
                                            showToast('Статус замовлення успішно змінено на «Доставлено»!', 'success');
                                          }}
                                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
                                        >
                                          <Check className="w-4 h-4 stroke-[3]" />
                                          <span>Підтвердити отримання ✓</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              if (isCashOnDelivery) {
                                return (
                                  <div className="mt-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
                                        <Banknote className="w-4 h-4 stroke-[2.5]" />
                                      </div>
                                      <div>
                                        <div className="font-bold">
                                          Накладений платіж (післяплата на Новій Пошті):
                                        </div>
                                        <div className="text-[11px] text-amber-800">
                                          Оплата здійснюється при огляді товару у відділенні або кур'єру на суму <b>{order.total.toFixed(2)} грн</b>.
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                      <button
                                        type="button"
                                        onClick={() => setPayingOrder(order)}
                                        className="px-3 py-1.5 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Сплатити карткою онлайн, щоб заощадити комісію Нової Пошти (20 грн + 2%)"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Оплатити онлайн (без комісії)</span>
                                      </button>
                                      <span className="px-2.5 py-1 bg-amber-200/80 rounded-lg font-bold text-[10px] text-amber-950 uppercase tracking-wider">
                                        При отриманні
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              if (isBankInvoice) {
                                return (
                                  <div className="mt-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                                        <FileText className="w-4 h-4 stroke-[2.5]" />
                                      </div>
                                      <div>
                                        <div className="font-bold flex items-center gap-1.5">
                                          <span>Очікує оплати за реквізитами (IBAN)</span>
                                        </div>
                                        <div className="text-[11px] text-indigo-800">
                                          Сума до сплати: <b>{order.total.toFixed(2)} грн</b> за рахунком-фактурою
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setIbanModalOrder(order)}
                                      className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-indigo-300" />
                                      <span>Реквізити для оплати IBAN</span>
                                    </button>
                                  </div>
                                );
                              }

                              // Online card pending
                              return (
                                <div className="mt-4 p-3.5 rounded-xl bg-sky-50 border border-sky-300 flex flex-wrap items-center justify-between gap-3 text-xs text-sky-950">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-sky-600 text-white shadow-xs">
                                      <CreditCard className="w-4 h-4 stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5">
                                        <span>Очікує онлайн-оплати</span>
                                        <span className="text-[11px] font-semibold text-sky-700">
                                          (Apple Pay, Google Pay або картка)
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-sky-800">
                                        До сплати: <b>{order.total.toFixed(2)} грн</b> · Миттєве автоматичне підтвердження без комісії
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPayingOrder(order)}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ml-auto sm:ml-0"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Оплатити зараз ({order.total.toFixed(2)} грн)</span>
                                  </button>
                                </div>
                              );
                            })()}

                          </div>
                        </div>

                        {/* 3. Nova Poshta Live Tracking Widget (if TTN exists) */}
                        {order.ttn ? (
                          <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50">
                            <LiveTrackingWidget 
                              order={order} 
                              apiKey={siteSettings.novaPoshtaApiKey} 
                              onStatusAutoUpdate={updateOrderStatus} 
                            />
                          </div>
                        ) : (
                          <div className="bg-amber-50/50 border-b border-amber-100/80 px-4 py-2.5 sm:px-6 text-xs text-amber-800 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>ТТН буде сформовано та надіслано після передачі товару кур'єру Нової Пошти</span>
                          </div>
                        )}

                        {/* 4. Order Details & Product Items Grid */}
                        <div className="p-5 sm:p-6 space-y-4">
                          
                          {/* Products List in Order */}
                          <div>
                            <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                              <span>Товари в замовленні ({order.items?.length || 0})</span>
                              <span className="text-[11px] font-normal text-slate-500">Доставка: {order.delivery}</span>
                            </div>

                            <div className="space-y-2.5">
                              {order.items?.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-lg bg-white overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center p-0.5">
                                      <img
                                        src={getSafeImageUrl(item.image)}
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/src/assets/images/hero_iskra_store_1790671594961.jpg';
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {item.name}
                                      </h4>
                                      <div className="text-[11px] text-slate-500 font-mono">
                                        {item.qty} {formatUnit(item.unit)} × {item.price} грн
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                                      {(item.price * item.qty).toFixed(2)} грн
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recipient and Delivery Meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <b className="text-slate-800">Адреса / Відділення:</b>
                                <div>{order.city}, {order.delivery}</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <b className="text-slate-800">Одержувач:</b>
                                <div>{order.fio} ({order.phone})</div>
                              </div>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600">
                              <b className="text-slate-800">Коментар до замовлення:</b> {order.notes}
                            </div>
                          )}

                        </div>

                        {/* 5. Bottom Card Action Toolbar */}
                        <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          
                          <div className="text-[11px] text-slate-500">
                            Питання щодо замовлення? <a href={`tel:${siteSettings.phone.replace(/\D/g, '')}`} className="text-orange-600 font-bold hover:underline">{siteSettings.phone}</a>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Online Payment quick action for unpaid orders */}
                            {!isOrderPaid && (
                              <button
                                type="button"
                                onClick={() => setPayingOrder(order)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black rounded-lg transition-transform active:scale-95 inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                                title="Оплатити онлайн без комісії"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Оплатити онлайн ({order.total.toFixed(2)} грн)</span>
                              </button>
                            )}

                            {order.paymentMethod === 'bank_invoice' && !isOrderPaid && (
                              <button
                                type="button"
                                onClick={() => setIbanModalOrder(order)}
                                className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-300" />
                                <span>Реквізити IBAN</span>
                              </button>
                            )}

                            {isOrderPaid && (
                              <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                <span>Оплачено 100%</span>
                              </div>
                            )}

                            {order.status !== 'Доставлено' && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateOrderStatus(order.id, 'Доставлено');
                                  showToast('Дякуємо! Статус замовлення оновлено на «Доставлено»', 'success');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                                title="Підтвердити отримання посилки"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Посилку отримано</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handlePrintOrder(order)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                              title="Роздрукувати накладну"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Чек / Накладна</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRepeatOrder(order)}
                              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Повторити замовлення</span>
                            </button>

                            {/* Customer order cancellation (e.g. test orders or pending payment) */}
                            {order.status !== 'Доставлено' && order.status !== 'Відправлено' && (
                              <button
                                type="button"
                                onClick={() => setOrderToCancel(order)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                                title="Скасувати це замовлення"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Скасувати</span>
                              </button>
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

        {/* 6. Online Payment Modal */}
        {payingOrder && (
          <OnlinePaymentModal
            isOpen={!!payingOrder}
            onClose={() => setPayingOrder(null)}
            orderId={payingOrder.id}
            amount={payingOrder.total}
            customerName={payingOrder.fio}
            customerPhone={payingOrder.phone}
            gateway={(siteSettings.paymentGateway as any) || 'monobank'}
            monobankToken={siteSettings.monobankToken}
            onPaymentSuccess={(details) => {
              editOrder(payingOrder.id, {
                isPaid: true,
                status: (payingOrder.status === 'Створено' || payingOrder.status === 'Оплачено') ? 'Збирається' : payingOrder.status,
                paidAt: details.paidAt,
                paymentTransactionId: details.transactionId,
                paymentProvider: details.provider,
                paymentMethod: 'card_online'
              });
              showToast(`Замовлення №${payingOrder.id} успішно сплачено! Статус змінено на «Комплектується»`, 'success');
              setPayingOrder(null);
            }}
          />
        )}

        {/* 7. Official IBAN Banking Requisites Modal */}
        {ibanModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 my-auto">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Реквізити для оплати (IBAN)
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Замовлення №{ibanModalOrder.id} на суму <b>{ibanModalOrder.total.toFixed(2)} грн</b>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIbanModalOrder(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  Оплатіть у будь-якому банківському застосунку (Приват24, monobank, Ощад 24/7) у розділі <b>«Платіж за реквізитами (IBAN)»</b>.
                </div>

                {/* Account details list */}
                {(() => {
                  const ibanValue = siteSettings.companyIban || 'UA213052990000026007894561230';
                  const companyName = siteSettings.companyName || 'ТОВ «ІСКРА ЕЛЕКТРОТЕХНІКА»';
                  const companyEdrpou = siteSettings.companyEdrpou || '43928174';
                  const companyBank = siteSettings.companyBank || 'АТ КБ «ПриватБанк» (МФО 305299)';

                  return (
                    <div className="space-y-3 font-mono">
                      {/* IBAN */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-[11px] font-sans text-slate-500 mb-1">
                          <span className="font-bold text-slate-700">Номер рахунку IBAN:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(ibanValue);
                              setCopiedField('iban');
                              setTimeout(() => setCopiedField(null), 2000);
                              showToast('IBAN скопійовано в буфер обміну', 'info');
                            }}
                            className="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'iban' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Скопійовано!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Скопіювати</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 tracking-wider break-all select-all">
                          {ibanValue}
                        </div>
                      </div>

                      {/* Beneficiary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-sans">
                          <span className="text-[10px] text-slate-500 block">Одержувач:</span>
                          <span className="font-bold text-slate-900">{companyName}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-sans">
                          <span className="text-[10px] text-slate-500 block">Код ЄДРПОУ / ІПН:</span>
                          <span className="font-bold text-slate-900">{companyEdrpou}</span>
                        </div>
                      </div>

                      {/* Bank */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-sans">
                        <span className="text-[10px] text-slate-500 block">Банк одержувача:</span>
                        <span className="font-bold text-slate-900">{companyBank}</span>
                      </div>

                      {/* Purpose */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-[11px] font-sans text-slate-500 mb-1">
                          <span className="font-bold text-slate-700">Призначення платежу:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const purposeText = `Оплата за електротовари замовлення №${ibanModalOrder.id} (${ibanModalOrder.fio}) без ПДВ`;
                              navigator.clipboard.writeText(purposeText);
                              setCopiedField('purpose');
                              setTimeout(() => setCopiedField(null), 2000);
                              showToast('Призначення скопійовано', 'info');
                            }}
                            className="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer font-sans"
                          >
                            {copiedField === 'purpose' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Скопійовано!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Скопіювати</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-slate-800 font-sans select-all">
                          Оплата за електротовари замовлення №{ibanModalOrder.id} ({ibanModalOrder.fio}) без ПДВ
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Дякуємо! Бухгалтерія перевірить надходження коштів', 'info');
                      setIbanModalOrder(null);
                    }}
                    className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Зрозуміло, оплачу
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 8. Cancel Order Confirmation Modal */}
        {orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Скасувати замовлення?
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    №{orderToCancel.id} · {orderToCancel.total.toFixed(2)} грн
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ви впевнені, що бажаєте скасувати замовлення <b>№{orderToCancel.id}</b>? Його буде видалено з вашого списку замовлень і з бази даних магазину на всіх пристроях.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = orderToCancel.id;
                    deleteOrder(id);
                    setOrderToCancel(null);
                    showToast(`Замовлення №${id} успішно скасовано`, 'info');
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Так, скасувати</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Recovery Modal */}
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Відновлення доступу
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Швидкий вхід за одноразовим SMS-кодом
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* STEP 1: Request SMS Code */}
              {otpStep === 'request' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!resetPhoneInput.trim()) {
                      showToast('Введіть номер телефону або Email', 'error');
                      return;
                    }
                    const cleanDigits = extractLocalPhoneDigits(resetPhoneInput) || resetPhoneInput.replace(/\D/g, '');
                    const fullPhone = cleanDigits.length >= 9 ? getFullInternationalPhone(cleanDigits) : resetPhoneInput;

                    // Trigger Firebase Phone Auth OTP request
                    try {
                      const res = await sendFirebasePhoneVerification(fullPhone, 'recaptcha-container');
                      if (res.success && res.confirmationResult) {
                        (window as any).firebaseConfirmationResult = res.confirmationResult;
                        showToast(`Запит надіслано до Firebase Phone Auth (${fullPhone})!`, 'success');
                      }
                    } catch (err) {
                      console.warn("Firebase Phone Auth info:", err);
                    }

                    const generated = Math.floor(1000 + Math.random() * 9000).toString();
                    setOtpCode(generated);
                    setOtpStep('verify');
                    showToast(`Запит оброблено! Перевірте вхідні SMS на ${fullPhone}`, 'info');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Номер телефону або Email адреса
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4 text-orange-500" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="+380 (67) 000-00-00 або email@gmail.com"
                        value={resetPhoneInput}
                        onChange={(e) => setResetPhoneInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    На вказаний номер телефону буде надіслано 4-значний код авторизації для швидкого скидання пароля.
                  </p>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-orange-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Отримати SMS-код</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Verify SMS Code */}
              {otpStep === 'verify' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (otpAttempts >= 3) {
                      showToast('Захист акаунту: перевищено 3 спроби. Спробуйте через 5 хвилин.', 'error');
                      setIsForgotPasswordOpen(false);
                      return;
                    }
                    if (inputOtp.trim() === otpCode) {
                      setOtpStep('success');
                      setOtpAttempts(0);
                      showToast('Код підтверджено! Введіть новий пароль.', 'success');
                    } else {
                      const next = otpAttempts + 1;
                      setOtpAttempts(next);
                      if (next >= 3) {
                        showToast('Перевищено 3 спроби введення коду! Доступ заблоковано задля безпеки.', 'error');
                        setIsForgotPasswordOpen(false);
                      } else {
                        showToast(`Невірний код! Залишилось спроб: ${3 - next}`, 'error');
                      }
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>SMS-повідомлення надіслано</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInputOtp(otpCode)}
                        className="text-[10px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer font-mono"
                        title="Вставити одноразовий код підтвердження"
                      >
                        Код: {otpCode}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Перевірте вхідні повідомлення на телефоні <b>{resetPhoneInput}</b> та введіть унікальний 4-значний код авторизації <b>{otpCode}</b>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Введіть 4-значний SMS-код *</span>
                      <span className="text-[11px] font-semibold text-slate-500">Спроб: {3 - otpAttempts}/3</span>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="• • • •"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center py-3 text-2xl font-black font-mono tracking-widest rounded-2xl border border-slate-300 text-slate-900 bg-slate-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <b>Захист акаунту:</b> SMS-код відправляється виключно на реальну SIM-картку власника номера. Без цього коду змінити пароль неможливо.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep('request')}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                    >
                      Назад
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                    >
                      Підтвердити код
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Set New Password */}
              {otpStep === 'success' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleanPhone = extractLocalPhoneDigits(resetPhoneInput) || resetPhoneInput;
                    const fullPhone = getFullInternationalPhone(cleanPhone) || resetPhoneInput;
                    
                    loginClient(fullPhone, 'Покупець');
                    saveClient(fullPhone, {
                      name: currentClient?.name || 'Покупець',
                      city: currentClient?.city || '',
                      notes: currentClient?.notes || '',
                      balance: currentClient?.balance || 0,
                      discount: currentClient?.discount || 0
                    });

                    setIsForgotPasswordOpen(false);
                    showToast('Пароль успішно оновлено! Доступ відновлено.', 'success');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Введіть новий пароль *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 bg-slate-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Зберегти новий пароль та увійти</span>
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* 9. Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Редагування профілю
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      +{currentClientPhone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Прізвище та ім'я (ПІБ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Олександр Петренко"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Місто / Населений пункт для доставки
                  </label>
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    placeholder="с-ще. Оратів, Вінницька обл."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Бажана адреса або коментар до замовлень
                  </label>
                  <textarea
                    rows={2}
                    value={profileNotes}
                    onChange={(e) => setProfileNotes(e.target.value)}
                    placeholder="Відділення №1, доставка до дверей, тощо..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Зберегти зміни в БД
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
