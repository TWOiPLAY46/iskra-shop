import React from 'react';
import { useStore } from '../context/StoreContext';
import { Phone, MapPin, Clock, ShieldCheck, Truck, Lock, Building2, RotateCcw, Mail, FileText } from 'lucide-react';

export const Footer: React.FC = () => {
  const { siteSettings, headerDesign, setActiveView } = useStore();

  const handleNavigate = (view: 'store' | 'about' | 'returns' | 'account' | 'admin') => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const storePhone = siteSettings.fopPhone || siteSettings.phone || '+38 (096) 647-36-67';
  const storeEmail = siteSettings.email || siteSettings.fopEmail || 'iskra.shop.ua@gmail.com';

  return (
    <footer id="contacts-section" className="bg-slate-950 text-slate-400 border-t border-slate-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Col 1: Store Brand & Trust */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center bg-[#e5001e] text-white px-2.5 py-1.5 rounded-[6px] text-sm font-black tracking-tight shrink-0 shadow-xs">
                <span className="font-black text-white text-[15.5px] tracking-[0.05em] font-display leading-none transform scale-y-110 scale-x-105 inline-block uppercase select-none">
                  {headerDesign.logoBadge || 'ISKRA'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight font-display leading-tight uppercase">
                  {headerDesign.logoText || 'МАГАЗИН'}
                </span>
                <span className="text-[10px] font-medium text-slate-400 tracking-tight leading-tight">
                  {headerDesign.logoSubtitle || 'Магазин надійних рішень'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {headerDesign.footerDesc || 'Спеціалізований інтернет-магазин та точка продажу інверторів, акумуляторів, сонячного, електромонтажного та сантехнічного обладнання.'}
            </p>

            <div className="pt-1 text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{headerDesign.footerTrust1 || 'Доставка Новою Поштою по всій Україні'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{headerDesign.footerTrust2 || 'Офіційна заводська гарантія (12–60 міс.)'}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Customer Information & Legal */}
          <div className="space-y-3 text-xs">
            <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider mb-3">
              Інформація та сервіс
            </h4>

            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => handleNavigate('about')}
                  className="flex items-center gap-2 text-slate-300 hover:text-red-400 transition-colors cursor-pointer text-left"
                >
                  <Building2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-semibold text-white">Про нас та реквізити ФОП</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavigate('returns')}
                  className="flex items-center gap-2 text-slate-300 hover:text-red-400 transition-colors cursor-pointer text-left"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-emerald-400">Повернення та обмін (14 днів)</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavigate('about')}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Інформація про продавця та оподаткування</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavigate('about')}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-left"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Гарантійні зобов'язання</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavigate('account')}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-left block pt-1"
                >
                  Особистий кабінет клієнта
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contacts & Schedule */}
          <div className="space-y-3 text-xs">
            <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider mb-3">
              Контакти магазину
            </h4>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <b className="text-slate-200">Адреса магазину / Самовивіз:</b><br />
                {siteSettings.city}, {siteSettings.address}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <b className="text-slate-200">Телефон для замовлень:</b><br />
                <a href={`tel:${storePhone.replace(/[^0-9+]/g, '')}`} className="text-red-400 hover:text-red-300 font-bold font-mono">
                  {storePhone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <b className="text-slate-200">E-mail:</b><br />
                <a href={`mailto:${storeEmail}`} className="text-slate-300 hover:text-red-400 font-mono">
                  {storeEmail}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <b className="text-slate-200">Графік роботи:</b><br />
                {siteSettings.workHours}
              </div>
            </div>
          </div>

          {/* Col 4: Map Box */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 h-52 relative group">
            <iframe
              title="Розташування магазину ISKRA (вул. Котляревського, 7, Оратів, Вінницька область, 22601)"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${siteSettings.address || 'вул. Котляревського, 7'}, ${siteSettings.city || 'с-ще. Оратів'}, Вінницька область, 22601`)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
              className="w-full h-full border-0 filter grayscale contrast-125 opacity-80 hover:opacity-100 hover:filter-none transition-all duration-300"
              loading="lazy"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${siteSettings.address || 'вул. Котляревського, 7'}, ${siteSettings.city || 'с-ще. Оратів'}, Вінницька область, 22601`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-slate-900/90 hover:bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 shadow-sm transition-all opacity-90 hover:opacity-100 flex items-center gap-1"
            >
              <MapPin className="w-3 h-3 text-red-400 group-hover:text-white" />
              <span>Маршрут на карті</span>
            </a>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Legal links & Admin Login */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <p>© {new Date().getFullYear()} Магазин «ISKRA» ({siteSettings.fopName || 'ФОП Тарасова Ірина Анатоліївна'}). Всі права захищені.</p>
            <span className="hidden sm:inline text-slate-700">|</span>
            <button 
              onClick={() => handleNavigate('about')} 
              className="hover:text-slate-300 transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Реквізити
            </button>
            <button 
              onClick={() => handleNavigate('returns')} 
              className="hover:text-slate-300 transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Повернення (14 днів)
            </button>
          </div>

          <button
            onClick={() => handleNavigate('admin')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
            title="Вхід для персоналу"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Панель керування</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
