import React, { useState } from 'react';
import { Product } from '../types/store';
import { useStore } from '../context/StoreContext';
import { getProductBrand } from '../utils/brandHelper';
import { ShoppingBag, Heart, Droplets, Zap, Check, AlertTriangle, Flame, Bell } from 'lucide-react';
import { getSafeImageUrl } from '../utils/assetImages';
import { formatUnit, formatPriceUnit } from '../utils/unitFormatter';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { siteTheme, addToCart, toggleWishlist, isInWishlist, setQuickViewProduct, siteSettings, openStockAlertModal } = useStore();
  const [imageError, setImageError] = useState(false);
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  const isPremium = siteTheme === 'premium';
  const brand = getProductBrand(product);
  const isFavorited = Boolean(product?.id && isInWishlist(product.id));
  const isOutOfStock = product.stock <= 0;
  const lowThreshold = siteSettings?.features?.lowStockThreshold ?? 3;
  const isLowStock = !isOutOfStock && product.stock <= lowThreshold;
  const showLowStockBadge = isLowStock && (siteSettings?.features?.showLowStockBadgeToBuyers ?? true);

  const isPlumbing = 
    product.category?.toLowerCase().includes('сантех') ||
    product.category?.toLowerCase().includes('радіатор') ||
    product.category?.toLowerCase().includes('змішувач') ||
    product.category?.toLowerCase().includes('труб') ||
    product.category?.toLowerCase().includes('фітинг') ||
    product.category?.toLowerCase().includes('унітаз') ||
    product.mainCategory?.toLowerCase().includes('сантех');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1200);
  };

  return (
    <div 
      onClick={() => setQuickViewProduct(product)}
      className={`group cursor-pointer relative flex flex-col justify-between transition-all duration-300 ${
        isPremium
          ? 'bg-[#0c1220]/95 hover:bg-[#11192e] backdrop-blur-md rounded-3xl border border-white/10 hover:border-amber-400/50 shadow-xl hover:shadow-[0_16px_36px_rgba(234,88,12,0.18)] hover:-translate-y-1.5 p-4 sm:p-5 overflow-hidden'
          : 'bg-white hover:bg-slate-50/90 rounded-3xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 p-3.5 sm:p-4.5 overflow-hidden ring-1 ring-transparent'
      }`}
    >
      {/* Top Hover Accent Glow Beam */}
      <div className={`absolute top-0 left-6 right-6 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
        isPremium 
          ? 'bg-gradient-to-r from-transparent via-amber-400/70 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-slate-400/60 to-transparent'
      }`} />

      {/* Top Section: Badge & Favorite Button */}
      <div className="flex items-center justify-between w-full mb-2 z-10">
        <div>
          {product.badge ? (
            <span className={`text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
              product.badge === 'Хіт продажу' || product.badge === 'Акція'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white shadow-md shadow-red-600/30 ring-1 ring-white/20' 
                : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            }`}>
              {product.badge}
            </span>
          ) : (
            <div className="h-4" />
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (product?.id) {
              toggleWishlist(product.id);
            }
          }}
          className={`p-1.5 rounded-full transition-all active:scale-90 ${
            isFavorited 
              ? 'text-red-500 bg-red-500/20' 
              : isPremium
              ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
              : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
          }`}
          title={isFavorited ? "Видалити з обраного" : "Додати до обраного"}
          aria-label={isFavorited ? "Видалити з обраного" : "Додати до обраного"}
        >
          <Heart className={`w-4 h-4 transition-transform ${isFavorited ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Visual Image Showcase Area - Borderless Clean Product Photo */}
      <div className="relative h-48 sm:h-56 md:h-60 lg:h-64 w-full p-1 sm:p-3 flex items-center justify-center mb-3 transition-all duration-300 overflow-hidden rounded-2xl bg-slate-50/60">
        {!imageError && product.image && product.image.trim() !== '' ? (
          <img
            src={getSafeImageUrl(product.image)}
            alt={product.name}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain object-center scale-[1.03] sm:scale-100 transition-transform duration-300 ease-out group-hover:scale-[1.05] relative z-10 transform-gpu"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 relative z-10">
            {isPlumbing ? (
              <Droplets className="w-20 h-20 sm:w-24 sm:h-24 text-slate-400 stroke-[1.5]" />
            ) : (
              <Zap className="w-20 h-20 sm:w-24 sm:h-24 text-slate-400 stroke-[1.5]" />
            )}
          </div>
        )}
      </div>

      {/* Product Content Body */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          {/* SKU & Brand */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className={`text-[10px] sm:text-[11px] font-mono font-medium truncate ${
              isPremium ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {product.sku}
            </span>
            {brand && brand !== 'Інші виробники' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                isPremium 
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30' 
                  : 'text-red-600 bg-red-50 border border-red-200/80'
              }`}>
                {brand}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug mb-2 transition-colors ${
            isPremium 
              ? 'text-white group-hover:text-red-400' 
              : 'text-slate-900 group-hover:text-red-600'
          }`}>
            {product.name}
          </h3>

          {/* Stock Status */}
          <div className="text-[11px] font-semibold mb-3">
            {isOutOfStock ? (
              <span className={`inline-flex items-center gap-1.5 font-semibold text-[11px] ${
                isPremium ? 'text-rose-400' : 'text-rose-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Немає в наявності</span>
              </span>
            ) : showLowStockBadge ? (
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                isPremium 
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-900'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="tracking-tight">
                  Закінчується: <span className="font-extrabold font-mono">лише {product.stock} {formatUnit(product.unit)}</span>
                </span>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1.5 font-semibold text-[11px] ${
                isPremium ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>В наявності ({product.stock} {formatUnit(product.unit)})</span>
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Cart Button Row */}
        <div className={`flex items-center justify-between gap-1.5 sm:gap-2 pt-2.5 border-t mt-auto min-w-0 ${
          isPremium ? 'border-slate-800/90' : 'border-slate-200/60'
        }`}>
          <div className="shrink-0">
            <div className={`font-black tabular-nums leading-none ${
              isPremium 
                ? 'text-base sm:text-xl font-display tracking-tight text-white' 
                : 'text-sm sm:text-lg font-display font-black tracking-tight text-slate-950'
            }`}>
              {product.price}{' '}
              <span className={`text-[10px] sm:text-xs font-bold ${isPremium ? 'text-red-400' : 'text-red-600'}`}>
                грн
              </span>
            </div>
            <div className={`text-[9px] sm:text-[10px] font-medium mt-0.5 ${
              isPremium ? 'text-slate-400' : 'text-slate-400'
            }`}>
              {formatPriceUnit(product.unit)}
            </div>
          </div>

          <div className="relative inline-flex items-center shrink-0">
            {isOutOfStock ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openStockAlertModal(product);
                }}
                className="relative px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-orange-600/30 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:brightness-110 text-white cursor-pointer shrink-0"
                title="Повідомити, коли з'явиться"
                aria-label="Повідомити про наявність"
              >
                <Bell className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white stroke-[2.2] shrink-0" />
                <span className="truncate">Повідомити</span>
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`relative font-black transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 ${
                  isPremium
                    ? `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs shadow-lg ${
                        isAddedRecently
                          ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                          : 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:brightness-110 text-white shadow-red-600/40 hover:scale-105'
                      }`
                    : `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs shadow-md transition-all ${
                        isAddedRecently
                          ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30 hover:scale-105'
                      }`
                }`}
                title="Додати в кошик"
                aria-label="Купити"
              >
                {isAddedRecently ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span className="text-[11px] sm:text-xs">В кошику</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                    <span>Купити</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
