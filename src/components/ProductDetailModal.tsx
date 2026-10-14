import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ShoppingCart, 
  ShoppingBag,
  Plus, 
  Minus, 
  Droplets, 
  Zap, 
  Check,
  CheckCircle2,
  Star,
  ShieldCheck,
  ZoomIn,
  Bell,
  Wrench,
  Home,
  Cog,
  Truck,
  RotateCcw,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';
import { Product } from '../types/store';
import { getProductBrand } from '../utils/brandHelper';
import { getSafeImageUrl } from '../utils/assetImages';
import { ProductReviewsSection } from './ProductReviewsSection';
import { getSmartRecommendedProducts } from '../utils/recommendationsHelper';
import { formatUnit, formatPriceUnit } from '../utils/unitFormatter';
import { enrichProductWithAI } from '../utils/aiEnricher';

export const ProductDetailModal: React.FC = () => {
  const { 
    quickViewProduct, 
    setQuickViewProduct, 
    addToCart, 
    products,
    siteSettings,
    siteTheme,
    showToast,
    openStockAlertModal,
    saveProduct
  } = useStore();

  const isPremium = siteTheme === 'premium';
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
    setImgError(false);
    setQty(1);
  }, [quickViewProduct?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else if (quickViewProduct) {
          setQuickViewProduct(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, quickViewProduct, setQuickViewProduct]);

  const isOutOfStock = quickViewProduct ? quickViewProduct.stock <= 0 : false;
  const lowThreshold = siteSettings?.features?.lowStockThreshold ?? 3;
  const isLowStock = !isOutOfStock && quickViewProduct ? quickViewProduct.stock <= lowThreshold : false;
  const showLowStockBadge = isLowStock && (siteSettings?.features?.showLowStockBadgeToBuyers ?? true);

  const cat = useMemo(() => {
    if (!quickViewProduct) return '';
    return ((quickViewProduct.category || '') + ' ' + (quickViewProduct.mainCategory || '')).toLowerCase();
  }, [quickViewProduct]);

  const isPlumbing = cat.includes('сантех') || cat.includes('радіатор') || cat.includes('змішувач') || cat.includes('труб') || cat.includes('фітинг') || cat.includes('унітаз') || cat.includes('опалення') || cat.includes('бойлер') || cat.includes('насос');
  const isTool = cat.includes('інструмент') || cat.includes('дриль') || cat.includes('шуруп') || cat.includes('перфоратор') || cat.includes('болгарк');
  const isHousehold = cat.includes('господар') || cat.includes('кріплен') || cat.includes('замок') || cat.includes('прибиран');
  const isOther = cat.includes('інш') || cat.includes('нерозподіл');

  // Smart related cross-sell accessories ("З цим часто купують")
  const frequentlyBoughtTogether = useMemo(() => {
    if (!quickViewProduct) return [];
    return getSmartRecommendedProducts(quickViewProduct, products, 4);
  }, [quickViewProduct, products]);

  if (!quickViewProduct) return null;

  const brand = getProductBrand(quickViewProduct);

  const handleBuy = () => {
    if (isOutOfStock) return;
    addToCart(quickViewProduct, qty);
    showToast(`«${quickViewProduct.name}» додано до кошика!`, 'success');
    setQuickViewProduct(null);
  };

  const handleAddRelated = (prod: Product) => {
    addToCart(prod, 1);
    setAddedItemIds((prev) => [...prev, prod.id]);
    showToast(`«${prod.name}» додано до замовлення`, 'success');
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== prod.id));
    }, 1500);
  };

  const handleGenerateAiDescription = async () => {
    if (!quickViewProduct) return;
    setIsAiGenerating(true);
    try {
      const enriched = await enrichProductWithAI({
        name: quickViewProduct.name,
        sku: quickViewProduct.sku,
        category: quickViewProduct.category,
        price: quickViewProduct.price,
      });

      const finalDesc = enriched.description || '';

      // Populate structured specifications table for the "Характеристики" tab
      const newSpecs: Record<string, string> = { ...(quickViewProduct.specs || {}) };
      if (enriched.specs && Array.isArray(enriched.specs)) {
        enriched.specs.forEach((s: any) => {
          if (s.key && s.value) {
            newSpecs[s.key] = s.value;
          }
        });
      }

      const updatedProd: Product = {
        ...quickViewProduct,
        desc: finalDesc,
        specs: newSpecs,
        mainCategory: enriched.mainCategory || quickViewProduct.mainCategory,
        category: enriched.category || quickViewProduct.category,
      };

      saveProduct(updatedProd);
      setQuickViewProduct(updatedProd);
      showToast('✨ Опис та характеристики успішно згенеровано через Gemini AI!', 'success');
    } catch (e: any) {
      showToast('Помилка генерації опису: ' + (e?.message || e), 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const modalImgUrl = getSafeImageUrl(
    quickViewProduct.image,
    `${quickViewProduct.name} ${quickViewProduct.category || ''} ${quickViewProduct.mainCategory || ''}`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className={`relative transform overflow-hidden rounded-[28px] sm:rounded-[32px] text-left shadow-2xl transition-all sm:my-8 w-full max-w-4xl border ${
          isPremium 
            ? 'bg-[#0f172a] text-white border-white/10 shadow-black/80' 
            : 'bg-white text-slate-900 border-slate-200/90 shadow-slate-900/20'
        }`}>
          
          {/* Header */}
          <div className={`px-5 sm:px-7 py-4 flex items-center justify-between border-b ${
            isPremium ? 'border-slate-800 bg-[#0c1222]' : 'border-slate-100 bg-slate-50/70'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                isPremium ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                Деталі товару
              </span>
              <div className={`text-xs truncate ${isPremium ? 'text-slate-300' : 'text-slate-700 font-semibold'}`}>
                <span>{quickViewProduct.mainCategory || 'Каталог'}</span>
                {quickViewProduct.category && (
                  <>
                    <span className="mx-1.5 opacity-60">/</span>
                    <span className={isPremium ? 'text-white font-bold' : 'text-black font-extrabold'}>{quickViewProduct.category}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setQuickViewProduct(null)}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                isPremium 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              aria-label="Закрити"
              title="Закрити"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-8 space-y-7">
            
            {/* Top Grid: Large Image Left, Product Details & Buy Box Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
              
              {/* Left Column (5 cols): Photo & Trust Badges */}
              <div className="md:col-span-5 flex flex-col gap-3.5">
                {/* Product Image Box */}
                <div 
                  onClick={() => {
                    if (!imgError && modalImgUrl) {
                      setIsZoomed(true);
                    }
                  }}
                  className={`aspect-square sm:aspect-[4/3] md:aspect-square w-full rounded-3xl flex items-center justify-center relative overflow-hidden group select-none transition-all p-3 sm:p-4 ${
                    isPremium 
                      ? 'bg-slate-900/60 border border-white/5' 
                      : 'bg-slate-50/80 border border-slate-200/70'
                  } ${!imgError && modalImgUrl ? 'cursor-zoom-in' : ''}`}
                  title={!imgError && modalImgUrl ? 'Натисніть для збільшення фото' : undefined}
                >
                  {!imgError && modalImgUrl ? (
                    <>
                      <img
                        src={modalImgUrl}
                        alt={quickViewProduct.name}
                        onError={() => setImgError(true)}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain object-center rounded-2xl transition-transform duration-300 ease-out group-hover:scale-105"
                      />

                      <div className="absolute bottom-3 right-3 bg-slate-900/85 text-white px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-md border border-white/10 z-20">
                        <ZoomIn className="w-3.5 h-3.5 text-red-400" />
                        <span>Збільшити</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      {isPlumbing ? (
                        <Droplets className="w-20 h-20 stroke-[1.5]" />
                      ) : isTool ? (
                        <Wrench className="w-20 h-20 stroke-[1.5]" />
                      ) : isHousehold ? (
                        <Home className="w-20 h-20 stroke-[1.5]" />
                      ) : isOther ? (
                        <Cog className="w-20 h-20 stroke-[1.5]" />
                      ) : (
                        <Zap className="w-20 h-20 stroke-[1.5]" />
                      )}
                    </div>
                  )}
                </div>

                {/* 3 Trust Assurance Features Block */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isPremium 
                    ? 'bg-slate-900/90 border-slate-800 shadow-md' 
                    : 'bg-slate-50/90 border-slate-200/90 shadow-xs'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className={`text-xs font-bold leading-tight ${
                        isPremium ? 'text-slate-100' : 'text-black'
                      }`}>
                        Відправка щодня Новою Поштою або самовивіз
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-red-600" />
                      </div>
                      <span className={`text-xs font-bold leading-tight ${
                        isPremium ? 'text-slate-100' : 'text-black'
                      }`}>
                        Офіційна гарантія та 100% перевірка якості
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className={`text-xs font-bold leading-tight ${
                        isPremium ? 'text-slate-100' : 'text-black'
                      }`}>
                        14 днів на повернення або обмін товару
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): Meta, Title, Price, Buy & Specs */}
              <div className="md:col-span-7 flex flex-col space-y-4">
                
                {/* Brand & SKU Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {brand && brand !== 'Інші виробники' && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${
                        isPremium 
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' 
                          : 'bg-red-50 border border-red-200/80 text-red-600 font-extrabold'
                      }`}>
                        {brand}
                      </span>
                    )}

                    {quickViewProduct.badge && (
                      <span className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg shadow-xs">
                        {quickViewProduct.badge}
                      </span>
                    )}
                  </div>

                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                    isPremium 
                      ? 'text-white bg-slate-800 border border-slate-700' 
                      : 'text-white bg-slate-900 border border-slate-800'
                  }`}>
                    АРТ: {quickViewProduct.sku}
                  </span>
                </div>

                {/* Product Title */}
                <h1 className={`text-lg sm:text-xl md:text-2xl font-bold leading-snug ${
                  isPremium ? 'text-white' : 'text-slate-950 font-display'
                }`}>
                  {quickViewProduct.name}
                </h1>

                {/* Rating & Stock Status */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                    isPremium 
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-900 font-bold'
                  }`}>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-extrabold ml-1">4.9</span>
                  </div>

                  <div className={isPremium ? 'text-slate-700' : 'text-slate-300'}>•</div>

                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-500 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Немає в наявності</span>
                    </span>
                  ) : showLowStockBadge ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${
                      isPremium 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-950'
                    }`}>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>Закінчується: лише {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}</span>
                    </span>
                  ) : (
                    <span className={`font-bold flex items-center gap-1.5 ${
                      isPremium ? 'text-emerald-400' : 'text-emerald-800'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>В наявності: {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}</span>
                    </span>
                  )}
                </div>

                {/* Price and Cart Purchase Card */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPremium 
                    ? 'bg-slate-900/90 border-slate-800' 
                    : 'bg-slate-50/90 border-slate-200/90'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className={`text-[11px] uppercase tracking-wider font-bold ${
                        isPremium ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        Ціна:
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-red-600 font-display tabular-nums leading-none mt-1">
                        {quickViewProduct.price}{' '}
                        <span className="text-lg font-bold text-red-600">грн</span>
                      </div>
                      <div className={`text-xs font-semibold mt-1 ${
                        isPremium ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {formatPriceUnit(quickViewProduct.unit)} • з ПДВ
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Stepper */}
                      {!isOutOfStock && (
                        <div className={`flex items-center rounded-xl px-2 py-1.5 border shadow-inner ${
                          isPremium ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                        }`}>
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isPremium ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            aria-label="Зменшити"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className={`w-8 text-center font-black text-sm font-mono ${
                            isPremium ? 'text-white' : 'text-slate-950'
                          }`}>
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(Math.min(quickViewProduct.stock || 99, qty + 1))}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isPremium ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            aria-label="Збільшити"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Buy Button */}
                      {isOutOfStock ? (
                        <button
                          type="button"
                          onClick={() => openStockAlertModal(quickViewProduct)}
                          className="px-5 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-500 hover:bg-amber-600 flex items-center gap-2 transition-all active:scale-95 shadow-md border border-amber-400 cursor-pointer"
                        >
                          <Bell className="w-4 h-4 stroke-[2.2]" />
                          <span>Повідомити</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleBuy}
                          className="px-6 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm text-white flex items-center gap-2 transition-all active:scale-95 shadow-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/30 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                          <span>Купити {qty > 1 ? `(${qty} шт)` : ''}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Description Section */}
                <div className="pt-2">
                  <div className={`flex items-center justify-between border-b pb-2 ${
                    isPremium ? 'border-slate-800' : 'border-slate-200/80'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-red-600 text-white shadow-xs`}>
                        Опис товару
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 space-y-4">
                    {(() => {
                      const rawDesc = quickViewProduct.desc || '';
                      const isPlaceholder = !rawDesc || 
                        rawDesc.includes('Товар з облікової програми УкрСклад') ||
                        rawDesc.startsWith('Товар з облікової програми');

                      if (isPlaceholder) {
                        return (
                          <div className="space-y-3">
                            <p className={`text-sm leading-relaxed ${isPremium ? 'text-white font-medium' : 'text-black font-semibold'}`}>
                              Офіційний сертифікований товар «{quickViewProduct.name}». Гарантія якості від виробника, надійні матеріали, перевірено перед відправкою. Підходить для професійного монтажу та щоденного домашнього використання.
                            </p>
                            {quickViewProduct.specs && Object.keys(quickViewProduct.specs).length > 0 && (
                              <div className="space-y-2 pt-2">
                                <div className={`pt-2 pb-1 border-b ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
                                  <h4 className={`text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                                    isPremium ? 'text-amber-400' : 'text-slate-900'
                                  }`}>
                                    ⚙️ Технічні характеристики
                                  </h4>
                                </div>
                                <div className="space-y-1">
                                  {Object.entries(quickViewProduct.specs).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-baseline gap-3 text-xs sm:text-sm py-1 border-b border-dashed border-slate-200/60">
                                      <span className={isPremium ? 'text-slate-400 font-medium' : 'text-slate-600 font-semibold'}>{k}:</span>
                                      <span className={`font-bold text-right ${isPremium ? 'text-white' : 'text-black'}`}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      const lines = rawDesc.split('\n');
                      const hasSections = lines.some((l) =>
                        ['Технічні характеристики', 'Переваги', 'Головні переваги'].some((s) => l.trim().startsWith(s))
                      );

                      if (!hasSections) {
                        return (
                          <div className="space-y-3">
                            <div className={`text-sm leading-relaxed whitespace-pre-line ${
                              isPremium ? 'text-white font-medium' : 'text-black font-semibold'
                            }`}>
                              {rawDesc}
                            </div>
                            {quickViewProduct.specs && Object.keys(quickViewProduct.specs).length > 0 && (
                              <div className="space-y-2 pt-2">
                                <div className={`pt-2 pb-1 border-b ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
                                  <h4 className={`text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                                    isPremium ? 'text-amber-400' : 'text-slate-900'
                                  }`}>
                                    ⚙️ Технічні характеристики
                                  </h4>
                                </div>
                                <div className="space-y-1">
                                  {Object.entries(quickViewProduct.specs).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-baseline gap-3 text-xs sm:text-sm py-1 border-b border-dashed border-slate-200/60">
                                      <span className={isPremium ? 'text-slate-400 font-medium' : 'text-slate-600 font-semibold'}>{k}:</span>
                                      <span className={`font-bold text-right ${isPremium ? 'text-white' : 'text-black'}`}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      let currentSection: 'intro' | 'specs' | 'features' = 'intro';

                      return (
                        <div className="space-y-3">
                          {lines.map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={idx} className="h-1.5" />;

                            if (trimmed === 'Технічні характеристики' || trimmed.startsWith('Технічні характеристики:')) {
                              currentSection = 'specs';
                              return (
                                <div key={idx} className={`pt-2.5 pb-1 border-b ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
                                  <h4 className={`text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                                    isPremium ? 'text-amber-400' : 'text-slate-900'
                                  }`}>
                                    ⚙️ {trimmed.replace(/:$/, '')}
                                  </h4>
                                </div>
                              );
                            }

                            if (trimmed === 'Переваги' || trimmed.startsWith('Переваги:') || trimmed.includes('Головні переваги')) {
                              currentSection = 'features';
                              return (
                                <div key={idx} className={`pt-2.5 pb-1 border-b ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
                                  <h4 className={`text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                                    isPremium ? 'text-emerald-400' : 'text-slate-900'
                                  }`}>
                                    ✨ {trimmed.replace(/:$/, '')}
                                  </h4>
                                </div>
                              );
                            }

                            if (currentSection === 'specs' && trimmed.includes(':')) {
                              const colonIdx = trimmed.indexOf(':');
                              const k = trimmed.substring(0, colonIdx).trim();
                              const v = trimmed.substring(colonIdx + 1).trim();
                              return (
                                <div key={idx} className="flex justify-between items-baseline gap-3 text-xs sm:text-sm py-0.5">
                                  <span className={isPremium ? 'text-slate-400 font-medium' : 'text-slate-600 font-semibold'}>
                                    {k}:
                                  </span>
                                  <span className={`font-bold text-right ${isPremium ? 'text-white' : 'text-black'}`}>
                                    {v}
                                  </span>
                                </div>
                              );
                            }

                            if (currentSection === 'features' && trimmed.includes(':')) {
                              const colonIdx = trimmed.indexOf(':');
                              const title = trimmed.substring(0, colonIdx).trim().replace(/^[•\-*🔥✨]\s*/, '');
                              const detail = trimmed.substring(colonIdx + 1).trim();
                              return (
                                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                                  <span className={`font-bold shrink-0 mt-0.5 ${isPremium ? 'text-emerald-400' : 'text-emerald-600'}`}>•</span>
                                  <div className={isPremium ? 'text-slate-200' : 'text-black font-semibold'}>
                                    <span className={`font-bold ${isPremium ? 'text-white' : 'text-slate-950'}`}>{title}:</span>{' '}
                                    <span className={isPremium ? 'text-slate-300 font-medium' : 'text-slate-800 font-medium'}>{detail}</span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <p key={idx} className={`text-sm leading-relaxed ${
                                isPremium ? 'text-slate-200 font-medium' : 'text-black font-semibold'
                              }`}>
                                {trimmed}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* AI Description Generation Quick Button */}
                    <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                      isPremium ? 'border-slate-800' : 'border-slate-200/80'
                    }`}>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Бажаєте розгорнутий опис з характеристиками?
                      </div>
                      <button
                        type="button"
                        disabled={isAiGenerating}
                        onClick={handleGenerateAiDescription}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        {isAiGenerating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Генерація опису AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>⚡ Згенерувати опис через Gemini AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Middle Section: "З цим часто купують" (Cross-Sell) */}
            {frequentlyBoughtTogether.length > 0 && (
              <div className={`pt-5 border-t ${isPremium ? 'border-slate-800' : 'border-slate-200/80'}`}>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className={isPremium ? 'text-white font-bold' : 'text-slate-900 font-bold'}>
                      З цим товаром також купують:
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                    Часті комплектуючі
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {frequentlyBoughtTogether.map((item) => {
                    const isAdded = addedItemIds.includes(item.id);
                    const itemImgUrl = getSafeImageUrl(item.image, `${item.name} ${item.category || ''}`);

                    return (
                      <div 
                        key={item.id}
                        className={`rounded-2xl border p-3 flex flex-col justify-between transition-all group ${
                          isPremium 
                            ? 'bg-slate-900/80 border-slate-800 hover:border-amber-400/40 text-white' 
                            : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-red-500/30 hover:shadow-md text-slate-900'
                        }`}
                      >
                        <div className="aspect-[4/3] rounded-xl flex items-center justify-center p-1.5 mb-2 overflow-hidden bg-white/5">
                          <img
                            src={itemImgUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain rounded-lg transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className={`text-[11px] font-bold line-clamp-2 leading-tight mb-2 h-7 ${
                          isPremium ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {item.name}
                        </div>

                        <div className={`flex items-center justify-between gap-1 pt-1 mt-auto border-t ${
                          isPremium ? 'border-slate-800' : 'border-slate-200/50'
                        }`}>
                          <span className="text-xs font-black text-red-600 tabular-nums">
                            {item.price} грн
                          </span>
                          <button
                            onClick={() => handleAddRelated(item)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                            }`}
                            title="Додати до замовлення"
                          >
                            {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Reviews Section */}
            <div className={`pt-5 border-t ${isPremium ? 'border-slate-800' : 'border-slate-200/80'}`}>
              <ProductReviewsSection 
                product={quickViewProduct} 
                isPlumbing={isPlumbing} 
              />
            </div>

          </div>

        </div>
      </div>

      {/* Fullscreen Image Zoom / Lightbox */}
      {isZoomed && quickViewProduct && (
        <div 
          className="fixed inset-0 z-[70] bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          {/* Top Bar with Product Name & Close Button */}
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/10 mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-sm sm:text-base font-bold truncate text-white">
                {quickViewProduct.name}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Артикул: {quickViewProduct.sku} {quickViewProduct.badge ? `• ${quickViewProduct.badge}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title="Закрити"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline pr-1">Закрити</span>
            </button>
          </div>

          {/* Large Center Image */}
          <div 
            className="relative max-w-4xl w-full max-h-[75vh] sm:max-h-[82vh] flex items-center justify-center p-3 sm:p-5 rounded-3xl bg-white/5 border border-white/15 overflow-hidden cursor-zoom-out shadow-2xl backdrop-blur-sm"
            onClick={() => setIsZoomed(false)}
          >
            <img
              src={modalImgUrl}
              alt={quickViewProduct.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[70vh] sm:max-h-[76vh] object-contain rounded-3xl shadow-xl transition-transform"
            />
          </div>

          <p className="text-xs text-white/70 mt-3 font-medium">
            Натисніть на фото або кнопку, щоб закрити перегляд
          </p>
        </div>
      )}
    </div>
  );
};
