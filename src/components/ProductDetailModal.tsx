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
  Info
} from 'lucide-react';
import { Product } from '../types/store';
import { getProductBrand } from '../utils/brandHelper';
import { getSafeImageUrl } from '../utils/assetImages';
import { ProductReviewsSection } from './ProductReviewsSection';
import { getSmartRecommendedProducts } from '../utils/recommendationsHelper';
import { formatUnit, formatPriceUnit } from '../utils/unitFormatter';

export const ProductDetailModal: React.FC = () => {
  const { 
    quickViewProduct, 
    setQuickViewProduct, 
    addToCart, 
    products,
    siteSettings,
    siteTheme,
    showToast,
    openStockAlertModal 
  } = useStore();

  const isPremium = siteTheme === 'premium';
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'specs' | 'desc'>('specs');

  useEffect(() => {
    setIsZoomed(false);
    setImgError(false);
    setQty(1);
    setActiveTab('specs');
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
              <div className="text-xs text-slate-400 truncate hidden sm:block">
                <span>{quickViewProduct.mainCategory || 'Каталог'}</span>
                {quickViewProduct.category && (
                  <>
                    <span className="mx-1.5 opacity-50">/</span>
                    <span className="text-slate-500">{quickViewProduct.category}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setQuickViewProduct(null)}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isPremium 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
              }`}
              aria-label="Закрити"
              title="Закрити (Esc)"
            >
              <span className="text-[11px] font-medium hidden sm:inline opacity-70">Esc</span>
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

                {/* 3 Trust Assurance Features */}
                <div className={`grid grid-cols-1 gap-2 p-3 rounded-2xl text-xs ${
                  isPremium ? 'bg-slate-900/40 border border-slate-800' : 'bg-slate-50 border border-slate-200/60'
                }`}>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">Відправка щодня Новою Поштою або самовивіз</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">Офіційна гарантія та 100% перевірка якості</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">14 днів на повернення або обмін товару</span>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): Meta, Title, Price, Buy & Specs */}
              <div className="md:col-span-7 flex flex-col space-y-4">
                
                {/* Brand & SKU Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {brand && brand !== 'Інші виробники' && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                        isPremium 
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
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

                  <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
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
                  <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-extrabold text-amber-600 dark:text-amber-300 ml-1">4.9</span>
                  </div>

                  <div className="text-slate-300 dark:text-slate-700">•</div>

                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Немає в наявності</span>
                    </span>
                  ) : showLowStockBadge ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>Закінчується: лише {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}</span>
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>В наявності: {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}</span>
                    </span>
                  )}
                </div>

                {/* Price and Cart Purchase Card */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPremium 
                    ? 'bg-slate-900/80 border-slate-800' 
                    : 'bg-slate-50/90 border-slate-200/90'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        Ціна:
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-red-600 font-display tabular-nums leading-none mt-1">
                        {quickViewProduct.price}{' '}
                        <span className="text-lg font-bold text-red-600">грн</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">
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
                            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            aria-label="Зменшити"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-black text-sm font-mono">
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(Math.min(quickViewProduct.stock || 99, qty + 1))}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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

                {/* Tabs: Specifications & Description */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                    <button
                      onClick={() => setActiveTab('specs')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'specs'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Характеристики
                    </button>
                    <button
                      onClick={() => setActiveTab('desc')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'desc'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Опис товару
                    </button>
                  </div>

                  {activeTab === 'specs' ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs pt-2">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Виробник / Бренд:</span>
                        <span className="font-bold text-red-600 dark:text-red-400">{brand}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Категорія:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{quickViewProduct.category}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Артикул (SKU):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{quickViewProduct.sku}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Одиниця виміру:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{quickViewProduct.unit}</span>
                      </div>
                      {quickViewProduct.specs && Object.entries(quickViewProduct.specs).map(([key, val]) => (
                        <div key={key} className="flex justify-between py-1.5 gap-2">
                          <span className="text-slate-500 shrink-0">{key}:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {quickViewProduct.desc || 'Офіційний сертифікований товар із гарантією виробника для надійного монтажу та ремонту.'}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Middle Section: "З цим часто купують" (Cross-Sell) */}
            {frequentlyBoughtTogether.length > 0 && (
              <div className={`pt-5 border-t ${isPremium ? 'border-slate-800' : 'border-slate-200/80'}`}>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>З цим товаром також купують:</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Часті комплектуючі</span>
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
                            ? 'bg-slate-900/60 border-slate-800 hover:border-amber-400/40' 
                            : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-red-500/30 hover:shadow-md'
                        }`}
                      >
                        <div className="aspect-[4/3] rounded-xl flex items-center justify-center p-1.5 mb-2 overflow-hidden">
                          <img
                            src={itemImgUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain rounded-lg transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="text-[11px] font-bold line-clamp-2 leading-tight mb-2 h-7">
                          {item.name}
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 mt-auto border-t border-slate-200/50 dark:border-slate-800">
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
              title="Закрити (Esc)"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline pr-1">Закрити (Esc)</span>
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
            Натисніть на фото або клавішу Esc, щоб закрити перегляд
          </p>
        </div>
      )}
    </div>
  );
};
