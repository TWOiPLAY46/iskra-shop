import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ChevronRight, 
  Droplets, 
  Zap, 
  Flame, 
  Sparkles,
  ArrowRight,
  Wrench,
  Home,
  Cog,
  Search,
  PackageOpen,
  CheckCircle2,
  Layers,
  ShoppingBag
} from 'lucide-react';

interface CatalogMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CatalogMegaMenu: React.FC<CatalogMegaMenuProps> = ({ isOpen, onClose }) => {
  const { 
    categoriesTree, 
    products,
    selectCategoryLeaf,
    setActiveView,
    setSearchQuery
  } = useStore();

  const [activeMainTab, setActiveMainTab] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const mainCategories = useMemo(() => {
    return Object.keys(categoriesTree);
  }, [categoriesTree]);

  // Ensure an active tab is selected whenever modal opens or categories change
  React.useEffect(() => {
    if (isOpen) {
      if (!activeMainTab || !categoriesTree[activeMainTab]) {
        if (mainCategories.length > 0) {
          setActiveMainTab(mainCategories[0]);
        }
      }
      setFilterQuery('');
    }
  }, [isOpen, mainCategories]);

  // Compute product counts for main categories and subcategories
  const categoryStats = useMemo(() => {
    const mainCounts: Record<string, number> = {};
    const subCounts: Record<string, number> = {};

    products.forEach((p) => {
      if (p.mainCategory) {
        mainCounts[p.mainCategory] = (mainCounts[p.mainCategory] || 0) + 1;
      }
      if (p.subCategory) {
        subCounts[p.subCategory] = (subCounts[p.subCategory] || 0) + 1;
      }
      if (p.category) {
        subCounts[p.category] = (subCounts[p.category] || 0) + 1;
      }
    });

    return { mainCounts, subCounts };
  }, [products]);

  if (!isOpen) return null;

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-products-section') || document.getElementById('subcategory-gallery-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (catName: string) => {
    selectCategoryLeaf(catName);
    setSearchQuery('');
    setActiveView('store');
    onClose();
    setTimeout(scrollToCatalog, 60);
    setTimeout(scrollToCatalog, 180);
    setTimeout(scrollToCatalog, 350);
  };

  const handleShowAll = () => {
    selectCategoryLeaf('Усі');
    setSearchQuery('');
    setActiveView('store');
    onClose();
    setTimeout(scrollToCatalog, 60);
    setTimeout(scrollToCatalog, 180);
    setTimeout(scrollToCatalog, 350);
  };

  const getCategoryTheme = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('інструмент') || lower.includes('обладнан')) {
      return {
        icon: <Wrench className="w-5 h-5 text-emerald-600" />,
        accentBg: 'bg-emerald-500',
        lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        badge: 'text-emerald-700 bg-emerald-50',
        borderHover: 'hover:border-emerald-300',
        colorName: 'Смарагдовий'
      };
    }
    if (lower.includes('господар') || lower.includes('хоз') || lower.includes('дім')) {
      return {
        icon: <Home className="w-5 h-5 text-indigo-600" />,
        accentBg: 'bg-indigo-500',
        lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        badge: 'text-indigo-700 bg-indigo-50',
        borderHover: 'hover:border-indigo-300',
        colorName: 'Індиго'
      };
    }
    if (lower.includes('сант') || lower.includes('вод') || lower.includes('труб')) {
      return {
        icon: <Droplets className="w-5 h-5 text-blue-600" />,
        accentBg: 'bg-blue-600',
        lightBg: 'bg-blue-50 text-blue-700 border-blue-100',
        badge: 'text-blue-700 bg-blue-50',
        borderHover: 'hover:border-blue-300',
        colorName: 'Синій'
      };
    }
    if (lower.includes('електр') || lower.includes('кабел') || lower.includes('освіт')) {
      return {
        icon: <Zap className="w-5 h-5 text-amber-500" />,
        accentBg: 'bg-amber-500',
        lightBg: 'bg-amber-50 text-amber-800 border-amber-100',
        badge: 'text-amber-800 bg-amber-50',
        borderHover: 'hover:border-amber-300',
        colorName: 'Бурштиновий'
      };
    }
    if (lower.includes('опал') || lower.includes('котел') || lower.includes('радіат')) {
      return {
        icon: <Flame className="w-5 h-5 text-rose-500" />,
        accentBg: 'bg-rose-500',
        lightBg: 'bg-rose-50 text-rose-700 border-rose-100',
        badge: 'text-rose-700 bg-rose-50',
        borderHover: 'hover:border-rose-300',
        colorName: 'Червоний'
      };
    }
    if (lower.includes('інш') || lower.includes('нерозподіл')) {
      return {
        icon: <Cog className="w-5 h-5 text-slate-600" />,
        accentBg: 'bg-slate-600',
        lightBg: 'bg-slate-50 text-slate-700 border-slate-100',
        badge: 'text-slate-700 bg-slate-50',
        borderHover: 'hover:border-slate-300',
        colorName: 'Графітовий'
      };
    }
    return {
      icon: <Sparkles className="w-5 h-5 text-red-500" />,
      accentBg: 'bg-red-600',
      lightBg: 'bg-red-50 text-red-700 border-red-100',
      badge: 'text-red-700 bg-red-50',
      borderHover: 'hover:border-red-300',
      colorName: 'Іскра'
    };
  };

  const currentMainObj = categoriesTree[activeMainTab] || {};
  const currentDirectLeaves = Array.isArray(currentMainObj?._leaves) ? currentMainObj._leaves : [];
  const currentSubCategories = Object.entries(currentMainObj || {}).filter(([k]) => k !== '_leaves');

  // Filter items if user typed in quick filter
  const q = filterQuery.trim().toLowerCase();
  const filteredSubCategories = q 
    ? currentSubCategories.filter(([subCatName, leaves]) => {
        if (subCatName.toLowerCase().includes(q)) return true;
        const items = Array.isArray(leaves) ? leaves : [];
        return items.some(item => item.toLowerCase().includes(q));
      })
    : currentSubCategories;

  const filteredDirectLeaves = q
    ? currentDirectLeaves.filter(leaf => leaf.toLowerCase().includes(q))
    : currentDirectLeaves;

  const activeTheme = getCategoryTheme(activeMainTab);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4 lg:p-6">
      {/* Backdrop with dark blur */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Catalog Window */}
      <div className="relative w-full max-w-6xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] z-50 animate-in zoom-in-95 fade-in duration-200">
        
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="bg-red-600 text-white font-black px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-display tracking-wider flex items-center gap-1.5 shadow-xs select-none">
              <Layers className="w-3.5 h-3.5" />
              <span>КАТАЛОГ</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-display leading-none text-white">
                Категорії товарів ISKRA
              </h2>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                Оберіть розділ для швидкого переходу до товарів
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleShowAll}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700/80 transition-all hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <PackageOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Усі товари ({products.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Закрити каталог"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View (Tabs / Sidebar on left, Detailed Content on right) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-50">
          
          {/* Left Column / Mobile Category Tabs */}
          <div className="md:w-72 lg:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 shrink-0 flex flex-col">
            <div className="p-3 sm:p-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Головні напрямки
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                {mainCategories.length} розділів
              </span>
            </div>

            {/* Main Categories Navigation List (Horizontal on mobile, vertical on tablet/desktop) */}
            <div className="overflow-x-auto md:overflow-x-hidden md:overflow-y-auto flex md:flex-col p-2 sm:p-2.5 gap-1.5 scrollbar-thin">
              {mainCategories.map((mainCatName) => {
                const isSelected = mainCatName === activeMainTab;
                const theme = getCategoryTheme(mainCatName);
                const count = categoryStats.mainCounts[mainCatName] || 0;

                return (
                  <button
                    key={mainCatName}
                    onClick={() => {
                      setActiveMainTab(mainCatName);
                      setFilterQuery('');
                    }}
                    className={`flex items-center justify-between text-left p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer shrink-0 md:shrink md:w-full border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        isSelected ? 'bg-white/10 text-white' : 'bg-slate-100'
                      }`}>
                        {theme.icon}
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs sm:text-sm font-bold truncate leading-tight ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}>
                          {mainCatName}
                        </span>
                        {count > 0 && (
                          <span className={`text-[10px] font-medium leading-none block mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {count} товарів
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-red-400 translate-x-0.5' : 'text-slate-500 hidden md:block'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Quick Action in Sidebar (Desktop) */}
            <div className="hidden md:block p-3 mt-auto border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => handleSelectCategory(activeMainTab)}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:text-red-600 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer group"
              >
                <span>Відкрити розділ «{activeMainTab}»</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Detailed Subcategories and Leaves */}
          <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
            
            {/* Context & Filter Bar */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-slate-100">
                  {activeTheme.icon}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    {activeMainTab}
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Оберіть потрібну підкатегорію або вид товару
                  </p>
                </div>
              </div>

              {/* Instant Search Filter inside category */}
              <div className="relative sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={`Фільтр у «${activeMainTab}»...`}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 outline-none transition-all placeholder:text-slate-400"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Subcategories Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
              
              {/* Direct Leaves (Tags) if any */}
              {filteredDirectLeaves.length > 0 && (
                <div className="mb-5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Швидкий доступ
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filteredDirectLeaves.map((leaf) => (
                      <button
                        key={leaf}
                        onClick={() => handleSelectCategory(leaf)}
                        className="text-xs font-semibold bg-slate-100 hover:bg-red-50 text-slate-800 hover:text-red-600 px-3 py-1.5 rounded-xl border border-slate-200/90 hover:border-red-200 transition-all cursor-pointer flex items-center gap-1.5 group active:scale-95"
                      >
                        <span>{leaf}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategories Cards */}
              {filteredSubCategories.length === 0 && filteredDirectLeaves.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2.5">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Нічого не знайдено за запитом</p>
                  <p className="text-xs text-slate-600 mt-1">Спробуйте змінити пошуковий запит або очистити фільтр</p>
                  <button
                    onClick={() => setFilterQuery('')}
                    className="mt-3 px-3 py-1 text-xs font-bold text-red-600 hover:underline"
                  >
                    Скинути фільтр
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {filteredSubCategories.map(([subCatName, leaves]) => {
                    const items = Array.isArray(leaves) ? leaves : [];
                    const subCount = categoryStats.subCounts[subCatName] || 0;

                    return (
                      <div 
                        key={subCatName} 
                        className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Subcategory Title Button */}
                          <button
                            onClick={() => handleSelectCategory(subCatName)}
                            className="w-full text-left flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 cursor-pointer"
                          >
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                                {subCatName}
                              </h4>
                              {subCount > 0 && (
                                <span className="text-[10px] font-semibold text-slate-600 block mt-0.5">
                                  {subCount} товарів у наявності
                                </span>
                              )}
                            </div>
                            <div className="p-1 rounded-lg bg-slate-50 group-hover:bg-red-50 text-slate-400 group-hover:text-red-600 transition-colors shrink-0 mt-0.5">
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>

                          {/* Nested Leaves List */}
                          {items.length > 0 && (
                            <ul className="space-y-1">
                              {items.slice(0, 6).map((leaf) => {
                                const leafCount = categoryStats.subCounts[leaf];
                                return (
                                  <li key={leaf}>
                                    <button
                                      onClick={() => handleSelectCategory(leaf)}
                                      className="text-xs text-slate-600 hover:text-red-600 transition-colors text-left flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50 w-full cursor-pointer group/leaf"
                                    >
                                      <span className="truncate group-hover/leaf:font-medium">
                                        {leaf}
                                      </span>
                                      {leafCount !== undefined && leafCount > 0 && (
                                        <span className="text-[10px] text-slate-600 font-mono shrink-0 ml-1.5">
                                          ({leafCount})
                                        </span>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                              {items.length > 6 && (
                                <li>
                                  <button
                                    onClick={() => handleSelectCategory(subCatName)}
                                    className="text-[11px] font-bold text-red-600 hover:text-red-700 py-1 px-1.5 flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Ще +{items.length - 6} підгруп...</span>
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>

                        {/* Quick Action Button at Bottom of Subcategory Card */}
                        <div className="pt-2.5 mt-2 border-t border-slate-50">
                          <button
                            onClick={() => handleSelectCategory(subCatName)}
                            className="w-full py-1.5 px-2.5 text-[11px] font-bold text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50/70 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Перейти до розділу</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Фізичний магазин та склад: <strong>с-ще. Оратів, Вінницька обл.</strong> · Відправка по всій Україні
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectCategory(activeMainTab)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Усі товари розділу «{activeMainTab}»
            </button>
            <button
              onClick={handleShowAll}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Весь асортимент</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
