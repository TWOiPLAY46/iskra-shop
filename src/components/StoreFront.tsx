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

export const StoreFront: React.FC = () => {
  const { 
    products, 
    categoriesTree,
    wishlist,
    showWishlistOnly,
    setShowWishlistOnly,
    activeCategory, 
    setActiveCategory, 
    searchQuery,
    setSearchQuery,
    sortOption, 
    setSortOption,
    siteSettings 
  } = useStore();

  // Pagination State (30 items per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Price & Brand filter states
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedLeafTag, setSelectedLeafTag] = useState<string | null>(null);
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

      // Filter by Subcategory Card selection
      if (selectedSubCategory) {
        const sub = selectedSubCategory.toLowerCase();
        list = list.filter((p) => 
          (p.subCategory && p.subCategory.toLowerCase().includes(sub)) ||
          p.category.toLowerCase().includes(sub) ||
          p.name.toLowerCase().includes(sub) ||
          (p.specs && Object.values(p.specs).some((v: any) => String(v).toLowerCase().includes(sub)))
        );
      }

      // Filter by Specific Tag / Leaf click
      if (selectedLeafTag) {
        const leaf = selectedLeafTag.toLowerCase();
        list = list.filter((p) => 
          p.name.toLowerCase().includes(leaf) ||
          p.category.toLowerCase().includes(leaf) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(leaf)) ||
          (p.desc && p.desc.toLowerCase().includes(leaf)) ||
          (p.specs && Object.values(p.specs).some((v: any) => String(v).toLowerCase().includes(leaf)))
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
          <section id="hits-section" className="scroll-mt-24 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <Flame className="w-5 h-5 fill-red-600" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-slate-950 tracking-tight">
                    Хіти продажу
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Найбільш популярні та перевірені майстрами позиції за вигідною ціною
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Все в наявності на складі</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              {hitsProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Category Quick Navigation Cards */}
        {!showWishlistOnly && (
          <section className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-600 text-white rounded-xl shadow-xs">
                    <LayoutGrid className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black font-display text-slate-950 tracking-tight">
                    Основні категорії каталогу
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hidden sm:inline-block">
                    4 розділи
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Натисніть на категорію для швидкого перегляду підкатегорій з фото, схемами та виробниками
                </p>
              </div>

              {activeCategory !== 'Усі' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('Усі');
                    setSelectedSubCategory(null);
                    setSelectedLeafTag(null);
                  }}
                  className="self-start sm:self-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Показати всі категорії</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(categoriesTree).map((catName) => {
                const isActive = activeCategory === catName;
                const lower = catName.toLowerCase();

                let icon = <Droplets className="w-5 h-5 text-white" />;
                let iconBg = "bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md shadow-blue-500/30";
                let cardBg = "bg-gradient-to-b from-blue-50/90 via-sky-50/40 to-white hover:from-blue-100/90 hover:to-white";
                let borderColor = "border-blue-200/90 hover:border-blue-400 hover:ring-2 hover:ring-blue-400/20";
                let topStripe = "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400";
                let badgeBg = "bg-blue-100 text-blue-900 border-blue-200";
                let subItems = "Змішувачі · Радіатори · Труби · Насоси";
                let subCount = "4 підрозділи";
                let Watermark = Droplets;

                if (lower.includes('електр')) {
                  icon = <Zap className="w-5 h-5 text-white" />;
                  iconBg = "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-md shadow-amber-500/30";
                  cardBg = "bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-white hover:from-amber-100/90 hover:to-white";
                  borderColor = "border-amber-200/90 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20";
                  topStripe = "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400";
                  badgeBg = "bg-amber-100 text-amber-950 border-amber-200";
                  subItems = "Освітлення · Розетки · Автомати · Кабель";
                  subCount = "6 підрозділів";
                  Watermark = Zap;
                } else if (lower.includes('інструмент')) {
                  icon = <Wrench className="w-5 h-5 text-white" />;
                  iconBg = "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/30";
                  cardBg = "bg-gradient-to-b from-emerald-50/90 via-teal-50/40 to-white hover:from-emerald-100/90 hover:to-white";
                  borderColor = "border-emerald-200/90 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/20";
                  topStripe = "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400";
                  badgeBg = "bg-emerald-100 text-emerald-950 border-emerald-200";
                  subItems = "Ручний інструмент · Дрилі · Оснастка";
                  subCount = "3 підрозділи";
                  Watermark = Wrench;
                } else if (lower.includes('господар')) {
                  icon = <Home className="w-5 h-5 text-white" />;
                  iconBg = "bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-md shadow-indigo-500/30";
                  cardBg = "bg-gradient-to-b from-indigo-50/90 via-purple-50/40 to-white hover:from-indigo-100/90 hover:to-white";
                  borderColor = "border-indigo-200/90 hover:border-indigo-400 hover:ring-2 hover:ring-indigo-400/20";
                  topStripe = "bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400";
                  badgeBg = "bg-indigo-100 text-indigo-950 border-indigo-200";
                  subItems = "Замки · Дюбелі · Драбини · Інвентар";
                  subCount = "2 підрозділи";
                  Watermark = Home;
                }

                // Count items matching this category
                const catCount = products.filter((p) => 
                  (p.mainCategory && p.mainCategory.toLowerCase().includes(lower)) ||
                  p.category.toLowerCase().includes(lower)
                ).length;

                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => {
                      if (activeCategory === catName) {
                        setActiveCategory('Усі');
                        setSelectedSubCategory(null);
                        setSelectedLeafTag(null);
                      } else {
                        setActiveCategory(catName);
                        setSelectedSubCategory(null);
                        setSelectedLeafTag(null);
                        setTimeout(() => {
                          const el = document.getElementById('subcategory-gallery-section');
                          if (el) {
                            const yOffset = -85;
                            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 80);
                      }
                    }}
                    className={`rounded-2xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden group shadow-xs hover:shadow-lg flex flex-col justify-between ${
                      isActive 
                        ? 'bg-slate-950 text-white border-slate-900 shadow-xl ring-2 ring-red-500 scale-[1.02]' 
                        : `${cardBg} text-slate-900 ${borderColor} hover:-translate-y-1`
                    }`}
                  >
                    {/* Top Vibrant Color Stripe */}
                    <div className={`h-1.5 w-full ${isActive ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-500' : topStripe}`}></div>

                    {/* Watermark Icon */}
                    <Watermark className={`w-28 h-28 -rotate-12 absolute -right-4 -bottom-6 pointer-events-none transition-all duration-300 ${
                      isActive ? 'text-white/5' : 'text-slate-900/5 group-hover:scale-110 group-hover:text-slate-900/10'
                    }`} />

                    <div className="p-4 sm:p-5 relative z-10 flex flex-col justify-between h-full space-y-3">
                      
                      {/* Header Row: Icon + Count Badges */}
                      <div className="flex items-center justify-between">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive ? 'bg-red-600 shadow-lg shadow-red-600/30 scale-105 text-white' : `${iconBg} group-hover:scale-110`
                        }`}>
                          {icon}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[11px] font-black font-mono px-2.5 py-0.5 rounded-full border shadow-2xs ${
                            isActive 
                              ? 'bg-red-600 text-white border-red-500' 
                              : `${badgeBg}`
                          }`}>
                            {catCount} товарів
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            isActive ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {subCount}
                          </span>
                        </div>
                      </div>

                      {/* Title & Preview Tags */}
                      <div>
                        <h3 className={`font-black text-base sm:text-lg leading-tight transition-colors ${
                          isActive ? 'text-white' : 'text-slate-950 group-hover:text-red-600'
                        }`}>
                          {catName}
                        </h3>
                        <p className={`text-xs mt-1 font-medium line-clamp-1 ${
                          isActive ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {subItems}
                        </p>
                      </div>

                      {/* Bottom CTA Row */}
                      <div className={`pt-2.5 border-t flex items-center justify-between text-xs font-bold ${
                        isActive 
                          ? 'border-white/10 text-amber-400' 
                          : 'border-slate-200/80 text-slate-700 group-hover:text-red-600'
                      }`}>
                        <span>{isActive ? '✓ Обрана категорія' : 'Відкрити підкатегорії'}</span>
                        <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${
                          isActive ? 'text-amber-400' : 'text-slate-400 group-hover:translate-x-1 group-hover:text-red-600'
                        }`} />
                      </div>

                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Subcategory Directory (Showcase Gallery with Photos like in 2nd photo) */}
        {!showWishlistOnly && activeCategory && activeCategory !== 'Усі' && (
          <section id="subcategory-gallery-section" className="scroll-mt-20">
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
              <div className="p-2 rounded-xl bg-slate-900 text-white">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black font-display text-slate-900 leading-tight">
                    {showWishlistOnly 
                      ? 'Обрані товари' 
                      : (activeCategory && activeCategory !== 'Усі' ? activeCategory : 'Каталог сантехніки та товарів')}
                  </h3>
                  {selectedSubCategory && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                      <ChevronRight className="w-3 h-3 text-red-400" />
                      <span>{selectedSubCategory}</span>
                      {selectedLeafTag && <span className="font-normal text-red-600">({selectedLeafTag})</span>}
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedSubCategory(null);
                          setSelectedLeafTag(null);
                        }}
                        className="hover:text-red-900 ml-0.5 cursor-pointer"
                        title="Скинути підкатегорію"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium">
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
                  className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors shadow-xs active:scale-95 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
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
                <span className="text-slate-500 hidden md:inline-flex items-center gap-1 font-medium">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Сортування:
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-red-600 transition-colors shadow-xs cursor-pointer"
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-red-900 font-medium">
              <div>
                Результати пошуку за запитом: <b className="text-red-700 font-bold">«{searchQuery}»</b> ({displayProducts.length} знайдено)
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-red-600 hover:text-red-800 font-bold text-xs underline cursor-pointer"
              >
                Очистити
              </button>
            </div>
          )}

          {/* Active Filter Chips / Tags Bar */}
          {hasCustomFilter && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold mr-1">
                Активні фільтри:
              </span>

              {/* Price filter chip */}
              {hasPriceFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-xl text-slate-800 font-bold shadow-2xs">
                  <Banknote className="w-3 h-3 text-red-600" />
                  <span>
                    Ціна: {minPrice !== '' ? `${minPrice} грн` : 'від 0'} — {maxPrice !== '' ? `${maxPrice} грн` : 'до макс.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePriceChange('', '')}
                    className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-xl text-slate-800 font-bold shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-red-600" />
                  <span>{b}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleBrand(b)}
                    className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs transition-colors ml-auto cursor-pointer"
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
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-lg mx-auto space-y-4">
                  {showWishlistOnly ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
                        <Heart className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        У списку обраного поки немає товарів
                      </h3>
                      <p className="text-xs text-slate-500">
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
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <SlidersHorizontal className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        За вибраними фільтрами товарів не знайдено
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Спробуйте розширити діапазон цін або обрати інших виробників сантехніки та електрики.
                      </p>
                      <button
                        onClick={handleResetAllFilters}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
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
                    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                      
                      {/* Left: Summary Info */}
                      <div className="text-xs text-slate-500 font-medium text-center md:text-left flex items-center gap-2">
                        <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                          <Package className="w-3.5 h-3.5" />
                        </span>
                        <span>
                          Показано <b className="text-slate-900 font-bold">{pageSize === -1 ? 1 : (currentSafePage - 1) * pageSize + 1}</b>
                          –<b className="text-slate-900 font-bold">{pageSize === -1 ? displayProducts.length : Math.min(currentSafePage * pageSize, displayProducts.length)}</b> із <b className="text-slate-900 font-bold">{displayProducts.length}</b> товарів
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
                                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
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
                                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
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
                        <span className="text-slate-400 hidden sm:inline">На сторінці:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-red-600 cursor-pointer"
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
