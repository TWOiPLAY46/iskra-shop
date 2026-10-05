import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ShoppingCart, 
  ArrowRight, 
  Sparkles,
  Check,
  ShieldCheck,
  ChevronRight,
  Tag
} from 'lucide-react';
import { Product } from '../types/store';
import { getSafeImageUrl } from '../utils/assetImages';
import { getSmartRecommendedProducts } from '../utils/recommendationsHelper';
import { formatUnit } from '../utils/unitFormatter';

export const CartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartDrawerOpen, 
    setIsCartDrawerOpen, 
    removeFromCart, 
    updateCartQty, 
    totalCartSum, 
    discountedCartSum, 
    currentClient, 
    setIsCheckoutModalOpen,
    setActiveView,
    products,
    addToCart,
    siteSettings,
    showToast,
    appliedPromo,
    applyPromoCode,
    removeAppliedPromo
  } = useStore();

  const [promoInput, setPromoInput] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);

  const discountAmount = totalCartSum - discountedCartSum;
  const freeShippingThreshold = siteSettings.features?.freeShippingThreshold ?? 3000;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - discountedCartSum);
  const freeShippingProgress = Math.min(100, Math.round((discountedCartSum / freeShippingThreshold) * 100));

  // Items not already in cart for recommendations
  const frequentlyBoughtTogether = useMemo(() => {
    if (!cart.length) return [];
    return getSmartRecommendedProducts(cart, products, 4);
  }, [cart, products]);

  if (!isCartDrawerOpen) return null;

  const handleCheckoutClick = () => {
    setIsCartDrawerOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const handleAddRelated = (prod: Product) => {
    addToCart(prod, 1);
    setAddedItemIds((prev) => [...prev, prod.id]);
    showToast(`«${prod.name}» додано до вашого замовлення!`, 'success');
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== prod.id));
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center sm:justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)} 
      />

      {/* Container: Centered modal on mobile (w-full max-w-[94vw] max-h-[92vh] rounded-3xl), slide-over panel on desktop */}
      <div className="relative z-10 w-full sm:w-auto sm:h-full flex items-center justify-center p-2.5 sm:p-0">
        <div className="w-full max-w-lg sm:w-[480px] bg-slate-50 shadow-2xl flex flex-col justify-between border border-slate-200/90 sm:border-y-0 sm:border-r-0 sm:border-l sm:h-full max-h-[90vh] sm:max-h-full rounded-3xl sm:rounded-none overflow-hidden animate-in zoom-in-95 sm:zoom-in-100 sm:slide-in-from-right duration-200">
          
          {/* 1. Header with Cart Items Count */}
          <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-600/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Ваше замовлення
                </h2>
                <div className="text-[11px] text-slate-500 font-medium">
                  {cart.length > 0 ? (
                    <span>У кошику <b className="text-slate-900">{cart.reduce((s, i) => s + i.qty, 0)} шт.</b> товарів</span>
                  ) : (
                    <span>Кошик порожній</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Закрити кошик"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Free Delivery Goal Tracker */}
          {cart.length > 0 && (
            <div className="bg-white px-5 py-2.5 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {remainingForFreeShipping === 0 ? (
                    <span className="text-emerald-700 font-bold">Вітаємо! У вас безкоштовна доставка 🎉</span>
                  ) : (
                    <span>До безкоштовної доставки: <b className="text-red-600 font-mono">{remainingForFreeShipping.toFixed(0)} грн</b></span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-slate-500 font-mono">{freeShippingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    remainingForFreeShipping === 0 ? 'bg-emerald-500' : 'bg-red-600'
                  }`}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 3. Main Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
                  <ShoppingBag className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1 font-display">
                  Ваш кошик порожній
                </h3>
                <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
                  Оберіть необхідні сантехнічні чи електротовари в каталозі та повертайтеся для оформлення замовлення.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    setActiveView('store');
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95"
                >
                  Перейти до каталогу товарів
                </button>
              </div>
            ) : (
              <>
                {/* SECTION 1: PRIMARY ORDER ITEMS (Hero Spotlight Card) */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center justify-between">
                    <span>Товари у вашому замовленні</span>
                    <span className="text-slate-400 font-normal">({cart.length} поз.)</span>
                  </div>

                  {cart.map((item) => {
                    const itemTotal = item.price * item.qty;
                    const imageUrl = getSafeImageUrl(item.image, `${item.name} ${item.category}`);

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-red-500/40 p-3.5 shadow-sm transition-all flex items-center gap-3.5 group"
                      >
                        {/* Big Clear Product Image */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-1 overflow-hidden relative">
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/src/assets/images/hero_iskra_store_1790671594961.jpg';
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mb-2">
                            {item.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.sku}</span>}
                            <span>{item.price} грн/{formatUnit(item.unit)}</span>
                          </div>

                          {/* Stepper + Total Price + Delete button */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Quantity Stepper */}
                            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                              <button
                                onClick={() => updateCartQty(item.id, item.qty - 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white rounded-lg transition-colors active:scale-90"
                                aria-label="Зменшити кількість"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-black font-mono text-slate-900">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => updateCartQty(item.id, item.qty + 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white rounded-lg transition-colors active:scale-90"
                                aria-label="Збільшити кількість"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Total Line Price & Trash */}
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-sm sm:text-base font-black text-red-600 font-display tabular-nums">
                                  {itemTotal.toFixed(0)} <span className="text-xs font-bold">грн</span>
                                </span>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Видалити з кошика"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SECTION 2: COMPACT HORIZONTAL RECOMMENDATIONS ("З цим також беруть") */}
                {frequentlyBoughtTogether.length > 0 && (
                  <div className="pt-2">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                            +
                          </div>
                          <span className="text-xs font-bold text-slate-900">Корисні доповнення до замовлення</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Швидке додавання</span>
                      </div>

                      {/* Clean compact list: each item is a single neat row */}
                      <div className="divide-y divide-slate-100">
                        {frequentlyBoughtTogether.map((item) => {
                          const isAdded = addedItemIds.includes(item.id);
                          const imageUrl = getSafeImageUrl(item.image, `${item.name} ${item.category}`);

                          return (
                            <div 
                              key={item.id}
                              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-1.5 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                  <img 
                                    src={imageUrl} 
                                    alt={item.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/src/assets/images/product_circuit_breaker_1790671628425.jpg';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-semibold text-slate-800 truncate">
                                    {item.name}
                                  </h5>
                                  <div className="text-[11px] font-bold text-red-600 font-mono tabular-nums">
                                    {item.price} грн
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleAddRelated(item)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95 ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 hover:bg-red-600 text-slate-800 hover:text-white border border-slate-200 hover:border-red-600'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Додано</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Додати</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Sticky Footer with Clear Total and Checkout Button */}
          {cart.length > 0 && (
            <div className="p-5 bg-white border-t border-slate-200 space-y-3 shrink-0 shadow-lg">
              
              {/* Promo Code Input / Applied Badge */}
              <div className="pt-1">
                {appliedPromo ? (
                  <div className="flex items-center justify-between text-xs bg-purple-50 text-purple-900 p-2.5 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        Промокод <b>{appliedPromo.code}</b> (
                        {appliedPromo.discountType === 'percent' ? `-${appliedPromo.discountValue}%` : `-${appliedPromo.discountValue} грн`}
                        )
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeAppliedPromo}
                      className="text-purple-700 hover:text-rose-600 font-bold text-[11px] underline cursor-pointer"
                    >
                      Скасувати
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Tag className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Промокод на знижку..."
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (promoInput.trim()) {
                              applyPromoCode(promoInput.trim());
                              setPromoInput('');
                            }
                          }
                        }}
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (promoInput.trim()) {
                          applyPromoCode(promoInput.trim());
                          setPromoInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Застосувати
                    </button>
                  </div>
                )}
              </div>

              {/* Client Discount Banner */}
              {currentClient && currentClient.discount > 0 && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Ваша персональна знижка ({currentClient.discount}%)</span>
                  </span>
                  <span className="font-bold font-mono tabular-nums">-{discountAmount.toFixed(2)} грн</span>
                </div>
              )}

              {/* Total Row */}
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Разом до сплати:</span>
                  <span className="text-[11px] text-slate-400">Без комісій та переплат</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black font-display text-slate-950 tabular-nums">
                    {discountedCartSum.toFixed(2)} <span className="text-base text-red-600 font-bold">грн</span>
                  </span>
                </div>
              </div>

              {/* Big Checkout CTA Button */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-4 px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-[0.98]"
              >
                <span>Оформити замовлення</span>
                <ArrowRight className="w-5 h-5" />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
