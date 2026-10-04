import React from 'react';
import { useStore } from '../context/StoreContext';
import { Truck, ShieldCheck, PhoneCall, CheckCircle2, ArrowRight, Flame } from 'lucide-react';
import { ASSET_IMAGES } from '../utils/assetImages';

export const Hero: React.FC = () => {
  const { headerDesign, siteSettings } = useStore();

  const scrollToHits = () => {
    const el = document.getElementById('hits-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to filter out garbage or hex color leftovers like 'ffffffff' or 'ffffff'
  const isGarbage = (val?: string) => {
    if (!val) return true;
    const trimmed = val.trim();
    return /^#?[fF0-9]{6,8}$/i.test(trimmed) || /^f+$/i.test(trimmed);
  };

  const heroBadge = !isGarbage(headerDesign.heroBadge)
    ? headerDesign.heroBadge
    : "ІНТЕРНЕТ-МАГАЗИН";

  const rawHeroCity = !isGarbage(headerDesign.heroCity)
    ? headerDesign.heroCity
    : (siteSettings.city ? `${siteSettings.city}, Вінницька обл.` : "с-ще. Оратів, Вінницька обл.");

  const heroCity = rawHeroCity.replace(/смт\.\s*Оратів/g, 'с-ще. Оратів').replace(/с\.\s*Оратів/g, 'с-ще. Оратів');

  return (
    <div className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
      {/* Background Photography with Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={ASSET_IMAGES.hero}
          alt="Магазин сантехніки та електротоварів ISKRA"
          className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transform duration-1000 ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/70" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-24">
        <div className="max-w-2xl">
          
          {/* Quiet Trust Kicker */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 mb-4 tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{heroBadge}</span>
            {heroCity && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 normal-case">{heroCity}</span>
              </>
            )}
          </div>

          {/* Headline with Text Balance */}
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.15] mb-4 sm:mb-5 [text-wrap:balance]">
            {headerDesign.heroTitle || "Надійна Сантехніка та Електротовари"}
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8 max-w-xl">
            {headerDesign.heroDesc || 
              "Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома."}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-10">
            <button
              onClick={scrollToHits}
              className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Flame className="w-4 h-4 fill-white" />
              <span>Переглянути хіти продажу</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={`tel:${siteSettings.phone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 font-semibold text-sm px-5 py-3.5 rounded-xl backdrop-blur-sm transition-all"
            >
              <PhoneCall className="w-4 h-4 text-red-400" />
              <span>{siteSettings.phone}</span>
            </a>
          </div>

        </div>

        {/* 3 Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white mb-0.5">Швидка відправка по Україні</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Нова Пошта у відділення або поштомати. Самовивіз з нашого магазину в Оратові.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white mb-0.5">Сертифіковані матеріали</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Тільки оригінальна продукція з гарантією. Відповідність ДСТУ та нормам безпеки.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white mb-0.5">Бонуси для майстрів</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Накопичувальні знижки та кешбек до кабінету на кожне наступне замовлення.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
