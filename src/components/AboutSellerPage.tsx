import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowLeft,
  Clock,
  Sparkles,
  Send,
  HelpCircle,
  Scale,
  RotateCcw
} from 'lucide-react';

export const AboutSellerPage: React.FC = () => {
  const { siteSettings, headerDesign, setActiveView, showToast } = useStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`Скопійовано: ${label}`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fopName = siteSettings.fopName || 'ФОП Тарасова Ірина Анатоліївна';
  const fopRegistrationAddress = siteSettings.fopRegistrationAddress || 'Україна, 22600, Вінницька обл., Вінницький р-н, с. Оратів, вул. Героїв Майдану, 14';
  const fopActualAddress = siteSettings.fopActualAddress || 'Україна, 22600, Вінницька обл., Вінницький р-н, с. Оратів, вул. Героїв Майдану, 14';
  const fopRnokpp = siteSettings.fopRnokpp || '3298412839';
  const fopEmail = siteSettings.fopEmail || 'iskra.shop.ua@gmail.com';
  const fopPhone = siteSettings.fopPhone || siteSettings.phone || '+38 (096) 647-36-67';
  const storeAddress = siteSettings.fopStoreAddress || `${siteSettings.city}, ${siteSettings.address}`;
  const websiteUrl = siteSettings.websiteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://iskra-shop.ua');
  const licenseInfo = siteSettings.licenseInfo || "Роздрібна торгівля побутовими електротоварами, сантехнікою, акумуляторами, інверторами та ручним/електроінструментом згідно зі ст. 7 Закону України «Про ліцензування видів господарської діяльності» не підлягає обов'язковому ліцензуванню. Вся реалізована продукція сертифікована в Україні та супроводжується офіційною гарантією виробника.";
  const taxInfo = siteSettings.taxInfo || "Фізична особа-підприємець (ФОП), платник єдиного податку 2-ї групи (без сплати ПДВ). Усі ціни, зазначені в каталозі на сайті, є кінцевими, актуальними та включають усі передбачені законодавством України податки і обов'язкові платежі.";
  const iban = siteSettings.companyIban || 'UA213052990000026007894561230';
  const bankName = siteSettings.companyBank || 'АТ КБ «ПриватБанк» (МФО 305299)';

  const aboutTitle = siteSettings.aboutTitle || 'Про магазин «ISKRA» та офіційні реквізити продавця';
  const aboutStory = siteSettings.aboutStory || `Магазин «ISKRA» засновано з метою надати українським родинам, монтажникам та енергетикам доступ до перевіреного та безпечного обладнання: від силових інверторів і LiFePO4 акумуляторів до якісної сантехніки, циркуляційних насосів, електромонтажної продукції та інструментів.\n\nМи не просто продаємо обладнання, а надаємо фахову технічну консультацію щодо правильного підбору потужності, сумісності вузлів та безпечного монтажу. Кожна одиниця товару перед відправкою проходить базовий огляд цілісності та комплектується всією необхідною документацією й гарантійними зобов'язаннями.`;

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
            <span>Повернутися до покупок</span>
          </button>

          <span className="text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-slate-200/80 text-slate-700">
            Офіційна інформація продавця
          </span>
        </div>

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              <span>Юридична інформація та реквізити</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
              {aboutTitle}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Магазин спеціалізованого електромонтажного, енергетичного та сантехнічного обладнання. 
              Ми працюємо прозоро, у повній відповідності до Законів України «Про електронну комерцію» та «Про захист прав споживачів».
            </p>
          </div>
        </div>

        {/* 1. Official FOP Legal Requisites Card (Section 1 requested by user) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                  Інформація про продавця (Реквізити ФОП)
                </h2>
                <p className="text-xs text-slate-500">
                  Повні реєстраційні та контактні дані для укладення електронних правочинів
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const fullText = `ФОП: ${fopName}\nРНОКПП (ІПН): ${fopRnokpp}\nМісце реєстрації: ${fopRegistrationAddress}\nФактичне місце: ${fopActualAddress}\nАдреса магазину: ${storeAddress}\nТелефон: ${fopPhone}\nE-mail: ${fopEmail}\nСайт: ${websiteUrl}\nIBAN: ${iban} (${bankName})`;
                handleCopy(fullText, 'Повні реквізити ФОП');
              }}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              {copiedField === 'Повні реквізити ФОП' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Скопіювати всі реквізити</span>
            </button>
          </div>

          {/* Grid of Key Requisites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* FOP Name */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  ФОП (ПІБ суб'єкта господарювання)
                </span>
                <span className="text-sm font-black text-slate-900 block font-display">
                  {fopName}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(fopName, 'ПІБ ФОП')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'ПІБ ФОП' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* RNOKPP / IPN */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  РНОКПП (ІПН платника податків)
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 block">
                  {fopRnokpp}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(fopRnokpp, 'РНОКПП')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'РНОКПП' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Registration Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Місце державної реєстрації ФОП
                </span>
                <span className="text-xs font-medium text-slate-800 block leading-relaxed">
                  {fopRegistrationAddress}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(fopRegistrationAddress, 'Місце реєстрації')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'Місце реєстрації' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Actual Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Фактичне місце проживання / діяльності
                </span>
                <span className="text-xs font-medium text-slate-800 block leading-relaxed">
                  {fopActualAddress}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(fopActualAddress, 'Фактичне місце проживання')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'Фактичне місце проживання' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Store Physical Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Адреса фізичного магазину (Самовивіз)
                </span>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  {storeAddress}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(storeAddress, 'Адреса магазину')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'Адреса магазину' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Website Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Офіційна адреса сайту (Домен)
                </span>
                <span className="text-xs font-mono font-bold text-red-600 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {websiteUrl}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(websiteUrl, 'Адреса сайту')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'Адреса сайту' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Email */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Електронна пошта для звернень та замовлень
                </span>
                <a href={`mailto:${fopEmail}`} className="text-xs font-mono font-bold text-slate-900 hover:text-red-600 transition-colors block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  {fopEmail}
                </a>
              </div>
              <button 
                onClick={() => handleCopy(fopEmail, 'E-mail')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'E-mail' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Phone */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Контактний телефон
                </span>
                <a href={`tel:${fopPhone.replace(/[^0-9+]/g, '')}`} className="text-xs font-mono font-bold text-slate-900 hover:text-red-600 transition-colors block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  {fopPhone}
                </a>
              </div>
              <button 
                onClick={() => handleCopy(fopPhone, 'Телефон')}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Скопіювати"
              >
                {copiedField === 'Телефон' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

          </div>

          {/* IBAN Bank Details */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Офіційний банківський рахунок IBAN для безготівкової оплати</span>
              </div>
              <p className="text-sm sm:text-base font-mono font-black text-amber-300 tracking-wider">
                {iban}
              </p>
              <p className="text-xs text-slate-400">
                Банк: <b className="text-slate-200">{bankName}</b> · Одержувач: <b className="text-slate-200">{fopName}</b>
              </p>
            </div>

            <button
              onClick={() => handleCopy(iban, 'IBAN')}
              className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              {copiedField === 'IBAN' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Скопіювати IBAN</span>
            </button>
          </div>

          {/* Tax Info & License Info Accordion/Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Tax Info */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Інформація про оподаткування та ціни</span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed">
                {taxInfo}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Жодних прихованих комісій — ціна в чеку відповідає ціні на сайті</span>
              </div>
            </div>

            {/* License Info */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Інформація про ліцензії та сертифікацію</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                {licenseInfo}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Офіційна заводська гарантія на все обладнання (12–60 міс.)</span>
              </div>
            </div>

          </div>

        </div>

        {/* 2. Store Mission, Story & Advantages */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                Про магазин надійних рішень «ISKRA»
              </h2>
              <p className="text-xs text-slate-500">
                Спеціалізований постачальник обладнання для приватних клієнтів, майстрів та підприємств
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-4">
            {aboutStory.split('\n\n').map((paragraph, pIdx) => (
              <p key={`p-${pIdx}`}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>100% Нова продукція</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Тільки оригінальне обладнання з заводським маркуванням і пломбами.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>Швидка відправка</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Товари в наявності на власному складі відправляються щодня Новою Поштою.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-red-500" />
                <span>Захист споживача</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                14 днів на повернення/обмін відповідно до чинного законодавства України.
              </p>
            </div>
          </div>

          {/* Quick Returns Navigation Banner */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 text-white rounded-xl shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900">
                  Потрібно повернути або обміняти товар?
                </h4>
                <p className="text-xs text-slate-600">
                  Ознайомтеся з покроковими правилами повернення протягом 14 днів або заповніть онлайн-заявку.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveView('returns');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span>Правила повернення та обміну</span>
            </button>
          </div>
        </div>

        {/* 3. Work Schedule & Map Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">
                Графік роботи та точка самовивозу
              </h2>
              <p className="text-xs text-slate-500">
                Завітайте до нашого магазину або замовляйте доставку онлайн
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <b className="text-slate-900 text-sm block">Години прийому та обробки замовлень:</b>
                  <span className="text-slate-600 mt-1 block">{siteSettings.workHours}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Замовлення через кошик сайту приймаються цілодобово 24/7.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <b className="text-slate-900 text-sm block">Адреса магазину:</b>
                  <span className="text-slate-600 mt-1 block">{storeAddress}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href={`tel:${fopPhone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Зателефонувати менеджеру</span>
                </a>

                {siteSettings.telegram && (
                  <a
                    href={`https://t.me/${siteSettings.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Написати в Telegram</span>
                  </a>
                )}
              </div>
            </div>

            {/* Interactive Embedded Map */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-56 relative shadow-inner">
              <iframe
                title="Розташування магазину ISKRA"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2618.5!2d29.54!3d49.23!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zT3JhdGl2!5e0!3m2!1suk!2sua!4v1650000000000!5m2!1suk!2sua"
                className="w-full h-full border-0 filter contrast-105"
                loading="lazy"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
