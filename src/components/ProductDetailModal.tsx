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
  Cog
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
    showToast,
    openStockAlertModal 
  } = useStore();

  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-2xl border border-slate-200">
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              Деталі товару
            </h2>
            <button
              onClick={() => setQuickViewProduct(null)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Закрити"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            
            {/* Top Grid: Image Left, Specs Right */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              
              {/* Left: Product Image / Stylized Placeholder */}
              <div 
                onClick={() => {
                  if (!imgError && quickViewProduct.image && quickViewProduct.image.trim() !== '') {
                    setIsZoomed(true);
                  }
                }}
                className={`aspect-[4/3] rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-center relative overflow-hidden group select-none transition-all ${
                  !imgError && quickViewProduct.image && quickViewProduct.image.trim() !== ''
                    ? 'cursor-zoom-in hover:border-slate-300'
                    : ''
                }`}
                title={!imgError && quickViewProduct.image ? 'Натисніть для збільшення фото' : undefined}
              >
                {!imgError && quickViewProduct.image && quickViewProduct.image.trim() !== '' ? (
                  <>
                    <img
                      src={getSafeImageUrl(quickViewProduct.image)}
                      alt={quickViewProduct.name}
                      onError={() => setImgError(true)}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-[1.015]"
                    />

                    <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-md border border-white/10 z-20">
                      <ZoomIn className="w-3.5 h-3.5 text-red-400" />
                      <span>Збільшити фото</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    {isPlumbing ? (
                      <Droplets className="w-24 h-24 text-slate-400/80 stroke-[1.5]" />
                    ) : isTool ? (
                      <Wrench className="w-24 h-24 text-slate-400/80 stroke-[1.5]" />
                    ) : isHousehold ? (
                      <Home className="w-24 h-24 text-slate-400/80 stroke-[1.5]" />
                    ) : isOther ? (
                      <Cog className="w-24 h-24 text-slate-400/80 stroke-[1.5]" />
                    ) : (
                      <Zap className="w-24 h-24 text-slate-400/80 stroke-[1.5]" />
                    )}
                  </div>
                )}
              </div>

              {/* Right: Product Meta & Information */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-slate-400 font-medium tracking-wide">
                  {quickViewProduct.sku}
                </div>

                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {quickViewProduct.name}
                </h1>

                {/* Rating & Trust Quick Badge */}
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-800">4.9</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Перевірені відгуки покупців
                  </span>
                </div>

                {/* Badge if exists or ХІТ ПРОДАЖУ */}
                <div>
                  <span className="inline-block bg-red-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs">
                    {quickViewProduct.badge || 'ХІТ ПРОДАЖУ'}
                  </span>
                </div>

                {/* Specs Table */}
                <div className="divide-y divide-slate-100 text-xs py-1">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Виробник / Бренд</span>
                    <span className="font-bold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded text-right">
                      {getProductBrand(quickViewProduct)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Категорія</span>
                    <span className="font-semibold text-slate-800 text-right">{quickViewProduct.category}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Артикул</span>
                    <span className="font-mono font-semibold text-slate-800">{quickViewProduct.sku}</span>
                  </div>
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-slate-500 font-medium">Статус товару</span>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>Немає в наявності</span>
                      </span>
                    ) : showLowStockBadge ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span>Закінчується: лише {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        В наявності: {quickViewProduct.stock} {formatUnit(quickViewProduct.unit)}
                      </span>
                    )}
                  </div>
                  {quickViewProduct.specs && Object.entries(quickViewProduct.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-medium shrink-0">{key}</span>
                      <span className="font-semibold text-slate-800 text-right">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Product Description */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-slate-400">
                    Опис та переваги:
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {quickViewProduct.desc || 'Якісний сертифікований товар для монтажу та ремонту.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Middle Section: "З цим часто купують" */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-3">
                <ShoppingCart className="w-3.5 h-3.5 text-red-600" />
                <span>З цим часто купують</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {frequentlyBoughtTogether.map((item) => {
                  const isAdded = addedItemIds.includes(item.id);
                  const isItemPlumbing = 
                    item.category?.toLowerCase().includes('сантех') ||
                    item.category?.toLowerCase().includes('змішувач') ||
                    item.category?.toLowerCase().includes('труб') ||
                    item.category?.toLowerCase().includes('фітинг');

                  return (
                    <div 
                      key={item.id}
                      className="bg-slate-50/90 hover:bg-slate-100/80 rounded-xl border border-slate-200/90 p-2.5 flex flex-col justify-between transition-all"
                    >
                      <div className="aspect-[4/3] rounded-lg bg-white flex items-center justify-center p-1 mb-2 border border-slate-100">
                        {item.image && item.image.trim() !== '' ? (
                          <img
                            src={getSafeImageUrl(item.image)}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          isItemPlumbing ? (
                            <Droplets className="w-7 h-7 text-slate-400 stroke-[1.5]" />
                          ) : (
                            <Zap className="w-7 h-7 text-slate-400 stroke-[1.5]" />
                          )
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mb-2 h-7">
                        {item.name}
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1 mt-auto">
                        <span className="text-xs font-extrabold text-red-600 tabular-nums">
                          {item.price} грн
                        </span>
                        <button
                          onClick={() => handleAddRelated(item)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-90 ${
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

            {/* Customer Reviews Section */}
            <ProductReviewsSection 
              product={quickViewProduct} 
              isPlumbing={isPlumbing} 
            />

            {/* Bottom Bar: Price in Red + Stepper + Buy Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-black text-red-600 font-display tabular-nums leading-none">
                  {quickViewProduct.price}{' '}
                  <span className="text-base font-bold text-red-600">грн</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {formatPriceUnit(quickViewProduct.unit)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Stepper: only shown when in stock */}
                {!isOutOfStock ? (
                  <div className="flex items-center bg-slate-100 rounded-xl px-2 py-1 border border-slate-200">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="p-1 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      aria-label="Зменшити"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(Math.min(quickViewProduct.stock || 99, qty + 1))}
                      className="p-1 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      aria-label="Збільшити"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Очікується поставка</span>
                  </div>
                )}

                {/* Buy Button or Notify Button */}
                <div className="relative inline-flex items-center">
                  {isOutOfStock ? (
                    <button
                      type="button"
                      onClick={() => openStockAlertModal(quickViewProduct)}
                      className="relative px-5 sm:px-7 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-500 hover:bg-amber-600 flex items-center gap-2 transition-all active:scale-95 shadow-sm border border-amber-400 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 stroke-[2.2] text-slate-950" />
                      <span>Повідомити про наявність</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBuy}
                      className="relative px-6 sm:px-8 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center gap-2 transition-all active:scale-95 shadow-sm bg-red-600 hover:bg-red-700 btn-pulse-red cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 stroke-[2]" />
                      <span>Купити</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Fullscreen Image Zoom / Lightbox */}
      {isZoomed && quickViewProduct && quickViewProduct.image && (
        <div 
          className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
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
            className="relative max-w-4xl w-full max-h-[75vh] sm:max-h-[82vh] flex items-center justify-center p-3 sm:p-5 rounded-3xl bg-white/10 border border-white/15 overflow-hidden cursor-zoom-out shadow-2xl backdrop-blur-sm"
            onClick={() => setIsZoomed(false)}
          >
            <img
              src={getSafeImageUrl(quickViewProduct.image)}
              alt={quickViewProduct.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[70vh] sm:max-h-[76vh] object-contain rounded-2xl shadow-xl transition-transform"
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
