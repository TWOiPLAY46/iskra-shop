import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Flame, 
  Clock, 
  ShoppingBag, 
  Check, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  ArrowRight,
  Bell,
  Eye
} from 'lucide-react';
import { getSafeImageUrl, ASSET_IMAGES } from '../utils/assetImages';
import { formatPriceUnit } from '../utils/unitFormatter';

export const WeeklyDealSection: React.FC = () => {
  const { 
    weeklyDeal, 
    products, 
    addToCart, 
    setIsCartDrawerOpen, 
    setQuickViewProduct,
    openStockAlertModal 
  } = useStore();

  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 14,
    minutes: 42,
    seconds: 18
  });

  const [isAddedRecently, setIsAddedRecently] = useState(false);

  // Live countdown timer calculation
  useEffect(() => {
    if (!weeklyDeal.enabled) return;

    const targetTime = weeklyDeal.endTimestamp || (Date.now() + 3 * 86400000 + 14 * 3600000);

    const updateTimer = () => {
      const difference = targetTime - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [weeklyDeal.enabled, weeklyDeal.endTimestamp]);

  // If disabled in admin panel, do not render
  if (!weeklyDeal.enabled) {
    return null;
  }

  // Find promo product
  const promoProduct = products.find(p => p.id === weeklyDeal.productId) || products[0];
  if (!promoProduct) return null;

  const discountPercent = weeklyDeal.discountPercent || 25;
  const originalPrice = promoProduct.price;
  const promoPrice = weeklyDeal.customPrice 
    ? weeklyDeal.customPrice 
    : Math.round(originalPrice * (1 - discountPercent / 100));
  const savings = originalPrice - promoPrice;

  const handleBuy = () => {
    const discountedItem = {
      ...promoProduct,
      price: promoPrice,
      desc: `${promoProduct.desc} (Акційна ціна: -${discountPercent}%)`
    };
    addToCart(discountedItem);
    setIsAddedRecently(true);
    setIsCartDrawerOpen(true);
    setTimeout(() => setIsAddedRecently(false), 2200);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0c1222] via-[#080d19] to-[#04060d] text-white border-2 border-red-500 shadow-2xl shadow-red-950/40 ring-1 ring-red-500/50 my-6 sm:my-8">
      
      {/* Decorative ambient glowing accents */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-72 h-72 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Luminous edge highlight lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent pointer-events-none" />

      <div className="relative p-5 sm:p-8 lg:p-10">
        
        {/* Top Header Row with Badge & Live Countdown Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/50 ring-1 ring-white/20 animate-pulse">
              <Flame className="w-4 h-4 fill-white" />
              <span>{weeklyDeal.badgeText || 'АКЦІЯ ТИЖНЯ'}</span>
            </span>

            <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-300 bg-slate-800/60 border border-slate-700/60 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Обмежена кількість за спецціною</span>
            </span>
          </div>

          {/* Live Countdown Timer */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mr-1">
              <Clock className="w-4 h-4 text-red-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-mono">До кінця акції:</span>
            </div>

            <div className="flex items-center gap-1.5 text-center">
              <div className="bg-[#10172a] border border-slate-700/80 rounded-xl px-2.5 py-1 min-w-[38px] shadow-inner">
                <div className="text-sm font-black text-white font-mono leading-tight">{String(timeLeft.days).padStart(2, '0')}</div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">дні</div>
              </div>
              <span className="text-red-500 font-bold">:</span>
              <div className="bg-[#10172a] border border-slate-700/80 rounded-xl px-2.5 py-1 min-w-[38px] shadow-inner">
                <div className="text-sm font-black text-white font-mono leading-tight">{String(timeLeft.hours).padStart(2, '0')}</div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">год</div>
              </div>
              <span className="text-red-500 font-bold">:</span>
              <div className="bg-[#10172a] border border-slate-700/80 rounded-xl px-2.5 py-1 min-w-[38px] shadow-inner">
                <div className="text-sm font-black text-white font-mono leading-tight">{String(timeLeft.minutes).padStart(2, '0')}</div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">хв</div>
              </div>
              <span className="text-red-500 font-bold">:</span>
              <div className="bg-gradient-to-b from-red-950 to-red-900 border border-red-500/70 rounded-xl px-2.5 py-1 min-w-[38px] shadow-md shadow-red-950/60">
                <div className="text-sm font-black text-red-300 font-mono leading-tight">{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div className="text-[8px] uppercase tracking-wider text-red-200 font-bold">сек</div>
              </div>
            </div>
          </div>

        </div>

        {/* Promo Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
          
          {/* Left Column: Product Image with Floating Discount Tag */}
          <div className="lg:col-span-5 relative group flex items-center justify-center">
            
            <div 
              className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer shadow-2xl border-2 border-red-500/70 hover:border-red-500 transition-all duration-500 group bg-slate-900"
              onClick={() => setQuickViewProduct(promoProduct)}
            >
              {/* Product Photo filling card edge-to-edge in full vibrant color */}
              <img 
                src={getSafeImageUrl(promoProduct.image)} 
                alt={promoProduct.name}
                onError={(e) => {
                  e.currentTarget.src = ASSET_IMAGES.faucetMixer;
                }}
                className="w-full h-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />

              {/* Dark radial gradient overlay to seamlessly fade out white photo edges */}
              <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-slate-950/80 pointer-events-none" />

              {/* Top ambient highlight line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent pointer-events-none" />

              {/* Floating Discount Tag */}
              <div className="absolute top-4 left-4 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl shadow-xl shadow-red-600/50 flex items-center gap-1.5 ring-1 ring-white/20 z-10">
                <Flame className="w-4 h-4 fill-white" />
                <span>-{discountPercent}%</span>
              </div>

              {/* Stock in Green */}
              <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xl z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>В наявності: {promoProduct.stock} шт</span>
              </div>

              {/* Interactive hint on hover */}
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/90 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-lg z-10">
                <Eye className="w-3.5 h-3.5 text-red-400" />
                <span>Швидкий огляд</span>
              </div>
            </div>

          </div>

          {/* Right Column: Title, Subtitle, Highlights, Price & Pulsing Buy Button */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
            
            <div>
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="text-[11px] font-mono text-red-300 font-bold bg-red-950/80 px-2.5 py-0.5 rounded-lg border border-red-500/40 shadow-xs">
                  АРТИКУЛ: {promoProduct.sku}
                </span>
                <span className="text-xs text-slate-300 font-semibold bg-slate-800/80 border border-slate-700/60 px-2.5 py-0.5 rounded-lg">
                  {promoProduct.category}
                </span>
                <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1 ml-auto">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>ЕКСКЛЮЗИВНА ЦІНА</span>
                </span>
              </div>

              <h3 
                onClick={() => setQuickViewProduct(promoProduct)}
                className="text-xl sm:text-2xl lg:text-3xl font-black font-display text-white tracking-tight leading-tight hover:text-red-400 transition-colors cursor-pointer"
              >
                {promoProduct.name}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2.5">
                {weeklyDeal.subtitle || promoProduct.desc || 'Спеціальна ціна цього тижня на сертифікований якісний товар для монтажу та ремонту.'}
              </p>
            </div>

            {/* Quick Benefits Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-1">
              <div className="flex items-center gap-2 bg-[#0e1628]/90 border border-slate-700/70 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200 shadow-xs transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">Офіційна гарантія</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0e1628]/90 border border-slate-700/70 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200 shadow-xs transition-colors">
                <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-medium">Швидка відправка</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0e1628]/90 border border-slate-700/70 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200 col-span-2 sm:col-span-1 shadow-xs transition-colors">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">100% оригінал</span>
              </div>
            </div>

            {/* Pricing & Pulsing Button Area */}
            <div className="pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Pricing Display */}
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight tabular-nums">
                    {promoPrice}{' '}
                    <span className="text-xl sm:text-2xl font-black text-red-500">грн</span>
                  </div>

                  <div className="text-base sm:text-lg font-bold text-slate-400 line-through tabular-nums">
                    {originalPrice} грн
                  </div>
                </div>

                <div className="text-xs text-emerald-400 font-bold mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Ви економите: {savings} грн
                  </span>
                  <span className="text-[10px] text-slate-400">{formatPriceUnit(promoProduct.unit)}</span>
                </div>
              </div>

              {/* Buy Button or Notify Button */}
              <div className="relative inline-flex items-center">
                {promoProduct.stock <= 0 ? (
                  <button
                    type="button"
                    onClick={() => openStockAlertModal(promoProduct)}
                    className="relative px-6 sm:px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md border border-amber-300 cursor-pointer"
                  >
                    <Bell className="w-5 h-5 stroke-[2.2] text-slate-950" />
                    <span>Повідомити про наявність</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    className={`relative px-7 sm:px-9 py-3.5 rounded-2xl font-black text-sm sm:text-base text-white flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xl cursor-pointer ${
                      isAddedRecently
                        ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                        : 'bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-600/40 ring-2 ring-red-400/50 hover:scale-[1.02]'
                    }`}
                    aria-label="Купити по акції"
                  >
                    {isAddedRecently ? (
                      <>
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        <span>Додано в кошик!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 stroke-[2]" />
                        <span>Купити по акції</span>
                        <ArrowRight className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
};
