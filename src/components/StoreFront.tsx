import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Hero } from './Hero';
import { ProductCard } from './ProductCard';
import { WeeklyDealSection } from './WeeklyDealSection';
import { ProductFilters } from './ProductFilters';
import { SubcategoryDirectory } from './SubcategoryDirectory';
import { StoreAboutSection } from './StoreAboutSection';
import { StoreReviewsSection } from './StoreReviewsSection';
import { StoreFaqSection } from './StoreFaqSection';
import { getProductBrand, matchProductSearch } from '../utils/brandHelper';
import { 
  Flame, 
  ArrowUpDown, 
  Phone, 
  CheckCircle2, 
  ShoppingBag,
  Heart,
  X,
  SlidersHorizontal,
  RotateCcw,
  Banknote,
  Tag,
  Droplets,
  Zap,
  Wrench,
  Home,
  Cog,
  LayoutGrid,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
  Sparkles,
  Check,
  Package
} from 'lucide-react';

const normalizeCategoryStem = (word: string): string => {
  return word.toLowerCase().replace(/[^a-zа-яієїґ0-9]/g, '').replace(/(?<=[а-яієїґ]{3,})[иіаяеоуів]$/g, '');
};

const matchSingleCategoryPhrase = (text: string, filter: string): boolean => {
  const t = text.toLowerCase().trim();
  const f = filter.toLowerCase().trim();
  if (t === f) return true;

  const tWords = t.split(/\s+/).map(normalizeCategoryStem).filter(w => w.length >= 2);
  const fWords = f.split(/\s+/).map(normalizeCategoryStem).filter(w => w.length >= 2);

  if (tWords.length === 0 || fWords.length === 0) return false;

  // Exact stem matching (both must have the exact same number of meaningful words matching)
  // This correctly matches "Розетка" <=> "Розетки", "Автоматичні вимикачі" <=> "Вимикач автоматичний",
  // but strictly avoids matching "Розетки з заземленням" when filtering by "Розетка",
  // and avoids matching "Вимикач автоматичний" when filtering by "Автомат" or "Вимикач".
  if (tWords.length === fWords.length) {
    return fWords.every(fw => tWords.some(tw => tw === fw || tw.startsWith(fw) || fw.startsWith(tw)));
  }

  return false;
};

const matchCategoryOrLeaf = (text: string, filter: string): boolean => {
  if (!text || !filter) return false;
  const parts = filter.split(/[,/|]/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.some(part => matchSingleCategoryPhrase(text, part));
  }
  return matchSingleCategoryPhrase(text, filter);
};

export const StoreFront: React.FC = () => {
  const { 
    products, 
    categoriesTree,
    wishlist,
    showWishlistOnly,
    setShowWishlistOnly,
    activeCategory, 
    setActiveCategory, 
    selectedSubCategory,
    setSelectedSubCategory,
    selectedLeafTag,
    setSelectedLeafTag,
    selectCategoryLeaf,
    searchQuery,
    setSearchQuery,
    sortOption, 
    setSortOption,
    siteSettings,
    siteTheme
  } = useStore();

  const isPremium = siteTheme === 'premium';

  // Pagination State (30 items per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Price & Brand filter states
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);


  // Reset pagination to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeCategory, 
    selectedSubCategory, 
    selectedLeafTag, 
    searchQuery, 
    minPrice, 
    maxPrice, 
    selectedBrands, 
    sortOption, 
    showWishlistOnly,
    pageSize
  ]);

  // Distinct Bestseller products ("Хіти продажу")
  const hitsProducts = useMemo(() => {
    return products.filter((p) => p.badge === 'Хіт продажу' || p.badge === 'Акція');
  }, [products]);

  // 1. Base category & search scope
  const scopeProducts = useMemo(() => {
    let list = [...products];

    // Filter by Wishlist if showWishlistOnly is active
    if (showWishlistOnly) {
      list = list.filter((p) => p?.id && wishlist.includes(p.id));
    } else {
      // Filter by Search Query from Header (supports multi-word, brand, manufacturer, specs, sku)
      if (searchQuery && searchQuery.trim() !== '') {
        list = list.filter((p) => matchProductSearch(p, searchQuery));
      }

      // Filter by Category from Header Catalog
      if (activeCategory && activeCategory !== 'Усі') {
        const cat = activeCategory.toLowerCase();
        list = list.filter((p) => 
          (p.mainCategory && p.mainCategory.toLowerCase().includes(cat)) ||
          p.category.toLowerCase().includes(cat) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(cat)) ||
          p.name.toLowerCase().includes(cat)
        );
      }

      // Filter by Specific Tag / Leaf click or Subcategory Card selection
      if (selectedLeafTag) {
        const leaf = selectedLeafTag;
        list = list.filter((p) => 
          matchCategoryOrLeaf(p.category, leaf)
        );
      } else if (selectedSubCategory) {
        const sub = selectedSubCategory;
        list = list.filter((p) => 
          (p.subCategory && matchCategoryOrLeaf(p.subCategory, sub)) ||
          matchCategoryOrLeaf(p.category, sub) ||
          (p.mainCategory && matchCategoryOrLeaf(p.mainCategory, sub))
        );
      }
    }

    return list;
  }, [products, showWishlistOnly, wishlist, searchQuery, activeCategory, selectedSubCategory, selectedLeafTag]);

  // 2. Available brands with item counts for current scope
  const availableBrandsWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    scopeProducts.forEach((p) => {
      const b = getProductBrand(p);
      map.set(b, (map.get(b) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'uk'));
  }, [scopeProducts]);

  // 3. Dynamic Price min & max limits
  const { catalogMinPrice, catalogMaxPrice } = useMemo(() => {
    if (scopeProducts.length === 0) return { catalogMinPrice: 0, catalogMaxPrice: 0 };
    let min = Infinity;
    let max = -Infinity;
    scopeProducts.forEach((p) => {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    });
    return { 
      catalogMinPrice: min === Infinity ? 0 : min, 
      catalogMaxPrice: max === -Infinity ? 0 : max 
    };
  }, [scopeProducts]);

  // 4. Final filtered & sorted products by Price and Brand
  const displayProducts = useMemo(() => {
    let list = scopeProducts.filter((p) => {
      // Filter by min price
      if (minPrice !== '' && p.price < minPrice) return false;
      // Filter by max price
      if (maxPrice !== '' && p.price > maxPrice) return false;
      // Filter by selected brands
      if (selectedBrands.length > 0) {
        const b = getProductBrand(p);
        if (!selectedBrands.includes(b)) return false;
      }
      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (sortOption === 'price-asc') return a.price - b.price;
      if (sortOption === 'price-desc') return b.price - a.price;
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name, 'uk');
      return 0;
    });

    return list;
  }, [scopeProducts, minPrice, maxPrice, selectedBrands, sortOption]);

  // Pagination computations
  const effectivePageSize = pageSize === -1 ? (displayProducts.length || 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(displayProducts.length / effectivePageSize));
  const currentSafePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return displayProducts;
    const startIndex = (currentSafePage - 1) * pageSize;
    return displayProducts.slice(startIndex, startIndex + pageSize);
  }, [displayProducts, currentSafePage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setTimeout(() => {
      const el = document.getElementById('catalog-products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const getPaginationRange = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, currentSafePage - delta); i <= Math.min(totalPages - 1, currentSafePage + delta); i++) {
      range.push(i);
    }
    if (currentSafePage - delta > 2) {
      range.unshift('...');
    }
    if (currentSafePage + delta < totalPages - 1) {
      range.push('...');
    }
    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }
    return range;
  };

  const hasPriceFilter = minPrice !== '' || maxPrice !== '';
  const hasBrandFilter = selectedBrands.length > 0;
  const hasCustomFilter = hasPriceFilter || hasBrandFilter;
  const hasCategoryOrSearchFilter = (activeCategory && activeCategory !== 'Усі') || (searchQuery && searchQuery.trim() !== '');

  const activeFiltersCount = (hasPriceFilter ? 1 : 0) + selectedBrands.length;

  const handlePriceChange = (min: number | '', max: number | '') => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  const handleToggleBrand = (brand: string) => {
    setSelectedBrands((prev) => 
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleClearBrands = () => {
    setSelectedBrands([]);
  };

  const handleResetCustomFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedBrands([]);
  };

  const handleResetAllFilters = () => {
    handleResetCustomFilters();
    setActiveCategory('Усі');
    setSearchQuery('');
  };

  return (
    <div>
      {/* Hero Banner (hidden when viewing favorites) */}
      {!showWishlistOnly && <Hero />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        
        {/* Wishlist Header Banner when viewing favorites */}
        {showWishlistOnly && (
          <div className="bg-red-50/90 border border-red-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30 shrink-0">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 leading-tight">
                  Обрані товари
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  {displayProducts.length === 1 
                    ? 'У вашому списку обраного 1 товар' 
                    : `У вашому списку обраного ${displayProducts.length} товарів`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowWishlistOnly(false)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
            >
              ← Повернутися до всіх товарів
            </button>
          </div>
        )}

        {/* Deal of the Week (Акція тижня) */}
        {!hasCategoryOrSearchFilter && !hasCustomFilter && !showWishlistOnly && <WeeklyDealSection />}

        {/* Dedicated "Хіти продажу" Section (hidden when viewing favorites or filtered) */}
        {!showWishlistOnly && !hasCustomFilter && (
          <section id="hits-section" className={`scroll-mt-24 space-y-5 rounded-3xl transition-all relative overflow-hidden ${
            isPremium 
              ? 'p-6 sm:p-7 bg-gradient-to-b from-[#0e1628]/95 via-[#0b101f] to-[#070b14] border border-amber-500/40 shadow-xl shadow-amber-950/30 text-white' 
              : 'p-6 sm:p-7 bg-white border border-red-300/80 shadow-md shadow-red-500/5 text-slate-900'
          }`}>
            {/* Ambient top highlight edge - refined & softer */}
            <div className={`absolute inset-x-0 top-0 h-px pointer-events-none z-10 ${
              isPremium 
                ? 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent' 
                : 'bg-gradient-to-r from-transparent via-red-400/40 to-transparent'
            }`} />

            {/* Ambient corner light glow */}
            <div className={`absolute top-0 right-0 w-60 h-60 rounded-full blur-2xl pointer-events-none ${
              isPremium 
                ? 'bg-gradient-to-br from-amber-500/15 via-orange-600/8 to-transparent' 
                : 'bg-gradient-to-br from-red-500/8 via-orange-500/4 to-transparent'
            }`} />

            {/* Ambient bottom highlight edge */}
            <div className={`absolute inset-x-0 bottom-0 h-px pointer-events-none z-10 ${
              isPremium 
                ? 'bg-gradient-to-r from-transparent via-amber-500/30 to-transparent' 
                : 'bg-gradient-to-r from-transparent via-red-500/20 to-transparent'
            }`} />

            <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b pb-4 relative z-10 ${
              isPremium ? 'border-slate-800' : 'border-slate-200/80'
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {/* Premium Flame Icon Badge before 'Хіти продажу' */}
                  <span className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/35 ring-1 ring-orange-400/40">
                    <Flame className="w-5 h-5 text-white fill-amber-200 animate-pulse drop-shadow-sm" />
                  </span>
                  <h2 className={`text-xl sm:text-2xl font-black font-display tracking-tight ${
                    isPremium ? 'text-white' : 'text-slate-950'
                  }`}>
                    Хіти продажу
                  </h2>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md font-mono ${
                    isPremium 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950' 
                      : 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-red-600/30'
                  }`}>
                    {isPremium ? 'FLAGSHIP BESTSELLERS' : 'ТОП ВИБІР МАЙСТРІВ'}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm font-medium ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                  Найбільш популярні та перевірені майстрами позиції за вигідною ціною
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                  isPremium 
                    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' 
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Все в наявності на складі в Оратові</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 relative z-10">
              {hitsProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Category Quick Navigation Cards */}
        {!showWishlistOnly && (
          <section className={`rounded-3xl p-5 sm:p-7 space-y-5 transition-all ${
            isPremium 
              ? 'bg-[#0c1220]/80 backdrop-blur-md border border-slate-800 shadow-2xl text-white' 
              : 'bg-white border border-slate-200/90 shadow-sm text-slate-900'
          }`}>
            {/* Header with Title and Interactive Design Switcher */}
            <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b ${
              isPremium ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-2 bg-gradient-to-tr from-red-600 via-orange-600 to-amber-500 text-white rounded-2xl shadow-md shadow-red-600/30">
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                  <h2 className={`text-xl sm:text-2xl font-black font-display tracking-tight ${
                    isPremium ? 'text-white' : 'text-slate-950'
                  }`}>
                    Категорії товарів
                  </h2>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full hidden sm:inline-block border ${
                    isPremium 
                      ? 'bg-slate-900 text-slate-300 border-slate-700' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {Object.keys(categoriesTree).length} основних розділів
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                  Оберіть напрямок для перегляду підрозділів, креслень та брендів
                </p>
              </div>

              {/* Category Quick Actions */}
              {activeCategory !== 'Усі' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('Усі');
                      setSelectedSubCategory(null);
                      setSelectedLeafTag(null);
                    }}
                    className="px-3.5 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Всі категорії</span>
                  </button>
                </div>
              )}
            </div>

            {/* CATEGORY SHOWCASE */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 animate-in fade-in duration-300">
              {Object.keys(categoriesTree).map((catName) => {
                const isActive = activeCategory === catName;
                const lower = catName.toLowerCase();

                // Specific themed colors, icons, and curated tags for the 4 primary hardware pillars
                let theme = {
                  gradient: 'from-blue-600 via-sky-500 to-cyan-500',
                  border: isPremium ? 'border-blue-900/40 hover:border-blue-500/50' : 'border-blue-100 hover:border-blue-300',
                  bgCard: isPremium ? 'bg-gradient-to-br from-blue-950/30 via-[#0a0f1d] to-[#070b14]' : 'bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30',
                  badge: isPremium ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100/80 text-blue-900 border-blue-200/60',
                  activeBorder: 'border-2 border-sky-500 ring-4 ring-sky-500/15 shadow-xl shadow-sky-500/10',
                  activeBg: 'bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white',
                  activeBadge: 'bg-sky-600 text-white border-sky-500 shadow-xs',
                  activeText: 'text-sky-950',
                  activeStatus: 'text-sky-600',
                  icon: <Droplets className="w-6 h-6 text-white" />,
                  chipColor: isPremium 
                    ? 'hover:bg-blue-600 hover:text-white border-slate-800 text-slate-300 bg-slate-900/90' 
                    : 'hover:bg-blue-600 hover:text-white border-blue-200 text-blue-900 bg-white/90',
                  chips: ['Змішувачі', 'Радіатори', 'Труби та фітинги', 'Насоси', 'Сифони'],
                  popularBrands: ['Grohe', 'Valtec', 'Cersanit']
                };

                if (lower.includes('інш') || lower.includes('нерозподіл')) {
                  theme = {
                    gradient: 'from-sky-600 via-blue-600 to-indigo-600',
                    border: isPremium ? 'border-sky-900/40 hover:border-sky-500/50' : 'border-sky-100 hover:border-sky-300',
                    bgCard: isPremium ? 'bg-gradient-to-br from-slate-950/30 via-[#0a0f1d] to-[#070b14]' : 'bg-gradient-to-br from-sky-50/40 via-white to-slate-50/30',
                    badge: isPremium ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-sky-100/80 text-sky-950 border-sky-200/60',
                    activeBorder: 'border-2 border-sky-500 ring-4 ring-sky-500/15 shadow-xl shadow-sky-500/10',
                    activeBg: 'bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white',
                    activeBadge: 'bg-sky-600 text-white border-sky-500 shadow-xs',
                    activeText: 'text-sky-950',
                    activeStatus: 'text-sky-600',
                    icon: <Cog className="w-6 h-6 text-white" />,
                    chipColor: isPremium
                      ? 'hover:bg-sky-600 hover:text-white border-slate-800 text-slate-300 bg-slate-900/90'
                      : 'hover:bg-sky-600 hover:text-white border-sky-200 text-sky-950 bg-white/90',
                    chips: ['Спецкріплення', 'Витратні матеріали', 'Аксесуари', 'Комплектуючі'],
                    popularBrands: ['Iskra', 'MasterTool', 'Hardy']
                  };
                } else if (lower.includes('електр')) {
                  theme = {
                    gradient: 'from-amber-500 via-orange-500 to-yellow-500',
                    border: isPremium ? 'border-amber-900/40 hover:border-amber-500/50' : 'border-amber-100 hover:border-amber-300',
                    bgCard: isPremium ? 'bg-gradient-to-br from-amber-950/30 via-[#0a0f1d] to-[#070b14]' : 'bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30',
                    badge: isPremium ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100/80 text-amber-950 border-amber-200/60',
                    activeBorder: 'border-2 border-amber-500 ring-4 ring-amber-500/15 shadow-xl shadow-amber-500/10',
                    activeBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white',
                    activeBadge: 'bg-amber-600 text-white border-amber-500 shadow-xs',
                    activeText: 'text-amber-950',
                    activeStatus: 'text-amber-600',
                    icon: <Zap className="w-6 h-6 text-white" />,
                    chipColor: isPremium
                      ? 'hover:bg-amber-600 hover:text-white border-slate-800 text-slate-300 bg-slate-900/90'
                      : 'hover:bg-amber-600 hover:text-white border-amber-200 text-amber-950 bg-white/90',
                    chips: ['Автоматичні вимикачі', 'Кабель та провід', 'Розетки', 'LED лампи', 'Світильники', 'Щитки'],
                    popularBrands: ['WAGO', 'Schneider', 'Hager']
                  };
                } else if (lower.includes('інструмент')) {
                  theme = {
                    gradient: 'from-emerald-600 via-teal-500 to-emerald-500',
                    border: isPremium ? 'border-emerald-900/40 hover:border-emerald-500/50' : 'border-emerald-100 hover:border-emerald-300',
                    bgCard: isPremium ? 'bg-gradient-to-br from-emerald-950/30 via-[#0a0f1d] to-[#070b14]' : 'bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30',
                    badge: isPremium ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100/80 text-emerald-950 border-emerald-200/60',
                    activeBorder: 'border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl shadow-emerald-500/10',
                    activeBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white',
                    activeBadge: 'bg-emerald-600 text-white border-emerald-500 shadow-xs',
                    activeText: 'text-emerald-950',
                    activeStatus: 'text-emerald-600',
                    icon: <Wrench className="w-6 h-6 text-white" />,
                    chipColor: isPremium
                      ? 'hover:bg-emerald-600 hover:text-white border-slate-800 text-slate-300 bg-slate-900/90'
                      : 'hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-950 bg-white/90',
                    chips: ['Дрилі та шурупокрути', 'Болгарки (КШМ)', 'Ручний інструмент', 'Свердла'],
                    popularBrands: ['Bosch', 'DeWalt', 'Dnipro-M']
                  };
                } else if (lower.includes('господар')) {
                  theme = {
                    gradient: 'from-indigo-600 via-violet-500 to-purple-500',
                    border: isPremium ? 'border-indigo-900/40 hover:border-indigo-500/50' : 'border-indigo-100 hover:border-indigo-300',
                    bgCard: isPremium ? 'bg-gradient-to-br from-indigo-950/30 via-[#0a0f1d] to-[#070b14]' : 'bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30',
                    badge: isPremium ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100/80 text-indigo-950 border-indigo-200/60',
                    activeBorder: 'border-2 border-indigo-500 ring-4 ring-indigo-500/15 shadow-xl shadow-indigo-500/10',
                    activeBg: 'bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white',
                    activeBadge: 'bg-indigo-600 text-white border-indigo-500 shadow-xs',
                    activeText: 'text-indigo-950',
                    activeStatus: 'text-indigo-600',
                    icon: <Home className="w-6 h-6 text-white" />,
                    chipColor: isPremium
                      ? 'hover:bg-indigo-600 hover:text-white border-slate-800 text-slate-300 bg-slate-900/90'
                      : 'hover:bg-indigo-600 hover:text-white border-indigo-200 text-indigo-950 bg-white/90',
                    chips: ['Замки та ручки', 'Дюбелі та кріплення', 'Драбини', 'Господарський інвентар'],
                    popularBrands: ['Apecs', 'Hardy', 'MasterTool']
                  };
                }

                const catCount = products.filter((p) => 
                  (p.mainCategory && p.mainCategory.toLowerCase().includes(lower)) ||
                  p.category.toLowerCase().includes(lower)
                ).length;

                const handleToggleCategory = () => {
                  if (activeCategory === catName) {
                    setActiveCategory('Усі');
                  } else {
                    setActiveCategory(catName);
                    setSelectedSubCategory(null);
                    setSelectedLeafTag(null);
                    // Smoothly scroll down to "Каталог > [Категорія]"
                    setTimeout(() => {
                      const el = document.getElementById('subcategory-gallery-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        const fallbackEl = document.getElementById('catalog-products-section');
                        if (fallbackEl) fallbackEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }
                };

                return (
                  <div
                    key={catName}
                    onClick={handleToggleCategory}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleCategory();
                      }
                    }}
                    className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-300 group flex flex-col justify-between border cursor-pointer select-none ${
                      isActive
                        ? isPremium
                          ? 'bg-gradient-to-br from-[#121c33] via-[#0d1424] to-[#080c16] text-white border-2 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                          : `${theme.activeBg} ${theme.activeBorder} scale-[1.01]`
                        : isPremium
                        ? 'bg-gradient-to-br from-[#0e1628]/95 via-[#0a0f1d] to-[#070b14] border-white/10 hover:border-amber-400/50 text-white shadow-xl hover:shadow-[0_12px_30px_rgba(234,88,12,0.15)] hover:-translate-y-1'
                        : `${theme.bgCard} ${theme.border} shadow-sm hover:shadow-xl hover:-translate-y-1`
                    }`}
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${theme.gradient} transition-all`} />

                    {/* Header Row: 3D Badge + Counter */}
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${theme.gradient} flex items-center justify-center shadow-lg shadow-black/10 group-hover:scale-105 transition-transform duration-300`}>
                        {theme.icon}
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-black font-mono px-2.5 py-1 rounded-full border shadow-2xs inline-block transition-colors ${
                          isActive
                            ? isPremium
                              ? 'bg-slate-900 text-amber-300 border-slate-700'
                              : theme.activeBadge
                            : isPremium
                            ? 'bg-slate-900 text-amber-300 border-slate-700'
                            : theme.badge
                        }`}>
                          {catCount} товарів
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="my-4">
                      <h3 className={`font-black text-lg sm:text-xl font-display tracking-tight leading-tight transition-colors ${
                        isActive 
                          ? isPremium 
                            ? 'text-white' 
                            : theme.activeText 
                          : isPremium 
                          ? 'text-white group-hover:text-amber-400' 
                          : 'text-slate-900'
                      }`}>
                        {catName}
                      </h3>

                      {/* Interactive Clickable Subcategory Quick Chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {theme.chips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategory(catName);
                              setSelectedSubCategory(chip);
                              setSelectedLeafTag(null);
                              setTimeout(() => {
                                const el = document.getElementById('catalog-products-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-white/90 text-slate-800 border-slate-300 hover:bg-slate-900 hover:text-white'
                                : isPremium
                                ? 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                                : theme.chipColor
                            }`}
                            title={`Перейти до підкатегорії: ${chip}`}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Footer: Popular Brands + Action Indicator */}
                    <div className={`pt-3 border-t flex items-center justify-between gap-2 text-xs font-bold ${
                      isActive ? 'border-black/5' : isPremium ? 'border-slate-800' : 'border-slate-200/80'
                    }`}>
                      <div className="text-[10px] font-medium text-slate-400 truncate">
                        Бренди: <span className={`font-bold ${isPremium ? 'text-slate-200' : 'text-slate-600'}`}>{theme.popularBrands.join(', ')}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black transition-all ${
                          isActive 
                            ? isPremium 
                              ? 'text-amber-400' 
                              : theme.activeStatus 
                            : isPremium 
                            ? 'text-amber-400 group-hover:text-amber-300' 
                            : 'text-slate-600 group-hover:text-slate-900'
                        }`}
                      >
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{isActive ? 'Обрано' : 'Каталог'}</span>
                        {!isActive && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Subcategory Directory (Showcase Gallery with Photos like in 2nd photo) */}
        {!showWishlistOnly && activeCategory && activeCategory !== 'Усі' && (
          <section id="subcategory-gallery-section" className="scroll-mt-24">
            <SubcategoryDirectory 
              mainCategory={activeCategory}
              selectedSubCategory={selectedSubCategory}
              onSelectSubCategory={(subCat, leafTag) => {
                setSelectedSubCategory(subCat);
                setSelectedLeafTag(leafTag || null);
                setTimeout(() => {
                  const el = document.getElementById('catalog-products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              onSelectBrand={(subCat, brand) => {
                setSelectedSubCategory(subCat);
                setSelectedLeafTag(null);
                setSelectedBrands([brand]);
                setTimeout(() => {
                  const el = document.getElementById('catalog-products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            />
          </section>
        )}

        {/* Main Catalog Section with Filters */}
        <section id="catalog-products-section" className="space-y-6 pt-4 scroll-mt-20">
          
          {/* Top Bar with Title, Filter Drawer Button on mobile, and Sorting */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            
            {/* Title & Counter */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl text-white ${isPremium ? 'bg-gradient-to-tr from-red-600 to-amber-500 shadow-md shadow-red-600/30' : 'bg-slate-900'}`}>
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-lg font-black font-display leading-tight ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                    {showWishlistOnly 
                      ? 'Обрані товари' 
                      : (activeCategory && activeCategory !== 'Усі' ? activeCategory : 'Каталог сантехніки та товарів')}
                  </h3>
                  {selectedSubCategory && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      isPremium 
                        ? 'bg-red-500/20 border-red-500/30 text-red-300' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      <ChevronRight className="w-3 h-3 text-red-400" />
                      <span>{selectedSubCategory}</span>
                      {selectedLeafTag && <span className="font-normal text-red-400">({selectedLeafTag})</span>}
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedSubCategory(null);
                          setSelectedLeafTag(null);
                        }}
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Скинути підкатегорію"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                  {displayProducts.length} позицій знайдено {totalPages > 1 && `(сторінка ${currentSafePage} з ${totalPages})`}
                </span>
              </div>
            </div>

            {/* Actions: Mobile Filter Button & Sort Dropdown */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              {/* Mobile filter button (< lg) */}
              {!showWishlistOnly && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className={`lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs active:scale-95 cursor-pointer border ${
                    isPremium 
                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
                  <span>Фільтри</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`hidden md:inline-flex items-center gap-1 font-medium ${
                  isPremium ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <ArrowUpDown className="w-3.5 h-3.5" /> Сортування:
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold outline-none transition-colors shadow-xs cursor-pointer border ${
                    isPremium 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-red-500' 
                      : 'border-slate-300 bg-white text-slate-800 focus:border-red-600'
                  }`}
                >
                  <option value="default">За замовчуванням</option>
                  <option value="price-asc">Від дешевших до дорогих</option>
                  <option value="price-desc">Від дорогих до дешевших</option>
                  <option value="name-asc">За назвою (А - Я)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Search Notification Banner */}
          {searchQuery && (
            <div className={`rounded-2xl p-3.5 flex items-center justify-between text-xs font-medium border ${
              isPremium 
                ? 'bg-red-950/40 border-red-900/60 text-red-200' 
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}>
              <div>
                Результати пошуку за запитом: <b className="text-red-400 font-bold">«{searchQuery}»</b> ({displayProducts.length} знайдено)
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-red-400 hover:text-red-200 font-bold text-xs underline cursor-pointer"
              >
                Очистити
              </button>
            </div>
          )}

          {/* Active Filter Chips / Tags Bar */}
          {hasCustomFilter && (
            <div className={`flex flex-wrap items-center gap-2 p-3 rounded-2xl text-xs border ${
              isPremium 
                ? 'bg-[#0c1220] border-slate-800 text-slate-300' 
                : 'bg-slate-100/80 border border-slate-200 text-slate-800'
            }`}>
              <span className={`font-semibold mr-1 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                Активні фільтри:
              </span>

              {/* Price filter chip */}
              {hasPriceFilter && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold shadow-2xs border ${
                  isPremium 
                    ? 'bg-slate-900 border-slate-700 text-slate-200' 
                    : 'bg-white border border-slate-300 text-slate-800'
                }`}>
                  <Banknote className="w-3 h-3 text-red-500" />
                  <span>
                    Ціна: {minPrice !== '' ? `${minPrice} грн` : 'від 0'} — {maxPrice !== '' ? `${maxPrice} грн` : 'до макс.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePriceChange('', '')}
                    className="p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Видалити фільтр ціни"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Selected Brand chips */}
              {selectedBrands.map((b) => (
                <span
                  key={b}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold shadow-2xs border ${
                    isPremium 
                      ? 'bg-slate-900 border-slate-700 text-slate-200' 
                      : 'bg-white border border-slate-300 text-slate-800'
                  }`}
                >
                  <Tag className="w-3 h-3 text-red-500" />
                  <span>{b}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleBrand(b)}
                    className="p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={`Видалити бренд ${b}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Reset all button */}
              <button
                type="button"
                onClick={handleResetCustomFilters}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold text-xs transition-colors ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Скинути фільтри</span>
              </button>
            </div>
          )}

          {/* Main 2-Column Section: Sidebar on Desktop + Products Grid */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Desktop & Mobile Filters Component */}
            {!showWishlistOnly && (
              <ProductFilters
                minLimit={catalogMinPrice}
                maxLimit={catalogMaxPrice}
                currentMinPrice={minPrice}
                currentMaxPrice={maxPrice}
                onPriceChange={handlePriceChange}
                availableBrands={availableBrandsWithCounts}
                selectedBrands={selectedBrands}
                onToggleBrand={handleToggleBrand}
                onClearBrands={handleClearBrands}
                onResetAll={handleResetCustomFilters}
                hasActiveFilters={hasCustomFilter}
                totalFilteredCount={displayProducts.length}
                isMobileDrawerOpen={isMobileFilterOpen}
                setIsMobileDrawerOpen={setIsMobileFilterOpen}
              />
            )}

            {/* Products Grid Column */}
            <div className="flex-1 w-full min-w-0">
              {displayProducts.length === 0 ? (
                <div className={`rounded-3xl p-10 text-center max-w-lg mx-auto space-y-4 border transition-all ${
                  isPremium 
                    ? 'bg-[#0c1220]/90 backdrop-blur-xl border-slate-800 text-slate-100 shadow-2xl' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}>
                  {showWishlistOnly ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                        <Heart className="w-6 h-6" />
                      </div>
                      <h3 className={`text-base font-bold font-display ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                        У списку обраного поки немає товарів
                      </h3>
                      <p className={`text-xs ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                        Натисніть на сердечко в картці будь-якого товару в каталозі, щоб додати його до обраного.
                      </p>
                      <button
                        onClick={() => setShowWishlistOnly(false)}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        Перейти до каталогу
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                        isPremium ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <SlidersHorizontal className="w-6 h-6" />
                      </div>
                      <h3 className={`text-base font-bold font-display ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                        За вибраними фільтрами товарів не знайдено
                      </h3>
                      <p className={`text-xs max-w-sm mx-auto ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                        Спробуйте розширити діапазон цін або обрати інших виробників сантехніки та електрики.
                      </p>
                      <button
                        onClick={handleResetAllFilters}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/30 cursor-pointer"
                      >
                        Скинути всі фільтри
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Product Cards Grid (30 items per page) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3.5 sm:gap-5">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Pagination Bar (When items exist) */}
                  {displayProducts.length > 0 && (
                    <div className={`rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${
                      isPremium 
                        ? 'bg-[#0c1220]/90 backdrop-blur-xl border-slate-800 text-slate-100 shadow-2xl' 
                        : 'bg-white border-slate-200/90 text-slate-800'
                    }`}>
                      
                      {/* Left: Summary Info */}
                      <div className={`text-xs font-medium text-center md:text-left flex items-center gap-2 ${
                        isPremium ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <span className={`p-1.5 rounded-lg ${isPremium ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                          <Package className="w-3.5 h-3.5" />
                        </span>
                        <span>
                          Показано <b className={`font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{pageSize === -1 ? 1 : (currentSafePage - 1) * pageSize + 1}</b>
                          –<b className={`font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{pageSize === -1 ? displayProducts.length : Math.min(currentSafePage * pageSize, displayProducts.length)}</b> із <b className={`font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{displayProducts.length}</b> товарів
                          {totalPages > 1 && (
                            <span className="text-slate-400 ml-1.5">
                              (Сторінка {currentSafePage} з {totalPages})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Center: Numeric & Arrow Pagination Buttons */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                          {/* Previous button */}
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentSafePage - 1)}
                            disabled={currentSafePage === 1}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              currentSafePage === 1
                                ? isPremium 
                                  ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed' 
                                  : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                : isPremium
                                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                            }`}
                            aria-label="Попередня сторінка"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Попередня</span>
                          </button>

                          {/* Page numbers */}
                          {getPaginationRange().map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400 font-mono">
                                  ...
                                </span>
                              );
                            }
                            const pageNum = Number(p);
                            const isActive = pageNum === currentSafePage;

                            return (
                              <button
                                key={`page-${pageNum}`}
                                type="button"
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                  isActive
                                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                                    : isPremium
                                    ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          {/* Next button */}
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentSafePage + 1)}
                            disabled={currentSafePage === totalPages}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              currentSafePage === totalPages
                                ? isPremium
                                  ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
                                  : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                : isPremium
                                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                            }`}
                            aria-label="Наступна сторінка"
                          >
                            <span className="hidden sm:inline">Наступна</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Right: Page Size Selector */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`hidden sm:inline ${isPremium ? 'text-slate-400' : 'text-slate-400'}`}>На сторінці:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer transition-colors ${
                            isPremium 
                              ? 'border-slate-700 bg-slate-900 text-white focus:border-red-500' 
                              : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-red-600'
                          }`}
                        >
                          <option value={30}>30 товарів</option>
                          <option value={60}>60 товарів</option>
                          <option value={90}>90 товарів</option>
                          <option value={-1}>Всі товари</option>
                        </select>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </section>

        {/* 3. About ISKRA Store Section */}
        {!showWishlistOnly && <StoreAboutSection />}

        {/* 4. Customer Reviews Section */}
        {!showWishlistOnly && (siteSettings.features?.reviewsEnabled ?? true) && <StoreReviewsSection />}

        {/* 5. Frequently Asked Questions & Delivery/Payment Policy */}
        {!showWishlistOnly && <StoreFaqSection />}

      </main>
    </div>
  );
};
