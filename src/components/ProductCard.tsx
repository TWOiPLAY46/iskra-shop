import React, { useState } from 'react';
import { Product } from '../types/store';
import { useStore } from '../context/StoreContext';
import { getProductBrand } from '../utils/brandHelper';
import { ShoppingBag, Heart, Droplets, Zap, Check, AlertTriangle, Flame, Bell, Wrench, Home, Cog, Eye } from 'lucide-react';
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

  const catLower = (product.category || '').toLowerCase();
  const mainLower = (product.mainCategory || '').toLowerCase();

  const isPlumbing = 
    catLower.includes('сантех') ||
    catLower.includes('радіатор') ||
    catLower.includes('змішувач') ||
    catLower.includes('труб') ||
    catLower.includes('фітинг') ||
    catLower.includes('унітаз') ||
    catLower.includes('бойлер') ||
    catLower.includes('насос') ||
    mainLower.includes('сантех');

  const isTool = 
    catLower.includes('інструмент') ||
    catLower.includes('дриль') ||
    catLower.includes('шуруп') ||
    catLower.includes('перфоратор') ||
    catLower.includes('болгарк') ||
    mainLower.includes('інструмент');

  const isHousehold = 
    catLower.includes('господар') ||
    catLower.includes('кріплен') ||
    catLower.includes('замок') ||
    catLower.includes('прибиран') ||
    mainLower.includes('господар');

  const isOther = 
    mainLower.includes('інш') || 
    mainLower.includes('нерозподіл') ||
    catLower.includes('інш');

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
          ? 'bg-[#0c1220]/95 hover:bg-[#11192e] backdrop-blur-md rounded-3xl border border-white/10 hover:border-amber-400/50 shadow-xl hover:shadow-[0_16px_36px_rgba(234,88,12,0.18)] hover:-translate-y-1.5 p-3 sm:p-5 overflow-hidden'
          : 'bg-white hover:bg-slate-50/90 rounded-3xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 p-2.5 sm:p-4.5 overflow-hidden ring-1 ring-transparent'
      }`}
    >
      {/* Top Hover Accent Glow Beam */}
      <div className={`absolute top-0 left-6 right-6 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
        isPremium 
          ? 'bg-gradient-to-r from-transparent via-amber-400/70 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-slate-400/60 to-transparent'
      }`} />

      {/* Top Section: Badge & Favorite Button */}
      <div className="flex items-center justify-between w-full mb-1.5 z-10">
        <div>
          {product.badge ? (
            <span className={`text-[9px] sm:text-[11px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg uppercase tracking-wider ${
              product.badge === 'Хіт продажу' || product.badge === 'Акція'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white shadow-md shadow-red-600/30 ring-1 ring-white/20' 
                : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            }`}>
              {product.badge}
            </span>
          ) : (
            <div className="h-3 sm:h-4" />
          )}
        </div>

        {/* Wishlist Button */}
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
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isFavorited ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Product Photo - Clean with rounded corners without artificial box */}
      {(() => {
        const displayImageUrl = getSafeImageUrl(
          product.image,
          `${product.name} ${product.category || ''} ${product.mainCategory || ''}`
        );

        return (
          <div className="relative h-36 sm:h-48 md:h-60 lg:h-64 w-full flex items-center justify-center mb-2.5 overflow-hidden rounded-2xl sm:rounded-[26px]">
            {!imageError && displayImageUrl ? (
              <img
                src={displayImageUrl}
                alt={product.name}
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-contain object-center rounded-2xl sm:rounded-[26px] transition-transform duration-300 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                {isPlumbing ? (
                  <Droplets className="w-16 h-16 sm:w-24 sm:h-24 stroke-[1.5]" />
                ) : isTool ? (
                  <Wrench className="w-16 h-16 sm:w-24 sm:h-24 stroke-[1.5]" />
                ) : isHousehold ? (
                  <Home className="w-16 h-16 sm:w-24 sm:h-24 stroke-[1.5]" />
                ) : isOther ? (
                  <Cog className="w-16 h-16 sm:w-24 sm:h-24 stroke-[1.5]" />
                ) : (
                  <Zap className="w-16 h-16 sm:w-24 sm:h-24 stroke-[1.5]" />
                )}
              </div>
            )}

            {/* Quick Preview Pill on hover */}
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none transform translate-y-1 group-hover:translate-y-0 z-20">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md border ${
                isPremium
                  ? 'bg-slate-900/90 text-amber-300 border-amber-400/30'
                  : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-slate-900/10'
              }`}>
                <Eye className="w-3.5 h-3.5 text-red-500" />
                <span>Огляд товару</span>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Product Content Body */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          {/* SKU & Brand */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className={`text-[9px] sm:text-[11px] font-mono font-medium truncate ${
              isPremium ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {product.sku}
            </span>
            {brand && brand !== 'Інші виробники' && (
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                isPremium 
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30' 
                  : 'text-red-600 bg-red-50 border border-red-200/80'
              }`}>
                {brand}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug mb-1.5 transition-colors ${
            isPremium 
              ? 'text-white group-hover:text-red-400' 
              : 'text-slate-900 group-hover:text-red-600'
          }`}>
            {product.name}
          </h3>

          {/* Stock Status */}
          <div className="text-[10px] sm:text-[11px] font-semibold mb-2.5">
            {isOutOfStock ? (
              <span className={`inline-flex items-center gap-1 font-semibold ${
                isPremium ? 'text-rose-400' : 'text-rose-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                <span className="truncate">Немає в наявності</span>
              </span>
            ) : showLowStockBadge ? (
              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold ${
                isPremium 
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-900'
              }`}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="tracking-tight truncate">
                  Лише {product.stock} {formatUnit(product.unit)}
                </span>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1 font-semibold ${
                isPremium ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">В наявності ({product.stock} {formatUnit(product.unit)})</span>
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Cart Button Row */}
        <div className={`flex items-center justify-between gap-1.5 pt-2 border-t mt-auto min-w-0 ${
          isPremium ? 'border-slate-800/90' : 'border-slate-200/60'
        }`}>
          <div className="shrink-0 min-w-0">
            <div className={`font-black tabular-nums leading-none ${
              isPremium 
                ? 'text-sm sm:text-xl font-display tracking-tight text-white' 
                : 'text-sm sm:text-lg font-display font-black tracking-tight text-slate-950'
            }`}>
              {product.price}{' '}
              <span className={`text-[10px] sm:text-xs font-bold ${isPremium ? 'text-red-400' : 'text-red-600'}`}>
                грн
              </span>
            </div>
            <div className={`text-[9px] sm:text-[10px] font-medium mt-0.5 truncate ${
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
                className="relative px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-orange-600/30 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:brightness-110 text-white cursor-pointer shrink-0 whitespace-nowrap"
                title="Повідомити, коли з'явиться"
                aria-label="Повідомити про наявність"
              >
                <Bell className="w-3 h-3 text-white stroke-[2.2] shrink-0" />
                <span>Повідомити</span>
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`relative font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                  isPremium
                    ? `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs shadow-lg ${
                        isAddedRecently
                          ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                          : 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:brightness-110 text-white shadow-red-600/40 hover:scale-105'
                      }`
                    : `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs shadow-md transition-all ${
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
                    <span>В кошику</span>
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
