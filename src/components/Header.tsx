import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { CatalogMegaMenu } from './CatalogMegaMenu';
import { 
  ShoppingBag, 
  Heart, 
  Menu, 
  X, 
  Sparkles,
  Flame,
  Search,
  LayoutGrid,
  Building2,
  RotateCcw
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    discountedCartSum, 
    setIsCartDrawerOpen, 
    wishlist, 
    showWishlistOnly,
    setShowWishlistOnly,
    currentClient, 
    activeView, 
    setActiveView, 
    headerDesign,
    siteSettings,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    products,
    setQuickViewProduct
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Quick live search matching items
  const quickSearchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q) ||
        (p.mainCategory && p.mainCategory.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [searchQuery, products]);

  const scrollToHits = () => {
    setActiveView('store');
    setTimeout(() => {
      const el = document.getElementById('hits-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSelectSearchResult = (prod: any) => {
    setIsSearchFocused(false);
    setQuickViewProduct(prod);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all w-full">
        {/* Dynamic Slim Promo Banner */}
        {headerDesign.promoActive && headerDesign.promoText && !promoDismissed && (
          <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white text-xs font-medium py-1.5 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                <span>{headerDesign.promoText}</span>
              </div>
              <button 
                onClick={() => setPromoDismissed(true)} 
                className="text-white/80 hover:text-white shrink-0 p-0.5"
                aria-label="Закрити банер"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-4">
            
            {/* Logo: Red ISKRA Badge + МАГАЗИН / Магазин надійних рішень */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
              <button
                onClick={() => {
                  setActiveView('store');
                  setActiveCategory('Усі');
                  setSearchQuery('');
                  setShowWishlistOnly(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5 sm:gap-2.5 group select-none"
              >
                {/* Red rectangular ISKRA badge */}
                <div className="relative shrink-0">
                  <div className="flex items-center justify-center bg-[#e5001e] hover:bg-[#d4001a] text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[6px] shadow-xs transition-transform duration-150 group-hover:scale-[1.02] active:scale-95">
                    <span className="font-black text-white text-[15.5px] sm:text-[18px] tracking-[0.05em] font-display leading-none transform scale-y-110 scale-x-105 inline-block uppercase select-none">
                      {headerDesign.logoBadge || 'ISKRA'}
                    </span>
                  </div>
                </div>

                {/* Right Wordmark: Hidden on mobile (< sm), shown on tablet and desktop */}
                <div className="hidden sm:flex flex-col justify-center text-left">
                  <span className="font-bold text-xs sm:text-base text-black tracking-tight font-display leading-tight uppercase">
                    {headerDesign.logoText || 'МАГАЗИН'}
                  </span>
                  <span className="text-[8.5px] sm:text-[11px] font-semibold text-black tracking-tight leading-tight">
                    {headerDesign.logoSubtitle || 'Магазин надійних рішень'}
                  </span>
                </div>
              </button>
            </div>

            {/* Catalog Button (Desktop only) */}
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="hidden md:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
            >
              <LayoutGrid className="w-4 h-4 text-red-500" />
              <span>Каталог</span>
            </button>

            {/* Desktop Search Bar (Hidden on mobile < md, replaced by full-width Row 2 below) */}
            <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-md relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeView !== 'store') setActiveView('store');
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Пошук серед товарів..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Очистити пошук"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isSearchFocused && quickSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Знайдено в каталозі ({quickSearchResults.length})</span>
                    <span>Натисніть для перегляду</span>
                  </div>
                  {quickSearchResults.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => handleSelectSearchResult(prod)}
                      className="w-full p-2.5 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {prod.sku} · {prod.category}
                        </div>
                      </div>
                      <div className="text-xs font-black text-red-600 shrink-0 tabular-nums">
                        {prod.price} грн
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Action Icons Group */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              
              {/* About Seller Button (Про нас / Реквізити) */}
              <button
                onClick={() => {
                  setActiveView(activeView === 'about' ? 'store' : 'about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  activeView === 'about'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
                title="Інформація про продавця та реквізити"
              >
                <Building2 className={`w-3.5 h-3.5 ${activeView === 'about' ? 'text-red-400' : 'text-red-600'}`} />
                <span className="font-medium text-[10px] sm:text-xs">Про нас</span>
              </button>

              {/* Returns & Exchange Button (Повернення та обмін) - visible on tablet/desktop */}
              <button
                onClick={() => {
                  setActiveView(activeView === 'returns' ? 'store' : 'returns');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`hidden lg:inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  activeView === 'returns'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
                title="Умови повернення та обміну товару (14 днів)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${activeView === 'returns' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className="font-medium text-[10px] sm:text-xs">Повернення</span>
              </button>

              {/* Account Profile Button */}
              <button
                onClick={() => setActiveView(activeView === 'account' ? 'store' : 'account')}
                className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  activeView === 'account'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span className={`font-medium text-[10px] sm:text-xs ${activeView === 'account' ? 'text-white' : 'text-slate-800'}`}>
                  {currentClient ? (currentClient.name || 'Кабінет').split(' ')[0] : 'Кабінет'}
                </span>
                {currentClient?.discount ? (
                  <span className="bg-emerald-50 border border-emerald-400 text-emerald-700 text-[8.5px] sm:text-[10px] font-bold px-1 py-0.2 rounded">
                    -{currentClient.discount}%
                  </span>
                ) : null}
              </button>

              {/* Wishlist Heart Icon with Red Badge */}
              <button
                onClick={() => {
                  setActiveView('store');
                  const nextState = !showWishlistOnly;
                  setShowWishlistOnly(nextState);
                  if (nextState) {
                    setActiveCategory('Усі');
                    setSearchQuery('');
                    setTimeout(() => {
                      const el = document.getElementById('catalog-products-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }, 50);
                  }
                }}
                className={`relative p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer ${
                  showWishlistOnly 
                    ? 'text-red-600 bg-red-50 ring-2 ring-red-400 shadow-xs' 
                    : 'text-slate-800 hover:text-red-600'
                }`}
                title={showWishlistOnly ? "Показати весь каталог" : "Показати тільки обрані товари"}
                aria-label="Обрані товари"
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${showWishlistOnly ? 'fill-red-600 text-red-600 scale-110' : 'text-slate-800 stroke-[1.8]'}`} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center animate-in zoom-in-50">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Shopping Cart Drawer Trigger (Red button with bag icon and sum) */}
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                aria-label="Кошик покупок"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2]" />
                <span className="tabular-nums font-bold text-[11px] sm:text-xs">
                  {discountedCartSum.toFixed(0)} грн
                </span>
              </button>

              {/* Mobile menu trigger (Three stripes / Burger) - enlarged and comfortable touch target */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="ml-2 sm:ml-3 p-2 text-slate-800 hover:text-black hover:bg-slate-100 active:bg-slate-200 rounded-xl md:hidden cursor-pointer flex items-center justify-center min-w-[42px] min-h-[42px] transition-colors"
                aria-label="Меню сайту"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.3]" />
                ) : (
                  <Menu className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.3]" />
                )}
              </button>
            </div>

          </div>

          {/* Row 2 on Mobile (< md): Dedicated full-width Catalog Button & Search Bar */}
          <div className="md:hidden pb-2.5 pt-0.5 flex items-center gap-2">
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
            >
              <LayoutGrid className="w-4 h-4 text-red-500" />
              <span>Каталог</span>
            </button>

            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'store') setActiveView('store');
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Пошук серед товарів..."
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Очистити пошук"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Instant Search Results Dropdown on Mobile */}
              {isSearchFocused && quickSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Знайдено ({quickSearchResults.length})</span>
                    <span>Натисніть для перегляду</span>
                  </div>
                  {quickSearchResults.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => handleSelectSearchResult(prod)}
                      className="w-full p-2.5 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {prod.sku} · {prod.category}
                        </div>
                      </div>
                      <div className="text-xs font-black text-red-600 shrink-0 tabular-nums">
                        {prod.price} грн
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Bar */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCatalogOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs"
            >
              <LayoutGrid className="w-4 h-4 text-red-500" />
              <span>Відкрити Каталог товарів</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveView('store');
                  setShowWishlistOnly(false);
                  setActiveCategory('Усі');
                  setSearchQuery('');
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800"
              >
                Головна
              </button>
              <button
                onClick={() => {
                  setActiveView('store');
                  setShowWishlistOnly(true);
                  setActiveCategory('Усі');
                  setSearchQuery('');
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    const el = document.getElementById('catalog-products-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
                className="text-left px-3 py-2 rounded-xl bg-red-50 text-xs font-bold text-red-600 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-red-600" />
                  <span>Обране</span>
                </div>
                {wishlist.length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {wishlist.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowWishlistOnly(false);
                  setIsMobileMenuOpen(false);
                  scrollToHits();
                }}
                className="text-left px-3 py-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Хіти продажу</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('about');
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  activeView === 'about' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${activeView === 'about' ? 'text-red-400' : 'text-red-600'}`} />
                <span>Про нас / Реквізити</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('returns');
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  activeView === 'returns' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${activeView === 'returns' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>Повернення та обмін</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('account');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800"
              >
                Особистий кабінет
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Catalog Mega-Menu Modal */}
      <CatalogMegaMenu 
        isOpen={isCatalogOpen} 
        onClose={() => setIsCatalogOpen(false)} 
      />
    </>
  );
};
