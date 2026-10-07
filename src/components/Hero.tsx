import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Truck, 
  ShieldCheck, 
  PhoneCall, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Sparkles, 
  Package, 
  Clock, 
  Star, 
  Droplets, 
  Zap, 
  Wrench, 
  Home,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Eye,
  Check,
  Pause,
  Play
} from 'lucide-react';
import { ASSET_IMAGES, getSafeImageUrl } from '../utils/assetImages';
import { getProductBrand } from '../utils/brandHelper';

export const Hero: React.FC = () => {
  const { 
    headerDesign, 
    siteSettings, 
    setActiveCategory,
    selectCategoryLeaf,
    products,
    setQuickViewProduct,
    addToCart
  } = useStore();

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightAdded, setSpotlightAdded] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(siteSettings.topFlagshipAutoplay ?? true);
  const [isHovered, setIsHovered] = useState(false);

  const flagshipTitle = siteSettings.topFlagshipTitle || "ТОП ФЛАГМАН КАТАЛОГУ";
  const flagshipInterval = Math.max(2, siteSettings.topFlagshipInterval || 4) * 1000;

  // Pick top flagship items with images
  const flagshipItems = useMemo(() => {
    if (siteSettings.topFlagshipProductIds && siteSettings.topFlagshipProductIds.length > 0) {
      const customList = siteSettings.topFlagshipProductIds
        .map(id => products.find(p => p.id === id))
        .filter((p): p is typeof products[0] => Boolean(p && p.stock > 0));
      if (customList.length > 0) {
        return customList;
      }
    }
    const list = products.filter(p => p.image && p.image.trim() !== '' && p.stock > 0);
    return list.slice(0, 6);
  }, [products, siteSettings.topFlagshipProductIds]);

  const currentFlagship = flagshipItems[spotlightIndex] || products[0];

  // Auto-switch flagship products with periodic interval
  useEffect(() => {
    if (flagshipItems.length <= 1 || !isAutoPlaying || isHovered) return;

    const intervalTimer = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % flagshipItems.length);
    }, flagshipInterval);

    return () => clearInterval(intervalTimer);
  }, [flagshipItems.length, isAutoPlaying, isHovered, flagshipInterval]);

  const handleNextSpotlight = () => {
    if (flagshipItems.length === 0) return;
    setSpotlightIndex((prev) => (prev + 1) % flagshipItems.length);
  };

  const handlePrevSpotlight = () => {
    if (flagshipItems.length === 0) return;
    setSpotlightIndex((prev) => (prev - 1 + flagshipItems.length) % flagshipItems.length);
  };

  const handleAddFlagshipToCart = () => {
    if (!currentFlagship || currentFlagship.stock <= 0) return;
    addToCart(currentFlagship, 1);
    setSpotlightAdded(true);
    setTimeout(() => setSpotlightAdded(false), 1500);
  };

  const scrollToHits = () => {
    const el = document.getElementById('hits-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCategoryShortcut = (cat: string) => {
    selectCategoryLeaf(cat);
    setTimeout(() => {
      const el = document.getElementById('catalog-products-section') || document.getElementById('subcategory-gallery-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
          className="w-full h-full object-cover object-center opacity-35 mix-blend-luminosity scale-105 transform duration-1000 ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/70" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-7">
            
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
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.1] mb-4 sm:mb-5 [text-wrap:balance]">
              {headerDesign.heroTitle || "Надійна Сантехніка та Електротовари"}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 sm:mb-8 max-w-xl">
              {headerDesign.heroDesc || 
                "Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома. Прямі поставки, заводська гарантія, приємні ціни."}
            </p>

            {/* Quick Category Shortcut Pills */}
            {(headerDesign.heroQuickNavEnabled ?? true) && (
              <div className="mb-8">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Швидкий перехід за напрямками:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryShortcut('Сантехніка та опалення')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-blue-500 text-xs font-bold transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span>Сантехніка</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryShortcut('Електротовари')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-amber-500 text-xs font-bold transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Електрика</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryShortcut('Інструменти та обладнання')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-emerald-500 text-xs font-bold transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Інструмент</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryShortcut('Господарчі товари')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-violet-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-violet-500 text-xs font-bold transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Home className="w-3.5 h-3.5 text-violet-400" />
                    <span>Господарчі товари</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              <button
                onClick={scrollToHits}
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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

          {/* Right Column: Flagship Spotlight & Live Metrics */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Flagship Showcase Interactive Card */}
            {(siteSettings.features?.topFlagshipEnabled ?? true) && currentFlagship && (
              <div 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="bg-gradient-to-b from-slate-900/90 via-[#0c1222] to-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden group"
              >
                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-amber-500/15 via-red-600/15 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                {/* Top Bar with Spotlight Kicker, Autoplay Status & Controls */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 font-mono">
                      {flagshipTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({spotlightIndex + 1}/{flagshipItems.length || 1})
                    </span>
                    {isAutoPlaying && !isHovered && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        АВТО
                      </span>
                    )}
                  </div>

                  {flagshipItems.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {/* Play/Pause Button */}
                      <button
                        type="button"
                        onClick={() => setIsAutoPlaying(prev => !prev)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                        title={isAutoPlaying ? "Призупинити автоперемикання" : "Увімкнути автоперемикання"}
                        aria-label="Автоперемикання"
                      >
                        {isAutoPlaying ? (
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrevSpotlight}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                        title="Попередній флагман"
                        aria-label="Попередній товар"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSpotlight}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                        title="Наступний флагман"
                        aria-label="Наступний товар"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Flagship Body: Image + Meta with Key transition */}
                <div key={currentFlagship.id} className="flex gap-4 items-center animate-in fade-in duration-300">
                  {/* Clean Studio Product Image Box */}
                  <div 
                    onClick={() => setQuickViewProduct(currentFlagship)}
                    className="relative w-36 h-36 sm:w-42 sm:h-42 rounded-2xl bg-white shadow-2xl p-2.5 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden group/img transition-all duration-300 border border-white/20 hover:border-amber-400"
                  >
                    <img
                      src={getSafeImageUrl(currentFlagship.image)}
                      alt={currentFlagship.name}
                      className="w-full h-full object-contain object-center transition-transform duration-300 ease-out group-hover/img:scale-[1.02] relative z-10"
                      onError={(e) => {
                        e.currentTarget.src = ASSET_IMAGES.faucetMixer;
                      }}
                      referrerPolicy="no-referrer"
                    />
                    {currentFlagship.badge && (
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white z-20 shadow-md ring-1 ring-white/20">
                        {currentFlagship.badge}
                      </span>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                      <span className="font-mono text-slate-400">{currentFlagship.sku}</span>
                      <span>·</span>
                      <span className="text-amber-300 font-bold">{getProductBrand(currentFlagship)}</span>
                    </div>

                    <h4 
                      onClick={() => setQuickViewProduct(currentFlagship)}
                      className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug cursor-pointer hover:text-amber-300 transition-colors mb-2"
                    >
                      {currentFlagship.name}
                    </h4>

                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-lg sm:text-xl font-black font-display text-white tabular-nums">
                        {currentFlagship.price}
                      </span>
                      <span className="text-xs font-bold text-red-400">грн</span>
                      <span className="text-[10px] text-emerald-400 ml-auto flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        В наявності ({currentFlagship.stock})
                      </span>
                    </div>

                    {/* Fast Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddFlagshipToCart}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                          spotlightAdded
                            ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                            : 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:brightness-110 text-white shadow-red-600/30'
                        }`}
                      >
                        {spotlightAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>В кошику</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Купити</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(currentFlagship)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700/80 flex items-center gap-1"
                        title="Швидкий перегляд деталей"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Огляд</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Indicators for Multi-Product Autoplay */}
                {flagshipItems.length > 1 && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/70">
                    <div className="flex items-center gap-1.5">
                      {flagshipItems.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSpotlightIndex(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === spotlightIndex 
                              ? 'w-6 bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 shadow-xs shadow-amber-400/50' 
                              : 'w-2 bg-slate-700/80 hover:bg-slate-500'
                          }`}
                          aria-label={`Перейти до товару ${idx + 1}`}
                          title={item.name}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isHovered ? 'Пауза при наведенні' : isAutoPlaying ? 'Автоперемикання: 3.8с' : 'Пауза'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 4 Live Store Metrics Pills */}
            {(headerDesign.heroStatsEnabled ?? true) && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span>{headerDesign.heroStat1Label || 'Каталог'}</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{headerDesign.heroStat1Value || '5,000+'}</div>
                  <div className="text-[9px] text-slate-400">{headerDesign.heroStat1Sub || 'позицій на складі'}</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{headerDesign.heroStat2Label || 'Відправка'}</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{headerDesign.heroStat2Value || '24/7'}</div>
                  <div className="text-[9px] text-slate-400">{headerDesign.heroStat2Sub || 'день у день'}</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{headerDesign.heroStat3Label || 'Оцінка'}</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{headerDesign.heroStat3Value || '4.9 / 5'}</div>
                  <div className="text-[9px] text-slate-400">{headerDesign.heroStat3Sub || 'довіра майстрів'}</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{headerDesign.heroStat4Label || 'Гарантія'}</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{headerDesign.heroStat4Value || '100%'}</div>
                  <div className="text-[9px] text-slate-400">{headerDesign.heroStat4Sub || 'офіційна'}</div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* 3 Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 mt-4">
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
