import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  formatUkrainianPhone, 
  extractLocalPhoneDigits, 
  getFullInternationalPhone, 
  UKRAINIAN_OPERATOR_CODES 
} from '../utils/phoneFormatter';
import { 
  X, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  ShieldCheck,
  ShoppingBag,
  Search,
  Sparkles,
  Zap,
  RotateCcw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Order } from '../types/store';
import { 
  searchNovaPoshtaCities, 
  getNovaPoshtaWarehouses, 
  DeliveryCity, 
  DeliveryWarehouse,
  POPULAR_CITIES,
  searchUkrposhtaOffices,
  getUkrposhtaByPostcode,
  UkrposhtaOffice
} from '../services/deliveryService';
import { OnlinePaymentModal } from './OnlinePaymentModal';

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutModalOpen, 
    setIsCheckoutModalOpen, 
    cart, 
    discountedCartSum, 
    currentClient, 
    currentClientPhone,
    placeOrder, 
    editOrder,
    setActiveView,
    siteSettings,
    showToast
  } = useStore();

  const [fio, setFio] = useState(currentClient?.name || '');
  const [phone, setPhone] = useState(currentClientPhone ? formatUkrainianPhone(currentClientPhone) : '');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Delivery states
  const [deliveryType, setDeliveryType] = useState<'novaposhta' | 'ukrposhta' | 'pickup' | 'courier'>('novaposhta');
  const [npDeliverySubType, setNpDeliverySubType] = useState<'branch' | 'postomat'>('branch');
  
  // Nova Poshta city & warehouse selection
  const [cityInput, setCityInput] = useState('Оратів');
  const [selectedCity, setSelectedCity] = useState<DeliveryCity | null>({
    ref: 'orativ-vin',
    name: 'Оратів',
    area: 'Вінницька область',
    region: 'Вінницький р-н',
    settlementType: 'смт / село'
  });
  const [citySuggestions, setCitySuggestions] = useState<DeliveryCity[]>([]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isSearchingCities, setIsSearchingCities] = useState(false);

  // Warehouses
  const [warehouses, setWarehouses] = useState<DeliveryWarehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<DeliveryWarehouse | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [manualWarehouseText, setManualWarehouseText] = useState('');
  const [useManualWarehouse, setUseManualWarehouse] = useState(false);

  // Ukrposhta fields & auto-lookup
  const [upIndex, setUpIndex] = useState('');
  const [upCity, setUpCity] = useState('');
  const [upAddress, setUpAddress] = useState('');
  const [ukrposhtaSearch, setUkrposhtaSearch] = useState('');
  const [ukrposhtaOfficesList, setUkrposhtaOfficesList] = useState<UkrposhtaOffice[]>([]);
  const [selectedUkrposhtaOffice, setSelectedUkrposhtaOffice] = useState<UkrposhtaOffice | null>(null);
  const [isSearchingUkrposhta, setIsSearchingUkrposhta] = useState(false);
  const [showUkrposhtaDropdown, setShowUkrposhtaDropdown] = useState(false);

  // Courier address
  const [streetAddress, setStreetAddress] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'card_online' | 'bank_invoice'>('card_online');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccessSimulator, setShowPaymentSuccessSimulator] = useState(false);
  const [isOnlinePaymentModalOpen, setIsOnlinePaymentModalOpen] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null);
  const [tempOrderId, setTempOrderId] = useState<string>('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Sync client phone when opened
  useEffect(() => {
    if (currentClientPhone && !phone) {
      setPhone(formatUkrainianPhone(currentClientPhone));
    }
  }, [currentClientPhone]);

  // Load cities on input change
  useEffect(() => {
    if (!cityInput || cityInput.trim().length < 2) {
      setCitySuggestions(POPULAR_CITIES.slice(0, 8));
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCities(true);
      try {
        const results = await searchNovaPoshtaCities(cityInput, siteSettings.novaPoshtaApiKey);
        setCitySuggestions(results);
      } finally {
        setIsSearchingCities(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [cityInput, siteSettings.novaPoshtaApiKey]);

  // Load warehouses when city or sub-type changes
  useEffect(() => {
    if (deliveryType !== 'novaposhta' || !selectedCity) return;

    let isMounted = true;
    setIsLoadingWarehouses(true);

    getNovaPoshtaWarehouses(
      selectedCity.name,
      npDeliverySubType,
      siteSettings.novaPoshtaApiKey
    ).then((items) => {
      if (!isMounted) return;
      setWarehouses(items);
      if (items.length > 0) {
        setSelectedWarehouse(items[0]);
      } else {
        setSelectedWarehouse(null);
      }
      setIsLoadingWarehouses(false);
    }).catch(() => {
      if (isMounted) setIsLoadingWarehouses(false);
    });

    return () => {
      isMounted = false;
    };
  }, [deliveryType, selectedCity, npDeliverySubType, siteSettings.novaPoshtaApiKey]);

  // Load Ukrposhta offices on search query
  useEffect(() => {
    if (deliveryType !== 'ukrposhta') return;

    let isMounted = true;
    setIsSearchingUkrposhta(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchUkrposhtaOffices(ukrposhtaSearch, siteSettings.ukrposhtaToken);
        if (isMounted) {
          setUkrposhtaOfficesList(res);
        }
      } catch (err) {
        console.warn('Ukrposhta lookup error:', err);
      } finally {
        if (isMounted) setIsSearchingUkrposhta(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [deliveryType, ukrposhtaSearch, siteSettings.ukrposhtaToken]);

  const handleSelectUkrposhtaOffice = (office: UkrposhtaOffice) => {
    setSelectedUkrposhtaOffice(office);
    setUpIndex(office.postcode);
    const fullCity = office.district 
      ? `${office.city} (${office.district}, ${office.region})`
      : `${office.city}, ${office.region}`;
    setUpCity(fullCity);
    setUpAddress(`${office.name}: ${office.address}`);
    setShowUkrposhtaDropdown(false);
    setUkrposhtaSearch('');
    showToast(`Відділення Укрпошти [${office.postcode}] обрано!`, 'success');
  };

  const handleUkrposhtaIndexInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 5);
    setUpIndex(cleaned);
    if (cleaned.length === 5) {
      const match = getUkrposhtaByPostcode(cleaned);
      if (match) {
        handleSelectUkrposhtaOffice(match);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUkrainianPhone(e.target.value);
    setPhone(formatted);
    if (phoneError) setPhoneError(null);
  };

  const handleSetOperatorCode = (code: string) => {
    const digits = extractLocalPhoneDigits(phone);
    const subscriberPart = digits.length > 2 ? digits.slice(2) : '';
    const newFormatted = formatUkrainianPhone(code + subscriberPart);
    setPhone(newFormatted);
    if (phoneError) setPhoneError(null);
  };

  if (!isCheckoutModalOpen) return null;

  const minSum = siteSettings.features?.minOrderSum ?? 50;
  const isFreeShipping = discountedCartSum >= (siteSettings.features?.freeShippingThreshold ?? 3000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fio.trim()) return;

    const localDigits = extractLocalPhoneDigits(phone);
    if (!localDigits) {
      setPhoneError("Введіть номер телефону для зв'язку (наприклад: +380 (67) 123-45-67)");
      showToast("Вкажіть номер телефону", "error");
      return;
    }
    if (localDigits.length < 9) {
      setPhoneError(`Номер телефону має містити повні 9 цифр після +380. Залишилось: ${9 - localDigits.length}`);
      showToast("Введіть повний номер телефону", "error");
      return;
    }
    setPhoneError(null);

    if (discountedCartSum < minSum) {
      showToast(`Мінімальна сума замовлення становить ${minSum} грн`, 'error');
      return;
    }

    setIsSubmitting(true);

    let deliveryString = `Самовивіз з магазину (${siteSettings.city || 'с-ще. Оратів'}, ${siteSettings.address || 'вул. Котляревського, 7'})`;
    let orderCity = siteSettings.city || 'с-ще. Оратів';

    if (deliveryType === 'novaposhta') {
      const cName = selectedCity ? `${selectedCity.name} (${selectedCity.area})` : cityInput;
      orderCity = selectedCity ? selectedCity.name : cityInput;
      const wName = useManualWarehouse 
        ? manualWarehouseText 
        : (selectedWarehouse ? selectedWarehouse.name : manualWarehouseText || 'Відділення №1');
      
      const typeLabel = npDeliverySubType === 'postomat' ? 'Поштомат' : 'Відділення';
      deliveryString = `Нова Пошта (${typeLabel}): ${cName} — ${wName}`;
    } else if (deliveryType === 'ukrposhta') {
      orderCity = upCity || 'Україна';
      deliveryString = `Укрпошта: Індекс ${upIndex || '---'}, ${upCity || ''}, ${upAddress || 'до запитання'}`;
    } else if (deliveryType === 'courier') {
      deliveryString = `Кур'єрська доставка до дверей: ${streetAddress || 'Вказана адреса'}`;
    }

    const fullPhone = getFullInternationalPhone(phone);

    // Create order directly for all payment methods
    setIsSubmitting(true);
    try {
      const order = await placeOrder({
        fio,
        phone: fullPhone,
        delivery: deliveryString,
        city: orderCity,
        paymentMethod,
        notes
      });

      setPlacedOrder(order);
    } catch (err) {
      console.error(err);
      showToast("Помилка при створенні замовлення", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult: {
    transactionId: string;
    provider: string;
    paidAt: string;
    cardMask?: string;
  }) => {
    if (!placedOrder) return;
    setIsSubmitting(true);
    try {
      const extraNotes = `${placedOrder.notes ? placedOrder.notes + ' · ' : ''}Оплата: ${paymentResult.provider} (Транзакція: ${paymentResult.transactionId}, ${paymentResult.paidAt})`;
      editOrder(placedOrder.id, {
        isPaid: true,
        status: (placedOrder.status === 'Створено' || placedOrder.status === 'Оплачено') ? 'Збирається' : placedOrder.status,
        paidAt: paymentResult.paidAt,
        paymentTransactionId: paymentResult.transactionId,
        paymentProvider: paymentResult.provider,
        notes: extraNotes
      });
      setPlacedOrder({
        ...placedOrder,
        isPaid: true,
        notes: extraNotes
      });
      showToast('Оплату успішно зафіксовано!', 'success');
    } catch (err) {
      console.error('Order update error after payment:', err);
      showToast('Помилка оновлення статусу оплати', 'error');
    } finally {
      setIsSubmitting(false);
      setIsOnlinePaymentModalOpen(false);
    }
  };

  const handleClose = () => {
    setIsCheckoutModalOpen(false);
    setPlacedOrder(null);
    setIsOnlinePaymentModalOpen(false);
    setPendingOrderPayload(null);
  };

  const filteredWarehouses = warehouses.filter(w => 
    !warehouseSearch || 
    w.name.toLowerCase().includes(warehouseSearch.toLowerCase()) || 
    w.number.includes(warehouseSearch)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-2xl border border-slate-200">
          
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold font-display uppercase tracking-wider">
                {placedOrder ? "Замовлення оформлено!" : "Оформлення замовлення"}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Placed Order Success Screen */}
          {placedOrder ? (
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-2xl font-black font-display text-slate-900 mb-2">
                  Дякуємо за ваше замовлення!
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Номер вашого замовлення: <span className="font-bold text-red-600 font-mono">№{placedOrder.id}</span>.
                  Наш менеджер зв'яжеться з вами за номером <b className="text-slate-900">{placedOrder.phone}</b> для підтвердження та відправки.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left max-w-md mx-auto text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Одержувач:</span>
                  <span className="font-semibold text-slate-900">{placedOrder.fio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Доставка:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[240px] truncate">{placedOrder.delivery}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Оплата:</span>
                  <span className="font-semibold text-slate-900">
                    {placedOrder.isPaid 
                      ? '💳 Онлайн-оплата (✓ Оплачено)' 
                      : placedOrder.paymentMethod === 'card_online' 
                      ? '💳 Онлайн-картка / Apple Pay (Очікує оплати)' 
                      : placedOrder.paymentMethod === 'bank_invoice' 
                      ? '📄 Рахунок IBAN (Очікує оплати)' 
                      : '💵 Післяплата (при отриманні)'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Сума замовлення:</span>
                  <span className="font-black text-emerald-600 tabular-nums text-sm">{placedOrder.total.toFixed(2)} грн</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {placedOrder.paymentMethod === 'card_online' && !placedOrder.isPaid && (
                  <button
                    onClick={() => setIsOnlinePaymentModalOpen(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Оплатити зараз ({placedOrder.total.toFixed(2)} грн)</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleClose();
                    setActiveView('account');
                  }}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Переглянути в кабінеті
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Продовжити покупки
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 max-h-[85vh] overflow-y-auto">
              
              {/* Step 1: Customer Contact */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Контактні дані покупця</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Прізвище та Ім'я одержувача *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="напр., Петро Іваненко"
                      value={fio}
                      onChange={(e) => setFio(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Номер телефону *</span>
                      <span className="text-[11px] font-semibold text-red-600">Приклад: +380 (67)...</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+380 (67) 000-00-00"
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 outline-none transition-all font-mono tracking-wider ${
                        phoneError 
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20' 
                          : 'border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20'
                      }`}
                    />

                    {/* Quick Operator selector */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[10px] text-slate-500">
                      <span className="text-slate-400">Код:</span>
                      {UKRAINIAN_OPERATOR_CODES.slice(0, 5).map((op) => (
                        <button
                          key={op.code}
                          type="button"
                          onClick={() => handleSetOperatorCode(op.code)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded text-slate-700 font-mono font-semibold transition-colors border border-slate-200"
                          title={`${op.name} (${op.code})`}
                        >
                          {op.code}
                        </button>
                      ))}
                    </div>

                    {phoneError && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{phoneError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery Method with Smart Nova Poshta & Ukrposhta */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Спосіб доставки</span>
                  </h4>
                  {isFreeShipping && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Безкоштовна доставка від 3000 грн!
                    </span>
                  )}
                </div>

                {/* Delivery Option Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('novaposhta')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      deliveryType === 'novaposhta'
                        ? 'border-red-600 bg-red-50/50 text-red-950 font-bold ring-2 ring-red-600/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                    }`}
                  >
                    <Truck className="w-4 h-4 mx-auto mb-1 text-red-600" />
                    <span className="text-xs block">Нова Пошта</span>
                    <span className="text-[10px] text-slate-400 font-normal">Відділення / Поштомат</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('ukrposhta')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      deliveryType === 'ukrposhta'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold ring-2 ring-amber-600/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                    }`}
                  >
                    <div className="w-4 h-4 mx-auto mb-1 rounded bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">
                      УП
                    </div>
                    <span className="text-xs block">Укрпошта</span>
                    <span className="text-[10px] text-slate-400 font-normal">По всій Україні</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      deliveryType === 'pickup'
                        ? 'border-red-600 bg-red-50/50 text-red-950 font-bold ring-2 ring-red-600/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-red-600" />
                    <span className="text-xs block">Самовивіз</span>
                    <span className="text-[10px] text-slate-400 font-normal">с-ще. Оратів</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('courier')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      deliveryType === 'courier'
                        ? 'border-red-600 bg-red-50/50 text-red-950 font-bold ring-2 ring-red-600/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                    }`}
                  >
                    <Truck className="w-4 h-4 mx-auto mb-1 text-slate-700" />
                    <span className="text-xs block">Кур'єр</span>
                    <span className="text-[10px] text-slate-400 font-normal">До дверей</span>
                  </button>
                </div>

                {/* NOVA POSHTA SMART DROPDOWNS */}
                {deliveryType === 'novaposhta' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                    
                    {/* Subtype switch: Branch or Postomat */}
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNpDeliverySubType('branch')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          npDeliverySubType === 'branch' 
                            ? 'bg-red-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        🏢 Відділення Нової Пошти
                      </button>
                      <button
                        type="button"
                        onClick={() => setNpDeliverySubType('postomat')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          npDeliverySubType === 'postomat' 
                            ? 'bg-red-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        📦 Поштомат (24/7)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                      
                      {/* 1. City Autocomplete Input */}
                      <div className="relative">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Місто або селище *</span>
                          <span className="text-[10px] text-slate-400 font-normal">введіть 2+ літери</span>
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="напр., Вінниця, Оратів, Київ..."
                            value={cityInput}
                            onFocus={() => setIsCityDropdownOpen(true)}
                            onChange={(e) => {
                              setCityInput(e.target.value);
                              setIsCityDropdownOpen(true);
                            }}
                            className="w-full px-3 py-2 pl-8 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-red-600"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>

                        {/* City Suggestions Dropdown */}
                        {isCityDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {isSearchingCities ? (
                              <div className="p-3 text-center text-xs text-slate-400">Пошук міст...</div>
                            ) : citySuggestions.length > 0 ? (
                              citySuggestions.map((c) => (
                                <button
                                  key={c.ref || c.name}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity(c);
                                    setCityInput(c.name);
                                    setIsCityDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 hover:text-red-950 transition-colors flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">{c.name}</span>
                                    <span className="text-[10px] text-slate-500 ml-1.5">
                                      {c.area} {c.region ? `(${c.region})` : ''}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">{c.settlementType}</span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-500">
                                <div>Місто не знайдено в базі</div>
                                <button
                                  type="button"
                                  onClick={() => setIsCityDropdownOpen(false)}
                                  className="mt-1 text-[11px] text-red-600 font-bold hover:underline"
                                >
                                  Використати як введено: "{cityInput}"
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. Warehouse or Postomat Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            {npDeliverySubType === 'postomat' ? 'Оберіть поштомат *' : 'Оберіть відділення *'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setUseManualWarehouse(!useManualWarehouse)}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            {useManualWarehouse ? 'Вибрати зі списку' : 'Ввести вручну'}
                          </button>
                        </div>

                        {useManualWarehouse ? (
                          <input
                            type="text"
                            required
                            placeholder="напр., Відділення №2 (вул. Центральна, 5)"
                            value={manualWarehouseText}
                            onChange={(e) => setManualWarehouseText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white outline-none"
                          />
                        ) : (
                          <div className="relative">
                            <select
                              required
                              value={selectedWarehouse?.ref || ''}
                              onChange={(e) => {
                                const found = warehouses.find(w => w.ref === e.target.value);
                                if (found) setSelectedWarehouse(found);
                              }}
                              disabled={isLoadingWarehouses}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-red-600 appearance-none pr-8 cursor-pointer disabled:bg-slate-100"
                            >
                              {isLoadingWarehouses ? (
                                <option>Завантаження відділень...</option>
                              ) : warehouses.length > 0 ? (
                                warehouses.map((w) => (
                                  <option key={w.ref} value={w.ref}>
                                    {w.name}
                                  </option>
                                ))
                              ) : (
                                <option value="">Відділення №1 (за замовчуванням)</option>
                              )}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        )}
                      </div>

                    </div>

                    {selectedWarehouse && !useManualWarehouse && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <span><b>Обрано:</b> {selectedWarehouse.name}</span>
                        {selectedWarehouse.maxWeightKg && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            до {selectedWarehouse.maxWeightKg} кг
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* UKRPOSHTA AUTOMATED FINDER & FIELDS */}
                {deliveryType === 'ukrposhta' && (
                  <div className="bg-gradient-to-b from-amber-50/70 to-yellow-50/40 p-4 sm:p-5 rounded-2xl border border-amber-300/80 shadow-2xs space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          УП
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <span>Укрпошта (Експрес / Стандарт)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-semibold">
                              По всій Україні
                            </span>
                          </h4>
                          <p className="text-[11px] text-amber-800/80">
                            Автоматичний підбір відділення за 5-значним індексом або назвою міста/села
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-amber-900 font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
                        {isFreeShipping ? 'Доставка: Безкоштовно' : 'Тариф: від 35 грн'}
                      </div>
                    </div>

                    {/* Interactive Autocomplete Search */}
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                        <span>Швидкий пошук відділення або індексу:</span>
                        <span className="text-[10px] text-amber-700 font-normal">Почніть вводити індекс або назву села/міста</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="напр., 22600 або Оратів, Вінниця, Київ, Чагів..."
                          value={ukrposhtaSearch}
                          onFocus={() => setShowUkrposhtaDropdown(true)}
                          onChange={(e) => {
                            setUkrposhtaSearch(e.target.value);
                            setShowUkrposhtaDropdown(true);
                          }}
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-amber-300 text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
                        />
                        <Search className="w-4 h-4 text-amber-600 absolute left-3 top-3 pointer-events-none" />

                        {isSearchingUkrposhta ? (
                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin absolute right-3 top-3" />
                        ) : ukrposhtaSearch ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUkrposhtaSearch('');
                              setShowUkrposhtaDropdown(false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-2.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>

                      {/* Dropdown suggestions */}
                      {showUkrposhtaDropdown && ukrposhtaOfficesList.length > 0 && (
                        <>
                          <div 
                            className="fixed inset-0 z-20" 
                            onClick={() => setShowUkrposhtaDropdown(false)} 
                          />
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-amber-200 z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                            <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center justify-between">
                              <span>Знайдено відділень: {ukrposhtaOfficesList.length}</span>
                              <span>Натисніть для автозаповнення</span>
                            </div>
                            {ukrposhtaOfficesList.map((office) => (
                              <button
                                key={office.postcode + office.address}
                                type="button"
                                onClick={() => handleSelectUkrposhtaOffice(office)}
                                className="w-full text-left p-2.5 sm:p-3 hover:bg-amber-50/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
                              >
                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-mono font-bold text-[11px] shrink-0 mt-0.5">
                                  {office.postcode}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900 group-hover:text-amber-900">
                                      {office.city}
                                    </span>
                                    {office.district && (
                                      <span className="text-[10px] text-slate-500">
                                        ({office.district}, {office.region})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-600 truncate mt-0.5">
                                    <b>{office.name}:</b> {office.address}
                                  </div>
                                  {office.workHours && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {office.workHours}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick Suggestions Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-amber-800/80 font-medium">Швидкий вибір:</span>
                      {[
                        { code: '22600', name: 'Оратів' },
                        { code: '21050', name: 'Вінниця (Головпоштамт)' },
                        { code: '22700', name: 'Іллінці' },
                        { code: '22500', name: 'Липовець' },
                        { code: '01001', name: 'Київ' },
                        { code: '79000', name: 'Львів' }
                      ].map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            const found = getUkrposhtaByPostcode(item.code);
                            if (found) handleSelectUkrposhtaOffice(found);
                          }}
                          className="px-2 py-0.5 bg-amber-100/80 hover:bg-amber-200 text-amber-900 rounded-md font-mono text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          {item.code} ({item.name})
                        </button>
                      ))}
                    </div>

                    {/* Confirmed Selection Banner */}
                    {selectedUkrposhtaOffice && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <b className="text-emerald-900">Відділення обрано:</b>{' '}
                          <span className="font-mono font-bold">[{selectedUkrposhtaOffice.postcode}]</span> {selectedUkrposhtaOffice.city}, {selectedUkrposhtaOffice.name} ({selectedUkrposhtaOffice.address})
                          {selectedUkrposhtaOffice.workHours && (
                            <div className="text-[10px] text-emerald-700 mt-0.5 font-normal">
                              Графік роботи: {selectedUkrposhtaOffice.workHours}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detailed Inputs (Auto-filled or editable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Поштовий індекс (5 цифр) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="22600"
                          value={upIndex}
                          onChange={(e) => handleUkrposhtaIndexInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none font-mono font-bold focus:border-amber-500 shadow-2xs"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5 block">Введіть 5 цифр для автопідбору</span>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Населений пункт (місто / село) та область *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="напр., смт Оратів, Вінницька обл."
                          value={upCity}
                          onChange={(e) => setUpCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Номер відділення Укрпошти або адреса *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="напр., ВПЗ Оратів (вул. Героїв Майдану, 78) або адреса для доставки"
                        value={upAddress}
                        onChange={(e) => setUpAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:border-amber-500 shadow-2xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* PICKUP INFO */}
                {deliveryType === 'pickup' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      <span>Магазин сантехніки та електротоварів «ISKRA»</span>
                    </div>
                    <div>Вінницька обл., {siteSettings.city || 'с-ще. Оратів'}, {siteSettings.address || 'вул. Котляревського, 7'}.</div>
                    <div className="text-slate-500 text-[11px]">Графік: Пн-Пт 08:00–18:00, Сб 08:00–15:00. Самовивіз безкоштовний.</div>
                  </div>
                )}

                {/* COURIER */}
                {deliveryType === 'courier' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Адреса доставки кур'єром (місто, вулиця, будинок, квартира) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="напр., с-ще. Оратів, вул. Центральна, 15"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Step 3: Payment Method (Online Apple Pay / Google Pay / WayForPay / Monobank) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Спосіб оплати</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  {/* Card Online / Apple Pay */}
                  <label className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    paymentMethod === 'card_online' 
                      ? 'border-emerald-600 bg-emerald-50/50 font-bold text-emerald-950 ring-2 ring-emerald-600/10' 
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'card_online'}
                          onChange={() => setPaymentMethod('card_online')}
                          className="text-emerald-600"
                        />
                        <span className="text-xs font-bold">Оплата карткою</span>
                      </div>
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal pl-5">
                      Apple Pay, Google Pay, Visa / Mastercard без комісії
                    </div>
                  </label>

                  {/* Cash on delivery */}
                  <label className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cash_on_delivery' 
                      ? 'border-red-600 bg-red-50/50 font-bold text-red-950 ring-2 ring-red-600/10' 
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'cash_on_delivery'}
                          onChange={() => setPaymentMethod('cash_on_delivery')}
                          className="text-red-600"
                        />
                        <span className="text-xs font-bold">Післяплата</span>
                      </div>
                      <Banknote className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal pl-5">
                      Оплата готівкою або карткою при отриманні на пошті
                    </div>
                  </label>

                  {/* Bank invoice IBAN */}
                  <label className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    paymentMethod === 'bank_invoice' 
                      ? 'border-slate-800 bg-slate-100 font-bold text-slate-900 ring-2 ring-slate-800/10' 
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'bank_invoice'}
                          onChange={() => setPaymentMethod('bank_invoice')}
                          className="text-slate-800"
                        />
                        <span className="text-xs font-bold">Рахунок IBAN</span>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal pl-5">
                      Для підприємств та ФОП за безготівковим розрахунком
                    </div>
                  </label>
                </div>

                {/* Instant Online Payment Badges Banner */}
                {paymentMethod === 'card_online' && (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Захищений шлюз (<b>{siteSettings.paymentGateway?.toUpperCase() || 'WAYFORPAY / MONO'}</b>) з 3D-Secure 2.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold font-mono text-[10px]">
                      <span className="bg-white px-1.5 py-0.5 rounded shadow-2xs">Apple Pay</span>
                      <span className="bg-white px-1.5 py-0.5 rounded shadow-2xs">G Pay</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Comment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Коментар або примітка до замовлення (необов'язково)
                </label>
                <textarea
                  rows={2}
                  placeholder="Додаткові побажання щодо замовлення чи доставки..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none"
                />
              </div>

              {/* Summary and Submit */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">До сплати:</div>
                  <div className="text-xl font-black font-display text-slate-950 tabular-nums">
                    {discountedCartSum.toFixed(2)} грн
                  </div>
                  {isFreeShipping && (
                    <div className="text-[10px] text-emerald-600 font-bold">
                      + Безкоштовна доставка
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isProcessingPayment}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:bg-slate-300"
                >
                  {isSubmitting || isProcessingPayment ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Обробка платежу...</span>
                    </>
                  ) : paymentMethod === 'card_online' ? (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Оплатити онлайн {discountedCartSum.toFixed(0)} грн</span>
                    </>
                  ) : (
                    <>
                      <span>Підтвердити замовлення</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
