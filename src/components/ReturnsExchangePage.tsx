import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  RotateCcw, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Truck, 
  CreditCard, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  FileText, 
  HelpCircle,
  ChevronRight,
  Send,
  Sparkles,
  Shield,
  Check
} from 'lucide-react';
import { ReturnRequest } from '../types/store';

export const ReturnsExchangePage: React.FC = () => {
  const { siteSettings, setActiveView, showToast, addReturnRequest, currentClient, currentClientPhone } = useStore();
  
  // Quick return request form state
  const [orderNumber, setOrderNumber] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(currentClientPhone || '');
  const [buyerName, setBuyerName] = useState(currentClient?.name || '');
  const [reason, setReason] = useState<ReturnRequest['reason']>('not_fit');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmitReturnForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerPhone || buyerPhone.trim().length < 9) {
      showToast('Будь ласка, вкажіть контактний номер телефону', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await addReturnRequest({
        orderNumber,
        buyerPhone,
        buyerName,
        reason,
        comment
      });
      if (ok) {
        setFormSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const storePhone = siteSettings.returnsReceiverPhone || siteSettings.fopPhone || siteSettings.phone || '+38 (096) 647-36-67';
  const storeCity = siteSettings.returnsReceiverCity || siteSettings.city || 'с-ще. Оратів';
  const storeWarehouse = siteSettings.returnsReceiverWarehouse || 'Відділення Нової Пошти №1';
  const receiverName = siteSettings.returnsReceiverName || siteSettings.fopName || 'Тарасова Ірина Анатоліївна';
  const returnsDays = siteSettings.returnsDays || 14;
  const refundDays = siteSettings.returnsRefundDays || '1–3 робочих днів';
  const whoPaysGood = siteSettings.returnsWhoPaysGood || 'Послуги пересилання оплачує покупець за тарифами перевізника «Нова Пошта».';
  const whoPaysDefect = siteSettings.returnsWhoPaysDefect || 'Усі витрати на доставку в обидві сторони повністю оплачує магазин ISKRA.';
  const pageTitle = siteSettings.returnsTitle || 'Повернення та обмін товару в магазині «ISKRA»';
  const legalBasis = siteSettings.returnsLegalBasis || 'Ми цінуємо довіру кожного клієнта і суворо дотримуємося ст. 9 Закону України «Про захист прав споживачів» та Закону України «Про електронну комерцію». Процедура повернення є простою, зрозумілою та прозорою.';
  const warrantyInfo = siteSettings.returnsWarrantyInfo || 'Офіційна заводська гарантія від 12 до 60 місяців з безкоштовним сервісом.';
  const noCodNotice = siteSettings.returnsNoCodNotice || 'Зверніть увагу: відправлення приймаються без послуги «післяплата» (накладений платіж). Посилки з післяплатою не можуть бути забрані кур\'єром, оскільки товар спочатку повинен пройти перевірку цілісності та комплектації.';

  // Conditions
  const cond1 = siteSettings.returnsCondition1 || "Товар не був у вжитку, відсутні сліди експлуатації, монтажу чи підключення до мережі.";
  const cond2 = siteSettings.returnsCondition2 || "Збережено товарний вигляд, оригінальну заводську упаковку, ярлики, наклейки та пломби.";
  const cond3 = siteSettings.returnsCondition3 || "Збережено повну комплектацію (інструкції, кабелі, кріплення, перехідники, гарантійний талон).";
  const cond4 = siteSettings.returnsCondition4 || "Наявний розрахунковий документ (чек, накладна, номер замовлення або SMS/електронне підтвердження).";

  // Step 1-4
  const step1Title = siteSettings.returnsStep1Title || 'Звернення до нас';
  const step1Text = siteSettings.returnsStep1Text || `Зателефонуйте менеджеру за номером ${storePhone} або заповніть онлайн-форму внизу сторінки.`;
  const step2Title = siteSettings.returnsStep2Title || 'Підготовка товару';
  const step2Text = siteSettings.returnsStep2Text || 'Акуратно упакуйте товар у рідну коробку разом із комплектуючими, гарантійним талоном та чеком.';
  const step3Title = siteSettings.returnsStep3Title || 'Відправка перевізником';
  const step3Text = siteSettings.returnsStep3Text || 'Надішліть посилку «Новою Поштою» за вказаними реквізитами (без післяплати) та повідомте нам номер ТТН.';
  const step4Title = siteSettings.returnsStep4Title || 'Огляд і виплата';
  const step4Text = siteSettings.returnsStep4Text || `Після огляду товару протягом ${refundDays} ми повертаємо гроші на вашу картку/IBAN або відправляємо заміну.`;

  // Warranty 1-3
  const w1Title = siteSettings.returnsWarranty1Title || '1. Заміна на новий товар';
  const w1Text = siteSettings.returnsWarranty1Text || 'Якщо під час гарантійного строку виявлено істотний заводський брак, ми безкоштовно замінюємо виріб на абсолютно новий аналогічний товар.';
  const w2Title = siteSettings.returnsWarranty2Title || '2. Гарантійний ремонт';
  const w2Text = siteSettings.returnsWarranty2Text || 'Безкоштовне усунення дефектів в авторизованих сервісних центрах виробників (строк ремонту зазвичай до 14 днів).';
  const w3Title = siteSettings.returnsWarranty3Title || '3. Повне повернення коштів';
  const w3Text = siteSettings.returnsWarranty3Text || 'Якщо ремонт неможливий, а аналогічного товару немає в наявності, ми негайно повертаємо 100% сплаченої вартості товару.';

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 animate-in fade-in-50 duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb / Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveView('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2 transition-all hover:shadow-xs group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Повернутися до каталогу</span>
          </button>

          <span className="text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
            Захист споживача: {returnsDays} днів
          </span>
        </div>

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>Правила та умови</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
              {pageTitle}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {legalBasis}
            </p>
          </div>
        </div>

        {/* Key Quick Facts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg">
              {returnsDays}
            </div>
            <h3 className="text-sm font-bold text-slate-900">Термін повернення</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {returnsDays} календарних днів з моменту отримання посилки у відділенні або кур'єром.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Повернення коштів</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Протягом {refundDays} на банківську картку чи IBAN рахунок після огляду товару.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Хто платить доставку</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              При належній якості — покупець. При заводському браку — магазин ISKRA.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Гарантійні зобов'язання</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {warrantyInfo}
            </p>
          </div>

        </div>

        {/* 1. Conditions of return (Належна якість) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                1. Умови повернення товару належної якості
              </h2>
              <p className="text-xs text-slate-500">
                Якщо товар не підійшов за габаритами, кольором, формою чи технічними характеристиками
              </p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Покупець має право повернути або обміняти непродовольчий товар належної якості на аналогічний протягом <b>{returnsDays} днів</b> (не враховуючи дня купівлі), якщо дотримано таких обов'язкових умов:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-800">
                  {cond1}
                </span>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-800">
                  {cond2}
                </span>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-800">
                  {cond3}
                </span>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-800">
                  {cond4}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Step-by-Step Instructions: Як оформити повернення */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                2. Покроковий порядок оформлення повернення
              </h2>
              <p className="text-xs text-slate-500">
                Простий алгоритм дій у 4 кроки
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 relative">
              <span className="text-xs font-black text-red-600 uppercase tracking-wider block">Крок 1</span>
              <h4 className="text-sm font-bold text-slate-900">{step1Title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step1Text}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 relative">
              <span className="text-xs font-black text-red-600 uppercase tracking-wider block">Крок 2</span>
              <h4 className="text-sm font-bold text-slate-900">{step2Title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step2Text}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 relative">
              <span className="text-xs font-black text-red-600 uppercase tracking-wider block">Крок 3</span>
              <h4 className="text-sm font-bold text-slate-900">{step3Title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step3Text}
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 relative">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider block">Крок 4</span>
              <h4 className="text-sm font-bold text-slate-900">{step4Title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step4Text}
              </p>
            </div>

          </div>
        </div>

        {/* 3. Shipping Address & Cost Responsibility (Куди відправляти і хто платить) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Where to send */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Куди відправляти посилку</h3>
                <p className="text-xs text-slate-500">Реквізити для відправки Новою Поштою</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 font-mono">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-sans">Одержувач:</span>
                <span className="font-bold text-slate-900 font-sans">{receiverName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-sans">Телефон одержувача:</span>
                <a href={`tel:${storePhone.replace(/[^0-9+]/g, '')}`} className="font-bold text-slate-900 hover:text-red-600 transition-colors">
                  {storePhone}
                </a>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-sans">Місто/Населений пункт:</span>
                <span className="font-bold text-slate-900 font-sans">{storeCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Відділення «Нова Пошта»:</span>
                <span className="font-bold text-red-600 font-sans">{storeWarehouse}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ⚠️ {noCodNotice}
            </p>
          </div>

          {/* Who pays shipping */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Хто оплачує доставку</h3>
                <p className="text-xs text-slate-500">Розподіл витрат на логістику</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <b className="text-slate-900 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Повернення товару належної якості:
                </b>
                <p className="text-slate-600 leading-relaxed">
                  {whoPaysGood}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/70 space-y-1">
                <b className="text-emerald-900 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Заводський брак / помилка комплектації:
                </b>
                <p className="text-emerald-800 leading-relaxed">
                  {whoPaysDefect}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Грошові кошти повертаються на ту ж саму картку/рахунок, з якого здійснювалася оплата, або за вказаним у заяві IBAN.
              </span>
            </div>
          </div>

        </div>

        {/* 4. Goods of inadequate quality & Warranty cases (Неналежна якість та гарантія) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                4. Товари неналежної якості та гарантійне обслуговування
              </h2>
              <p className="text-xs text-slate-500">
                Захист від виробничих дефектів та гарантійний ремонт
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {w1Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {w1Text}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {w2Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {w2Text}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                {w3Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {w3Text}
              </p>
            </div>

          </div>
        </div>

        {/* 5. Online Return Request Form */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 inline-flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Швидке онлайн-повідомлення
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-display text-white">
              Бажаєте оформити повернення або обмін?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Залиште ваші дані, і наш менеджер зв'яжеться з вами протягом 15 хвилин для узгодження деталей
            </p>
          </div>

          {formSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Заявку успішно прийнято!</h3>
              <p className="text-xs text-emerald-200 max-w-md mx-auto">
                Менеджер магазину ISKRA зв'яжеться з вами за вказаним номером для підтвердження деталей повернення або надішле SMS з реквізитами.
              </p>
              <button
                onClick={() => {
                  setFormSubmitted(false);
                  setOrderNumber('');
                  setComment('');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer pt-2"
              >
                Подати іншу заявку
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReturnForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Номер замовлення або ТТН:
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Наприклад: #1042 або 204509..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ваш номер телефону: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+380 (__) ___-__-__"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Причина звернення:
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReturnRequest['reason'])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                  >
                    <option value="not_fit">Не підійшов розмір / колір / характеристики</option>
                    <option value="defect">Виявлено виробничий дефект (брак)</option>
                    <option value="wrong_item">Не відповідає замовленому (помилка складу)</option>
                    <option value="warranty">Гарантійне обслуговування</option>
                    <option value="other">Інша причина</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Додатковий коментар або опис (необов'язково):
                </label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Опишіть ситуацію детальніше..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-[11px] text-slate-400">
                  Натискаючи «Надіслати заявку», ви підтверджуєте згоду на обробку контактних даних для врегулювання повернення.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Надсилання...' : 'Надіслати заявку менеджеру'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
