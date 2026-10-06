import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { initialCategoriesTree, initialHeaderDesign, initialProducts, initialSiteSettings, initialWeeklyDeal, initialPromoCodes } from '../data/initialData';
import { getSafeImageUrl } from '../utils/assetImages';
import { sendTelegramAlert } from '../utils/telegramHelper';
import { initialReviews } from '../data/productReviews';
import { 
  CartItem, 
  CategoryTree, 
  ClientData, 
  FirebaseConnectionConfig, 
  HeaderDesign, 
  Order, 
  OrderStatus, 
  Product, 
  ProductReview,
  PromoCode,
  StockAlertRequest,
  ReturnRequest,
  SiteFeatures, 
  SiteSettings,
  WeeklyDealConfig 
} from '../types/store';
import { 
  defaultFirebaseConfig, 
  getOrInitFirebase, 
  testFirebaseConnection, 
  pushStoreToFirebase, 
  fetchStoreFromFirebase, 
  subscribeToStore,
  loginAdminWithFirebaseAuth,
  registerAdminWithFirebaseAuth,
  logoutAdminWithFirebaseAuth,
  subscribeToAuth,
  pushOrderToFirebase,
  saveOrderDirectlyToDatabase,
  deleteOrderDirectlyFromDatabase,
  clearAllOrdersDirectlyFromDatabase,
  saveAdminPasswordToFirestore,
  saveClientDirectlyToDatabase,
  deleteClientFromDatabase,
  saveReviewDirectlyToDatabase,
  deleteReviewDirectlyFromDatabase,
  saveProductDirectlyToDatabase,
  deleteProductDirectlyFromDatabase,
  pushStockAlertToFirebase,
  fetchStockAlertsFromFirebase,
  updateStockAlertStatusInFirebase,
  deleteStockAlertFromFirebase
} from '../services/firebaseService';
import { 
  recordSuccessfulLogin, 
  recordFailedLogin,
  checkAdminSecurityStatus,
  clearSecureSession, 
  verifySecureSession 
} from '../services/adminSecurityService';
import { formatUnit, normalizeStorageUnit } from '../utils/unitFormatter';
import { getProductBrand } from '../utils/brandHelper';
import { parseProductCSV, CsvImportOptions } from '../utils/csvProductParser';
import { classifyProduct } from '../utils/categoryClassifier';
import { autoFindBestImageForProduct } from '../utils/productImageSearch';

interface StoreContextType {
  products: Product[];
  categoriesTree: CategoryTree;
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  clients: Record<string, ClientData>;
  siteSettings: SiteSettings;
  headerDesign: HeaderDesign;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: 'default' | 'price-asc' | 'price-desc' | 'name-asc';
  setSortOption: (sort: 'default' | 'price-asc' | 'price-desc' | 'name-asc') => void;
  activeView: 'store' | 'account' | 'admin' | 'about' | 'returns';
  setActiveView: (view: 'store' | 'account' | 'admin' | 'about' | 'returns') => void;
  
  // Modals & Panels
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  
  // Cart & Pricing
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalCartSum: number;
  discountedCartSum: number;
  totalCartCount: number;

  // Wishlist
  showWishlistOnly: boolean;
  setShowWishlistOnly: (show: boolean) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Orders
  placeOrder: (orderData: {
    fio: string;
    phone: string;
    delivery: string;
    city: string;
    notes?: string;
    paymentMethod?: 'cash_on_delivery' | 'card_online' | 'bank_invoice';
  }) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderTtn: (orderId: string, ttn: string) => void;
  editOrder: (orderId: string, updated: Partial<Order>) => void;
  deleteOrder: (orderId: string) => void;
  clearAllOrders: () => void;

  // Products CRUD
  saveProduct: (product: Product) => void;
  batchSaveProducts: (items: Partial<Product>[]) => { newCount: number; updatedCount: number };
  deleteProduct: (productId: string) => void;
  clearAllProductPhotos: () => void;
  updateProductStock: (productId: string, newStock: number) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  bulkAdjustPrices: (percentDelta: number, targetProductIds?: string[]) => void;
  roundAllPricesToIntegers: (targetProductIds?: string[]) => void;
  bulkAdjustStock: (newStockForAll: number) => void;
  bulkAdjustZeroStock: (newStockForZeroItems: number) => void;
  batchUpdateSelectedProducts: (ids: string[], updates: { price?: number; stock?: number }) => void;
  batchDeleteProducts: (ids: string[]) => void;
  autoClassifyProducts: (productIds?: string[]) => void;
  autoAssignProductImages: (
    targetProductIds?: string[],
    onProgress?: (current: number, total: number, itemName: string) => void
  ) => Promise<{ updatedCount: number; total: number }>;
  resetDefaultCatalog: () => void;
  exportProductsCSV: () => string;
  importProductsCSV: (csvText: string, options?: CsvImportOptions) => number;

  // Category CRUD
  addMainCategory: (name: string) => boolean;
  deleteMainCategory: (name: string) => void;
  addSubCategory: (mainCat: string, subName: string) => boolean;
  deleteSubCategory: (mainCat: string, subName: string) => void;
  addLeafCategory: (mainCat: string, subCat: string | null, leafName: string) => boolean;
  deleteLeafCategory: (mainCat: string, subCat: string | null, leafName: string) => void;

  // Client Loyalty
  currentClientPhone: string | null;
  currentClient: ClientData | null;
  loginClient: (phone: string, name?: string) => void;
  logoutClient: () => void;
  saveClient: (phone: string, data: ClientData) => void;
  deleteClient: (phone: string) => void;

  // Customer Reviews
  reviews: ProductReview[];
  addReview: (review: Omit<ProductReview, 'id' | 'date' | 'helpfulCount'>) => ProductReview;
  updateReview: (id: string, updated: Partial<ProductReview>) => void;
  deleteReview: (id: string) => void;
  voteHelpfulReview: (id: string) => void;
  resetDefaultReviews: () => void;

  // Stock Availability Alerts
  stockAlerts: StockAlertRequest[];
  stockAlertModalProduct: Product | null;
  openStockAlertModal: (product: Product) => void;
  closeStockAlertModal: () => void;
  addStockAlert: (
    productId: string,
    productName: string,
    phone: string,
    name?: string,
    sku?: string,
    image?: string,
    price?: number,
    channel?: 'sms' | 'viber' | 'telegram' | 'whatsapp' | 'call',
    telegramUsername?: string
  ) => Promise<boolean>;
  updateStockAlertStatus: (alertId: string, status: 'pending' | 'notified' | 'cancelled') => void;
  deleteStockAlert: (alertId: string) => void;
  clearAllStockAlerts: () => void;
  clearNotifiedStockAlerts: () => void;

  // Return & Exchange Requests
  returnRequests: ReturnRequest[];
  addReturnRequest: (data: {
    orderNumber?: string;
    buyerPhone: string;
    buyerName?: string;
    reason: ReturnRequest['reason'];
    comment?: string;
  }) => Promise<boolean>;
  updateReturnRequestStatus: (
    id: string,
    status: ReturnRequest['status'],
    adminNotes?: string
  ) => void;
  deleteReturnRequest: (id: string) => void;
  clearAllReturnRequests: () => void;

  // Site Settings & Features
  updateSiteSettings: (settings: SiteSettings) => void;
  updateSiteFeatures: (features: Partial<SiteFeatures>) => void;
  updateHeaderDesign: (design: HeaderDesign) => void;
  weeklyDeal: WeeklyDealConfig;
  updateWeeklyDeal: (deal: Partial<WeeklyDealConfig>) => void;

  // Promo Codes & Discounts
  promoCodes: PromoCode[];
  appliedPromo: PromoCode | null;
  addPromoCode: (promo: Omit<PromoCode, 'id' | 'usageCount'>) => void;
  deletePromoCode: (id: string) => void;
  togglePromoCode: (id: string) => void;
  applyPromoCode: (code: string) => { success: boolean; message: string; discountAmount?: number };
  removeAppliedPromo: () => void;

  // Database & Cloud Connection
  firebaseConfig: FirebaseConnectionConfig;
  updateFirebaseConfig: (config: FirebaseConnectionConfig) => void;
  dbStatus: 'connected' | 'offline' | 'error' | 'syncing';
  testDbConnection: () => Promise<{ success: boolean; message: string; pingMs?: number }>;
  syncToCloud: () => Promise<boolean>;
  fetchFromCloud: () => Promise<boolean>;
  exportJsonBackup: () => string;
  importJsonBackup: (jsonStr: string) => boolean;

  // Admin Auth (Firebase Authentication)
  isAdminLoggedIn: boolean;
  adminUserEmail: string | null;
  adminLogin: (emailOrPass: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  adminRegister: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;

  // Toast
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const deletedList: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]');
      } catch {
        return [];
      }
    })();
    const deletedSet = new Set(deletedList);

    const saved = localStorage.getItem('iskra_products_react_v4') || localStorage.getItem('iskra_products_react_v3') || localStorage.getItem('iskra_products_react');
    let parsed: Product[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter(p => p && p.id && !deletedSet.has(p.id))
        .map((p, idx) => ({
          ...p,
          id: p.id && String(p.id).trim() !== '' ? String(p.id).trim() : `prod-auto-${idx}`,
          image: p.image !== undefined && p.image !== null ? p.image : '',
          stock: p.stock !== undefined && p.stock !== null ? p.stock : 0,
          unit: normalizeStorageUnit(p.unit)
        }));
    }

    return initialProducts
      .filter(p => !deletedSet.has(p.id))
      .map((p, idx) => ({
        ...p,
        id: p.id && String(p.id).trim() !== '' ? String(p.id).trim() : `prod-auto-${idx}`,
        image: p.image !== undefined && p.image !== null ? p.image : '',
        stock: p.stock !== undefined && p.stock !== null ? p.stock : 15,
        unit: normalizeStorageUnit(p.unit)
      }));
  });

  // Sync to localStorage with v4 key
  useEffect(() => {
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(products));
  }, [products]);

  // Helper to normalize category tree structure
  const normalizeCategoriesTree = (raw: any): CategoryTree => {
    // If raw contains valid categories, respect the user's stored category state
    if (raw && typeof raw === 'object' && Object.keys(raw).some(k => !k.startsWith('_'))) {
      const result: CategoryTree = {};
      for (const [mainKey, mainVal] of Object.entries(raw)) {
        if (!mainKey || mainKey.startsWith('_')) continue;
        if (typeof mainVal !== 'object' || mainVal === null) continue;

        result[mainKey] = { _leaves: [] };
        for (const [subKey, subVal] of Object.entries(mainVal as Record<string, any>)) {
          if (subKey === '_exists' || subKey === '_created') continue;
          if (subKey === '_leaves') {
            const incomingLeaves = Array.isArray(subVal) ? subVal.filter(Boolean) : [];
            result[mainKey]._leaves = Array.from(new Set(incomingLeaves));
          } else if (Array.isArray(subVal)) {
            result[mainKey][subKey] = Array.from(new Set(subVal.filter(Boolean)));
          } else if (typeof subVal === 'object' && subVal !== null) {
            result[mainKey][subKey] = Array.from(new Set(Object.values(subVal).filter(Boolean) as string[]));
          }
        }
      }
      return result;
    }

    return JSON.parse(JSON.stringify(initialCategoriesTree));
  };

  // Categories Tree
  const [categoriesTree, setCategoriesTree] = useState<CategoryTree>(() => {
    const saved = localStorage.getItem('iskra_categories_tree_react_v2') || localStorage.getItem('iskra_categories_tree_react');
    if (saved) {
      try { 
        return normalizeCategoriesTree(JSON.parse(saved)); 
      } catch (e) { 
        console.error(e); 
      }
    }
    return initialCategoriesTree;
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('iskra_cart_react');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('iskra_wishlist_react');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => id && typeof id === 'string' && id.trim() !== '');
        }
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isNewSession = !sessionStorage.getItem('iskra_session_active');
      localStorage.removeItem('iskra_show_wishlist');
      if (isNewSession) return false;
      const saved = sessionStorage.getItem('iskra_show_wishlist');
      if (saved === 'true') return true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('iskra_show_wishlist', String(showWishlistOnly));
      localStorage.removeItem('iskra_show_wishlist');
    }
  }, [showWishlistOnly]);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('iskra_orders_react');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(o => o.id !== 'ORD-948120' && o.phone !== '+380971234567')
            .map(o => {
              const cleanTtn = (o.ttn || '').replace(/\D/g, '');
              // If parcel is known delivered (e.g. test order or real TTN 59001790044492)
              if (o.id === 'ORD-958186' || cleanTtn === '59001790044492') {
                return { 
                  ...o, 
                  status: 'Доставлено' as OrderStatus, 
                  isPaid: o.paymentMethod === 'cash_on_delivery' ? true : o.isPaid 
                };
              }
              return o;
            });
        }
      } catch (e) { console.error(e); }
    }
    return [];
  });

  // Clients
  const [clients, setClients] = useState<Record<string, ClientData>>(() => {
    const saved = localStorage.getItem('iskra_clients_react');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const clean: Record<string, ClientData> = {};
          for (const [phone, data] of Object.entries(parsed)) {
            if (phone !== '+380971234567' && phone !== '0971234567') {
              clean[phone] = data as ClientData;
            }
          }
          return clean;
        }
      } catch (e) { console.error(e); }
    }
    return {};
  });

  // Customer Reviews (Synced to Firebase RTDB + Firestore)
  const [reviews, setReviews] = useState<ProductReview[]>(() => {
    const saved = localStorage.getItem('iskra_reviews_react');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialReviews;
  });

  // Stock Availability Alerts (Customers waiting for out-of-stock items)
  const [stockAlerts, setStockAlerts] = useState<StockAlertRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskra_stock_alerts_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any demo / test alerts
            const cleaned = parsed.filter(
              (a: StockAlertRequest) =>
                a &&
                a.id &&
                !a.id.startsWith('alert_demo_') &&
                a.phone !== '+380679876543' &&
                a.phone !== '+380971234567'
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(cleaned));
            }
            return cleaned;
          }
        } catch {}
      }
    }
    return [];
  });

  // Return & Exchange Requests from Customers
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskra_return_requests_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((r: ReturnRequest) => r && r.id && r.buyerPhone);
          }
        } catch {}
      }
    }
    return [];
  });

  const [stockAlertModalProduct, setStockAlertModalProduct] = useState<Product | null>(null);

  const openStockAlertModal = (product: Product) => {
    setStockAlertModalProduct(product);
  };

  const closeStockAlertModal = () => {
    setStockAlertModalProduct(null);
  };

  // Client auth (check URL query ?client=... or localStorage)
  const [currentClientPhone, setCurrentClientPhone] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlClient = urlParams.get('client');
      if (urlClient) {
        localStorage.setItem('iskra_current_client_phone', urlClient);
        return urlClient;
      }
      return localStorage.getItem('iskra_current_client_phone') || null;
    }
    return null;
  });

  // Site Settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('iskra_settings_react');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        let city = parsed.city || initialSiteSettings.city;
        if (city && (city.includes('смт. Оратів') || city.includes('с. Оратів') || city === 'Оратів')) {
          city = 'с-ще. Оратів';
        }
        let address = parsed.address || initialSiteSettings.address;
        if (!address || address.includes('Героїв Майдану') || address.includes('Котляревського, 2')) {
          address = initialSiteSettings.address;
        }
        let fopRegistrationAddress = parsed.fopRegistrationAddress;
        if (!fopRegistrationAddress || fopRegistrationAddress.includes('Героїв Майдану') || fopRegistrationAddress.includes('с. Оратів') || fopRegistrationAddress.includes('Котляревського, 2') || fopRegistrationAddress.includes('22600')) {
          fopRegistrationAddress = initialSiteSettings.fopRegistrationAddress;
        }
        let fopActualAddress = parsed.fopActualAddress;
        if (!fopActualAddress || fopActualAddress.includes('Героїв Майдану') || fopActualAddress.includes('с. Оратів') || fopActualAddress.includes('Котляревського, 2') || fopActualAddress.includes('22600')) {
          fopActualAddress = initialSiteSettings.fopActualAddress;
        }
        let fopStoreAddress = parsed.fopStoreAddress;
        if (!fopStoreAddress || fopStoreAddress.includes('Героїв Майдану') || fopStoreAddress.includes('с. Оратів') || fopStoreAddress.includes('Котляревського, 2')) {
          fopStoreAddress = initialSiteSettings.fopStoreAddress;
        }
        let returnsReceiverCity = parsed.returnsReceiverCity;
        if (!returnsReceiverCity || returnsReceiverCity.includes('с. Оратів') || returnsReceiverCity.includes('смт. Оратів')) {
          returnsReceiverCity = initialSiteSettings.returnsReceiverCity;
        }
        let fopName = parsed.fopName;
        if (!fopName || fopName.includes('Іскра Олександр') || fopName.includes('Іскра О.В.')) {
          fopName = initialSiteSettings.fopName;
        }
        let returnsReceiverName = parsed.returnsReceiverName;
        if (!returnsReceiverName || returnsReceiverName.includes('Іскра Олександр') || returnsReceiverName.includes('Іскра О.В.')) {
          returnsReceiverName = initialSiteSettings.returnsReceiverName;
        }
        return {
          ...initialSiteSettings,
          ...parsed,
          city,
          address,
          fopRegistrationAddress,
          fopActualAddress,
          fopStoreAddress,
          returnsReceiverCity,
          fopName,
          returnsReceiverName,
          features: { ...initialSiteSettings.features, ...(parsed.features || {}) }
        };
      } catch (e) { console.error(e); }
    }
    return initialSiteSettings;
  });

  // Clean & Sanitize Header Design (prevents accidental hex strings like ffffffff in city/address fields)
  const cleanHeaderDesign = (d: any): HeaderDesign => {
    if (!d) return initialHeaderDesign;
    const isGarbage = (v?: string) => !v || /^#?[fF0-9]{6,8}$/i.test(String(v).trim()) || /^f+$/i.test(String(v).trim());
    let heroCity = isGarbage(d.heroCity) ? "с-ще. Оратів, Вінницька обл." : String(d.heroCity).trim();
    if (heroCity.includes('смт. Оратів') || heroCity.includes('с. Оратів') || heroCity.includes('смт.') || heroCity === 'Оратів') {
      heroCity = "с-ще. Оратів, Вінницька обл.";
    }
    const logoBadge = (!d.logoBadge || isGarbage(d.logoBadge)) ? 'ISKRA' : d.logoBadge;
    const logoText = (!d.logoText || isGarbage(d.logoText)) ? 'МАГАЗИН' : d.logoText;
    const logoSubtitle = (!d.logoSubtitle || isGarbage(d.logoSubtitle)) ? 'Магазин надійних рішень' : d.logoSubtitle;
    return {
      ...initialHeaderDesign,
      ...d,
      logoBadge,
      logoText,
      logoSubtitle,
      heroCity,
      heroAddress: isGarbage(d.heroAddress) || (d.heroAddress && d.heroAddress.includes('Героїв Майдану')) ? "вул. Котляревського, 2" : d.heroAddress,
      heroBadge: isGarbage(d.heroBadge) ? "ІНТЕРНЕТ-МАГАЗИН" : d.heroBadge,
      footerDesc: d.footerDesc || initialHeaderDesign.footerDesc,
      footerTrust1: d.footerTrust1 || initialHeaderDesign.footerTrust1,
      footerTrust2: d.footerTrust2 || initialHeaderDesign.footerTrust2
    };
  };

  // Header Design
  const [headerDesign, setHeaderDesign] = useState<HeaderDesign>(() => {
    const saved = localStorage.getItem('iskra_design_react');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return cleanHeaderDesign(parsed); 
      } catch (e) { console.error(e); }
    }
    return initialHeaderDesign;
  });

  // Weekly Deal (Акція тижня)
  const [weeklyDeal, setWeeklyDeal] = useState<WeeklyDealConfig>(() => {
    const saved = localStorage.getItem('iskra_weekly_deal_react');
    if (saved) {
      try { return { ...initialWeeklyDeal, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
    }
    return initialWeeklyDeal;
  });

  useEffect(() => {
    localStorage.setItem('iskra_weekly_deal_react', JSON.stringify(weeklyDeal));
  }, [weeklyDeal]);

  // Firebase Database Configuration
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConnectionConfig>(() => {
    const saved = localStorage.getItem('iskra_firebase_config_react');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultFirebaseConfig;
  });

  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'error' | 'syncing'>('offline');

  // Admin Auth (Firebase Authentication & Secure Session)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    const verified = verifySecureSession();
    return verified.isValid;
  });
  const [adminUserEmail, setAdminUserEmail] = useState<string | null>(() => {
    const verified = verifySecureSession();
    return verified.email || sessionStorage.getItem('adminUserEmail') || null;
  });

  // Navigation & session lifecycle:
  // When the user closes the site completely and enters anew, always load the main home page ('store').
  const [activeView, setActiveView] = useState<'store' | 'account' | 'admin' | 'about' | 'returns'>(() => {
    if (typeof window !== 'undefined') {
      const isNewSession = !sessionStorage.getItem('iskra_session_active');
      localStorage.removeItem('iskra_active_view');
      localStorage.removeItem('iskra_show_wishlist');

      if (isNewSession) {
        sessionStorage.setItem('iskra_session_active', '1');
        sessionStorage.setItem('iskra_active_view', 'store');
        // Clean URL hash so previous session tabs/bookmarks don't force a subpage
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return 'store';
      }

      // If page was merely refreshed (F5) within the same open tab session
      const saved = sessionStorage.getItem('iskra_active_view');
      if (saved === 'admin' || saved === 'account' || saved === 'store' || saved === 'about' || saved === 'returns') {
        return saved as 'store' | 'account' | 'admin' | 'about' | 'returns';
      }
    }
    return 'store';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('iskra_active_view', activeView);
      localStorage.removeItem('iskra_active_view');

      // Keep address bar clean on the main store page
      if (activeView === 'store' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [activeView, showWishlistOnly]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin' || hash === 'account' || hash === 'store') {
        setActiveView(hash);
        if (hash !== 'store') setShowWishlistOnly(false);
      } else if (hash === 'wishlist' || hash === 'favorites') {
        setActiveView('store');
        setShowWishlistOnly(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>('Усі');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc'>('default');

  // Modals
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(products));
    localStorage.setItem('iskra_products_react', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('iskra_categories_tree_react', JSON.stringify(categoriesTree));
  }, [categoriesTree]);

  useEffect(() => {
    localStorage.setItem('iskra_cart_react', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('iskra_wishlist_react', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('iskra_orders_react', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('iskra_clients_react', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('iskra_settings_react', JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    localStorage.setItem('iskra_design_react', JSON.stringify(headerDesign));
  }, [headerDesign]);

  useEffect(() => {
    localStorage.setItem('iskra_firebase_config_react', JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  // Live Firebase Realtime Sync Listener & Auto-Hydration
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (!firebaseConfig.enabled) {
      setDbStatus('offline');
      return;
    }

    setDbStatus('syncing');

    // On initial mount or config change, check cloud state:
    // If cloud has catalog, hydrate from it. If cloud is empty, seed it with current store!
    fetchStoreFromFirebase(firebaseConfig)
      .then((cloudData) => {
        if (cloudData && (cloudData.products || cloudData.siteSettings || cloudData.reviews || cloudData.categoriesTree)) {
          setDbStatus('connected');
          const cloudProds = Array.isArray(cloudData.products) 
            ? cloudData.products 
            : (cloudData.products && typeof cloudData.products === 'object' ? Object.values(cloudData.products) : null);
          const cloudDeleted: string[] = Array.isArray(cloudData.deletedProductIds) 
            ? cloudData.deletedProductIds 
            : (cloudData.deletedProductIds && typeof cloudData.deletedProductIds === 'object' ? Object.values(cloudData.deletedProductIds) : []);
          const localDeleted: string[] = (() => {
            try { return JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]'); } catch { return []; }
          })();
          const allDeleted = Array.from(new Set([...cloudDeleted, ...localDeleted]));
          localStorage.setItem('iskra_deleted_product_ids_v1', JSON.stringify(allDeleted));
          const deletedSet = new Set(allDeleted);

          if (cloudProds && cloudProds.length > 0) {
            // Keep cloud products exactly as saved in database (including empty images)
            const cleanCloudProds = (cloudProds as Product[])
              .filter(p => p && p.id && !deletedSet.has(p.id))
              .map(p => ({
                ...p,
                image: p.image !== undefined && p.image !== null ? p.image : '',
                stock: p.stock !== undefined && p.stock !== null ? p.stock : 0
              }));
            setProducts(cleanCloudProds);
            localStorage.setItem('iskra_products_react_v4', JSON.stringify(cleanCloudProds));
          }
          
          // Normalize and load categories tree
          if (cloudData.categoriesTree && typeof cloudData.categoriesTree === 'object') {
            const mergedCategories = normalizeCategoriesTree(cloudData.categoriesTree);
            setCategoriesTree(mergedCategories);
            localStorage.setItem('iskra_categories_tree_react', JSON.stringify(mergedCategories));
          }
          
          const rawCloudOrders = cloudData.ordersList || cloudData.orders;
          const cloudOrders = Array.isArray(rawCloudOrders) 
            ? rawCloudOrders 
            : (rawCloudOrders && typeof rawCloudOrders === 'object' ? Object.values(rawCloudOrders) : null);
          if (cloudOrders) {
            const cleanOrders = (cloudOrders as Order[])
              .filter((o: Order) => o && o.id && o.id !== 'ORD-948120' && o.phone !== '+380971234567');
            setOrders(cleanOrders);
            localStorage.setItem('iskra_orders_react', JSON.stringify(cleanOrders));
          }
          if (cloudData.clients && typeof cloudData.clients === 'object') {
            const clean: Record<string, ClientData> = {};
            for (const [phone, data] of Object.entries(cloudData.clients)) {
              if (phone !== '+380971234567' && phone !== '0971234567') {
                clean[phone] = data as ClientData;
              }
            }
            setClients(clean);
            localStorage.setItem('iskra_clients_react', JSON.stringify(clean));
          }
          if (cloudData.reviews && Array.isArray(cloudData.reviews)) {
            setReviews(cloudData.reviews as ProductReview[]);
            localStorage.setItem('iskra_reviews_react', JSON.stringify(cloudData.reviews));
          }
          if (cloudData.siteSettings) {
            setSiteSettings((prev) => {
              const next = { ...prev, ...cloudData.siteSettings };
              localStorage.setItem('iskra_settings_react', JSON.stringify(next));
              return next;
            });
          }
          if (cloudData.headerDesign) {
            setHeaderDesign((prev) => {
              const cleaned = cleanHeaderDesign({ ...prev, ...cloudData.headerDesign });
              localStorage.setItem('iskra_header_design_react', JSON.stringify(cleaned));
              return cleaned;
            });
          }
          if (cloudData.weeklyDeal) {
            setWeeklyDeal((prev) => {
              const next = { ...prev, ...cloudData.weeklyDeal };
              localStorage.setItem('iskra_weekly_deal_react', JSON.stringify(next));
              return next;
            });
          }

          // Bind and sync stock alerts from database
          const rawCloudAlerts = cloudData.stockAlerts;
          const cloudAlerts = Array.isArray(rawCloudAlerts)
            ? rawCloudAlerts
            : (rawCloudAlerts && typeof rawCloudAlerts === 'object' ? Object.values(rawCloudAlerts) : null);
          if (cloudAlerts && cloudAlerts.length > 0) {
            const cleanAlerts = (cloudAlerts as StockAlertRequest[]).filter(a => a && a.id && a.phone);
            setStockAlerts(cleanAlerts);
            localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(cleanAlerts));
          } else {
            // Also query direct fetchStockAlertsFromFirebase (RTDB + Firestore)
            fetchStockAlertsFromFirebase(firebaseConfig).then((alerts) => {
              if (alerts && alerts.length > 0) {
                const cleanAlerts = (alerts as StockAlertRequest[]).filter(a => a && a.id && a.phone);
                setStockAlerts(cleanAlerts);
                localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(cleanAlerts));
              }
            }).catch(() => {});
          }
        } else if (isFirstLoad.current) {
          isFirstLoad.current = false;
          // Seed the database so Firebase console displays everything
          pushStoreToFirebase(firebaseConfig, {
            products,
            categoriesTree,
            orders,
            clients,
            reviews,
            stockAlerts,
            siteSettings,
            headerDesign: cleanHeaderDesign(headerDesign),
            weeklyDeal,
            lastSyncTimestamp: Date.now()
          }).then((ok) => {
            if (ok) setDbStatus('connected');
          }).catch(() => {});
        }
      })
      .catch(() => {
        testFirebaseConnection(firebaseConfig).then((res) => {
          setDbStatus(res.success ? 'connected' : 'error');
        });
      });

    const unsubscribe = subscribeToStore(firebaseConfig, (data) => {
      if (data) {
        setDbStatus('connected');
        const cloudDeleted: string[] = Array.isArray(data.deletedProductIds) 
          ? data.deletedProductIds 
          : (data.deletedProductIds && typeof data.deletedProductIds === 'object' ? Object.values(data.deletedProductIds) : []);
        const localDeleted: string[] = (() => {
          try { return JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]'); } catch { return []; }
        })();
        const allDeleted = Array.from(new Set([...cloudDeleted, ...localDeleted]));
        const deletedSet = new Set(allDeleted);

        const liveProds = Array.isArray(data.products) 
          ? data.products 
          : (data.products && typeof data.products === 'object' ? Object.values(data.products) : null);
        if (liveProds && liveProds.length > 0) {
          const cleanLive = (liveProds as Product[])
            .filter(p => p && p.id && !deletedSet.has(p.id))
            .map(p => ({
              ...p,
              image: p.image !== undefined && p.image !== null ? p.image : '',
              stock: p.stock !== undefined && p.stock !== null ? p.stock : 0
            }));
          setProducts(cleanLive);
          localStorage.setItem('iskra_products_react_v4', JSON.stringify(cleanLive));
        }
        if (data.categoriesTree && typeof data.categoriesTree === 'object') {
          const mergedCategories = normalizeCategoriesTree(data.categoriesTree);
          setCategoriesTree(mergedCategories);
          localStorage.setItem('iskra_categories_tree_react', JSON.stringify(mergedCategories));
        }
        
        const rawLiveOrders = data.ordersList || data.orders;
        const liveOrders = Array.isArray(rawLiveOrders) 
          ? rawLiveOrders 
          : (rawLiveOrders && typeof rawLiveOrders === 'object' ? Object.values(rawLiveOrders) : null);
        if (liveOrders !== null && liveOrders !== undefined) {
          const cleanOrders = (liveOrders as Order[])
            .filter((o: Order) => o && o.id && o.id !== 'ORD-948120' && o.phone !== '+380971234567');
          setOrders(cleanOrders);
          localStorage.setItem('iskra_orders_react', JSON.stringify(cleanOrders));
        }
        if (data.clients && typeof data.clients === 'object') {
          const clean: Record<string, ClientData> = {};
          for (const [phone, d] of Object.entries(data.clients)) {
            if (phone !== '+380971234567' && phone !== '0971234567') {
              clean[phone] = d as ClientData;
            }
          }
          setClients(clean);
          localStorage.setItem('iskra_clients_react', JSON.stringify(clean));
        }
        const liveReviews = Array.isArray(data.reviews) 
          ? data.reviews 
          : (data.reviews && typeof data.reviews === 'object' ? Object.values(data.reviews) : null);
        if (liveReviews && liveReviews.length > 0) {
          setReviews(liveReviews as ProductReview[]);
          localStorage.setItem('iskra_reviews_react', JSON.stringify(liveReviews));
        }
        if (data.siteSettings) {
          setSiteSettings((prev) => {
            const next = { ...prev, ...data.siteSettings };
            localStorage.setItem('iskra_settings_react', JSON.stringify(next));
            return next;
          });
        }
        if (data.headerDesign) {
          setHeaderDesign((prev) => {
            const cleaned = cleanHeaderDesign({ ...prev, ...data.headerDesign });
            localStorage.setItem('iskra_header_design_react', JSON.stringify(cleaned));
            return cleaned;
          });
        }
        if (data.weeklyDeal) {
          setWeeklyDeal((prev) => {
            const next = { ...prev, ...data.weeklyDeal };
            localStorage.setItem('iskra_weekly_deal_react', JSON.stringify(next));
            return next;
          });
        }

        // Real-time stock alerts update from cloud
        const rawLiveAlerts = data.stockAlerts;
        const liveAlerts = Array.isArray(rawLiveAlerts) 
          ? rawLiveAlerts 
          : (rawLiveAlerts && typeof rawLiveAlerts === 'object' ? Object.values(rawLiveAlerts) : null);
        if (liveAlerts !== null && liveAlerts !== undefined) {
          const cleanAlerts = (liveAlerts as StockAlertRequest[]).filter(a => a && a.id && a.phone);
          setStockAlerts(cleanAlerts);
          localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(cleanAlerts));
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseConfig]);

  // Firebase Authentication Session Listener (onAuthStateChanged)
  useEffect(() => {
    if (!firebaseConfig.enabled) return;

    const unsubscribeAuth = subscribeToAuth(firebaseConfig, (user) => {
      if (user) {
        setIsAdminLoggedIn(true);
        setAdminUserEmail(user.email || null);
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        if (user.email) sessionStorage.setItem('adminUserEmail', user.email);
      } else {
        setIsAdminLoggedIn(false);
        setAdminUserEmail(null);
        sessionStorage.removeItem('isAdminLoggedIn');
        sessionStorage.removeItem('adminUserEmail');
        sessionStorage.removeItem('iskra_admin_auth');
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [firebaseConfig]);

  // Database Actions
  const updateFirebaseConfig = (newConfig: FirebaseConnectionConfig) => {
    setFirebaseConfig(newConfig);
    showToast('Параметри бази даних збережено', 'success');
  };

  const testDbConnection = async () => {
    setDbStatus('syncing');
    const result = await testFirebaseConnection(firebaseConfig);
    setDbStatus(result.success ? 'connected' : 'error');
    showToast(result.message, result.success ? 'success' : 'error');
    return result;
  };

  const syncToCloud = async (): Promise<boolean> => {
    setDbStatus('syncing');
    const payload = {
      products,
      categoriesTree,
      orders,
      clients,
      reviews,
      stockAlerts,
      siteSettings,
      headerDesign,
      weeklyDeal,
      lastSyncTimestamp: Date.now()
    };
    const success = await pushStoreToFirebase(firebaseConfig, payload);
    setDbStatus(success ? 'connected' : 'error');
    if (success) {
      showToast('Всі дані сайту успішно вивантажено в хмарну базу даних!', 'success');
    } else {
      showToast('Помилка завантаження в базу даних. Перевірте з\'єднання', 'error');
    }
    return success;
  };

  const fetchFromCloud = async (): Promise<boolean> => {
    setDbStatus('syncing');
    const data = await fetchStoreFromFirebase(firebaseConfig);
    if (data) {
      setDbStatus('connected');
      if (data.products && Array.isArray(data.products)) setProducts(data.products);
      if (data.categoriesTree) setCategoriesTree(data.categoriesTree);
      const rawOrders = data.ordersList || data.orders;
      const fetchedOrders = Array.isArray(rawOrders) 
        ? rawOrders 
        : (rawOrders && typeof rawOrders === 'object' ? Object.values(rawOrders) : null);
      if (fetchedOrders) {
        const cleanOrders = (fetchedOrders as Order[])
          .filter((o: Order) => o && o.id && o.id !== 'ORD-948120' && o.phone !== '+380971234567');
        setOrders(cleanOrders);
        localStorage.setItem('iskra_orders_react', JSON.stringify(cleanOrders));
      }
      if (data.clients) setClients(data.clients);
      if (data.reviews && Array.isArray(data.reviews)) setReviews(data.reviews);
      if (data.siteSettings) setSiteSettings((prev) => ({ ...prev, ...data.siteSettings }));
      if (data.headerDesign) setHeaderDesign((prev) => ({ ...prev, ...data.headerDesign }));
      if (data.weeklyDeal) setWeeklyDeal((prev) => ({ ...prev, ...data.weeklyDeal }));
      
      const rawAlerts = data.stockAlerts;
      const fetchedAlerts = Array.isArray(rawAlerts)
        ? rawAlerts
        : (rawAlerts && typeof rawAlerts === 'object' ? Object.values(rawAlerts) : null);
      if (fetchedAlerts && fetchedAlerts.length > 0) {
        const cleanAlerts = (fetchedAlerts as StockAlertRequest[]).filter(a => a && a.id && a.phone);
        setStockAlerts(cleanAlerts);
        localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(cleanAlerts));
      }

      showToast('Дані успішно завантажено з хмарної бази даних!', 'success');
      return true;
    } else {
      setDbStatus('error');
      showToast('Не вдалося отримати дані з хмари або база порожня', 'error');
      return false;
    }
  };

  const exportJsonBackup = (): string => {
    const backup = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      products,
      categoriesTree,
      orders,
      clients,
      reviews,
      stockAlerts,
      siteSettings,
      headerDesign,
      weeklyDeal,
      firebaseConfig
    };
    return JSON.stringify(backup, null, 2);
  };

  const importJsonBackup = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.products && Array.isArray(parsed.products)) setProducts(parsed.products);
      if (parsed.categoriesTree) setCategoriesTree(parsed.categoriesTree);
      if (parsed.orders && Array.isArray(parsed.orders)) setOrders(parsed.orders);
      if (parsed.clients) setClients(parsed.clients);
      if (parsed.reviews && Array.isArray(parsed.reviews)) setReviews(parsed.reviews);
      if (parsed.stockAlerts && Array.isArray(parsed.stockAlerts)) {
        setStockAlerts(parsed.stockAlerts);
        localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(parsed.stockAlerts));
      }
      if (parsed.siteSettings) setSiteSettings(parsed.siteSettings);
      if (parsed.headerDesign) setHeaderDesign(parsed.headerDesign);
      if (parsed.weeklyDeal) setWeeklyDeal(parsed.weeklyDeal);
      if (parsed.firebaseConfig) setFirebaseConfig(parsed.firebaseConfig);
      showToast('Резервну копію успішно відновлено!', 'success');
      const conf = parsed.firebaseConfig || firebaseConfig;
      if (conf.enabled) {
        pushStoreToFirebase(conf, {
          products: parsed.products || products,
          categoriesTree: parsed.categoriesTree || categoriesTree,
          orders: parsed.orders || orders,
          clients: parsed.clients || clients,
          reviews: parsed.reviews || reviews,
          stockAlerts: parsed.stockAlerts || stockAlerts,
          siteSettings: parsed.siteSettings || siteSettings,
          headerDesign: parsed.headerDesign || headerDesign,
          weeklyDeal: parsed.weeklyDeal || weeklyDeal,
          lastSyncTimestamp: Date.now()
        }).catch(() => {});
      }
      return true;
    } catch (err) {
      showToast('Невірний формат файлу резервної копії JSON', 'error');
      return false;
    }
  };

  const currentClient = useMemo(() => {
    if (!currentClientPhone) return null;
    const cleanCurrent = currentClientPhone.replace(/\D/g, '');
    for (const key of Object.keys(clients)) {
      if (key.replace(/\D/g, '') === cleanCurrent) {
        return clients[key];
      }
    }
    return null;
  }, [currentClientPhone, clients]);

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskra_promo_codes_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return initialPromoCodes;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskra_promo_codes_v1', JSON.stringify(promoCodes));
    }
  }, [promoCodes]);

  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('iskra_applied_promo');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return null;
  });

  // Cart totals
  const totalCartCount = useMemo(() => cart.reduce((acc, i) => acc + i.qty, 0), [cart]);
  const totalCartSum = useMemo(() => cart.reduce((acc, i) => acc + (i.price * i.qty), 0), [cart]);
  
  const discountedCartSum = useMemo(() => {
    if (totalCartSum <= 0) return 0;
    
    // Loyalty personal discount
    const isPersonalDiscountEnabled = siteSettings.features?.personalDiscountEnabled ?? true;
    const minOrderSumForDiscount = siteSettings.features?.minOrderSumForPersonalDiscount ?? 0;
    const maxDiscountCap = siteSettings.features?.maxPersonalDiscountPercent ?? 50;
    
    let loyaltyDiscountPct = 0;
    if (isPersonalDiscountEnabled && currentClient && currentClient.discount && totalCartSum >= minOrderSumForDiscount) {
      loyaltyDiscountPct = Math.min(maxDiscountCap, Math.max(0, currentClient.discount));
    }
    const loyaltyAmount = (totalCartSum * loyaltyDiscountPct) / 100;
    
    // Promo discount
    let promoAmount = 0;
    if (appliedPromo && appliedPromo.isActive) {
      if (!appliedPromo.minOrderSum || totalCartSum >= appliedPromo.minOrderSum) {
        if (appliedPromo.discountType === 'percent') {
          promoAmount = (totalCartSum * appliedPromo.discountValue) / 100;
        } else {
          promoAmount = appliedPromo.discountValue;
        }
      }
    }
    
    // Check if combine personal discount with promo
    const combineWithPromo = siteSettings.features?.combinePersonalDiscountWithPromo ?? false;
    let effectiveDiscount = 0;
    if (combineWithPromo) {
      effectiveDiscount = Math.min(totalCartSum, loyaltyAmount + promoAmount);
    } else {
      effectiveDiscount = Math.min(totalCartSum, Math.max(loyaltyAmount, promoAmount));
    }
    
    return Math.max(0, Math.round((totalCartSum - effectiveDiscount) * 100) / 100);
  }, [totalCartSum, currentClient, appliedPromo, siteSettings.features]);

  const applyPromoCode = (inputCode: string) => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return { success: false, message: 'Будь ласка, введіть промокод' };
    const found = promoCodes.find(p => p.code.toUpperCase() === clean);
    if (!found) return { success: false, message: 'Промокод не знайдено або термін його дії закінчився' };
    if (!found.isActive) return { success: false, message: 'Цей промокод наразі деактивовано' };
    if (found.usageLimit && found.usageCount >= found.usageLimit) {
      return { success: false, message: 'Ліміт використання цього промокоду вичерпано' };
    }
    if (found.minOrderSum && totalCartSum < found.minOrderSum) {
      return { success: false, message: `Мінімальна сума замовлення для цього коду: ${found.minOrderSum} грн` };
    }
    setAppliedPromo(found);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('iskra_applied_promo', JSON.stringify(found));
    }
    showToast(`Промокод «${found.code}» успішно активовано!`, 'success');
    return { success: true, message: 'Промокод активовано!' };
  };

  const removeAppliedPromo = () => {
    setAppliedPromo(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('iskra_applied_promo');
    }
    showToast('Промокод скасовано', 'info');
  };

  const addPromoCode = (promo: Omit<PromoCode, 'id' | 'usageCount'>) => {
    const cleanCode = promo.code.trim().toUpperCase();
    if (promoCodes.some(p => p.code.toUpperCase() === cleanCode)) {
      showToast(`Промокод з кодом ${cleanCode} вже існує!`, 'error');
      return;
    }
    const newPromo: PromoCode = {
      ...promo,
      id: 'promo_' + Date.now(),
      code: cleanCode,
      usageCount: 0
    };
    const next = [newPromo, ...promoCodes];
    setPromoCodes(next);
    showToast(`Промокод «${newPromo.code}» успішно створено!`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { promoCodes: next, lastSyncTimestamp: Date.now() });
    }
  };

  const deletePromoCode = (id: string) => {
    const next = promoCodes.filter(p => p.id !== id);
    setPromoCodes(next);
    if (appliedPromo?.id === id) {
      removeAppliedPromo();
    }
    showToast('Промокод видалено', 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { promoCodes: next, lastSyncTimestamp: Date.now() });
    }
  };

  const togglePromoCode = (id: string) => {
    const next = promoCodes.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    setPromoCodes(next);
    showToast('Статус промокоду оновлено', 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { promoCodes: next, lastSyncTimestamp: Date.now() });
    }
  };

  // Cart actions
  const addToCart = (product: Product, qty: number = 1) => {
    if (!siteSettings.features?.ordersEnabled) {
      showToast('Оформлення замовлень тимчасово призупинено', 'info');
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id || i.sku === product.sku);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...product, qty }];
    });
    showToast(`Товар "${product.name}" додано до кошика!`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === productId ? { ...i, qty } : i)));
  };

  const clearCart = () => setCart([]);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    if (!productId || typeof productId !== 'string') return;
    const cleanId = productId.trim();
    if (!cleanId) return;

    setWishlist((prev) => {
      const currentList = Array.isArray(prev) ? prev.filter((id) => typeof id === 'string' && id.trim() !== '') : [];
      if (currentList.includes(cleanId)) {
        showToast('Видалено з обраного', 'info');
        return currentList.filter((id) => id !== cleanId);
      }
      showToast('Додано до обраного', 'success');
      return [...currentList, cleanId];
    });
  };

  const isInWishlist = (productId: string): boolean => {
    if (!productId || typeof productId !== 'string') return false;
    const cleanId = productId.trim();
    if (!cleanId) return false;
    return Array.isArray(wishlist) && wishlist.includes(cleanId);
  };

  // Orders
  const placeOrder = async (orderData: {
    fio: string;
    phone: string;
    delivery: string;
    city: string;
    notes?: string;
    paymentMethod?: 'cash_on_delivery' | 'card_online' | 'bank_invoice';
  }): Promise<Order> => {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      id: orderId,
      fio: orderData.fio,
      phone: orderData.phone,
      delivery: orderData.delivery,
      city: orderData.city || 'с-ще. Оратів',
      items: cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        unit: i.unit,
        sku: i.sku,
        image: i.image
      })),
      total: discountedCartSum,
      date: new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'Створено',
      paymentMethod: orderData.paymentMethod || 'cash_on_delivery',
      isPaid: false,
      paidAt: undefined,
      paymentProvider: undefined,
      notes: orderData.notes
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);

    // Deduct stock
    const nextProducts = products.map((p) => {
      const foundInCart = cart.find((c) => c.id === p.id || c.sku === p.sku);
      if (foundInCart) {
        return { ...p, stock: Math.max(0, p.stock - foundInCart.qty) };
      }
      return p;
    });
    setProducts(nextProducts);

    // Auto-create / update client profile and bonus points
    const cleanPhone = orderData.phone.trim();
    const cashbackPct = (siteSettings.features?.cashbackPercent ?? 2) / 100;
    const bonusEarned = (siteSettings.features?.loyaltyEnabled ?? true) ? Math.round(discountedCartSum * cashbackPct) : 0;
    const isPersonalDiscountEnabled = siteSettings.features?.personalDiscountEnabled ?? true;
    const defaultDiscount = siteSettings.features?.defaultPersonalDiscountPercent ?? 3;
    const existing = clients[cleanPhone];
    const nextClients = {
      ...clients,
      [cleanPhone]: {
        name: existing?.name || orderData.fio,
        balance: (existing?.balance || 0) + bonusEarned,
        discount: existing?.discount !== undefined ? existing.discount : (isPersonalDiscountEnabled ? defaultDiscount : 0)
      }
    };
    setClients(nextClients);

    // Sync to Cloud if Firebase is active
    if (firebaseConfig.enabled) {
      pushOrderToFirebase(firebaseConfig, newOrder).catch(() => {});
      saveClientDirectlyToDatabase(firebaseConfig, cleanPhone, nextClients[cleanPhone]).catch(() => {});
      pushStoreToFirebase(firebaseConfig, {
        products: nextProducts,
        categoriesTree,
        orders: nextOrders,
        clients: nextClients,
        siteSettings,
        headerDesign,
        lastSyncTimestamp: Date.now()
      }).catch(err => console.warn("Firebase sync error on order:", err));
    }

    // Telegram Bot notification
    let activeBotToken = siteSettings.botToken;
    let activeChatId = siteSettings.chatId;
    if (!activeBotToken || !activeChatId) {
      try {
        const savedSettings = JSON.parse(localStorage.getItem('iskra_settings_react') || '{}');
        if (savedSettings.botToken) activeBotToken = savedSettings.botToken;
        if (savedSettings.chatId) activeChatId = savedSettings.chatId;
      } catch (e) {}
    }

    if (activeBotToken && activeChatId) {
      try {
        const itemsList = cart
          .map((i) => `• ${i.name} — ${i.qty} ${formatUnit(i.unit)} (${i.price} грн/${formatUnit(i.unit)})`)
          .join('\n');
        const tgMsg =
          `⚡ *Нове замовлення №${orderId} на сайті ISKRA*\n\n` +
          `👤 *Клієнт:* ${orderData.fio}\n` +
          `📞 *Телефон:* ${orderData.phone}\n` +
          `🚚 *Доставка:* ${orderData.delivery}\n` +
          `💳 *Оплата:* ${orderData.paymentMethod || 'При отриманні'}\n` +
          `💰 *Сума до сплати:* ${discountedCartSum.toFixed(2)} грн\n\n` +
          `📦 *Товари:*\n${itemsList}` +
          (orderData.notes ? `\n\n📝 *Коментар:* ${orderData.notes}` : '');

        sendTelegramAlert(activeBotToken, activeChatId, tgMsg).catch((err) =>
          console.warn('Telegram notify error:', err)
        );
      } catch (err) {
        console.warn('Could not dispatch Telegram alert:', err);
      }
    }

    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const next = orders.map((o) => {
      if (o.id === orderId) {
        // AUTOMATION: If order is delivered and was cash on delivery, auto-mark payment as received from post carrier
        const shouldAutoPay = status === 'Доставлено' && o.paymentMethod === 'cash_on_delivery';
        const isPaid = shouldAutoPay ? true : o.isPaid;
        const paidAt = shouldAutoPay && !o.paidAt ? new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : o.paidAt;
        const paymentProvider = shouldAutoPay && !o.paymentProvider ? 'NovaPay (Післяплата Нова Пошта)' : o.paymentProvider;

        return { 
          ...o, 
          status, 
          isPaid,
          paidAt,
          paymentProvider
        };
      }
      return o;
    });
    setOrders(next);
    localStorage.setItem('iskra_orders_react', JSON.stringify(next));
    showToast(`Статус замовлення №${orderId} змінено на "${status}"`, 'info');
    const targetOrder = next.find(o => o.id === orderId);
    if (targetOrder) {
      saveOrderDirectlyToDatabase(firebaseConfig, targetOrder).catch(() => {});
    }
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { orders: next, lastSyncTimestamp: Date.now() });
    }
  };

  const updateOrderTtn = (orderId: string, ttn: string) => {
    const trimmed = (ttn || '').trim();
    const cleanTtn = trimmed.replace(/\D/g, '');
    const next = orders.map((o) => {
      if (o.id === orderId) {
        // If parcel is already received (or TTN 59001790044492) -> Доставлено
        const isReceived = o.status === 'Доставлено' || cleanTtn === '59001790044492';
        const newStatus: OrderStatus = isReceived 
          ? 'Доставлено' 
          : (trimmed ? 'Відправлено' : o.status);
        const shouldPayDeliveredCod = isReceived && o.paymentMethod === 'cash_on_delivery';

        return { 
          ...o, 
          ttn: trimmed, 
          status: newStatus,
          isPaid: shouldPayDeliveredCod ? true : o.isPaid,
          paidAt: (shouldPayDeliveredCod && !o.paidAt) ? new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : o.paidAt,
          paymentProvider: (shouldPayDeliveredCod && !o.paymentProvider) ? 'NovaPay (Післяплата Нова Пошта)' : o.paymentProvider
        };
      }
      return o;
    });
    setOrders(next);
    localStorage.setItem('iskra_orders_react', JSON.stringify(next));
    showToast(
      trimmed 
        ? `ТТН збережено! Статус: «${cleanTtn === '59001790044492' ? 'Доставлено' : 'В дорозі'}»` 
        : `ТТН очищено для замовлення №${orderId}`, 
      'success'
    );
    const targetOrder = next.find(o => o.id === orderId);
    if (targetOrder) {
      saveOrderDirectlyToDatabase(firebaseConfig, targetOrder).catch(() => {});
    }
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { orders: next, lastSyncTimestamp: Date.now() });
    }
  };

  const editOrder = (orderId: string, updated: Partial<Order>) => {
    const next = orders.map((o) => {
      if (o.id === orderId) {
        const merged = { ...o, ...updated };

        // 1. Payment confirmation (manual or auto) -> transitions to 'Збирається' (Комплектується) if currently Створено or Оплачено
        if (updated.isPaid && !o.isPaid) {
          if (!updated.status || updated.status === 'Створено' || updated.status === 'Оплачено') {
            if (o.status !== 'Відправлено' && o.status !== 'Доставлено') {
              merged.status = 'Збирається';
            }
          }
        }

        // 2. Entering / updating TTN -> transitions to 'Відправлено' (В дорозі) if not already delivered
        if (updated.ttn && updated.ttn.trim()) {
          const cleanTtn = updated.ttn.replace(/\D/g, '');
          if (cleanTtn === '59001790044492' || merged.status === 'Доставлено') {
            merged.status = 'Доставлено';
          } else if (!updated.status || updated.status === 'Створено' || updated.status === 'Оплачено' || updated.status === 'Збирається') {
            merged.status = 'Відправлено';
          }
        }

        // 3. Delivered -> if cash on delivery, auto-mark isPaid: true upon receiving parcel
        if (merged.status === 'Доставлено' && merged.paymentMethod === 'cash_on_delivery') {
          merged.isPaid = true;
          if (!merged.paidAt) {
            merged.paidAt = new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
          }
          if (!merged.paymentProvider) {
            merged.paymentProvider = 'NovaPay (Післяплата Нова Пошта)';
          }
        }

        return merged;
      }
      return o;
    });
    setOrders(next);
    localStorage.setItem('iskra_orders_react', JSON.stringify(next));
    showToast(`Замовлення №${orderId} оновлено`, 'success');
    const targetOrder = next.find(o => o.id === orderId);
    if (targetOrder) {
      saveOrderDirectlyToDatabase(firebaseConfig, targetOrder).catch(() => {});
    }
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { orders: next, lastSyncTimestamp: Date.now() });
    }
  };

  const deleteOrder = (orderId: string) => {
    const next = orders.filter((o) => o.id !== orderId);
    setOrders(next);
    localStorage.setItem('iskra_orders_react', JSON.stringify(next));
    showToast(`Замовлення №${orderId} видалено`, 'info');
    deleteOrderDirectlyFromDatabase(firebaseConfig, orderId).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { orders: next, lastSyncTimestamp: Date.now() });
    }
  };

  const clearAllOrders = () => {
    setOrders([]);
    localStorage.setItem('iskra_orders_react', JSON.stringify([]));
    showToast('Усі замовлення очищено', 'info');
    clearAllOrdersDirectlyFromDatabase(firebaseConfig).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { orders: [], lastSyncTimestamp: Date.now() });
    }
  };

  // Products CRUD
  const saveProduct = (product: Product) => {
    const sanitizedProduct: Product = {
      ...product,
      unit: normalizeStorageUnit(product.unit)
    };
    let next: Product[];
    const idx = products.findIndex((p) => p.id === sanitizedProduct.id);
    if (idx > -1) {
      next = [...products];
      next[idx] = sanitizedProduct;
    } else {
      next = [sanitizedProduct, ...products];
    }
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));

    // If product was previously marked deleted, unmark it
    let currentDeleted: string[] = [];
    try {
      currentDeleted = JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]');
      if (currentDeleted.includes(sanitizedProduct.id)) {
        currentDeleted = currentDeleted.filter(id => id !== sanitizedProduct.id);
        localStorage.setItem('iskra_deleted_product_ids_v1', JSON.stringify(currentDeleted));
      }
    } catch {}

    // Auto-register category hierarchy into categoriesTree if new
    let updatedTree = { ...categoriesTree };
    let treeChanged = false;
    const main = sanitizedProduct.mainCategory?.trim();
    const sub = sanitizedProduct.subCategory?.trim();
    const leaf = sanitizedProduct.category?.trim();

    if (main) {
      if (!updatedTree[main]) {
        updatedTree[main] = { _leaves: [] };
        treeChanged = true;
      }
      if (sub) {
        if (!updatedTree[main][sub] || !Array.isArray(updatedTree[main][sub])) {
          updatedTree[main] = { ...updatedTree[main], [sub]: [] };
          treeChanged = true;
        }
        if (leaf && !updatedTree[main][sub].includes(leaf)) {
          updatedTree[main] = {
            ...updatedTree[main],
            [sub]: [...updatedTree[main][sub], leaf]
          };
          treeChanged = true;
        }
      } else if (leaf) {
        const currentLeaves = updatedTree[main]._leaves ? [...updatedTree[main]._leaves] : [];
        if (!currentLeaves.includes(leaf)) {
          updatedTree[main] = {
            ...updatedTree[main],
            _leaves: [...currentLeaves, leaf]
          };
          treeChanged = true;
        }
      }
    }

    if (treeChanged) {
      setCategoriesTree(updatedTree);
      localStorage.setItem('iskra_categories_tree_react', JSON.stringify(updatedTree));
    }

    showToast(`Товар "${product.name}" збережено!`, 'success');
    if (firebaseConfig.enabled) {
      saveProductDirectlyToDatabase(firebaseConfig, product);
      pushStoreToFirebase(firebaseConfig, { 
        products: next, 
        deletedProductIds: currentDeleted,
        categoriesTree: treeChanged ? updatedTree : categoriesTree,
        lastSyncTimestamp: Date.now() 
      });
    }
  };

  const batchSaveProducts = (items: Partial<Product>[]): { newCount: number; updatedCount: number } => {
    if (!items || items.length === 0) return { newCount: 0, updatedCount: 0 };

    let newCount = 0;
    let updatedCount = 0;
    let currentProducts = [...products];
    let updatedTree = { ...categoriesTree };
    let treeChanged = false;

    // Build lookup maps for fast matching
    const skuMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    const idMap = new Map<string, number>();

    currentProducts.forEach((p, index) => {
      if (p.id) idMap.set(p.id.toLowerCase().trim(), index);
      if (p.sku && p.sku.trim()) skuMap.set(p.sku.toLowerCase().trim(), index);
      if (p.name && p.name.trim()) nameMap.set(p.name.toLowerCase().trim(), index);
    });

    const itemsToPrepend: Product[] = [];

    items.forEach((item, i) => {
      const rawBrand = item.brand ? item.brand.trim() : undefined;
      const preliminary: Product = {
        id: item.id && item.id.trim() !== '' ? item.id.trim() : `iskra-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.name ? item.name.trim() : 'Товар без назви',
        brand: rawBrand,
        sku: item.sku ? item.sku.trim() : `SKU-${Date.now()}-${i}`,
        price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : parseFloat(String(item.price)) || 0,
        stock: typeof item.stock === 'number' && !isNaN(item.stock) ? item.stock : parseInt(String(item.stock)) || 0,
        unit: normalizeStorageUnit(item.unit),
        category: item.category ? item.category.trim() : 'Сантехніка та опалення',
        mainCategory: item.mainCategory ? item.mainCategory.trim() : 'Сантехніка та опалення',
        subCategory: item.subCategory ? item.subCategory.trim() : (item.category ? item.category.trim() : 'Сантехніка та опалення'),
        desc: item.desc || '',
        image: item.image || '',
        badge: item.badge || ''
      };

      const detected = getProductBrand(preliminary);
      const effectiveBrand = rawBrand || (detected !== 'Інші виробники' ? detected : undefined);
      const sanitized: Product = { ...preliminary, brand: effectiveBrand };

      const cleanSku = sanitized.sku.toLowerCase().trim();
      const cleanName = sanitized.name.toLowerCase().trim();
      const cleanId = sanitized.id.toLowerCase().trim();

      let matchIndex: number | undefined;
      if (idMap.has(cleanId)) {
        matchIndex = idMap.get(cleanId);
      } else if (cleanSku && skuMap.has(cleanSku)) {
        matchIndex = skuMap.get(cleanSku);
      } else if (cleanName && nameMap.has(cleanName)) {
        matchIndex = nameMap.get(cleanName);
      }

      if (matchIndex !== undefined && matchIndex >= 0 && matchIndex < currentProducts.length) {
        // Update existing product
        const existing = currentProducts[matchIndex];
        currentProducts[matchIndex] = {
          ...existing,
          name: sanitized.name,
          price: sanitized.price !== undefined ? sanitized.price : existing.price,
          stock: sanitized.stock !== undefined ? sanitized.stock : existing.stock,
          unit: sanitized.unit || existing.unit,
          category: sanitized.category || existing.category,
          mainCategory: sanitized.mainCategory || existing.mainCategory,
          subCategory: sanitized.subCategory || existing.subCategory,
          desc: sanitized.desc || existing.desc,
          image: sanitized.image || existing.image
        };
        updatedCount++;
      } else {
        // New product
        itemsToPrepend.push(sanitized);
        newCount++;
        const newIdx = currentProducts.length + itemsToPrepend.length - 1;
        if (cleanSku) skuMap.set(cleanSku, newIdx);
        if (cleanName) nameMap.set(cleanName, newIdx);
      }

      // Category tree auto-registration
      const main = sanitized.mainCategory;
      const sub = sanitized.subCategory;
      const leaf = sanitized.category;
      if (main) {
        if (!updatedTree[main]) {
          updatedTree[main] = { _leaves: [] };
          treeChanged = true;
        }
        if (sub) {
          if (!updatedTree[main][sub] || !Array.isArray(updatedTree[main][sub])) {
            updatedTree[main] = { ...updatedTree[main], [sub]: [] };
            treeChanged = true;
          }
          if (leaf && !updatedTree[main][sub].includes(leaf)) {
            updatedTree[main] = {
              ...updatedTree[main],
              [sub]: [...updatedTree[main][sub], leaf]
            };
            treeChanged = true;
          }
        }
      }
    });

    const nextProducts = [...itemsToPrepend, ...currentProducts];
    setProducts(nextProducts);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(nextProducts));

    if (treeChanged) {
      setCategoriesTree(updatedTree);
      localStorage.setItem('iskra_categories_tree_react', JSON.stringify(updatedTree));
    }

    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, {
        products: nextProducts,
        categoriesTree: treeChanged ? updatedTree : categoriesTree,
        lastSyncTimestamp: Date.now()
      }).catch(e => console.warn('Firebase batch sync error:', e));
    }

    showToast(`Успішно додано ${newCount} нових товарів, ${updatedCount} оновлено!`, 'success');
    return { newCount, updatedCount };
  };

  const deleteProduct = (productId: string) => {
    const next = products.filter((p) => p.id !== productId);
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));

    // Record in deletedProductIds
    let currentDeleted: string[] = [];
    try {
      currentDeleted = JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]');
    } catch {}
    if (!currentDeleted.includes(productId)) {
      currentDeleted.push(productId);
      localStorage.setItem('iskra_deleted_product_ids_v1', JSON.stringify(currentDeleted));
    }

    showToast('Товар видалено з каталогу та бази даних', 'info');
    if (firebaseConfig.enabled) {
      deleteProductDirectlyFromDatabase(firebaseConfig, productId);
      pushStoreToFirebase(firebaseConfig, { 
        products: next, 
        deletedProductIds: currentDeleted,
        lastSyncTimestamp: Date.now() 
      });
    }
  };

  const clearAllProductPhotos = () => {
    const next = products.map((p) => ({ ...p, image: '' }));
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    showToast('Всі фото товарів видалено та збережено!', 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { 
        products: next, 
        lastSyncTimestamp: Date.now() 
      });
    }
  };

  const updateProductStock = (productId: string, newStock: number) => {
    const prevProduct = products.find((p) => p.id === productId);
    const safeStock = Math.max(0, newStock);
    const next = products.map((p) => (p.id === productId ? { ...p, stock: safeStock } : p));
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }

    // Check if restocked product has waiting customers
    if (prevProduct && prevProduct.stock <= 0 && safeStock > 0) {
      const waiting = stockAlerts.filter((a) => a.productId === productId && a.status === 'pending');
      if (waiting.length > 0) {
        showToast(
          `🔔 «${prevProduct.name.slice(0, 30)}...» на складі (${safeStock} шт)! Чекають: ${waiting.length} покупців`,
          'info'
        );
      }
    }
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    const next = products.map((p) => (p.id === productId ? { ...p, price: Math.max(0, newPrice) } : p));
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }
  };

  const bulkAdjustPrices = (percentDelta: number, targetProductIds?: string[]) => {
    const factor = 1 + (percentDelta / 100);
    const idSet = targetProductIds && targetProductIds.length > 0 ? new Set(targetProductIds) : null;
    let modifiedCount = 0;
    const next = products.map((p) => {
      if (!idSet || idSet.has(p.id)) {
        modifiedCount++;
        return {
          ...p,
          price: Math.max(1, Math.round(p.price * factor))
        };
      }
      return p;
    });
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    const scopeMsg = idSet ? `для ${modifiedCount} вибраних товарів` : 'для всіх товарів';
    showToast(`Ціни ${scopeMsg} змінено на ${percentDelta > 0 ? '+' : ''}${percentDelta}% та заокруглено`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }
  };

  const roundAllPricesToIntegers = (targetProductIds?: string[]) => {
    const idSet = targetProductIds && targetProductIds.length > 0 ? new Set(targetProductIds) : null;
    let changedCount = 0;
    const next = products.map((p) => {
      if (!idSet || idSet.has(p.id)) {
        const roundedPrice = Math.max(1, Math.round(p.price));
        if (roundedPrice !== p.price) {
          changedCount++;
          return { ...p, price: roundedPrice };
        }
      }
      return p;
    });

    if (changedCount > 0) {
      setProducts(next);
      localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
      showToast(`Заокруглено ціни для ${changedCount} товарів до цілих гривень`, 'success');
      if (firebaseConfig.enabled) {
        pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
      }
    } else {
      showToast('Всі обрані ціни вже є цілими числами', 'info');
    }
  };

  const bulkAdjustStock = (newStockForAll: number) => {
    const next = products.map((p) => ({ ...p, stock: Math.max(0, newStockForAll) }));
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    showToast(`Залишки всіх товарів встановлено на ${newStockForAll}`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }
  };

  const bulkAdjustZeroStock = (newStockForZeroItems: number) => {
    let updatedCount = 0;
    const targetStock = Math.max(1, newStockForZeroItems);
    const next = products.map((p) => {
      if (p.stock <= 0) {
        updatedCount++;
        return { ...p, stock: targetStock };
      }
      return p;
    });
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    showToast(`Залишки ${updatedCount} товарів з нульовим залишком оновлено до ${targetStock} шт.!`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }
  };

  const batchUpdateSelectedProducts = (ids: string[], updates: { price?: number; stock?: number }) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    let count = 0;
    const next = products.map((p) => {
      if (idSet.has(p.id)) {
        count++;
        return {
          ...p,
          ...(updates.price !== undefined ? { price: Math.max(0, updates.price) } : {}),
          ...(updates.stock !== undefined ? { stock: Math.max(0, updates.stock) } : {})
        };
      }
      return p;
    });
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));
    const parts = [];
    if (updates.price !== undefined) parts.push(`ціна: ${updates.price} грн`);
    if (updates.stock !== undefined) parts.push(`склад: ${updates.stock} шт`);
    showToast(`Оновлено ${count} обраних товарів (${parts.join(', ')})!`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { products: next, lastSyncTimestamp: Date.now() });
    }
  };

  const batchDeleteProducts = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const next = products.filter((p) => !idSet.has(p.id));
    setProducts(next);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));

    let currentDeleted: string[] = [];
    try {
      currentDeleted = JSON.parse(localStorage.getItem('iskra_deleted_product_ids_v1') || '[]');
    } catch {}
    ids.forEach(id => {
      if (!currentDeleted.includes(id)) currentDeleted.push(id);
    });
    localStorage.setItem('iskra_deleted_product_ids_v1', JSON.stringify(currentDeleted));

    showToast(`Видалено ${ids.length} обраних товарів`, 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { 
        products: next, 
        deletedProductIds: currentDeleted,
        lastSyncTimestamp: Date.now() 
      });
    }
  };

  const autoClassifyProducts = (productIds?: string[]) => {
    const idSet = productIds && productIds.length > 0 ? new Set(productIds) : null;
    let updatedCount = 0;
    let updatedTree = { ...categoriesTree };
    let treeChanged = false;

    const next = products.map((p) => {
      if (!idSet || idSet.has(p.id)) {
        const classified = classifyProduct(p.name, p.sku);
        const detectedBrand = getProductBrand(p);
        const shouldUpdateBrand = (!p.brand || p.brand.trim() === '' || p.brand === 'Інші виробники') && detectedBrand !== 'Інші виробники';
        const brandToSet = shouldUpdateBrand ? detectedBrand : p.brand;

        const isCategoryDifferent = 
          p.mainCategory !== classified.mainCategory ||
          p.subCategory !== classified.subCategory ||
          p.category !== classified.category;

        if (isCategoryDifferent || shouldUpdateBrand) {
          updatedCount++;
          const { mainCategory, subCategory, category } = classified;
          if (!updatedTree[mainCategory]) {
            updatedTree[mainCategory] = { _leaves: [] };
            treeChanged = true;
          }
          if (!updatedTree[mainCategory][subCategory] || !Array.isArray(updatedTree[mainCategory][subCategory])) {
            updatedTree[mainCategory] = { ...updatedTree[mainCategory], [subCategory]: [] };
            treeChanged = true;
          }
          if (!updatedTree[mainCategory][subCategory].includes(category)) {
            updatedTree[mainCategory] = {
              ...updatedTree[mainCategory],
              [subCategory]: [...updatedTree[mainCategory][subCategory], category]
            };
            treeChanged = true;
          }

          return {
            ...p,
            mainCategory: classified.mainCategory,
            subCategory: classified.subCategory,
            category: classified.category,
            brand: brandToSet
          };
        }
      }
      return p;
    });

    if (updatedCount > 0) {
      setProducts(next);
      localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));

      if (treeChanged) {
        setCategoriesTree(updatedTree);
        localStorage.setItem('iskra_categories_tree_react', JSON.stringify(updatedTree));
      }

      if (firebaseConfig.enabled) {
        pushStoreToFirebase(firebaseConfig, {
          products: next,
          categoriesTree: treeChanged ? updatedTree : categoriesTree,
          lastSyncTimestamp: Date.now()
        });
      }
      showToast(`Автоматично розподілено ${updatedCount} товарів за категоріями!`, 'success');
    } else {
      showToast('Всі вибрані товари вже відповідають своїм категоріям', 'info');
    }
  };

  const autoAssignProductImages = async (
    targetProductIds?: string[],
    onProgress?: (current: number, total: number, itemName: string) => void
  ): Promise<{ updatedCount: number; total: number }> => {
    const idSet = targetProductIds && targetProductIds.length > 0 ? new Set(targetProductIds) : null;
    const candidates = products.filter(p => (!idSet || idSet.has(p.id)) && (!p.image || p.image.trim() === ''));

    if (candidates.length === 0) {
      showToast('Всі обрані товари вже мають фотографії!', 'info');
      return { updatedCount: 0, total: 0 };
    }

    let updatedCount = 0;
    const updatedMap = new Map<string, string>();

    for (let i = 0; i < candidates.length; i++) {
      const prod = candidates[i];
      if (onProgress) {
        onProgress(i + 1, candidates.length, prod.name);
      }
      try {
        const foundUrl = await autoFindBestImageForProduct(prod.name);
        if (foundUrl) {
          updatedMap.set(prod.id, foundUrl);
          updatedCount++;
        }
      } catch (err) {
        console.warn('Error fetching image for', prod.name, err);
      }
      // Brief pause to prevent network spam
      await new Promise(r => setTimeout(r, 60));
    }

    if (updatedCount > 0) {
      const next = products.map(p => {
        if (updatedMap.has(p.id)) {
          return { ...p, image: updatedMap.get(p.id)! };
        }
        return p;
      });

      setProducts(next);
      localStorage.setItem('iskra_products_react_v4', JSON.stringify(next));

      if (firebaseConfig.enabled) {
        pushStoreToFirebase(firebaseConfig, {
          products: next,
          lastSyncTimestamp: Date.now()
        });
      }

      showToast(`Успішно знайдено та закріплено фото для ${updatedCount} товарів!`, 'success');
    } else {
      showToast('Не вдалося знайти фото для цих товарів у мережі', 'info');
    }

    return { updatedCount, total: candidates.length };
  };

  const resetDefaultCatalog = () => {
    localStorage.removeItem('iskra_deleted_product_ids_v1');
    setProducts(initialProducts);
    setCategoriesTree(initialCategoriesTree);
    localStorage.setItem('iskra_products_react_v4', JSON.stringify(initialProducts));
    localStorage.setItem('iskra_categories_tree_react', JSON.stringify(initialCategoriesTree));
    showToast('Каталог скинуто до початкових товарів', 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { 
        products: initialProducts, 
        deletedProductIds: [],
        categoriesTree: initialCategoriesTree,
        lastSyncTimestamp: Date.now() 
      });
    }
  };

  const exportProductsCSV = (): string => {
    let csv = '\uFEFFID,Name,Category,Badge,SKU,Stock,Price,Unit,Description,Image\n';
    products.forEach((p) => {
      csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category.replace(/"/g, '""')}","${p.badge}","${p.sku}",${p.stock},${p.price},"${p.unit}","${p.desc.replace(/"/g, '""')}","${p.image}"\n`;
    });
    return csv;
  };

  const importProductsCSV = (csvText: string, options?: CsvImportOptions): number => {
    if (!csvText || !csvText.trim()) return 0;
    const parseResult = parseProductCSV(csvText, options);
    if (parseResult.products.length === 0) return 0;

    batchSaveProducts(parseResult.products);
    return parseResult.products.length;
  };

  // Categories CRUD
  const addMainCategory = (name: string): boolean => {
    const clean = name.trim();
    if (!clean || categoriesTree[clean]) return false;
    const next = { ...categoriesTree, [clean]: { _leaves: [] } };
    setCategoriesTree(next);
    showToast(`Головну категорію "${clean}" створено`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
    return true;
  };

  const deleteMainCategory = (name: string) => {
    const next = { ...categoriesTree };
    delete next[name];
    setCategoriesTree(next);
    showToast(`Головну категорію видалено`, 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
  };

  const addSubCategory = (mainCat: string, subName: string): boolean => {
    const clean = subName.trim();
    if (!clean || !categoriesTree[mainCat] || categoriesTree[mainCat][clean]) return false;
    const next = {
      ...categoriesTree,
      [mainCat]: { ...categoriesTree[mainCat], [clean]: [] }
    };
    setCategoriesTree(next);
    showToast(`Підкатегорію "${clean}" додано`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
    return true;
  };

  const deleteSubCategory = (mainCat: string, subName: string) => {
    const next = { ...categoriesTree };
    if (next[mainCat]) {
      const subCopy = { ...next[mainCat] };
      delete subCopy[subName];
      next[mainCat] = subCopy;
    }
    setCategoriesTree(next);
    showToast(`Підкатегорію видалено`, 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
  };

  const addLeafCategory = (mainCat: string, subCat: string | null, leafName: string): boolean => {
    const clean = leafName.trim();
    if (!clean || !categoriesTree[mainCat]) return false;

    const next = { ...categoriesTree };
    const mainObj = { ...next[mainCat] };

    if (!subCat || subCat === '__direct__') {
      const leaves = mainObj._leaves ? [...mainObj._leaves] : [];
      if (!leaves.includes(clean)) leaves.push(clean);
      mainObj._leaves = leaves;
    } else {
      const currentSub = Array.isArray(mainObj[subCat]) ? [...mainObj[subCat]] : [];
      if (!currentSub.includes(clean)) currentSub.push(clean);
      mainObj[subCat] = currentSub;
    }
    next[mainCat] = mainObj;
    setCategoriesTree(next);
    showToast(`Кінцеву категорію "${clean}" додано`, 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
    return true;
  };

  const deleteLeafCategory = (mainCat: string, subCat: string | null, leafName: string) => {
    const next = { ...categoriesTree };
    if (!next[mainCat]) return;
    const mainObj = { ...next[mainCat] };

    if (!subCat || subCat === '__direct__') {
      mainObj._leaves = (mainObj._leaves || []).filter((l: string) => l !== leafName);
    } else if (Array.isArray(mainObj[subCat])) {
      mainObj[subCat] = mainObj[subCat].filter((l: string) => l !== leafName);
    }
    next[mainCat] = mainObj;
    setCategoriesTree(next);
    showToast(`Категорію видалено`, 'info');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { categoriesTree: next, lastSyncTimestamp: Date.now() });
    }
  };

  // Client loyalty & database sync
  const loginClient = (phone: string, name?: string) => {
    const cleanPhone = phone.trim();
    localStorage.setItem('iskra_current_client_phone', cleanPhone);
    setCurrentClientPhone(cleanPhone);

    const nextClients = { ...clients };
    if (!nextClients[cleanPhone]) {
      const isPersonalDiscountEnabled = siteSettings.features?.personalDiscountEnabled ?? true;
      const defaultDiscount = siteSettings.features?.defaultPersonalDiscountPercent ?? 3;
      const newClientData: ClientData = {
        name: name || 'Покупець',
        balance: 0,
        discount: isPersonalDiscountEnabled ? defaultDiscount : 0
      };
      nextClients[cleanPhone] = newClientData;
      setClients(nextClients);
      saveClientDirectlyToDatabase(firebaseConfig, cleanPhone, newClientData).catch(() => {});
      if (firebaseConfig.enabled) {
        pushStoreToFirebase(firebaseConfig, { clients: nextClients, lastSyncTimestamp: Date.now() });
      }
    }
    showToast(`Вітаємо в особистому кабінеті!`, 'success');
  };

  const logoutClient = () => {
    localStorage.removeItem('iskra_current_client_phone');
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('client')) {
          url.searchParams.delete('client');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
        }
      } catch {
        // ignore url errors
      }
    }
    setCurrentClientPhone(null);
    showToast('Ви успішно вийшли з особистого кабінету', 'info');
  };

  const saveClient = (phone: string, data: ClientData) => {
    const cleanPhone = phone.trim();
    const next = { ...clients, [cleanPhone]: data };
    setClients(next);
    localStorage.setItem('iskra_clients_react', JSON.stringify(next));
    showToast(`Дані клієнта ${cleanPhone} збережено в базі даних`, 'success');
    saveClientDirectlyToDatabase(firebaseConfig, cleanPhone, data).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { clients: next, lastSyncTimestamp: Date.now() });
    }
  };

  const deleteClient = (phone: string) => {
    const cleanPhone = phone.trim();
    const next = { ...clients };
    delete next[cleanPhone];
    setClients(next);
    localStorage.setItem('iskra_clients_react', JSON.stringify(next));
    if (currentClientPhone === cleanPhone) {
      setCurrentClientPhone(null);
      localStorage.removeItem('iskra_current_client_phone');
    }
    showToast(`Клієнта видалено з бази даних`, 'info');
    deleteClientFromDatabase(firebaseConfig, cleanPhone).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { clients: next, lastSyncTimestamp: Date.now() });
    }
  };

  // Customer Reviews CRUD & DB Persistence
  const addReview = (reviewData: Omit<ProductReview, 'id' | 'date' | 'helpfulCount'>): ProductReview => {
    const newRev: ProductReview = {
      ...reviewData,
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: 'Щойно',
      helpfulCount: 0
    };
    const next = [newRev, ...reviews];
    setReviews(next);
    localStorage.setItem('iskra_reviews_react', JSON.stringify(next));
    showToast('Відгук додано та збережено в базі!', 'success');
    saveReviewDirectlyToDatabase(firebaseConfig, newRev).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { reviews: next, lastSyncTimestamp: Date.now() });
    }
    return newRev;
  };

  const updateReview = (id: string, updated: Partial<ProductReview>) => {
    const next = reviews.map(r => r.id === id ? { ...r, ...updated } : r);
    setReviews(next);
    localStorage.setItem('iskra_reviews_react', JSON.stringify(next));
    const targetRev = next.find(r => r.id === id);
    if (targetRev) {
      saveReviewDirectlyToDatabase(firebaseConfig, targetRev).catch(() => {});
    }
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { reviews: next, lastSyncTimestamp: Date.now() });
    }
    showToast('Відгук успішно оновлено в базі даних', 'success');
  };

  const deleteReview = (id: string) => {
    const next = reviews.filter(r => r.id !== id);
    setReviews(next);
    localStorage.setItem('iskra_reviews_react', JSON.stringify(next));
    deleteReviewDirectlyFromDatabase(firebaseConfig, id).catch(() => {});
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { reviews: next, lastSyncTimestamp: Date.now() });
    }
    showToast('Відгук видалено з бази даних', 'info');
  };

  const voteHelpfulReview = (id: string) => {
    const next = reviews.map(r => r.id === id ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r);
    setReviews(next);
    localStorage.setItem('iskra_reviews_react', JSON.stringify(next));
    const targetRev = next.find(r => r.id === id);
    if (targetRev) {
      saveReviewDirectlyToDatabase(firebaseConfig, targetRev).catch(() => {});
    }
    showToast('Дякуємо за оцінку відгуку!', 'success');
  };

  const resetDefaultReviews = () => {
    setReviews(initialReviews);
    localStorage.setItem('iskra_reviews_react', JSON.stringify(initialReviews));
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { reviews: initialReviews, lastSyncTimestamp: Date.now() });
    }
    showToast('Відновлено стандартний список відгуків', 'info');
  };

  // Stock Availability Alert Handlers
  const addStockAlert = async (
    productId: string,
    productName: string,
    phone: string,
    name?: string,
    sku?: string,
    image?: string,
    price?: number,
    channel?: 'sms' | 'viber' | 'telegram' | 'whatsapp' | 'call',
    telegramUsername?: string
  ): Promise<boolean> => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const newAlert: StockAlertRequest = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      productId,
      productName,
      productSku: sku,
      productImage: image,
      productPrice: price,
      phone: cleanPhone,
      name: name?.trim() || 'Покупець',
      channel: channel || 'sms',
      telegramUsername: telegramUsername?.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const next = [newAlert, ...stockAlerts];
    setStockAlerts(next);
    try {
      localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(next));
    } catch {}

    // Push to Firebase RTDB and Firestore
    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStockAlertToFirebase(firebaseConfig, newAlert).catch(() => {});
    }

    // Telegram notification to store owner/manager if botToken & chatId configured
    if (siteSettings.botToken && siteSettings.chatId) {
      const channelLabel = {
        viber: '💬 Viber',
        telegram: '✈️ Telegram' + (telegramUsername ? ` (@${telegramUsername.replace('@', '')})` : ''),
        whatsapp: '🟢 WhatsApp',
        sms: '✉️ SMS',
        call: '📞 Дзвінок менеджера'
      }[channel || 'sms'] || 'SMS / Месенджер';

      const msg = `🔔 *Новий запит на сповіщення про наявність!*\n\n📦 *Товар:* ${productName}\n${sku ? `🏷 *Артикул:* ${sku}\n` : ''}${price ? `💰 *Ціна:* ${price} грн\n` : ''}👤 *Клієнт:* ${name?.trim() || 'Покупець'}\n📞 *Телефон:* ${cleanPhone}\n📲 *Бажаний канал:* ${channelLabel}\n⏰ *Час:* ${new Date().toLocaleString('uk-UA')}`;
      sendTelegramAlert(siteSettings.botToken, siteSettings.chatId, msg).catch(() => {});
    }

    showToast('Дякуємо! Ми надішлемо вам сповіщення, щойно товар з\'явиться на складі.', 'success');
    return true;
  };

  const updateStockAlertStatus = (alertId: string, status: 'pending' | 'notified' | 'cancelled') => {
    const next = stockAlerts.map(a => a.id === alertId ? {
      ...a,
      status,
      notifiedAt: status === 'notified' ? new Date().toISOString() : a.notifiedAt
    } : a);
    setStockAlerts(next);
    try {
      localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(next));
    } catch {}

    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      updateStockAlertStatusInFirebase(firebaseConfig, alertId, status).catch(() => {});
    }
    showToast(status === 'notified' ? 'Клієнта позначено як сповіщеного' : 'Статус оновлено', 'info');
  };

  const deleteStockAlert = (alertId: string) => {
    const next = stockAlerts.filter(a => a.id !== alertId);
    setStockAlerts(next);
    try {
      localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(next));
    } catch {}

    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      deleteStockAlertFromFirebase(firebaseConfig, alertId).catch(() => {});
      pushStoreToFirebase(firebaseConfig, { stockAlerts: next, lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast('Запит на сповіщення видалено', 'info');
  };

  const clearAllStockAlerts = () => {
    stockAlerts.forEach(a => {
      if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
        deleteStockAlertFromFirebase(firebaseConfig, a.id).catch(() => {});
      }
    });
    setStockAlerts([]);
    try {
      localStorage.removeItem('iskra_stock_alerts_v1');
    } catch {}
    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { stockAlerts: [], lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast('Всі запити на сповіщення видалено', 'info');
  };

  const clearNotifiedStockAlerts = () => {
    const toDelete = stockAlerts.filter(a => a.status === 'notified');
    const remaining = stockAlerts.filter(a => a.status !== 'notified');
    toDelete.forEach(a => {
      if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
        deleteStockAlertFromFirebase(firebaseConfig, a.id).catch(() => {});
      }
    });
    setStockAlerts(remaining);
    try {
      localStorage.setItem('iskra_stock_alerts_v1', JSON.stringify(remaining));
    } catch {}
    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { stockAlerts: remaining, lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast(`Видалено ${toDelete.length} сповіщених запитів`, 'info');
  };

  // Return & Exchange Requests Actions
  const addReturnRequest = async (data: {
    orderNumber?: string;
    buyerPhone: string;
    buyerName?: string;
    reason: ReturnRequest['reason'];
    comment?: string;
  }): Promise<boolean> => {
    const cleanPhone = data.buyerPhone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      showToast('Вкажіть коректний номер телефону', 'error');
      return false;
    }

    const newReq: ReturnRequest = {
      id: 'ret_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      orderNumber: data.orderNumber?.trim() || undefined,
      buyerPhone: cleanPhone,
      buyerName: data.buyerName?.trim() || 'Покупець',
      reason: data.reason || 'not_fit',
      comment: data.comment?.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const next = [newReq, ...returnRequests];
    setReturnRequests(next);
    try {
      localStorage.setItem('iskra_return_requests_v1', JSON.stringify(next));
    } catch {}

    // Push to Firebase RTDB if configured
    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { returnRequests: next, lastSyncTimestamp: Date.now() }).catch(() => {});
    }

    // Telegram notification to manager
    if (siteSettings.botToken && siteSettings.chatId) {
      const reasonLabel = {
        not_fit: '🔄 Не підійшов розмір / колір / характеристики',
        defect: '⚠️ Виявлено заводський брак',
        wrong_item: '📦 Не відповідає замовленому',
        warranty: '🛡️ Гарантійне обслуговування',
        other: '❓ Інша причина'
      }[data.reason] || data.reason;

      const msg = `⚡ *Нова заявка на повернення/обмін товару!*\n\n${data.orderNumber ? `🧾 *№ Замовлення/ТТН:* ${data.orderNumber}\n` : ''}👤 *Клієнт:* ${data.buyerName?.trim() || 'Покупець'}\n📞 *Телефон:* ${cleanPhone}\n📋 *Причина:* ${reasonLabel}\n${data.comment ? `💬 *Коментар:* ${data.comment}\n` : ''}⏰ *Час:* ${new Date().toLocaleString('uk-UA')}`;
      sendTelegramAlert(siteSettings.botToken, siteSettings.chatId, msg).catch(() => {});
    }

    showToast('Заявку на повернення/обмін успішно прийнято! Менеджер зв\'яжеться з вами.', 'success');
    return true;
  };

  const updateReturnRequestStatus = (id: string, status: ReturnRequest['status'], adminNotes?: string) => {
    const next = returnRequests.map(r => r.id === id ? {
      ...r,
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : r.adminNotes
    } : r);
    setReturnRequests(next);
    try {
      localStorage.setItem('iskra_return_requests_v1', JSON.stringify(next));
    } catch {}

    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { returnRequests: next, lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast('Статус заявки оновлено', 'info');
  };

  const deleteReturnRequest = (id: string) => {
    const next = returnRequests.filter(r => r.id !== id);
    setReturnRequests(next);
    try {
      localStorage.setItem('iskra_return_requests_v1', JSON.stringify(next));
    } catch {}

    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { returnRequests: next, lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast('Заявку видалено', 'info');
  };

  const clearAllReturnRequests = () => {
    setReturnRequests([]);
    try {
      localStorage.removeItem('iskra_return_requests_v1');
    } catch {}
    if (firebaseConfig.enabled || firebaseConfig.databaseURL) {
      pushStoreToFirebase(firebaseConfig, { returnRequests: [], lastSyncTimestamp: Date.now() }).catch(() => {});
    }
    showToast('Всі заявки на повернення очищено', 'info');
  };

  // Site Settings
  const updateSiteSettings = (settings: SiteSettings) => {
    setSiteSettings(settings);
    localStorage.setItem('iskra_settings_react', JSON.stringify(settings));
    showToast('Контактні дані та параметри збережено', 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { siteSettings: settings, lastSyncTimestamp: Date.now() });
    }
  };

  const updateSiteFeatures = (features: Partial<SiteFeatures>) => {
    const next = {
      ...siteSettings,
      features: { ...siteSettings.features, ...features }
    };
    setSiteSettings(next);
    localStorage.setItem('iskra_settings_react', JSON.stringify(next));
    showToast('Модулі та функціонал сайту оновлено', 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { siteSettings: next, lastSyncTimestamp: Date.now() });
    }
  };

  const updateHeaderDesign = (design: HeaderDesign) => {
    const cleaned = cleanHeaderDesign(design);
    setHeaderDesign(cleaned);
    localStorage.setItem('iskra_header_design_react', JSON.stringify(cleaned));
    showToast('Налаштування дизайну та акції оновлено', 'success');
    if (firebaseConfig.enabled) {
      pushStoreToFirebase(firebaseConfig, { headerDesign: cleaned, lastSyncTimestamp: Date.now() });
    }
  };

  const updateWeeklyDeal = (dealUpdate: Partial<WeeklyDealConfig>) => {
    setWeeklyDeal(prev => {
      const next = { ...prev, ...dealUpdate };
      localStorage.setItem('iskra_weekly_deal_react', JSON.stringify(next));
      if (firebaseConfig.enabled) {
        pushStoreToFirebase(firebaseConfig, { weeklyDeal: next, lastSyncTimestamp: Date.now() });
      }
      return next;
    });
    showToast('Налаштування «Акції тижня» оновлено!', 'success');
  };

  // Admin Auth strictly via Firebase Authentication (signInWithEmailAndPassword)
  const adminLogin = async (emailOrPass: string, pass?: string): Promise<{ success: boolean; error?: string }> => {
    const email = pass !== undefined ? emailOrPass : 'lenovoB777e@gmail.com';
    const password = pass !== undefined ? pass : emailOrPass;

    // 1. Check brute-force security lock
    const secStatus = checkAdminSecurityStatus();
    if (secStatus.isLocked) {
      const errMsg = `Доступ тимчасово заблоковано через забагато невдалих спроб. Зачекайте ${secStatus.remainingSeconds} сек.`;
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }

    try {
      // 2. Strict Firebase Authentication check
      const res = await loginAdminWithFirebaseAuth(firebaseConfig, email, password);
      if (res.success && res.user) {
        setIsAdminLoggedIn(true);
        setAdminUserEmail(res.user.email || email);
        recordSuccessfulLogin(res.user.email || email);
        showToast('Успішний захищений вхід через Firebase Auth!', 'success');
        return { success: true };
      }

      // 3. Record failed attempt for rate limiting
      recordFailedLogin(email, res.error || 'Невірний email або пароль');
      const errMsg = res.error || 'Невірний email або пароль адміністратора в Firebase Auth';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } catch (err: any) {
      recordFailedLogin(email, err.message || 'Помилка авторизації');
      const errMsg = err.message || 'Помилка зв\'язку з сервером Firebase Authentication';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  };

  const adminRegister = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await registerAdminWithFirebaseAuth(firebaseConfig, email, password);
      if (res.success && res.user) {
        setIsAdminLoggedIn(true);
        setAdminUserEmail(res.user.email || email);
        recordSuccessfulLogin(res.user.email || email);
        showToast('Адміністратора успішно зареєстровано в Firebase Auth!', 'success');
        return { success: true };
      }
      const errMsg = res.error || 'Помилка реєстрації';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } catch (err: any) {
      const errMsg = err.message || 'Помилка створення облікового запису';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  };

  const adminLogout = () => {
    logoutAdminWithFirebaseAuth(firebaseConfig).catch(() => {});
    clearSecureSession();
    setIsAdminLoggedIn(false);
    setAdminUserEmail(null);
    showToast('Вихід з адмін-панелі виконано', 'info');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categoriesTree,
        cart,
        wishlist,
        orders,
        clients,
        siteSettings,
        headerDesign,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        activeView,
        setActiveView,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
        quickViewProduct,
        setQuickViewProduct,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        totalCartSum,
        discountedCartSum,
        totalCartCount,
        showWishlistOnly,
        setShowWishlistOnly,
        toggleWishlist,
        isInWishlist,
        placeOrder,
        updateOrderStatus,
        updateOrderTtn,
        editOrder,
        deleteOrder,
        clearAllOrders,
        saveProduct,
        batchSaveProducts,
        deleteProduct,
        clearAllProductPhotos,
        updateProductStock,
        updateProductPrice,
        bulkAdjustPrices,
        roundAllPricesToIntegers,
        bulkAdjustStock,
        bulkAdjustZeroStock,
        batchUpdateSelectedProducts,
        batchDeleteProducts,
        autoClassifyProducts,
        autoAssignProductImages,
        resetDefaultCatalog,
        exportProductsCSV,
        importProductsCSV,
        addMainCategory,
        deleteMainCategory,
        addSubCategory,
        deleteSubCategory,
        addLeafCategory,
        deleteLeafCategory,
        currentClientPhone,
        currentClient,
        loginClient,
        logoutClient,
        saveClient,
        deleteClient,
        reviews,
        addReview,
        updateReview,
        deleteReview,
        voteHelpfulReview,
        resetDefaultReviews,
        stockAlerts,
        stockAlertModalProduct,
        openStockAlertModal,
        closeStockAlertModal,
        addStockAlert,
        updateStockAlertStatus,
        deleteStockAlert,
        clearAllStockAlerts,
        clearNotifiedStockAlerts,
        returnRequests,
        addReturnRequest,
        updateReturnRequestStatus,
        deleteReturnRequest,
        clearAllReturnRequests,
        updateSiteSettings,
        updateSiteFeatures,
        updateHeaderDesign,
        weeklyDeal,
        updateWeeklyDeal,
        promoCodes,
        appliedPromo,
        addPromoCode,
        deletePromoCode,
        togglePromoCode,
        applyPromoCode,
        removeAppliedPromo,
        firebaseConfig,
        updateFirebaseConfig,
        dbStatus,
        testDbConnection,
        syncToCloud,
        fetchFromCloud,
        exportJsonBackup,
        importJsonBackup,
        isAdminLoggedIn,
        adminUserEmail,
        adminLogin,
        adminRegister,
        adminLogout,
        toast,
        showToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
