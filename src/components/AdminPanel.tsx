import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { saveAdminPasswordToFirestore } from '../services/firebaseService';
import { getSafeImageUrl } from '../utils/assetImages';
import { optimizeImageFile } from '../utils/imageUpload';
import { 
  formatUkrainianPhone, 
  extractLocalPhoneDigits, 
  UKRAINIAN_OPERATOR_CODES 
} from '../utils/phoneFormatter';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Palette, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  FileDown, 
  FileUp, 
  FolderPlus, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ArrowLeft,
  DollarSign,
  Database,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Sliders,
  TrendingUp,
  Printer,
  Sparkles,
  Key,
  ShieldAlert,
  Flame,
  Clock,
  Tag,
  Percent,
  ShoppingBag,
  ExternalLink,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  ShieldCheck,
  UserPlus,
  Pencil,
  MapPin,
  Star,
  ThumbsUp,
  MessageSquare,
  MessageSquarePlus,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Truck,
  CreditCard,
  Banknote,
  FileText,
  Building2,
  Boxes,
  Clipboard,
  Bell,
  Phone,
  Copy,
  MessageCircle,
  RotateCcw,
  X
} from 'lucide-react';
import { 
  generateSmsUrl, 
  generateViberUrl, 
  generateTelegramUrl,
  generateWhatsAppUrl,
  formatStockAlertSms, 
  sendSmsViaGateway 
} from '../utils/smsHelper';
import { Order, OrderStatus, Product, ProductBadge, ProductReview, StockAlertRequest, FirebaseConnectionConfig } from '../types/store';
import { LiveTrackingWidget } from './LiveTrackingWidget';
import { UkrSkladSyncModal } from './UkrSkladSyncModal';
import { CsvImportModal } from './CsvImportModal';
import { formatUnit, formatPriceUnit, normalizeStorageUnit } from '../utils/unitFormatter';
import { getProductBrand, matchProductSearch } from '../utils/brandHelper';
import { trackNovaPoshtaTTN, searchUkrposhtaOffices, UkrposhtaOffice } from '../services/deliveryService';
import { sendTelegramAlert } from '../utils/telegramHelper';
import { 
  checkAdminSecurityStatus, 
  recordFailedLogin, 
  recordSuccessfulLogin, 
  getSecurityLogs, 
  clearSecurityAuditLogs,
  generateAntiBotChallenge
} from '../services/adminSecurityService';

// Inline editable stock component with smooth zero deletion and database sync
interface InlineStockInputProps {
  productId: string;
  stock: number;
  lowStockThreshold: number;
  updateProductStock: (id: string, newStock: number) => void;
}

const InlineStockInput: React.FC<InlineStockInputProps> = ({
  productId,
  stock,
  lowStockThreshold,
  updateProductStock
}) => {
  const [val, setVal] = useState<string>(String(stock));

  useEffect(() => {
    setVal(String(stock));
  }, [stock]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setVal('');
      return;
    }
    const cleaned = raw.length > 1 ? raw.replace(/^0+(?=\d)/, '') : raw;
    setVal(cleaned);
  };

  const handleBlur = () => {
    if (val === '') {
      setVal('0');
      updateProductStock(productId, 0);
    } else {
      const num = parseInt(val, 10);
      const safe = isNaN(num) || num < 0 ? 0 : num;
      setVal(String(safe));
      updateProductStock(productId, safe);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const currentNum = parseInt(val, 10) || 0;

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={val}
      onFocus={(e) => e.target.select()}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-16 px-2 py-1 border rounded text-xs font-mono tabular-nums text-center font-bold outline-none transition-colors ${
        currentNum <= 0
          ? 'border-rose-400 bg-rose-50 text-rose-700 font-bold'
          : currentNum <= lowStockThreshold
          ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
          : 'border-slate-300 bg-white text-slate-900 focus:border-orange-500'
      }`}
    />
  );
};

interface InlinePriceInputProps {
  productId: string;
  price: number;
  updateProductPrice: (id: string, newPrice: number) => void;
}

const InlinePriceInput: React.FC<InlinePriceInputProps> = ({
  productId,
  price,
  updateProductPrice
}) => {
  const [val, setVal] = useState<string>(String(price));

  useEffect(() => {
    setVal(String(price));
  }, [price]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setVal('');
      return;
    }
    const cleaned = raw.length > 1 ? raw.replace(/^0+(?=\d)/, '') : raw;
    setVal(cleaned);
  };

  const handleBlur = () => {
    if (val === '') {
      setVal('0');
      updateProductPrice(productId, 0);
    } else {
      const num = parseFloat(val);
      const safe = isNaN(num) || num < 0 ? 0 : num;
      setVal(String(safe));
      updateProductPrice(productId, safe);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={val}
      onFocus={(e) => e.target.select()}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-20 px-2 py-1 border border-slate-300 rounded font-bold font-display text-slate-900 tabular-nums text-center outline-none focus:border-orange-500"
    />
  );
};

const getUkPositionsWord = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'позиція';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'позиції';
  return 'позицій';
};

interface StockFilterDropdownProps {
  value: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  onChange: (val: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const StockFilterDropdown: React.FC<StockFilterDropdownProps> = ({
  value,
  onChange,
  totalProducts,
  inStockCount,
  lowStockCount,
  outOfStockCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: Array<{ id: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'; label: string }> = [
    { id: 'all', label: `Всі товари - [ ${totalProducts} ${getUkPositionsWord(totalProducts)} ]` },
    { id: 'in_stock', label: `В наявності - [ ${inStockCount} ${getUkPositionsWord(inStockCount)} ]` },
    { id: 'low_stock', label: `⚠️ Закінчуються - [ ${lowStockCount} ${getUkPositionsWord(lowStockCount)} ]` },
    { id: 'out_of_stock', label: `❌ Немає в наявності - [ ${outOfStockCount} ${getUkPositionsWord(outOfStockCount)} ]` }
  ];

  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto min-w-[280px] px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold flex items-center justify-between gap-2 shadow-2xs hover:border-orange-300 transition-all cursor-pointer"
      >
        <span className="truncate whitespace-nowrap">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[320px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                value === opt.id
                  ? 'bg-orange-50 text-orange-900 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="whitespace-nowrap">{opt.label}</span>
              {value === opt.id && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper component for managing each main category in the tree
const AdminCategoryCard: React.FC<{
  mainCat: string;
  mainObj: Record<string, any>;
  onDeleteMain: (name: string) => void;
  onAddSub: (main: string, sub: string) => void;
  onDeleteSub: (main: string, sub: string) => void;
  onAddLeaf: (main: string, sub: string | null, leaf: string) => void;
  onDeleteLeaf: (main: string, sub: string | null, leaf: string) => void;
}> = ({
  mainCat,
  mainObj,
  onDeleteMain,
  onAddSub,
  onDeleteSub,
  onAddLeaf,
  onDeleteLeaf
}) => {
  const [subInput, setSubInput] = useState('');
  const [directLeafInput, setDirectLeafInput] = useState('');
  const [leafInputs, setLeafInputs] = useState<Record<string, string>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmSubDelete, setConfirmSubDelete] = useState<string | null>(null);

  const directLeaves: string[] = Array.isArray(mainObj._leaves) ? mainObj._leaves : [];
  const subCats = Object.keys(mainObj).filter((k) => k !== '_leaves' && !k.startsWith('_'));

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
          <span className="p-1 rounded-lg bg-orange-100 text-orange-600 text-xs">📂</span>
          <span>{mainCat}</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({subCats.length} підкатегорій, {directLeaves.length} прямих груп)
          </span>
        </span>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1.5 animate-in fade-in">
            <span className="text-xs text-rose-600 font-semibold">Видалити всю категорію?</span>
            <button
              type="button"
              onClick={() => {
                onDeleteMain(mainCat);
                setIsConfirmingDelete(false);
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
            >
              Так, видалити
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
            >
              Скасувати
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            Видалити категорію
          </button>
        )}
      </div>

      {/* Input forms for Subcategory and Direct Leaf */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-200/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (subInput.trim()) {
              onAddSub(mainCat, subInput.trim());
              setSubInput('');
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            placeholder={`Нова підкатегорія в "${mainCat}"...`}
            value={subInput}
            onChange={(e) => setSubInput(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white outline-none focus:border-orange-500 w-48 sm:w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            + Підкатегорія
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (directLeafInput.trim()) {
              onAddLeaf(mainCat, null, directLeafInput.trim());
              setDirectLeafInput('');
            }
          }}
          className="flex items-center gap-1.5 sm:ml-auto"
        >
          <input
            type="text"
            placeholder="Пряма кінцева група..."
            value={directLeafInput}
            onChange={(e) => setDirectLeafInput(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white outline-none focus:border-orange-500 w-40 sm:w-48"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            + Кінцева
          </button>
        </form>
      </div>

      {/* Direct Leaves (if any) */}
      {directLeaves.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold self-center mr-1">Прямі групи:</span>
          {directLeaves.map((leaf) => (
            <span
              key={leaf}
              className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 text-xs px-2.5 py-1 rounded-lg"
            >
              <span>{leaf}</span>
              <button
                type="button"
                onClick={() => onDeleteLeaf(mainCat, null, leaf)}
                className="text-amber-700 hover:text-rose-600 font-bold ml-0.5"
                title="Видалити"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Subcategories Grid */}
      {subCats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {subCats.map((sub) => {
            const leaves: string[] = Array.isArray(mainObj[sub]) ? mainObj[sub] : [];

            return (
              <div key={sub} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800 pb-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <span>📁</span>
                    <span>{sub}</span>
                  </span>

                  {confirmSubDelete === sub ? (
                    <span className="inline-flex items-center gap-1 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSub(mainCat, sub);
                          setConfirmSubDelete(null);
                        }}
                        className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                      >
                        Видалити
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSubDelete(null)}
                        className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                      >
                        Ні
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmSubDelete(sub)}
                      className="text-rose-500 hover:text-rose-700 font-normal text-[11px] hover:underline"
                    >
                      Видалити
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {leaves.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Немає кінцевих категорій</span>
                  ) : (
                    leaves.map((leaf) => (
                      <span
                        key={leaf}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] transition-colors"
                      >
                        <span>{leaf}</span>
                        <button
                          type="button"
                          onClick={() => onDeleteLeaf(mainCat, sub, leaf)}
                          className="text-slate-400 hover:text-rose-600 font-bold ml-0.5"
                          title="Видалити"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = (leafInputs[sub] || '').trim();
                    if (val) {
                      onAddLeaf(mainCat, sub, val);
                      setLeafInputs((prev) => ({ ...prev, [sub]: '' }));
                    }
                  }}
                  className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100"
                >
                  <input
                    type="text"
                    placeholder="+ Кінцева група"
                    value={leafInputs[sub] || ''}
                    onChange={(e) => setLeafInputs((prev) => ({ ...prev, [sub]: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg flex-1 outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                  >
                    +
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    categoriesTree, 
    orders, 
    clients, 
    siteSettings, 
    headerDesign,
    isAdminLoggedIn,
    adminUserEmail,
    adminLogin,
    adminRegister,
    adminLogout,
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
    exportProductsCSV,
    importProductsCSV,
    resetDefaultCatalog,
    updateOrderStatus,
    updateOrderTtn,
    editOrder,
    deleteOrder,
    clearAllOrders,
    addMainCategory,
    deleteMainCategory,
    addSubCategory,
    deleteSubCategory,
    addLeafCategory,
    deleteLeafCategory,
    saveClient,
    deleteClient,
    reviews,
    addReview,
    updateReview,
    deleteReview,
    resetDefaultReviews,
    stockAlerts,
    updateStockAlertStatus,
    deleteStockAlert,
    clearAllStockAlerts,
    clearNotifiedStockAlerts,
    updateSiteSettings,
    updateSiteFeatures,
    updateHeaderDesign,
    weeklyDeal,
    updateWeeklyDeal,
    firebaseConfig,
    updateFirebaseConfig,
    dbStatus,
    testDbConnection,
    syncToCloud,
    fetchFromCloud,
    exportJsonBackup,
    importJsonBackup,
    setActiveView,
    showToast
  } = useStore();

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'products' | 'weekly_deal' | 'categories' | 'orders' | 'reviews' | 'clients' | 'stock_alerts' | 'analytics' | 'features' | 'database' | 'delivery' | 'payments' | 'design' | 'about_settings' | 'returns_settings' | 'settings'
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskra_admin_tab');
      const validTabs = ['products', 'weekly_deal', 'categories', 'orders', 'reviews', 'clients', 'stock_alerts', 'analytics', 'features', 'database', 'delivery', 'payments', 'design', 'about_settings', 'returns_settings', 'settings'];
      if (saved && validTabs.includes(saved)) {
        return saved as any;
      }
    }
    return 'products';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskra_admin_tab', activeTab);
    }
  }, [activeTab]);

  // Stock Alerts states
  const [stockAlertSearch, setStockAlertSearch] = useState('');
  const [stockAlertStatusFilter, setStockAlertStatusFilter] = useState<'all' | 'pending' | 'notified'>('all');
  const [stockAlertFilterProduct, setStockAlertFilterProduct] = useState<string>('');
  const [stockAlertInStockOnly, setStockAlertInStockOnly] = useState(false);
  const [smsModalAlert, setSmsModalAlert] = useState<{ alert: StockAlertRequest; text: string } | null>(null);
  const [isSendingGatewaySms, setIsSendingGatewaySms] = useState(false);
  const [selectedStockAlertIds, setSelectedStockAlertIds] = useState<string[]>([]);
  const [alertToDelete, setAlertToDelete] = useState<string | null>(null);
  const [isConfirmingClearAllAlerts, setIsConfirmingClearAllAlerts] = useState(false);
  const [isConfirmingClearNotifiedAlerts, setIsConfirmingClearNotifiedAlerts] = useState(false);
  const [isConfirmingBulkDeleteAlerts, setIsConfirmingBulkDeleteAlerts] = useState(false);

  // Search & Filter states
  const [productSearch, setProductSearch] = useState('');
  const [productFilterStock, setProductFilterStock] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [isSyncingTTN, setIsSyncingTTN] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [adminNavGroup, setAdminNavGroup] = useState<'all' | 'sales' | 'services' | 'settings'>('all');
  const [adminTabSearch, setAdminTabSearch] = useState('');

  // Ukrposhta test state in Admin
  const [upTestQuery, setUpTestQuery] = useState('22600');
  const [upTestResults, setUpTestResults] = useState<UkrposhtaOffice[]>([]);
  const [isTestingUp, setIsTestingUp] = useState(false);

  // Reviews Tab State
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilterRating, setReviewFilterRating] = useState<string>('all');
  const [reviewFilterProduct, setReviewFilterProduct] = useState<string>('all');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [rAuthor, setRAuthor] = useState('');
  const [rCity, setRCity] = useState('');
  const [rRating, setRRating] = useState<number>(5);
  const [rProductId, setRProductId] = useState('');
  const [rComment, setRComment] = useState('');
  const [rVerified, setRVerified] = useState(true);
  const [rRecommended, setRRecommended] = useState(true);
  const [rHelpful, setRHelpful] = useState<number>(0);
  const [rDate, setRDate] = useState('Сьогодні');

  // Bulk price edit state
  const [bulkPercent, setBulkPercent] = useState<number>(5);
  const [bulkStockValue, setBulkStockValue] = useState<number>(10);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [batchPriceInput, setBatchPriceInput] = useState<number | string>('');
  const [batchStockInput, setBatchStockInput] = useState<number | string>('');
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchQ = matchProductSearch(p, productSearch);
    const matchStock = 
      productFilterStock === 'all' 
        ? true 
        : productFilterStock === 'in_stock' 
        ? p.stock > 0 
        : productFilterStock === 'low_stock' 
        ? p.stock > 0 && p.stock <= lowStockThreshold 
        : p.stock <= 0;
    return matchQ && matchStock;
  });

  // Product Add/Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUkrSkladModalOpen, setIsUkrSkladModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // Form states for Product Modal
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pMainCat, setPMainCat] = useState('');
  const [pSubCat, setPSubCat] = useState('');
  const [pLeafCat, setPLeafCat] = useState('');
  const [pBadge, setPBadge] = useState<ProductBadge>('');
  const [pSku, setPSku] = useState('');
  const [pStock, setPStock] = useState<number | string>(10);
  const [pPrice, setPPrice] = useState<number | string>(100);
  const [pUnit, setPUnit] = useState('грн/шт');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [productImageUploadError, setProductImageUploadError] = useState<string | null>(null);
  const [productImageTab, setProductImageTab] = useState<'upload' | 'search' | 'url'>('upload');
  const [onlineImageQuery, setOnlineImageQuery] = useState('');

  // Handler for uploading product image from local PC
  const handleProductImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProductImageUploadError(null);
    setIsUploadingProductImage(true);
    try {
      const result = await optimizeImageFile(file, 1000, 1000, 0.85);
      setPImage(result.dataUrl);
      showToast(`Фото товару успішно завантажено (${result.sizeKb} КБ)!`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Помилка під час обробки фото';
      setProductImageUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingProductImage(false);
      e.target.value = '';
    }
  };

  // Handler for pasting image from clipboard (Ctrl+V)
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                const file = new File([blob], 'pasted-image.png', { type });
                const result = await optimizeImageFile(file, 1000, 1000, 0.85);
                setPImage(result.dataUrl);
                showToast(`Фото успішно вставлено з буфера (${result.sizeKb} КБ)!`, 'success');
                return;
              }
            }
          }
        } catch {
          // ignore and fall through to readText
        }
      }

      if (navigator.clipboard?.readText) {
        try {
          const text = await navigator.clipboard.readText();
          const cleanText = text?.trim();
          if (cleanText && (cleanText.startsWith('http://') || cleanText.startsWith('https://') || cleanText.startsWith('data:image/'))) {
            setPImage(cleanText);
            showToast('Посилання на фото успішно вставлено!', 'success');
            return;
          }
        } catch {
          // ignore
        }
      }

      showToast('Натисніть комбінацію клавіш Ctrl + V для швидкої вставки скопійованого фото або посилання', 'info');
    } catch {
      showToast('Натисніть комбінацію клавіш Ctrl + V для швидкої вставки скопійованого фото', 'info');
    }
  };

  const handleModalPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const result = await optimizeImageFile(file, 1000, 1000, 0.85);
            setPImage(result.dataUrl);
            showToast(`Фото товару вставлено з буфера (${result.sizeKb} КБ)!`, 'success');
            return;
          } catch {}
        }
      }
    }
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
      setPImage(text.trim());
      showToast('Посилання на фото вставлено!', 'success');
    }
  };

  // Product management states
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [confirmResetCatalog, setConfirmResetCatalog] = useState(false);
  const [confirmClearPhotos, setConfirmClearPhotos] = useState(false);

  // Category states
  const [newMainCatInput, setNewMainCatInput] = useState('');

  // Order management states
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [confirmClearAllOrders, setConfirmClearAllOrders] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [addOrderItemId, setAddOrderItemId] = useState<string>('');

  // Client edit/add modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<{
    phone: string;
    originalPhone?: string;
    name: string;
    balance: number;
    discount: number;
    city?: string;
    notes?: string;
    isNew?: boolean;
  }>({
    phone: '',
    name: '',
    balance: 0,
    discount: 3,
    city: '',
    notes: '',
    isNew: false
  });
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Settings & DB Form
  const [settingsForm, setSettingsForm] = useState(siteSettings);
  const [designForm, setDesignForm] = useState(headerDesign);
  const [dbConfigForm, setDbConfigForm] = useState<FirebaseConnectionConfig>(firebaseConfig);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    setDesignForm(headerDesign);
  }, [headerDesign]);

  useEffect(() => {
    setDbConfigForm(firebaseConfig);
  }, [firebaseConfig]);

  // Security Session Guard:
  // On all admin panel pages, if sessionStorage.getItem('isAdminLoggedIn') !== 'true',
  // immediately redirect back to login
  useEffect(() => {
    if (isAdminLoggedIn) {
      const isAuthInSession = sessionStorage.getItem('isAdminLoggedIn') === 'true';
      if (!isAuthInSession) {
        adminLogout();
      }
    }
  }, [isAdminLoggedIn, activeTab]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
      adminLogout();
      return;
    }
    setActiveTab(tab);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);
    try {
      if (isRegisterMode) {
        const res = await adminRegister(adminEmail, adminPassword);
        if (!res.success) {
          setLoginError(res.error || 'Помилка реєстрації нового адміністратора');
        }
      } else {
        const res = await adminLogin(adminEmail, adminPassword);
        if (!res.success) {
          setLoginError(res.error || 'Невірний email або пароль адміністратора');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Помилка зв\'язку з Firebase Authentication');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // KPIs & Stock Analysis
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalSalesSum = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const outOfStockProducts = products.filter((p) => p.stock <= 0);
  const outOfStockCount = outOfStockProducts.length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= lowStockThreshold);
  const lowStockCount = lowStockProducts.length;
  const totalCriticalStockCount = outOfStockCount + lowStockCount;
  const averageOrderValue = totalOrders > 0 ? totalSalesSum / totalOrders : 0;
  const pendingStockAlertsCount = stockAlerts.filter((a) => a.status === 'pending').length;

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 text-center animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-orange-500 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-slate-900/10">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mb-1">
            Панель керування ISKRA
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Захищена авторизація через <strong>Firebase Authentication</strong>
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>signInWithEmailAndPassword • onAuthStateChanged</span>
          </div>

          <form
            onSubmit={handleLoginSubmit}
            className="space-y-4 text-left"
          >
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email адміністратора
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={isAuthenticating}
                  placeholder="admin@iskra.ru"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Пароль адміністратора
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isAuthenticating}
                  placeholder="Введіть ваш пароль"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:opacity-50 font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{loginError}</span>
                  {loginError.includes('не знайдено') && !isRegisterMode && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(true);
                          setLoginError(null);
                        }}
                        className="text-red-800 underline font-bold"
                      >
                        Створити цей обліковий запис в Firebase Auth?
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {isRegisterMode ? 'Створення в Firebase Auth...' : 'Авторизація у Firebase Auth...'}
                  </span>
                </>
              ) : (
                <span>
                  {isRegisterMode ? 'Зареєструвати адміністратора' : 'Увійти в панель керування'}
                </span>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginError(null);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              {isRegisterMode ? (
                <span>Вже є обліковий запис? <strong>Увійти</strong></span>
              ) : (
                <span>Немає створеного користувача? <strong>Зареєструвати в Firebase Auth</strong></span>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveView('store')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Повернутися до магазину</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Open modal for new product
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPBrand('');
    const mainKeys = Object.keys(categoriesTree);
    const initialMain = mainKeys[0] || '';
    setPMainCat(initialMain);
    setPSubCat('');
    setPLeafCat('');
    setPBadge('');
    setPSku('ISK-' + Math.floor(100 + Math.random() * 900));
    setPStock(10);
    setPPrice(250);
    setPUnit('грн/шт');
    setPDesc('');
    setPImage('');
    setProductImageUploadError(null);
    setProductImageTab('upload');
    setOnlineImageQuery('');
    setIsProductModalOpen(true);
  };

  // Helper to accurately match product to categoriesTree hierarchy
  const findProductHierarchy = (p: Product) => {
    let main = p.mainCategory?.trim() || '';
    let sub = p.subCategory?.trim() || '';
    let leaf = p.category?.trim() || '';

    // If leaf has slashes, e.g. "Електротовари / Кабельна продукція / Кабель силовий ВВГ"
    if (leaf.includes('/')) {
      const parts = leaf.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        main = parts[0];
        sub = parts[1];
        leaf = parts[2];
      } else if (parts.length === 2) {
        main = parts[0];
        leaf = parts[1];
      } else if (parts.length === 1) {
        leaf = parts[0];
      }
    }

    const allMainKeys = Object.keys(categoriesTree).filter(k => !k.startsWith('_'));

    // Check if main is known or search tree
    if (!main || !categoriesTree[main]) {
      // 1. Search if leaf matches any leaf in any main/sub in categoriesTree
      for (const m of allMainKeys) {
        const mObj = categoriesTree[m];
        if (!mObj || typeof mObj !== 'object') continue;

        for (const [sKey, leaves] of Object.entries(mObj)) {
          if (sKey === '_leaves' && Array.isArray(leaves)) {
            if (leaves.some(l => l.toLowerCase() === leaf.toLowerCase())) {
              return { main: m, sub: '', leaf };
            }
          } else if (Array.isArray(leaves)) {
            if (leaves.some(l => l.toLowerCase() === leaf.toLowerCase())) {
              return { main: m, sub: sKey, leaf };
            }
            if (sKey.toLowerCase() === leaf.toLowerCase()) {
              return { main: m, sub: sKey, leaf: leaves[0] || leaf };
            }
          }
        }

        if (m.toLowerCase() === leaf.toLowerCase()) {
          return { main: m, sub: '', leaf };
        }
      }

      // 2. Search based on product name / SKU / category keywords
      const text = `${p.name} ${p.sku} ${leaf}`.toLowerCase();
      if (
        text.includes('кабел') ||
        text.includes('провід') ||
        text.includes('провод') ||
        text.includes('ввг') ||
        text.includes('пвс') ||
        text.includes('шввп') ||
        text.includes('гофр') ||
        text.includes('автомат') ||
        text.includes('диф') ||
        text.includes('узо') ||
        text.includes('реле') ||
        text.includes('щит') ||
        text.includes('розетк') ||
        text.includes('вимикач') ||
        text.includes('ламп') ||
        text.includes('led') ||
        text.includes('прожектор') ||
        text.includes('світло') ||
        text.includes('електр') ||
        text.includes('wago') ||
        text.includes('клеми') ||
        text.includes('сіп') ||
        text.includes('рубильник')
      ) {
        main = allMainKeys.find(k => k.toLowerCase().includes('електр')) || 'Електротовари';
        if (text.includes('кабел') || text.includes('провід') || text.includes('ввг') || text.includes('пвс') || text.includes('шввп') || text.includes('гофр')) {
          sub = 'Кабельна продукція';
          if (!leaf || leaf === 'Загальне' || leaf.includes('Сантехніка')) {
            leaf = 'Кабель силовий ВВГ';
          }
        } else if (text.includes('автомат') || text.includes('щит') || text.includes('реле') || text.includes('узо')) {
          sub = 'Автоматика та щитове обладнання';
        } else if (text.includes('розетк') || text.includes('вимикач')) {
          sub = 'Розетки та вимикачі';
        } else if (text.includes('ламп') || text.includes('led') || text.includes('світл')) {
          sub = 'Освітлення та LED';
        }
      } else if (
        text.includes('змішувач') ||
        text.includes('ванн') ||
        text.includes('душ') ||
        text.includes('кран') ||
        text.includes('труб') ||
        text.includes('фітинг') ||
        text.includes('сифон') ||
        text.includes('бойлер') ||
        text.includes('котел') ||
        text.includes('радіатор') ||
        text.includes('унітаз') ||
        text.includes('мийк') ||
        text.includes('умивальник') ||
        text.includes('каналізац') ||
        text.includes('фільтр') ||
        text.includes('опаленн') ||
        text.includes('сантех')
      ) {
        main = allMainKeys.find(k => k.toLowerCase().includes('сантех')) || 'Сантехніка та опалення';
      } else if (
        text.includes('інструмент') ||
        text.includes('молоток') ||
        text.includes('викрутк') ||
        text.includes('плоскогуб') ||
        text.includes('дрель') ||
        text.includes('перфоратор') ||
        text.includes('болгарк') ||
        text.includes('рулетк') ||
        text.includes('рівень')
      ) {
        main = allMainKeys.find(k => k.toLowerCase().includes('інструмент')) || 'Інструменти';
      } else if (
        text.includes('господар') ||
        text.includes('відро') ||
        text.includes('лопат') ||
        text.includes('рукавич') ||
        text.includes('мішок') ||
        text.includes('клей') ||
        text.includes('піна')
      ) {
        main = allMainKeys.find(k => k.toLowerCase().includes('господар')) || 'Господарські товари';
      } else {
        main = allMainKeys[0] || 'Сантехніка та опалення';
      }
    }

    return { main, sub, leaf };
  };

  // Open modal for edit product
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPBrand(p.brand || '');

    const { main, sub, leaf } = findProductHierarchy(p);

    setPMainCat(main);
    setPSubCat(sub);
    setPLeafCat(leaf);
    setPBadge(p.badge);
    setPSku(p.sku);
    setPStock(p.stock);
    setPPrice(p.price);
    setPUnit(normalizeStorageUnit(p.unit));
    setPDesc(p.desc);
    setPImage(p.image);
    setProductImageUploadError(null);
    setProductImageTab(p.image && p.image.trim() !== '' ? 'upload' : 'search');
    setOnlineImageQuery(p.name);
    setIsProductModalOpen(true);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pName.trim()) {
      showToast('Будь ласка, вкажіть назву товару!', 'error');
      return;
    }

    const cleanSku = (pSku && pSku.trim()) ? pSku.trim() : (editingProduct?.sku || `SKU-${Date.now().toString().slice(-6)}`);
    const cleanStock = pStock === '' || isNaN(Number(pStock)) ? 0 : Math.max(0, Number(pStock));
    const cleanPrice = pPrice === '' || isNaN(Number(pPrice)) ? 0 : Math.max(0, Number(pPrice));

    const savedProd: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      name: pName.trim(),
      brand: pBrand.trim() || undefined,
      category: pLeafCat || pSubCat || pMainCat || 'Загальне',
      mainCategory: pMainCat,
      subCategory: pSubCat,
      badge: pBadge,
      sku: cleanSku,
      stock: cleanStock,
      price: cleanPrice,
      unit: normalizeStorageUnit(pUnit),
      desc: pDesc || '',
      image: pImage ? pImage.trim() : '',
      specs: editingProduct?.specs
    };

    saveProduct(savedProd);
    setIsProductModalOpen(false);
  };

  const handleCsvExport = () => {
    const csv = exportProductsCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iskra_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Каталог успішно експортовано у CSV', 'success');
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        importProductsCSV(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleJsonBackupDownload = () => {
    const jsonStr = exportJsonBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iskra_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Повну резервну копію сайту скачано!', 'success');
  };

  const handleJsonBackupRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        importJsonBackup(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Review management handlers
  const openAddReviewModal = (presetProductId?: string) => {
    setEditingReviewId(null);
    setRAuthor('');
    setRCity('с. Оратів');
    setRRating(5);
    setRProductId(presetProductId || '');
    setRComment('');
    setRVerified(true);
    setRRecommended(true);
    setRHelpful(0);
    setRDate('Сьогодні');
    setIsReviewModalOpen(true);
  };

  const openEditReviewModal = (rev: ProductReview) => {
    setEditingReviewId(rev.id);
    setRAuthor(rev.author);
    setRCity(rev.city || '');
    setRRating(rev.rating);
    setRProductId(rev.productId || '');
    setRComment(rev.comment);
    setRVerified(rev.verifiedPurchase);
    setRRecommended(rev.recommended);
    setRHelpful(rev.helpfulCount || 0);
    setRDate(rev.date || 'Нещодавно');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rComment.trim()) {
      showToast('Будь ласка, введіть текст відгуку', 'info');
      return;
    }

    if (editingReviewId) {
      updateReview(editingReviewId, {
        author: rAuthor.trim() || 'Покупець ISKRA',
        city: rCity.trim() || 'с. Оратів',
        rating: rRating,
        productId: rProductId,
        comment: rComment.trim(),
        verifiedPurchase: rVerified,
        recommended: rRecommended,
        helpfulCount: rHelpful,
        date: rDate
      });
    } else {
      addReview({
        author: rAuthor.trim() || 'Покупець ISKRA',
        city: rCity.trim() || 'с. Оратів',
        rating: rRating,
        productId: rProductId,
        comment: rComment.trim(),
        verifiedPurchase: rVerified,
        recommended: rRecommended
      });
    }

    setIsReviewModalOpen(false);
  };

  const handleDeleteReview = (id: string) => {
    deleteReview(id);
  };

  const printOrderSlip = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Накладна №${order.id}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { font-size: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; }
            .total { font-size: 16px; font-weight: bold; margin-top: 15px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Магазин «ISKRA» — Товарний чек №${order.id}</h1>
          <p><b>Дата:</b> ${order.date}</p>
          <p><b>Клієнт:</b> ${order.fio} (${order.phone})</p>
          <p><b>Доставка:</b> ${order.delivery}</p>
          <p><b>ТТН:</b> ${order.ttn || '—'}</p>
          <table>
            <thead><tr><th>Товар</th><th>Кількість</th><th>Ціна</th><th>Сума</th></tr></thead>
            <tbody>
              ${(order.items || []).map((i: any) => `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.qty} ${formatUnit(i.unit)}</td>
                  <td>${i.price} грн</td>
                  <td>${(i.qty * i.price).toFixed(2)} грн</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="total">Разом до сплати: ${order.total.toFixed(2)} грн</p>
          <hr style="margin-top: 30px;" />
          <p style="font-size: 11px; color: #64748b;">Дякуємо за покупку в магазині ISKRA! (с. Оратів, тел: ${siteSettings.phone})</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Export Procurement List to CSV
  const exportLowStockCSV = () => {
    const criticalItems = products.filter(p => p.stock <= lowStockThreshold);
    if (criticalItems.length === 0) {
      showToast('Всі товари на складі мають достатній залишок!', 'info');
      return;
    }
    const headers = ['Артикул', 'Назва товару', 'Категорія', 'Поточний залишок', 'Ціна продажу', 'Рекомендована закупівля'];
    const rows = criticalItems.map(p => [
      `"${p.sku.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.stock,
      p.price,
      Math.max(10, 20 - p.stock) // Suggested order
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `iskra_low_stock_procurement_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Завантажено відомість на закупівлю (${criticalItems.length} товарів)`, 'success');
  };

  // Print Procurement Sheet for Suppliers
  const printProcurementList = () => {
    const criticalItems = products.filter(p => p.stock <= lowStockThreshold);
    if (criticalItems.length === 0) {
      showToast('Всі товари на складі мають достатній залишок!', 'info');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Відомість на закупівлю товару ISKRA</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 800; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-bottom: 6px; }
            .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f8fafc; font-weight: bold; }
            .stock-zero { background: #fee2e2; color: #991b1b; font-weight: bold; }
            .stock-low { background: #fef3c7; color: #92400e; font-weight: bold; }
            .suggested { font-weight: bold; color: #0369a1; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Магазин «ISKRA» — Відомість на закупівлю та поповнення залишків</h1>
          <div class="subtitle">
            Дата формування: ${new Date().toLocaleString('uk-UA')} | Поріг залишку: менше ${lowStockThreshold + 1} шт. | Всього позицій: ${criticalItems.length}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 120px;">Артикул</th>
                <th>Назва товару</th>
                <th>Категорія</th>
                <th style="text-align: center; width: 110px;">Поточний залишок</th>
                <th style="text-align: center; width: 130px;">Рекомендовано замовити</th>
                <th style="width: 120px;">Факт замовлення</th>
              </tr>
            </thead>
            <tbody>
              ${criticalItems.map(p => `
                <tr>
                  <td><code>${p.sku}</code></td>
                  <td><b>${p.name}</b></td>
                  <td>${p.category}</td>
                  <td style="text-align: center;" class="${p.stock <= 0 ? 'stock-zero' : 'stock-low'}">
                    ${p.stock <= 0 ? '❌ 0 (Немає)' : `⚠️ ${p.stock} ${formatUnit(p.unit)}`}
                  </td>
                  <td style="text-align: center;" class="suggested">
                    +${Math.max(10, 20 - p.stock)} шт.
                  </td>
                  <td>___________</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Магазин сантехніки та електротоварів «ISKRA» • ${siteSettings.city}, ${siteSettings.address} • Тел: ${siteSettings.phone}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Top Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-slate-900 text-orange-500 px-2 py-0.5 rounded text-sm font-black">
              ADMIN PRO
            </span>
            <h2 className="text-xl font-bold font-display text-slate-900">
              Панель керування ISKRA
            </h2>
            
            {adminUserEmail && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono">{adminUserEmail}</span>
              </span>
            )}

            {/* Live Database status pill */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              dbStatus === 'connected'
                ? 'bg-emerald-100 text-emerald-800'
                : dbStatus === 'syncing'
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : dbStatus === 'error'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'syncing' ? 'bg-amber-500' : 'bg-slate-400'
              }`} />
              <span>
                {dbStatus === 'connected' ? 'БД: Підключено' : dbStatus === 'syncing' ? 'БД: Синхронізація...' : dbStatus === 'error' ? 'БД: Помилка' : 'БД: Офлайн'}
              </span>
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            Повне керування товарами, базою даних, замовленнями, клієнтами, аналітикою та налаштуваннями
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('store')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>На сайт</span>
          </button>

          <button
            onClick={adminLogout}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Вийти</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Товари на складі</span>
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black font-display text-slate-900 tabular-nums">
            {totalProducts}
          </div>
          <div className="text-[10px] mt-0.5 flex flex-wrap items-center gap-1.5">
            {totalCriticalStockCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setProductFilterStock('low_stock');
                }}
                className="text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
              >
                ⚠️ {totalCriticalStockCount} {
                  (() => {
                    const n = totalCriticalStockCount;
                    const m10 = n % 10;
                    const m100 = n % 100;
                    const pos = (m10 === 1 && m100 !== 11) ? 'позиція' : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? 'позиції' : 'позицій';
                    const verb = (m10 === 1 && m100 !== 11) ? 'потребує' : 'потребують';
                    return `${pos} ${verb}`;
                  })()
                } закупки
              </button>
            ) : (
              <span className="text-emerald-600 font-medium">✓ Всі в достатній кількості</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Замовлень</span>
            <ShoppingCart className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black font-display text-slate-900 tabular-nums">
            {totalOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Сер. чек: {averageOrderValue.toFixed(0)} грн
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Сума продажів</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-display text-emerald-600 tabular-nums">
            {totalSalesSum.toFixed(0)} грн
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Обороти за весь період
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Хмарна БД</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-display text-indigo-600">
            {firebaseConfig.enabled ? 'Активна' : 'Офлайн'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {firebaseConfig.databaseURL ? 'RTDB підключено' : 'Потрібне налаштування'}
          </div>
        </div>
      </div>

      {/* Grouped Admin Navigation Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-4 mb-6 space-y-3.5">
        
        {/* Hub Header: Categories Filter & Quick Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          
          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl">
            <button
              type="button"
              onClick={() => setAdminNavGroup('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                adminNavGroup === 'all'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Всі розділи (16)
            </button>

            <button
              type="button"
              onClick={() => setAdminNavGroup('sales')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                adminNavGroup === 'sales'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🛍️ Каталог та Продажі</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 font-mono">7</span>
              {totalCriticalStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Є товари в дефіциті" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setAdminNavGroup('services')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                adminNavGroup === 'services'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>⚡ Інтеграції та БД</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 font-mono">5</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminNavGroup('settings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                adminNavGroup === 'settings'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🏢 Налаштування сайту</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 font-mono">4</span>
            </button>
          </div>

          {/* Search Tab Input */}
          <div className="relative min-w-[180px] sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Знайти вкладку..."
              value={adminTabSearch}
              onChange={(e) => setAdminTabSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-red-500 transition-all placeholder:text-slate-400"
            />
            {adminTabSearch && (
              <button
                type="button"
                onClick={() => setAdminTabSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Groups Container */}
        <div className="space-y-4">
          
          {/* GROUP 1: Каталог та Продажі */}
          {(adminNavGroup === 'all' || adminNavGroup === 'sales') && (!adminTabSearch || ['товар', 'акці', 'тижн', 'замовл', 'категор', 'відгук', 'клієнт', 'очіку', 'лист', 'stock'].some(k => k.includes(adminTabSearch.toLowerCase()) || adminTabSearch.toLowerCase().includes(k))) && (
            <div className="space-y-2">
              {adminNavGroup === 'all' && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>🛍️ Каталог, Замовлення та Клієнти</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                
                {/* 1. Товари */}
                {(!adminTabSearch || 'товари products наявність склад'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('products')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'products'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'products' ? 'bg-white/10 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                        activeTab === 'products' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {products.length}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Товари</div>
                      {totalCriticalStockCount > 0 ? (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            activeTab === 'products' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800 border border-amber-300/60'
                          }`}>
                            <span>⚠️</span>
                            <span>{totalCriticalStockCount} дефіцит</span>
                          </span>
                        </div>
                      ) : (
                        <div className={`text-[10px] mt-0.5 ${activeTab === 'products' ? 'text-white/60' : 'text-slate-400'}`}>
                          Склад в нормі
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {/* 2. Замовлення */}
                {(!adminTabSearch || 'замовлення orders покупки клієнт чек'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('orders')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'orders' ? 'bg-white/10 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                        activeTab === 'orders' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {orders.length}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Замовлення</div>
                      {orders.filter(o => o.status === 'Створено').length > 0 ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-[10px] font-black px-1.5 py-0.2 rounded-md bg-red-600 text-white animate-pulse">
                            +{orders.filter(o => o.status === 'Створено').length} нових
                          </span>
                        </div>
                      ) : (
                        <div className={`text-[10px] mt-0.5 ${activeTab === 'orders' ? 'text-white/60' : 'text-slate-400'}`}>
                          Оброблено
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {/* 3. Категорії */}
                {(!adminTabSearch || 'категорії categories розділи каталог'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('categories')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'categories'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'categories' ? 'bg-white/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                        <FolderPlus className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Категорії</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'categories' ? 'text-white/60' : 'text-slate-400'}`}>
                        Дерево каталогу
                      </div>
                    </div>
                  </button>
                )}

                {/* 4. Акція тижня */}
                {(!adminTabSearch || 'акція тижня weekly deal знижка промо'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('weekly_deal')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'weekly_deal'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${
                        activeTab === 'weekly_deal' 
                          ? 'bg-white/10 text-red-400' 
                          : weeklyDeal.enabled ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Flame className={`w-4 h-4 ${weeklyDeal.enabled ? 'fill-current' : ''}`} />
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        weeklyDeal.enabled 
                          ? (activeTab === 'weekly_deal' ? 'bg-red-500/30 text-red-200 border border-red-400/40' : 'bg-red-100 text-red-700 font-black')
                          : (activeTab === 'weekly_deal' ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {weeklyDeal.enabled ? 'Увімкнено' : 'Вимкнено'}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Акція тижня</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'weekly_deal' ? 'text-white/60' : 'text-slate-400'}`}>
                        {weeklyDeal.enabled ? 'Промо-банер діє' : 'Неактивна'}
                      </div>
                    </div>
                  </button>
                )}

                {/* 5. Відгуки */}
                {(!adminTabSearch || 'відгуки reviews оцінки зірки коментарі'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('reviews')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'reviews'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'reviews' ? 'bg-white/10 text-amber-300' : 'bg-amber-50 text-amber-500'}`}>
                        <Star className={`w-4 h-4 ${reviews.length > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </div>
                      <span className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                        activeTab === 'reviews' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {reviews.length}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Відгуки</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'reviews' ? 'text-white/60' : 'text-slate-400'}`}>
                        Модерація та рейтинг
                      </div>
                    </div>
                  </button>
                )}

                {/* 6. Клієнти */}
                {(!adminTabSearch || 'клієнти clients покупці база телефони'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('clients')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'clients'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'clients' ? 'bg-white/10 text-violet-300' : 'bg-violet-50 text-violet-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                        activeTab === 'clients' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {Object.keys(clients).length}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Клієнти</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'clients' ? 'text-white/60' : 'text-slate-400'}`}>
                        Історія покупок
                      </div>
                    </div>
                  </button>
                )}

                {/* 7. Очікують товар */}
                {(!adminTabSearch || 'очікують товар stock alerts сповіщення лист очікування'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => {
                      setStockAlertFilterProduct('');
                      handleTabChange('stock_alerts');
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'stock_alerts'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'stock_alerts' ? 'bg-white/10 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      {pendingStockAlertsCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-amber-500 text-slate-950 animate-pulse">
                          {pendingStockAlertsCount}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          activeTab === 'stock_alerts' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          0
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Очікують товар</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'stock_alerts' ? 'text-white/60' : 'text-slate-400'}`}>
                        {pendingStockAlertsCount > 0 ? 'Є активні заявки' : 'Лист очікування'}
                      </div>
                    </div>
                  </button>
                )}

              </div>
            </div>
          )}

          {/* GROUP 2: Інтеграції та Системи */}
          {(adminNavGroup === 'all' || adminNavGroup === 'services') && (!adminTabSearch || ['бд', 'база', 'даних', 'хмара', 'аналіт', 'модул', 'достав', 'пошт', 'оплат', 'wayforpay', 'mono'].some(k => k.includes(adminTabSearch.toLowerCase()) || adminTabSearch.toLowerCase().includes(k))) && (
            <div className="space-y-2">
              {adminNavGroup === 'all' && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
                  <span>⚡ Хмарні інтеграції, Платежі та Аналітика</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                
                {/* 1. База даних (БД) */}
                {(!adminTabSearch || 'база даних бд firebase cloud rtdb синхронізація'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('database')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'database'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'database' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Database className="w-4 h-4" />
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        firebaseConfig.enabled 
                          ? (activeTab === 'database' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200')
                          : (activeTab === 'database' ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-500')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${firebaseConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{firebaseConfig.enabled ? 'RTDB' : 'Офлайн'}</span>
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">База даних (БД)</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'database' ? 'text-white/60' : 'text-slate-400'}`}>
                        Firebase синхронізація
                      </div>
                    </div>
                  </button>
                )}

                {/* 2. Аналітика */}
                {(!adminTabSearch || 'аналітика analytics звіти продажі прибуток'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('analytics')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'analytics'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'analytics' ? 'bg-white/10 text-cyan-300' : 'bg-cyan-50 text-cyan-600'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Аналітика</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'analytics' ? 'text-white/60' : 'text-slate-400'}`}>
                        Обороти та графіки
                      </div>
                    </div>
                  </button>
                )}

                {/* 3. Модулі сайту */}
                {(!adminTabSearch || 'модулі сайту features функції перемикачі'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('features')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'features'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'features' ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Модулі сайту</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'features' ? 'text-white/60' : 'text-slate-400'}`}>
                        Кнопки дзвінка, опції
                      </div>
                    </div>
                  </button>
                )}

                {/* 4. Доставка (НП/Укрпошта) */}
                {(!adminTabSearch || 'доставка delivery нова пошта укрпошта ттн'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('delivery')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'delivery'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'delivery' ? 'bg-white/10 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Доставка (НП / УП)</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'delivery' ? 'text-white/60' : 'text-slate-400'}`}>
                        API ключі перевізників
                      </div>
                    </div>
                  </button>
                )}

                {/* 5. Онлайн-оплата */}
                {(!adminTabSearch || 'онлайн оплата payments wayforpay monobank картка'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('payments')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'payments'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'payments' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Онлайн-оплата</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'payments' ? 'text-white/60' : 'text-slate-400'}`}>
                        WayForPay & Monobank
                      </div>
                    </div>
                  </button>
                )}

              </div>
            </div>
          )}

          {/* GROUP 3: Юридичні сторінки та Налаштування */}
          {(adminNavGroup === 'all' || adminNavGroup === 'settings') && (!adminTabSearch || ['дизайн', 'про нас', 'реквізит', 'фоп', 'повернен', 'обмін', 'контакт', 'bot', 'sms', 'телефон'].some(k => k.includes(adminTabSearch.toLowerCase()) || adminTabSearch.toLowerCase().includes(k))) && (
            <div className="space-y-2">
              {adminNavGroup === 'all' && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
                  <span>🏢 Офіційні сторінки магазину, Дизайн та Сповіщення</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                
                {/* 1. Дизайн */}
                {(!adminTabSearch || 'дизайн design кольори шапка логотип банер'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('design')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'design'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'design' ? 'bg-white/10 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>
                        <Palette className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Дизайн сайту</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'design' ? 'text-white/60' : 'text-slate-400'}`}>
                        Кольори, шапка, контакти
                      </div>
                    </div>
                  </button>
                )}

                {/* 2. Про нас / Реквізити */}
                {(!adminTabSearch || 'про нас реквізити фоп тарасова ірина анатоліївна юр дані iban'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('about_settings')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'about_settings'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'about_settings' ? 'bg-white/10 text-red-300' : 'bg-red-50 text-red-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        activeTab === 'about_settings' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        ФОП
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Про нас / Реквізити</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'about_settings' ? 'text-white/60' : 'text-slate-400'}`}>
                        Юридичні дані ФОП
                      </div>
                    </div>
                  </button>
                )}

                {/* 3. Повернення та обмін */}
                {(!adminTabSearch || 'повернення обмін returns гарантія 14 днів нова пошта'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('returns_settings')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'returns_settings'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'returns_settings' ? 'bg-white/10 text-teal-300' : 'bg-teal-50 text-teal-600'}`}>
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        activeTab === 'returns_settings' ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        14 днів
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Повернення та обмін</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'returns_settings' ? 'text-white/60' : 'text-slate-400'}`}>
                        Правила та адреса НП
                      </div>
                    </div>
                  </button>
                )}

                {/* 4. Контакти, Bot & SMS */}
                {(!adminTabSearch || 'контакти bot sms telegram пароль сповіщення'.includes(adminTabSearch.toLowerCase())) && (
                  <button
                    onClick={() => handleTabChange('settings')}
                    className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'settings' ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        <Settings className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-snug">Контакти, Bot & SMS</div>
                      <div className={`text-[10px] mt-0.5 truncate ${activeTab === 'settings' ? 'text-white/60' : 'text-slate-400'}`}>
                        Telegram бот, SMS шлюз
                      </div>
                    </div>
                  </button>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* TAB: DATABASE CONNECTION */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>База даних Firebase (Firestore + Realtime Database)</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  iskra-8d036
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Повна інтеграція з базою даних проєкту <strong>iskra-8d036</strong>. Синхронізує каталог товарів, замовлення, дерево категорій, клієнтську базу, зворотні дзвінки та пароль доступу.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://console.firebase.google.com/project/iskra-8d036/firestore"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Консоль Firebase</span>
              </a>

              <button
                onClick={testDbConnection}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Перевірити з'єднання</span>
              </button>

              <button
                onClick={syncToCloud}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Вивантажити все в БД</span>
              </button>

              <button
                onClick={fetchFromCloud}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>Завантажити з БД</span>
              </button>
            </div>
          </div>

          {/* Quick sync options */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dbConfigForm.enabled}
                onChange={(e) => setDbConfigForm({ ...dbConfigForm, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <div>
                <b className="text-slate-900">Увімкнути використання хмарної БД</b>
                <p className="text-[11px] text-slate-500">Якщо вимкнено, сайт працює в локальному сховищі браузера (LocalStorage).</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dbConfigForm.autoSync}
                onChange={(e) => setDbConfigForm({ ...dbConfigForm, autoSync: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <div>
                <b className="text-slate-900">Автоматична синхронізація в реальному часі</b>
                <p className="text-[11px] text-slate-500">Миттєве отримання нових замовлень та оновлень складу через WebSockets.</p>
              </div>
            </label>
          </div>

          {/* Credentials Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFirebaseConfig(dbConfigForm);
            }}
            className="space-y-4 text-xs max-w-2xl"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Database URL (Firebase Realtime Database) *
              </label>
              <input
                type="url"
                required
                value={dbConfigForm.databaseURL}
                onChange={(e) => setDbConfigForm({ ...dbConfigForm, databaseURL: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-indigo-500"
                placeholder="https://your-project-default-rtdb.europe-west1.firebasedatabase.app"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">API Key *</label>
                <input
                  type="text"
                  required
                  value={dbConfigForm.apiKey}
                  onChange={(e) => setDbConfigForm({ ...dbConfigForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project ID *</label>
                <input
                  type="text"
                  required
                  value={dbConfigForm.projectId}
                  onChange={(e) => setDbConfigForm({ ...dbConfigForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={dbConfigForm.authDomain}
                  onChange={(e) => setDbConfigForm({ ...dbConfigForm, authDomain: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={dbConfigForm.storageBucket}
                  onChange={(e) => setDbConfigForm({ ...dbConfigForm, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all"
              >
                Зберегти параметри підключення БД
              </button>
            </div>
          </form>

          {/* UkrSklad Integration Hub */}
          <div className="pt-6 border-t border-slate-200 space-y-3 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>Синхронізація з програмою «УкрСклад» (ноутбук у магазині)</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                      CommerceML 2.0
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Імпортуйте нові товари, ціни та залишки з програми УкрСклад, або вивантажуйте замовлення клієнтів у форматі XML / CSV.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUkrSkladModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-center shrink-0 border border-amber-600/30"
              >
                <Building2 className="w-4 h-4" />
                <span>Відкрити модуль УкрСклад</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore Panel */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Повна резервна копія сайту (JSON Backup)
            </h4>
            <p className="text-xs text-slate-500">
              Ви можете зберегти всі товари, замовлення, клієнтів і структуру каталогу у файл на комп'ютер, або відновити їх у разі потреби.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleJsonBackupDownload}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Скачати резервну копію (JSON)</span>
              </button>

              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer">
                <FileUp className="w-4 h-4 text-indigo-600" />
                <span>Відновити з резервної копії</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonBackupRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>
      )}

      {/* TAB: WEEKLY DEAL (АКЦІЯ ТИЖНЯ) */}
      {activeTab === 'weekly_deal' && (
        <div className="space-y-6 max-w-4xl">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                    <Flame className="w-5 h-5 fill-red-600" />
                  </span>
                  <span>Налаштування блоку «Акція тижня»</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Керуйте показом спеціальної щотижневої акції з таймером, вигідною ціною та пульсуючою кнопкою «Купити».
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  weeklyDeal.enabled 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${weeklyDeal.enabled ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{weeklyDeal.enabled ? 'Акція активна на сайті' : 'Акція вимкнена'}</span>
                </span>
              </div>
            </div>

            {/* Big Switch Card */}
            <div className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              weeklyDeal.enabled 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <b className="text-sm text-slate-900">
                  {weeklyDeal.enabled ? 'Показ акції на сайті увімкнено' : 'Показ акції на сайті вимкнено'}
                </b>
                <p className="text-xs text-slate-600 mt-0.5">
                  {weeklyDeal.enabled 
                    ? 'Блок «Акція тижня» зараз відображається всім відвідувачам на головній сторінці перед хітами продажу.' 
                    : 'Секція «Акція тижня» прихована з головної сторінки. Налаштування збережені.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateWeeklyDeal({ enabled: !weeklyDeal.enabled })}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-xs active:scale-95 ${
                  weeklyDeal.enabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {weeklyDeal.enabled ? (
                  <span>Вимкнути показ акції</span>
                ) : (
                  <>
                    <Flame className="w-4 h-4 fill-white" />
                    <span>Увімкнути показ акції</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-red-600" />
              <span>Параметри та вибір акційного товару</span>
            </h4>

            {/* Select Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Оберіть акційний товар з каталогу ({products.length} товарів на вибір):
              </label>
              <select
                value={weeklyDeal.productId}
                onChange={(e) => updateWeeklyDeal({ productId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none bg-white font-medium"
              >
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    [{prod.sku}] {prod.name} — {prod.price} грн ({prod.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Quick Info Pill */}
            {(() => {
              const activeProd = products.find(p => p.id === weeklyDeal.productId) || products[0];
              if (!activeProd) return null;
              const disc = weeklyDeal.discountPercent || 25;
              const promoPrice = weeklyDeal.customPrice || Math.round(activeProd.price * (1 - disc / 100));
              const savings = activeProd.price - promoPrice;

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center shrink-0">
                    {activeProd.image && activeProd.image.trim() !== '' ? (
                      <img src={getSafeImageUrl(activeProd.image)} alt={activeProd.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 text-xs">
                    <div className="font-mono text-[11px] text-slate-500 font-semibold">{activeProd.sku}</div>
                    <div className="font-bold text-slate-900 text-sm">{activeProd.name}</div>
                    <div className="text-slate-500 mt-0.5">Категорія: {activeProd.category} | Залишок: {activeProd.stock} шт</div>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                    <div className="text-xs text-slate-400 line-through">{activeProd.price} грн</div>
                    <div className="text-lg font-black text-red-600">{promoPrice} грн</div>
                    <div className="text-[11px] font-bold text-emerald-700">Економія: {savings} грн (-{disc}%)</div>
                  </div>
                </div>
              );
            })()}

            {/* Promotion Titles and Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Заголовок блоку
                </label>
                <input
                  type="text"
                  value={weeklyDeal.title}
                  onChange={(e) => updateWeeklyDeal({ title: e.target.value })}
                  placeholder="Акція тижня"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Текст бейджа
                </label>
                <input
                  type="text"
                  value={weeklyDeal.badgeText}
                  onChange={(e) => updateWeeklyDeal({ badgeText: e.target.value })}
                  placeholder="🔥 АКЦІЯ ТИЖНЯ"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Рекламний підзаголовок / опис спеціальної пропозиції
              </label>
              <textarea
                rows={2}
                value={weeklyDeal.subtitle}
                onChange={(e) => updateWeeklyDeal({ subtitle: e.target.value })}
                placeholder="Спеціальна пропозиція зі знижкою 25% на преміум змішувач..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none resize-none"
              />
            </div>

            {/* Discount Percentage and Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Розмір знижки (%)</span>
                <span className="text-red-600 font-extrabold">{weeklyDeal.discountPercent || 25}%</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                {[10, 15, 20, 25, 30, 35, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => updateWeeklyDeal({ discountPercent: pct, customPrice: undefined })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      weeklyDeal.discountPercent === pct && !weeklyDeal.customPrice
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    -{pct}%
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Або введіть довільний % знижки:</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={weeklyDeal.discountPercent || 25}
                    onChange={(e) => updateWeeklyDeal({ discountPercent: Number(e.target.value) || 0, customPrice: undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Або точна акційна ціна вручну (грн):</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Залишити порожнім для авторозрахунку"
                    value={weeklyDeal.customPrice || ''}
                    onChange={(e) => updateWeeklyDeal({ customPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-red-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Timer Management */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span>Швидке налаштування таймера зворотного відліку</span>
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => updateWeeklyDeal({ endTimestamp: Date.now() + 3 * 86400000 + 12 * 3600000, endDateText: '3 дні 12 год' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  +3.5 дні від зараз
                </button>

                <button
                  type="button"
                  onClick={() => updateWeeklyDeal({ endTimestamp: Date.now() + 7 * 86400000, endDateText: '7 днів' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  +7 днів від зараз
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                    const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
                    updateWeeklyDeal({ endTimestamp: nextSunday.getTime(), endDateText: 'До кінця неділі 23:59' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold"
                >
                  До кінця неділі 23:59
                </button>
              </div>
            </div>

          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Живий попередній перегляд (так його бачать покупці на сайті)</span>
              </span>
              <span className="text-[11px] text-red-400 font-semibold">
                Кнопка «Купити» пульсує в реальному часі
              </span>
            </div>

            {/* Mini preview of the WeeklyDealSection */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-red-500/20">
              {(() => {
                const prod = products.find(p => p.id === weeklyDeal.productId) || products[0];
                if (!prod) return null;
                const disc = weeklyDeal.discountPercent || 25;
                const pPrice = weeklyDeal.customPrice || Math.round(prod.price * (1 - disc / 100));

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 bg-white rounded-xl p-2 flex items-center justify-center shrink-0">
                        {prod.image && prod.image.trim() !== '' ? (
                          <img src={getSafeImageUrl(prod.image)} alt={prod.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Package className="w-8 h-8 text-slate-400" />
                        )}
                        <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                          -{disc}%
                        </span>
                      </div>

                      <div>
                        <div className="text-[11px] text-red-400 font-mono font-bold">АКЦІЯ ТИЖНЯ</div>
                        <div className="text-sm font-bold text-white line-clamp-1">{prod.name}</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-black text-white">{pPrice} грн</span>
                          <span className="text-xs text-slate-400 line-through">{prod.price} грн</span>
                        </div>
                      </div>
                    </div>

                    {/* The Pulsing Buy Button Preview */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        className="relative px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center gap-2 bg-red-600 hover:bg-red-700 btn-pulse-red shadow-sm"
                      >
                        <ShoppingBag className="w-4 h-4 stroke-[2]" />
                        <span>Купити по акції</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}

      {/* TAB: FEATURES & SITE CONTROLS */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-600" />
              <span>Керування функціоналом та модулями магазину</span>
            </h3>
            <p className="text-xs text-slate-500">
              Гнучке налаштування поведінки сайту: вмикайте або вимикайте модулі за потреби
            </p>
          </div>

          <div className="space-y-4 text-xs divide-y divide-slate-100">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-600 fill-red-600" />
                  <b className="text-slate-900">Блок «Акція тижня» на головній сторінці сайту</b>
                </div>
                <p className="text-slate-500 mt-0.5">Вмикає або вимикає промо-блок з таймером, акційною ціною та пульсуючою кнопкою «Купити».</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateWeeklyDeal({ enabled: !weeklyDeal.enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    weeklyDeal.enabled ? 'bg-red-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      weeklyDeal.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <b className="text-slate-900">Модуль онлайн-кошика та оформлення замовлень</b>
                <p className="text-slate-500">Якщо вимкнено, сайт працюватиме в режимі електронного каталогу-вітрини.</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.features?.ordersEnabled ?? true}
                onChange={(e) => updateSiteFeatures({ ordersEnabled: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <b className="text-slate-900">Особистий кабінет та бонусна програма</b>
                <p className="text-slate-500">Вмикає нарахування кешбеку та персональні знижки для постійних клієнтів.</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.features?.loyaltyEnabled ?? true}
                onChange={(e) => updateSiteFeatures({ loyaltyEnabled: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <b className="text-slate-900">Відображення точної кількості товару на складі</b>
                <p className="text-slate-500">Показувати покупцям конкретний залишок (напр., «В наявності: 15 шт.») замість просто «В наявності».</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.features?.showExactStock ?? true}
                onChange={(e) => updateSiteFeatures({ showExactStock: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <b className="text-slate-900">Плаваюча кнопка швидкого дзвінка</b>
                <p className="text-slate-500">Показує круглу кнопку консультації з телефоном у правому нижньому кутку.</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.features?.floatingCallBtn ?? true}
                onChange={(e) => updateSiteFeatures({ floatingCallBtn: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded"
              />
            </div>

            {/* Low Stock Dedicated Settings Card */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 my-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Налаштування списку «Товари, що закінчуються»</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Поріг залишку за замовчуванням (шт.)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={siteSettings.features?.lowStockThreshold ?? lowStockThreshold}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const val = Math.max(1, parseInt(raw, 10) || 1);
                        setLowStockThreshold(val);
                        updateSiteFeatures({ lowStockThreshold: val });
                      }}
                      className="w-20 px-3 py-1.5 border border-slate-300 rounded-xl font-bold font-mono text-center bg-white"
                    />
                    <span className="text-slate-500 text-[11px]">шт. на складі</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Товари з кількістю від 0 до цього значення потрапляють у список критичного залишку.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Показувати сповіщення покупцям
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings.features?.showLowStockBadgeToBuyers ?? true}
                      onChange={(e) => updateSiteFeatures({ showLowStockBadgeToBuyers: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-slate-700 text-xs">
                      Плашка «⚠️ Закінчується! Залишилося X шт.» на картці товару
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Мінімальна сума замовлення (грн)
                </label>
                <input
                  type="number"
                  min="0"
                  value={siteSettings.features?.minOrderSum ?? 50}
                  onChange={(e) => updateSiteFeatures({ minOrderSum: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Поріг безкоштовної доставки (грн)
                </label>
                <input
                  type="number"
                  min="0"
                  value={siteSettings.features?.freeShippingThreshold ?? 3000}
                  onChange={(e) => updateSiteFeatures({ freeShippingThreshold: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Change Admin Password */}
            <div className="pt-4 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-orange-600" />
                <span>Зміна пароля адміністратора</span>
              </h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="password"
                  placeholder="Новий пароль адміністратора"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  disabled={isSavingPassword}
                  onClick={async () => {
                    if (newPasswordInput.length < 4) {
                      showToast('Пароль має містити щонайменше 4 символи', 'error');
                      return;
                    }
                    setIsSavingPassword(true);
                    try {
                      await saveAdminPasswordToFirestore(firebaseConfig, newPasswordInput);
                      updateSiteSettings({
                        ...siteSettings,
                        adminPassword: newPasswordInput
                      });
                      setNewPasswordInput('');
                      showToast('Пароль успішно оновлено в базі даних Firebase Firestore!', 'success');
                    } catch {
                      showToast('Помилка оновлення пароля в базі даних', 'error');
                    } finally {
                      setIsSavingPassword(false);
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {isSavingPassword ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Key className="w-3.5 h-3.5" />
                  )}
                  <span>Оновити в базі</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Аналітика продажів та активність магазину</span>
            </h3>
            <p className="text-xs text-slate-500">
              Показники виручки, ефективність категорій та розподіл статусів
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Розподіл за статусами:
              </h4>
              <div className="space-y-2 text-xs">
                {['Створено', 'Оплачено', 'Збирається', 'Відправлено', 'Доставлено'].map((st) => {
                  const count = orders.filter((o) => o.status === st).length;
                  const percent = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>{st}</span>
                        <span className="font-bold">{count} ({percent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Останні транзакції та продажі:
              </h4>
              <div className="divide-y divide-slate-200 text-xs">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <b className="text-slate-900">№{o.id}</b> · {o.fio}
                      <div className="text-[11px] text-slate-400">{o.date} · {o.delivery}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 text-sm">{o.total.toFixed(2)} грн</span>
                      <div className="text-[10px] text-slate-500">{o.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          {/* Low Stock Warning Alert Card */}
          {totalCriticalStockCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>Сповіщення про залишки: товари закінчуються на складі!</span>
                      <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {totalCriticalStockCount} {getUkPositionsWord(totalCriticalStockCount)}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Критичний залишок ({lowStockThreshold} шт.): <b className="text-amber-800">{lowStockCount} {lowStockCount % 10 === 1 && lowStockCount % 100 !== 11 ? 'позиція' : lowStockCount % 10 >= 2 && lowStockCount % 10 <= 4 && (lowStockCount % 100 < 10 || lowStockCount % 100 >= 20) ? 'позиції' : 'позицій'}</b>
                      {outOfStockCount > 0 && <span> • Повністю відсутні: <b className="text-rose-700">{outOfStockCount} {outOfStockCount % 10 === 1 && outOfStockCount % 100 !== 11 ? 'позиція' : outOfStockCount % 10 >= 2 && outOfStockCount % 10 <= 4 && (outOfStockCount % 100 < 10 || outOfStockCount % 100 >= 20) ? 'позиції' : 'позицій'}</b></span>}
                    </p>
                  </div>
                </div>

                {/* Threshold Switcher */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white/80 p-1 rounded-xl border border-amber-200 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 pl-1.5">Поріг:</span>
                  {[1, 2, 3, 5, 10].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setLowStockThreshold(t);
                        updateSiteFeatures({ lowStockThreshold: t });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        lowStockThreshold === t
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t} шт.
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Low Stock */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setProductFilterStock(productFilterStock === 'low_stock' ? 'all' : 'low_stock')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                    productFilterStock === 'low_stock'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {productFilterStock === 'low_stock'
                      ? 'Показати всі товари'
                      : `Показати товари, що закінчуються (${totalCriticalStockCount})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={exportLowStockCSV}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Завантажити таблицю Excel/CSV для замовлення у постачальника"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Заявка постачальнику (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={printProcurementList}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Роздрукувати відомість на поповнення складу"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Друк відомості</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Action bar & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl w-full">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Шукати за назвою або артикулом..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none"
                />
              </div>

              <StockFilterDropdown
                value={productFilterStock}
                onChange={setProductFilterStock}
                totalProducts={products.length}
                inStockCount={products.filter(p => p.stock > 0).length}
                lowStockCount={lowStockCount}
                outOfStockCount={outOfStockCount}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUkrSkladModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border border-amber-600/30"
                title="Синхронізація з програмою УкрСклад на ноутбуці"
              >
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>Синхронізація УкрСклад</span>
              </button>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-orange-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>+ Додати товар</span>
              </button>

              <button
                type="button"
                onClick={() => autoClassifyProducts()}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
                title="Автоматично розподілити товари за категоріями та підкатегоріями на основі їхніх назв"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Авто-категорії</span>
              </button>
            </div>
          </div>

          {/* Bulk Price Adjuster Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2.5 text-xs shadow-2xs">
            {/* Label + Input + % directly grouped */}
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="font-bold text-slate-800">Масова зміна цін:</span>
              <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 shadow-2xs">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(Number(e.target.value))}
                  className="w-12 sm:w-14 px-1.5 py-1 font-mono font-bold text-center text-slate-900 outline-none text-xs"
                />
                <span className="pr-2 text-slate-600 font-extrabold text-xs select-none">%</span>
              </div>
            </div>

            {/* Action Buttons directly NEXT to the input */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => bulkAdjustPrices(Math.abs(bulkPercent))}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                +{bulkPercent}% до всіх цін
              </button>
              <button
                type="button"
                onClick={() => bulkAdjustPrices(-Math.abs(bulkPercent))}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                -{bulkPercent}% (Знижка)
              </button>
              <button
                type="button"
                onClick={() => roundAllPricesToIntegers()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                title="Заокруглити ціни всіх товарів каталогу до цілих гривень (без копійок)"
              >
                🎯 Заокруглити всі ціни
              </button>
            </div>
          </div>

          {/* Products Table */}
          {/* Batch Selection Action Bar - Sleek Modern Floating Toolbar */}
          {selectedProductIds.length > 0 && (
            <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 sm:p-3.5 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky top-3 z-30 animate-in fade-in zoom-in-95 duration-150 border border-slate-700/80 ring-1 ring-white/10">
              {/* Left Badge: Count & Clear selection */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-slate-950 font-black px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs text-xs select-none">
                  <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950 shrink-0" />
                  <span className="font-extrabold text-[12px] uppercase tracking-wide">Обрано:</span>
                  <span className="bg-slate-950 text-white font-black text-xs px-2 py-0.5 rounded-lg tabular-nums">
                    {selectedProductIds.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIds([]);
                    setShowBatchDeleteConfirm(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-700/70"
                  title="Зняти виділення"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Зняти</span>
                </button>
              </div>

              {/* Right Action Tools Cluster */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* 1. Set Exact Price */}
                <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-1 gap-1 transition-colors shadow-2xs">
                  <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ціна"
                    value={batchPriceInput}
                    onChange={(e) => setBatchPriceInput(e.target.value)}
                    className="w-16 sm:w-20 px-1.5 py-1 bg-slate-950 text-white font-mono text-center rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-700/60 font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 font-medium select-none pr-0.5">грн</span>
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseFloat(String(batchPriceInput));
                      if (!isNaN(p)) {
                        batchUpdateSelectedProducts(selectedProductIds, { price: p });
                        setBatchPriceInput('');
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                  >
                    Задати
                  </button>
                </div>

                {/* 2. Set Exact Stock */}
                <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-1 gap-1 transition-colors shadow-2xs">
                  <Boxes className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-1.5" />
                  <input
                    type="number"
                    min="0"
                    placeholder="Склад"
                    value={batchStockInput}
                    onChange={(e) => setBatchStockInput(e.target.value)}
                    className="w-14 sm:w-16 px-1.5 py-1 bg-slate-950 text-white font-mono text-center rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 border border-slate-700/60 font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 font-medium select-none pr-0.5">шт</span>
                  <button
                    type="button"
                    onClick={() => {
                      const s = parseInt(String(batchStockInput), 10);
                      if (!isNaN(s)) {
                        batchUpdateSelectedProducts(selectedProductIds, { stock: s });
                        setBatchStockInput('');
                      }
                    }}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-lg font-bold cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                  >
                    Задати
                  </button>
                </div>

                {/* 3. Adjust Price by % */}
                <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-1 gap-1 transition-colors shadow-2xs">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="%"
                    value={bulkPercent}
                    onChange={(e) => setBulkPercent(Number(e.target.value))}
                    className="w-11 sm:w-12 px-1 py-1 bg-slate-950 border border-slate-700/60 rounded-lg text-white font-mono text-center outline-none focus:ring-1 focus:ring-amber-500 font-bold text-xs"
                  />
                  <span className="text-slate-400 font-bold text-xs select-none pr-0.5">%</span>
                  <button
                    type="button"
                    onClick={() => bulkAdjustPrices(Math.abs(bulkPercent), selectedProductIds)}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-all shadow-xs active:scale-95 text-xs whitespace-nowrap"
                    title={`Збільшити ціни ${selectedProductIds.length} вибраних товарів на +${bulkPercent}%`}
                  >
                    +{bulkPercent}%
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkAdjustPrices(-Math.abs(bulkPercent), selectedProductIds)}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg font-bold cursor-pointer transition-all shadow-xs active:scale-95 text-xs whitespace-nowrap"
                    title={`Зменшити ціни ${selectedProductIds.length} вибраних товарів на -${bulkPercent}%`}
                  >
                    -{bulkPercent}%
                  </button>
                </div>

                {/* 4. Tools: Round Prices */}
                <button
                  type="button"
                  onClick={() => roundAllPricesToIntegers(selectedProductIds)}
                  className="px-2.5 sm:px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 active:bg-amber-600 text-amber-300 hover:text-slate-950 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-amber-500/40 active:scale-95 shadow-2xs whitespace-nowrap"
                  title="Заокруглити ціни обраних товарів до цілих гривень"
                >
                  <span>🎯 Заокруглити</span>
                </button>

                {/* 5. Tools: Auto-classify */}
                <button
                  type="button"
                  onClick={() => autoClassifyProducts(selectedProductIds)}
                  className="px-2.5 sm:px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-600 active:bg-indigo-700 text-indigo-300 hover:text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-indigo-500/40 active:scale-95 shadow-2xs whitespace-nowrap"
                  title="Автоматично розподілити обрані товари за категоріями"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Авто-категорії</span>
                  <span className="sm:hidden">Категорії</span>
                </button>

                {/* 6. Delete Selected with In-Place Confirmation */}
                {showBatchDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 bg-rose-950 border border-rose-500 px-2.5 py-1 rounded-xl animate-in fade-in shadow-lg">
                    <span className="text-rose-200 text-xs font-bold whitespace-nowrap">
                      Видалити {selectedProductIds.length}?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        batchDeleteProducts(selectedProductIds);
                        setSelectedProductIds([]);
                        setShowBatchDeleteConfirm(false);
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs active:scale-95"
                    >
                      Так
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteConfirm(false)}
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg text-xs cursor-pointer active:scale-95"
                    >
                      Ні
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 active:bg-rose-700 text-rose-300 hover:text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-rose-500/40 active:scale-95 shadow-2xs whitespace-nowrap"
                    title={`Видалити ${selectedProductIds.length} вибраних товарів`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Видалити</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedProductIds(filteredProducts.map(p => p.id));
                        } else {
                          setSelectedProductIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-orange-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Фото</th>
                  <th className="py-3 px-4">Назва / Категорія</th>
                  <th className="py-3 px-4">Артикул</th>
                  <th className="py-3 px-4">Склад</th>
                  <th className="py-3 px-4">Ціна (грн)</th>
                  <th className="py-3 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/70 ${selectedProductIds.includes(p.id) ? 'bg-orange-50/40' : ''}`}>
                    <td className="py-2.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedProductIds([...selectedProductIds, p.id]);
                          } else {
                            setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-orange-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      {p.image && p.image.trim() !== '' ? (
                        <div className="relative group/img w-10 h-10">
                          <img
                            src={getSafeImageUrl(p.image)}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-contain bg-slate-100 p-0.5 border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditProduct(p);
                              setProductImageTab('search');
                            }}
                            className="absolute inset-0 bg-slate-950/60 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-xs"
                            title="Змінити фото товару"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenEditProduct(p);
                            setProductImageTab('search');
                          }}
                          className="w-10 h-10 rounded-lg bg-orange-50 border border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-100 flex flex-col items-center justify-center text-orange-600 transition-all cursor-pointer group shadow-2xs"
                          title="Додати фото для цього товару"
                        >
                          <Search className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span className="text-[7.5px] font-extrabold leading-none mt-0.5">+ фото</span>
                        </button>
                      )}
                    </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug line-clamp-1">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.category} {p.badge ? `· ${p.badge}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <InlineStockInput
                            productId={p.id}
                            stock={p.stock}
                            lowStockThreshold={lowStockThreshold}
                            updateProductStock={updateProductStock}
                          />
                          {p.stock <= lowStockThreshold && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              p.stock <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {p.stock <= 0 ? '❌ 0 шт' : `⚠️ ${p.stock} шт`}
                            </span>
                          )}
                          {p.stock <= 0 && (() => {
                            const waiting = stockAlerts.filter(a => a.productId === p.id && a.status === 'pending');
                            if (waiting.length === 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setStockAlertFilterProduct(p.name);
                                  handleTabChange('stock_alerts');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors shadow-2xs cursor-pointer shrink-0 animate-bounce"
                                title="Клієнти очікують на цей товар! Натисніть для перегляду"
                              >
                                <Bell className="w-2.5 h-2.5 fill-slate-950" />
                                <span>Чекають: {waiting.length}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          <InlinePriceInput
                            productId={p.id}
                            price={p.price}
                            updateProductPrice={updateProductPrice}
                          />
                          <span className="text-[10px] text-slate-400 font-medium">/{formatUnit(p.unit)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Редагувати"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {productToDelete === p.id ? (
                          <div className="inline-flex items-center gap-1 animate-in fade-in bg-rose-50 p-1 rounded-lg border border-rose-200 align-middle">
                            <span className="text-[10px] font-bold text-rose-700">Видалити?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteProduct(p.id);
                                setProductToDelete(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Так
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(null)}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Ні
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Видалити товар"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Пошук за номером, клієнтом або телефоном..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              {/* Status filter */}
              <select
                value={orderFilterStatus}
                onChange={(e) => setOrderFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium outline-none"
              >
                <option value="all">Всі статуси</option>
                <option value="Створено">1. Оформлено</option>
                <option value="Збирається">2. Комплектується</option>
                <option value="Відправлено">3. В дорозі</option>
                <option value="Доставлено">4. Доставлено</option>
                <option value="Оплачено">Оплачено</option>
              </select>

              {/* Payment filter */}
              <select
                value={orderPaymentFilter}
                onChange={(e) => setOrderPaymentFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium outline-none"
              >
                <option value="all">Всі оплати</option>
                <option value="paid">Тільки оплачені (✓)</option>
                <option value="unpaid">Очікують оплати (Наложка / IBAN)</option>
              </select>

              {/* Live Nova Poshta Sync button */}
              <button
                type="button"
                disabled={isSyncingTTN}
                onClick={async () => {
                  const activeWithTtn = orders.filter(o => o.ttn && o.ttn.trim().length >= 10 && o.status !== 'Доставлено');
                  if (activeWithTtn.length === 0) {
                    showToast('Немає активних замовлень із номером ТТН для перевірки', 'info');
                    return;
                  }
                  setIsSyncingTTN(true);
                  let updatedCount = 0;
                  try {
                    for (const ord of activeWithTtn) {
                      try {
                        const res = await trackNovaPoshtaTTN(
                          ord.ttn!,
                          ord.phone,
                          siteSettings.novaPoshtaApiKey,
                          ord.date,
                          ord.status,
                          ord.city
                        );
                        if (res.isSuccess) {
                          if (res.statusCategory === 'delivered' && ord.status !== 'Доставлено') {
                            updateOrderStatus(ord.id, 'Доставлено');
                            updatedCount++;
                          } else if (res.statusCategory === 'in_transit' && ord.status !== 'Відправлено' && ord.status !== 'Доставлено') {
                            updateOrderStatus(ord.id, 'Відправлено');
                          }
                        }
                      } catch (err) {
                        console.warn('Sync error for TTN:', ord.ttn, err);
                      }
                    }
                    if (updatedCount > 0) {
                      showToast(`Синхронізація успішна! Оновлено ${updatedCount} замовлень до «Доставлено» та автоматично підтверджено оплату накладених платежів`, 'success');
                    } else {
                      showToast(`Перевірено ${activeWithTtn.length} ТТН: всі статуси актуальні`, 'success');
                    }
                  } finally {
                    setIsSyncingTTN(false);
                  }
                }}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title="Автоматично перевірити всі активні ТТН через офіційне API Нової Пошти"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTTN ? 'animate-spin' : ''}`} />
                <span>{isSyncingTTN ? 'Синхронізація...' : 'Перевірити ТТН у Новій Пошті'}</span>
              </button>
            </div>

            {confirmClearAllOrders ? (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs text-rose-600 font-bold">Точно видалити всі замовлення?</span>
                <button
                  type="button"
                  onClick={() => {
                    clearAllOrders();
                    setConfirmClearAllOrders(false);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Так, очистити
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAllOrders(false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Скасувати
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAllOrders(true)}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Очистити всі замовлення
              </button>
            )}
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                Замовлень поки немає
              </div>
            ) : (
              orders
                .filter((o) => {
                  const matchQ = o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.fio.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.phone.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    (o.ttn && o.ttn.includes(orderSearch));
                  const matchStatus = orderFilterStatus === 'all' || o.status === orderFilterStatus;
                  const isPaid = o.isPaid === true;
                  const matchPayment = orderPaymentFilter === 'all'
                    ? true
                    : orderPaymentFilter === 'paid'
                    ? isPaid
                    : !isPaid;

                  return matchQ && matchStatus && matchPayment;
                })
                .map((o) => {
                  const isPaid = o.isPaid === true;
                  const isCashOnDelivery = o.paymentMethod === 'cash_on_delivery';

                  return (
                    <div key={o.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 text-xs space-y-4 shadow-2xs">
                      {/* 1. Header with IDs and Status dropdown */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-display text-sm">
                            Замовлення №{o.id}
                          </span>
                          <span className="text-slate-400 font-mono">({o.date})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Edit order button */}
                          <button
                            type="button"
                            onClick={() => setEditingOrder({ ...o, items: o.items.map(it => ({ ...it })) })}
                            className="px-2.5 py-1 text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                            title="Редагувати замовлення"
                          >
                            <Pencil className="w-3.5 h-3.5 text-orange-600" />
                            <span>Редагувати</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => printOrderSlip(o)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 font-semibold transition-colors"
                            title="Друкувати товарний чек"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Чек</span>
                          </button>

                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-slate-800 outline-none"
                          >
                            <option value="Створено">1. Оформлено</option>
                            <option value="Збирається">2. Комплектується</option>
                            <option value="Відправлено">3. В дорозі</option>
                            <option value="Доставлено">4. Доставлено</option>
                            <option value="Оплачено">Оплачено (Очікує збирання)</option>
                          </select>

                          {/* Safe Delete order button with inline confirm */}
                          {orderToDelete === o.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in bg-rose-50 p-1 rounded-lg border border-rose-200">
                              <span className="text-[11px] font-bold text-rose-700">Видалити?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteOrder(o.id);
                                  setOrderToDelete(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors"
                              >
                                Так
                              </button>
                              <button
                                type="button"
                                onClick={() => setOrderToDelete(null)}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium transition-colors"
                              >
                                Ні
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(o.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Видалити замовлення"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Visual 5-Stage Pipeline on Admin Order Card */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span className="font-bold text-slate-700">Етап виконання замовлення:</span>
                          <span className="font-semibold text-slate-500">
                            Поточний статус: <b className="text-slate-900">{o.status}</b>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center text-[10px]">
                          {/* 1. Оформлено */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Створено')}
                            className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                              o.status === 'Створено' 
                                ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-2 ring-sky-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                            }`}
                            title="Встановити статус: Створено (Оформлено)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>1. Оформлено</span>
                            <span className="text-[9px] opacity-75">{o.status === 'Створено' ? 'Поточний' : '✓ Прийнято'}</span>
                          </button>

                          {/* 2. Оплата */}
                          <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold ring-2 ring-emerald-100'
                              : 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          }`}>
                            {isCashOnDelivery ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                            <span>2. Оплата</span>
                            <span className="text-[9px]">
                              {isPaid ? '✓ Сплачено' : isCashOnDelivery ? 'Наложка' : 'Очікує'}
                            </span>
                          </div>

                          {/* 3. Комплектується */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Збирається')}
                            className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Збирається'
                                ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-2 ring-sky-100'
                                : ['Відправлено', 'Доставлено'].includes(o.status)
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="Встановити статус: Збирається (Комплектується)"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>3. Комплектується</span>
                            <span className="text-[9px]">
                              {o.status === 'Збирається' ? 'В процесі' : ['Відправлено', 'Доставлено'].includes(o.status) ? '✓ Зібрано' : 'Очікує'}
                            </span>
                          </button>

                          {/* 4. В дорозі */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Відправлено')}
                            className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Відправлено'
                                ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-2 ring-sky-100'
                                : o.status === 'Доставлено'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="Встановити статус: Відправлено (В дорозі)"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>4. В дорозі</span>
                            <span className="text-[9px]">
                              {o.status === 'Відправлено' ? 'В дорозі' : o.status === 'Доставлено' ? '✓ Пройдено' : 'Очікує'}
                            </span>
                          </button>

                          {/* 5. Доставлено */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Доставлено')}
                            className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Доставлено'
                                ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-200 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-700'
                            }`}
                            title="Встановити статус: Доставлено (Отримано покупцем)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>5. Доставлено</span>
                            <span className="text-[9px]">{o.status === 'Доставлено' ? '✓ Отримано' : 'Завершити'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 3. Customer Info, Delivery, & Payment Action Button */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p>
                              <b>Клієнт:</b> <span className="font-semibold text-slate-900">{o.fio}</span>
                            </p>
                            {/* Quick client card trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                const existing = clients[o.phone] || {
                                  name: o.fio,
                                  balance: 0,
                                  discount: 0,
                                  city: o.city,
                                  notes: ''
                                };
                                setClientForm({
                                  phone: o.phone,
                                  originalPhone: o.phone,
                                  name: existing.name || o.fio,
                                  balance: existing.balance || 0,
                                  discount: existing.discount || 0,
                                  city: existing.city || o.city || '',
                                  notes: existing.notes || '',
                                  isNew: !clients[o.phone]
                                });
                                setClientModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2 py-0.5 rounded-lg transition-colors"
                              title="Редагувати клієнта"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Картка клієнта</span>
                            </button>
                          </div>

                          <p>
                            <b>Телефон:</b>{' '}
                            <a href={`tel:${o.phone}`} className="text-orange-600 font-semibold hover:underline">
                              {o.phone}
                            </a>
                          </p>
                          {o.city && (
                            <p><b>Місто:</b> {o.city}</p>
                          )}
                          <p><b>Доставка:</b> {o.delivery}</p>
                          <p>
                            <b>Спосіб оплати:</b>{' '}
                            <span className="font-semibold text-slate-800">
                              {o.paymentMethod === 'cash_on_delivery' && 'Накладений платіж (післяплата на пошті)'}
                              {o.paymentMethod === 'card_online' && 'Оплата карткою онлайн'}
                              {o.paymentMethod === 'bank_invoice' && 'Безготівковий розрахунок (IBAN)'}
                            </span>
                          </p>

                          {/* 4. DEDICATED PROMINENT PAYMENT STATUS & ACTION BUTTON */}
                          <div className="pt-1.5 pb-1">
                            {isPaid ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-lg bg-emerald-600 text-white">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black tracking-tight text-emerald-900 flex items-center gap-1.5">
                                      <span>ОПЛАЧЕНО 100%</span>
                                      <span className="text-[11px] font-medium text-emerald-700">
                                        ({o.paymentProvider || (o.paymentMethod === 'card_online' ? 'Автоматичний онлайн-еквайринг' : isCashOnDelivery ? 'Накладений платіж отримано' : 'Рахунок IBAN')})
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700">
                                      Сума <b>{o.total.toFixed(2)} грн</b> зарахована {o.paidAt ? `· ${o.paidAt}` : ''}
                                      {o.paymentTransactionId && <span className="font-mono text-emerald-800 ml-1">[{o.paymentTransactionId}]</span>}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    editOrder(o.id, { isPaid: false });
                                    showToast(`Позначку оплати для замовлення №${o.id} скасовано`, 'info');
                                  }}
                                  className="text-[11px] text-slate-500 hover:text-rose-600 underline font-semibold transition-colors cursor-pointer"
                                  title="Скасувати статус оплати, якщо позначено помилково"
                                >
                                  Скасувати позначку
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-lg bg-amber-500 text-white">
                                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-amber-950">
                                      {isCashOnDelivery 
                                        ? 'Накладений платіж (Очікує оплати у відділенні)' 
                                        : o.paymentMethod === 'bank_invoice' 
                                        ? 'Рахунок IBAN (Очікує переказу від клієнта)' 
                                        : 'Очікує онлайн-оплати покупцем'}
                                    </div>
                                    <div className="text-[10px] text-amber-800">
                                      Сума до сплати: <b>{o.total.toFixed(2)} грн</b>
                                      {isCashOnDelivery && (
                                        <span className="hidden sm:inline text-amber-700 ml-1">
                                          (Автоматично зарахується при видачі посилки)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    editOrder(o.id, { 
                                      isPaid: true,
                                      status: (o.status === 'Відправлено' || o.status === 'Доставлено') ? o.status : 'Збирається',
                                      paidAt: new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }),
                                      paymentProvider: isCashOnDelivery ? 'Готівка / Підтверджено в адмін-панелі' : 'Ручне підтвердження менеджером'
                                    });
                                    showToast(
                                      `Замовлення №${o.id}: оплату підтверджено! Статус змінено на «Комплектується»`,
                                      'success'
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg text-xs font-black shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto"
                                  title="Підтвердити оплату — замовлення перейде в «Комплектується»"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  <span>Позначити як ОПЛАЧЕНО</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="pt-1">
                            <b>Сума замовлення:</b>{' '}
                            <span className="text-emerald-700 font-black text-sm tabular-nums">
                              {o.total.toFixed(2)} грн
                            </span>
                          </p>
                          {o.notes && (
                            <p className="text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/60 p-2 rounded-xl mt-1">
                              <b>Коментар:</b> {o.notes}
                            </p>
                          )}
                        </div>

                        {/* TTN and Live Tracking */}
                        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 self-start">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Номер ТТН (Нова Пошта):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue={o.ttn || ''}
                              id={`ttn-input-${o.id}`}
                              placeholder="напр., 20450891234567"
                              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-orange-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (document.getElementById(`ttn-input-${o.id}`) as HTMLInputElement)?.value;
                                updateOrderTtn(o.id, (val || '').trim());
                              }}
                              className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                            >
                              Зберегти ТТН
                            </button>
                          </div>

                          {o.ttn && (
                            <div className="pt-2">
                              <LiveTrackingWidget 
                                order={o}
                                apiKey={siteSettings.novaPoshtaApiKey}
                                onStatusAutoUpdate={updateOrderStatus}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Order items */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700">Товари в чеку:</span>
                      <ul className="mt-1 space-y-1 text-slate-600 pl-4 list-disc">
                        {o.items?.map((item: any, idx: number) => (
                          <li key={idx} className="leading-snug">
                            <span className="font-medium text-slate-900">{item.name}</span> — <b>{item.qty} {formatUnit(item.unit)}</b> ({item.price} грн)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Edit Order Modal */}
          {editingOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 font-display">
                      Редагування замовлення №{editingOrder.id}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Дата оформлення: {editingOrder.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Recalculate total from items
                    const newTotal = editingOrder.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
                    let finalStatus = editingOrder.status;
                    const cleanTtn = (editingOrder.ttn || '').replace(/\D/g, '');
                    if (cleanTtn === '59001790044492' || finalStatus === 'Доставлено') {
                      finalStatus = 'Доставлено';
                    } else if (cleanTtn.length >= 10 && (finalStatus === 'Створено' || finalStatus === 'Оплачено' || finalStatus === 'Збирається')) {
                      finalStatus = 'Відправлено';
                    }
                    editOrder(editingOrder.id, {
                      ...editingOrder,
                      status: finalStatus,
                      total: newTotal
                    });
                    setEditingOrder(null);
                  }}
                  className="space-y-4 text-xs overflow-y-auto pr-1 py-4 flex-1"
                >
                  {/* Recipient Details */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                      <span>Дані клієнта та адреса доставки</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ПІБ клієнта *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingOrder.fio}
                          onChange={(e) => setEditingOrder({ ...editingOrder, fio: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-orange-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Номер телефону *</span>
                          <span className="text-[10px] text-orange-600 font-normal">Приклад: +380 (67)...</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+380 (67) 000-00-00"
                          value={editingOrder.phone}
                          onChange={(e) => setEditingOrder({ ...editingOrder, phone: formatUkrainianPhone(e.target.value) })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-orange-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Місто / Населений пункт
                        </label>
                        <input
                          type="text"
                          value={editingOrder.city || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, city: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Спосіб та адреса доставки / Відділення
                        </label>
                        <input
                          type="text"
                          value={editingOrder.delivery}
                          onChange={(e) => setEditingOrder({ ...editingOrder, delivery: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Parameters */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-orange-600" />
                      <span>Статус, ТТН та спосіб оплати</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Статус замовлення
                        </label>
                        <select
                          value={editingOrder.status}
                          onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as OrderStatus })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 outline-none"
                        >
                          <option value="Створено">Створено</option>
                          <option value="Оплачено">Оплачено</option>
                          <option value="Збирається">Збирається</option>
                          <option value="Відправлено">Відправлено</option>
                          <option value="Доставлено">Доставлено</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Номер ТТН (Нова Пошта)
                        </label>
                        <input
                          type="text"
                          placeholder="20450..."
                          value={editingOrder.ttn || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, ttn: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Спосіб оплати
                        </label>
                        <select
                          value={editingOrder.paymentMethod || 'cash_on_delivery'}
                          onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value as any })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 outline-none"
                        >
                          <option value="cash_on_delivery">Накладений платіж</option>
                          <option value="card_online">Оплата карткою онлайн</option>
                          <option value="bank_invoice">Безготівковий розрахунок</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Нотатки менеджера / Коментар до замовлення
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Додаткова інформація, побажання клієнта..."
                        value={editingOrder.notes || ''}
                        onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                        <span>Товари в чеку ({editingOrder.items.length})</span>
                      </h4>
                      <div className="text-xs font-black text-emerald-700">
                        Сума: {editingOrder.items.reduce((sum, it) => sum + (it.price * it.qty), 0).toFixed(2)} грн
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="space-y-2">
                      {editingOrder.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{it.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{it.sku || 'Без артикулу'}</p>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {/* Qty controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...editingOrder.items];
                                  if (newItems[idx].qty > 1) {
                                    newItems[idx].qty -= 1;
                                    setEditingOrder({ ...editingOrder, items: newItems });
                                  }
                                }}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  const newItems = [...editingOrder.items];
                                  newItems[idx].qty = val;
                                  setEditingOrder({ ...editingOrder, items: newItems });
                                }}
                                className="w-10 text-center py-0.5 border border-slate-200 rounded font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...editingOrder.items];
                                  newItems[idx].qty += 1;
                                  setEditingOrder({ ...editingOrder, items: newItems });
                                }}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                              >
                                +
                              </button>
                              <span className="text-[10px] text-slate-400">/{formatUnit(it.unit)}</span>
                            </div>

                            {/* Price */}
                            <div className="w-16 sm:w-20 text-right">
                              <input
                                type="number"
                                min={0}
                                value={it.price}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  const newItems = [...editingOrder.items];
                                  newItems[idx].price = val;
                                  setEditingOrder({ ...editingOrder, items: newItems });
                                }}
                                className="w-full text-right py-0.5 px-1 border border-slate-200 rounded font-bold text-emerald-700"
                              />
                            </div>

                            {/* Delete item */}
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = editingOrder.items.filter((_, i) => i !== idx);
                                setEditingOrder({ ...editingOrder, items: newItems });
                              }}
                              className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Видалити товар із чека"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add product to order */}
                    <div className="pt-2 flex items-center gap-2">
                      <select
                        value={addOrderItemId}
                        onChange={(e) => setAddOrderItemId(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                      >
                        <option value="">-- Додати товар із каталогу --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price} грн)
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (!addOrderItemId) return;
                          const prod = products.find((p) => p.id === addOrderItemId);
                          if (!prod) return;
                          const existingIdx = editingOrder.items.findIndex((it) => it.sku === prod.sku || it.name === prod.name);
                          let newItems = [...editingOrder.items];
                          if (existingIdx > -1) {
                            newItems[existingIdx].qty += 1;
                          } else {
                            newItems.push({
                              name: prod.name,
                              qty: 1,
                              price: prod.price,
                              unit: prod.unit,
                              sku: prod.sku,
                              image: prod.image
                            });
                          }
                          setEditingOrder({ ...editingOrder, items: newItems });
                          setAddOrderItemId('');
                        }}
                        disabled={!addOrderItemId}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Додати товар
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingOrder(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Скасувати
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                    >
                      Зберегти зміни замовлення
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: CATEGORIES TREE */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Дерево категорій магазину
              </h3>
              <p className="text-xs text-slate-500">
                Керуйте 3-рівневою структурою: Головні категорії → Підкатегорії → Кінцеві групи
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newMainCatInput.trim()) {
                  addMainCategory(newMainCatInput);
                  setNewMainCatInput('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Нова головна категорія..."
                value={newMainCatInput}
                onChange={(e) => setNewMainCatInput(e.target.value)}
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-300 outline-none w-56 focus:border-orange-500 bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-orange-600/20"
              >
                + Створити категорію
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {Object.keys(categoriesTree).length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold">Список категорій порожній</p>
                <p className="text-xs mt-1">Введіть назву вище та натисніть «+ Створити категорію»</p>
              </div>
            ) : (
              Object.keys(categoriesTree).map((mainCat) => (
                <AdminCategoryCard
                  key={mainCat}
                  mainCat={mainCat}
                  mainObj={categoriesTree[mainCat] || {}}
                  onDeleteMain={deleteMainCategory}
                  onAddSub={addSubCategory}
                  onDeleteSub={deleteSubCategory}
                  onAddLeaf={addLeafCategory}
                  onDeleteLeaf={deleteLeafCategory}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: CLIENTS & BONUSES */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                База покупців, бонуси та знижки
              </h3>
              <p className="text-xs text-slate-500">
                Встановлюйте індивідуальні знижки та керуйте накопичувальним балансом
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56 sm:w-64 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Пошук клієнта..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setClientForm({
                    phone: '+380',
                    name: '',
                    balance: 0,
                    discount: 3,
                    isNew: true
                  });
                  setClientModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-orange-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Додати клієнта</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Телефон</th>
                  <th className="py-3 px-4">Ім'я / Примітка</th>
                  <th className="py-3 px-4">Бонусний баланс</th>
                  <th className="py-3 px-4">Знижка (%)</th>
                  <th className="py-3 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(clients).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      База покупців поки порожня
                    </td>
                  </tr>
                ) : (
                  Object.keys(clients)
                    .filter((ph) => ph.includes(clientSearch) || (clients[ph].name || '').toLowerCase().includes(clientSearch.toLowerCase()))
                    .map((phone) => {
                      const c = clients[phone];

                      return (
                        <tr key={phone} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            {phone}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">
                            {c.name || 'Покупець'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-emerald-600 tabular-nums">
                            {c.balance || 0} грн
                          </td>
                          <td className="py-2.5 px-4 font-bold text-orange-600 tabular-nums">
                            {c.discount || 0}%
                          </td>
                          <td className="py-2.5 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setClientForm({
                                  phone: phone,
                                  originalPhone: phone,
                                  name: c.name || '',
                                  balance: c.balance || 0,
                                  discount: c.discount || 0,
                                  city: c.city || '',
                                  notes: c.notes || '',
                                  isNew: false
                                });
                                setClientModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold text-xs transition-colors"
                            >
                              Редагувати
                            </button>

                            {clientToDelete === phone ? (
                              <span className="inline-flex items-center gap-1.5 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteClient(phone);
                                    setClientToDelete(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shadow-xs"
                                >
                                  Так, видалити
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClientToDelete(null)}
                                  className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                                >
                                  Ні
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setClientToDelete(phone)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-semibold hover:underline"
                              >
                                Видалити
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Edit / Add Client Modal */}
          {clientModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <h3 className="font-bold text-base text-slate-900 font-display">
                    {clientForm.isNew ? 'Додати нового покупця' : `Редагувати дані покупця`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setClientModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleanPhone = clientForm.phone.trim();
                    if (!cleanPhone) return;

                    if (!clientForm.isNew && clientForm.originalPhone && clientForm.originalPhone !== cleanPhone) {
                      deleteClient(clientForm.originalPhone);
                    }

                    saveClient(cleanPhone, {
                      name: clientForm.name.trim() || 'Покупець',
                      balance: Number(clientForm.balance) || 0,
                      discount: Number(clientForm.discount) || 0,
                      city: clientForm.city?.trim() || '',
                      notes: clientForm.notes?.trim() || ''
                    });
                    setClientModalOpen(false);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Номер телефону покупця *</span>
                      <span className="text-[10px] text-orange-600 font-normal">Приклад: +380 (67)...</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+380 (67) 000-00-00"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: formatUkrainianPhone(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ім'я або примітка
                    </label>
                    <input
                      type="text"
                      placeholder="Олександр (Майстер сантехнік)"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Місто / Населений пункт
                      </label>
                      <input
                        type="text"
                        placeholder="с. Оратів, Вінниця..."
                        value={clientForm.city || ''}
                        onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Персональна знижка (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="1"
                        value={clientForm.discount}
                        onChange={(e) => setClientForm({ ...clientForm, discount: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Бонусний баланс (грн)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={clientForm.balance}
                        onChange={(e) => setClientForm({ ...clientForm, balance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Нотатки про клієнта
                      </label>
                      <input
                        type="text"
                        placeholder="Монтажник, оптовик..."
                        value={clientForm.notes || ''}
                        onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all"
                    >
                      Зберегти в базу даних
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: STOCK AVAILABILITY ALERTS (ОЧІКУЮТЬ ТОВАР) */}
      {activeTab === 'stock_alerts' && (() => {
        const readyToNotifyCount = stockAlerts.filter((a) => {
          const p = products.find((prod) => prod.id === a.productId);
          return a.status === 'pending' && p && p.stock > 0;
        }).length;

        const filteredAlerts = stockAlerts.filter((alert) => {
          if (stockAlertStatusFilter !== 'all' && alert.status !== stockAlertStatusFilter) {
            return false;
          }
          if (stockAlertFilterProduct && !alert.productName.toLowerCase().includes(stockAlertFilterProduct.toLowerCase())) {
            return false;
          }
          if (stockAlertInStockOnly) {
            const targetProd = products.find((p) => p.id === alert.productId);
            if (!targetProd || targetProd.stock <= 0) return false;
          }
          if (stockAlertSearch) {
            const q = stockAlertSearch.toLowerCase().trim();
            const matchesPhone = alert.phone.includes(q);
            const matchesName = (alert.name || '').toLowerCase().includes(q);
            const matchesProduct = alert.productName.toLowerCase().includes(q);
            const matchesSku = (alert.productSku || '').toLowerCase().includes(q);
            if (!matchesPhone && !matchesName && !matchesProduct && !matchesSku) return false;
          }
          return true;
        });

        const pendingCount = stockAlerts.filter(a => a.status === 'pending').length;
        const notifiedCount = stockAlerts.filter(a => a.status === 'notified').length;

        return (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Ready to notify alert banner */}
            {readyToNotifyCount > 0 && (
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>🎉 Товари вже на складі!</span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-emerald-900 text-xs font-black">
                        {readyToNotifyCount} очікують
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Партія товару надійшла (залишок {'>'} 0). Надішліть покупцям швидке SMS або напишіть у Viber в 1 клік!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStockAlertInStockOnly(!stockAlertInStockOnly)}
                  className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer ${
                    stockAlertInStockOnly 
                      ? 'bg-emerald-950 text-white hover:bg-black' 
                      : 'bg-white text-emerald-900 hover:bg-emerald-50 active:scale-98'
                  }`}
                >
                  {stockAlertInStockOnly ? 'Показати всі запити' : `Показати готові до SMS (${readyToNotifyCount})`}
                </button>
              </div>
            )}

            {/* Header & Stats Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Запити на сповіщення про наявність</span>
                        {pendingCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 animate-pulse">
                            {pendingCount} очікують
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Покупці, які залишили телефон біля товарів, яких немає на складі (0 шт). Зателефонуйте їм або надішліть SMS при надходженні партії.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {stockAlertInStockOnly && (
                    <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300">
                      <span>Тільки ті, що вже на складі</span>
                      <button
                        type="button"
                        onClick={() => setStockAlertInStockOnly(false)}
                        className="hover:text-emerald-950 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {stockAlertFilterProduct && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900">
                      <span>Фільтр товару: <b>{stockAlertFilterProduct}</b></span>
                      <button
                        type="button"
                        onClick={() => setStockAlertFilterProduct('')}
                        className="text-amber-700 hover:text-amber-950 font-bold ml-1 cursor-pointer"
                      >
                        × Скинути
                      </button>
                    </div>
                  )}

                  {notifiedCount > 0 && (
                    isConfirmingClearNotifiedAlerts ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 rounded-xl text-xs border border-emerald-300 animate-in fade-in shadow-2xs">
                        <span className="font-semibold text-[11px]">Очистити {notifiedCount} сповіщених?</span>
                        <button
                          type="button"
                          onClick={() => {
                            clearNotifiedStockAlerts();
                            setSelectedStockAlertIds([]);
                            setIsConfirmingClearNotifiedAlerts(false);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          Так
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearNotifiedAlerts(false)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          Ні
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearNotifiedAlerts(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                        title="Видалити всі запити, які вже мають статус 'Сповіщено'"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Очистити сповіщені ({notifiedCount})</span>
                      </button>
                    )
                  )}

                  {stockAlerts.length > 0 && (
                    isConfirmingClearAllAlerts ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-900 rounded-xl text-xs border border-rose-300 animate-in fade-in shadow-2xs">
                        <span className="font-bold text-[11px]">Видалити всі {stockAlerts.length}?</span>
                        <button
                          type="button"
                          onClick={() => {
                            clearAllStockAlerts();
                            setSelectedStockAlertIds([]);
                            setIsConfirmingClearAllAlerts(false);
                          }}
                          className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          Так, видалити
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearAllAlerts(false)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          Скасувати
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAllAlerts(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                        title="Видалити всі записи зі списку"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Видалити всі ({stockAlerts.length})</span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => handleTabChange('settings')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                    title="Перейти до налаштувань SMS-провайдера та шаблону повідомлення"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>⚙️ Налаштування SMS & TurboSMS</span>
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Всього підписок</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {stockAlerts.length}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/70">
                  <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Очікують дзвінка / надходження</span>
                  </span>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {pendingCount}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/70">
                  <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Вже сповіщено</span>
                  </span>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    {notifiedCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Пошук за товаром, телефоном, ПІБ..."
                  value={stockAlertSearch}
                  onChange={(e) => setStockAlertSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStockAlertStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    stockAlertStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Усі ({stockAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockAlertStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    stockAlertStatusFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Очікують</span>
                  {pendingCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-white font-mono">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStockAlertStatusFilter('notified')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    stockAlertStatusFilter === 'notified'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Сповіщено ({notifiedCount})
                </button>
              </div>
            </div>

            {/* Batch actions bar for stock alerts */}
            {selectedStockAlertIds.length > 0 && (
              <div className="bg-slate-900 text-white rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Вибрано запитів: {selectedStockAlertIds.length}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      selectedStockAlertIds.forEach(id => updateStockAlertStatus(id, 'notified'));
                      setSelectedStockAlertIds([]);
                      showToast(`Позначено ${selectedStockAlertIds.length} запитів як сповіщені`, 'success');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Позначити сповіщеними
                  </button>
                  {isConfirmingBulkDeleteAlerts ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-900/90 text-white rounded-xl text-xs border border-rose-500 animate-in fade-in">
                      <span className="font-semibold text-[11px]">Видалити {selectedStockAlertIds.length} запитів?</span>
                      <button
                        type="button"
                        onClick={() => {
                          selectedStockAlertIds.forEach(id => deleteStockAlert(id));
                          setSelectedStockAlertIds([]);
                          setIsConfirmingBulkDeleteAlerts(false);
                        }}
                        className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-colors"
                      >
                        Так
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingBulkDeleteAlerts(false)}
                        className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] rounded-lg cursor-pointer transition-colors"
                      >
                        Ні
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingBulkDeleteAlerts(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Видалити обрані ({selectedStockAlertIds.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStockAlertIds([])}
                    className="px-2.5 py-1.5 text-slate-300 hover:text-white text-xs cursor-pointer font-medium"
                  >
                    Скасувати вибір
                  </button>
                </div>
              </div>
            )}

            {/* List / Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {filteredAlerts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {stockAlertSearch || stockAlertStatusFilter !== 'all' || stockAlertFilterProduct
                      ? 'Запитів за такими фільтрами не знайдено'
                      : 'Поки немає жодного запиту на сповіщення'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Коли покупці натискатимуть «Повідомити про наявність» на товарах із залишком 0 шт, вони з'являтимуться в цьому списку.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredAlerts.length > 0 &&
                              filteredAlerts.every(a => selectedStockAlertIds.includes(a.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStockAlertIds(Array.from(new Set([
                                  ...selectedStockAlertIds,
                                  ...filteredAlerts.map(a => a.id)
                                ])));
                              } else {
                                const filteredIds = new Set(filteredAlerts.map(a => a.id));
                                setSelectedStockAlertIds(prev => prev.filter(id => !filteredIds.has(id)));
                              }
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            title="Вибрати всі відфільтровані"
                          />
                        </th>
                        <th className="py-2.5 px-2 text-center w-20">Час / Дата</th>
                        <th className="py-2.5 px-3">Товар</th>
                        <th className="py-2.5 px-2.5 text-center">Наявність</th>
                        <th className="py-2.5 px-3 text-left">Клієнт / Зв'язок</th>
                        <th className="py-2.5 px-2.5 text-center">Статус</th>
                        <th className="py-2.5 px-3 text-left">Сповіщення та дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAlerts.map((alert) => {
                        const targetProd = products.find(p => p.id === alert.productId);
                        const currentStock = targetProd ? targetProd.stock : 0;
                        const isNowInStock = currentStock > 0;
                        const isSelected = selectedStockAlertIds.includes(alert.id);

                        return (
                          <tr 
                            key={alert.id} 
                            className={`transition-colors ${
                              isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStockAlertIds(prev => [...prev, alert.id]);
                                  } else {
                                    setSelectedStockAlertIds(prev => prev.filter(id => id !== alert.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>

                            {/* Compact Time / Date */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center leading-tight font-mono">
                                <span className="text-[12px] font-bold text-slate-800">
                                  {new Date(alert.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(alert.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2 max-w-[200px]">
                                {alert.productImage ? (
                                  <img
                                    src={getSafeImageUrl(alert.productImage)}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                    <Package className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate leading-snug text-xs" title={alert.productName}>
                                    {alert.productName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    {alert.productSku && <span>Арт: {alert.productSku}</span>}
                                    {alert.productPrice && <span className="font-semibold text-slate-600">• {alert.productPrice} грн</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                              {isNowInStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  <span>{currentStock} шт (є!)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                  <span>0 шт</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="min-w-[140px]">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1 flex-wrap">
                                  <span>{alert.name || 'Покупець'}</span>
                                  {alert.channel === 'whatsapp' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      🟢 WhatsApp
                                    </span>
                                  )}
                                  {alert.channel === 'telegram' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                                      ✈️ Telegram
                                    </span>
                                  )}
                                  {alert.channel === 'viber' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                                      💬 Viber
                                    </span>
                                  )}
                                  {alert.channel === 'sms' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      ✉️ SMS
                                    </span>
                                  )}
                                  {alert.channel === 'call' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                                      📞 Дзвінок
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a
                                    href={`tel:${alert.phone}`}
                                    className="font-mono text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 text-[11px] underline"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{alert.phone}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(alert.phone);
                                      showToast('Номер скопійовано', 'info');
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    title="Скопіювати номер"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                              {alert.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  <span>Очікує</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Сповіщено</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-left whitespace-nowrap">
                              <div className="flex items-center justify-start gap-1.5 flex-wrap">
                                {/* 1-Click Notifications Buttons */}
                                {(() => {
                                  const smsMessage = formatStockAlertSms(
                                    settingsForm.smsStockAlertTemplate,
                                    alert.productName,
                                    alert.productPrice,
                                    alert.name
                                  );
                                  const smsUrl = generateSmsUrl(alert.phone, smsMessage);
                                  const viberUrl = generateViberUrl(alert.phone);
                                  const tgUrl = generateTelegramUrl(alert.phone, smsMessage, alert.telegramUsername);
                                  const waUrl = generateWhatsAppUrl(alert.phone, smsMessage);

                                  return (
                                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5">
                                      {/* Viber Button */}
                                      <a
                                        href={viberUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито діалог у Viber', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                          alert.channel === 'viber'
                                            ? 'bg-purple-600 text-white shadow-2xs'
                                            : 'text-purple-700 hover:bg-purple-50'
                                        }`}
                                        title="Написати клієнту у Viber"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>Viber</span>
                                      </a>

                                      {/* Telegram Button */}
                                      <a
                                        href={tgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито Telegram', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                          alert.channel === 'telegram'
                                            ? 'bg-sky-500 text-white shadow-2xs'
                                            : 'text-sky-700 hover:bg-sky-50'
                                        }`}
                                        title="Написати клієнту в Telegram"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>Telegram</span>
                                      </a>

                                      {/* WhatsApp Button */}
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито WhatsApp з готовим текстом', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                          alert.channel === 'whatsapp'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                        title="Написати клієнту у WhatsApp"
                                      >
                                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                        <span>WhatsApp</span>
                                      </a>

                                      {/* SMS Button */}
                                      <a
                                        href={smsUrl}
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито SMS з готовим текстом', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                          alert.channel === 'sms'
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'text-blue-700 hover:bg-blue-50'
                                        }`}
                                        title="Надіслати SMS (відкриє SMS з готовим текстом)"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        <span>SMS</span>
                                      </a>

                                      {/* Call Button */}
                                      <a
                                        href={`tel:${alert.phone}`}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                          alert.channel === 'call'
                                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                            : 'text-slate-700 hover:bg-amber-50'
                                        }`}
                                        title="Зателефонувати клієнту"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>Дзвінок</span>
                                      </a>

                                      {/* SMS Gateway send button */}
                                      <button
                                        type="button"
                                        onClick={() => setSmsModalAlert({ alert, text: smsMessage })}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                        title="Відправити через SMS-шлюз (TurboSMS/SMSClub)"
                                      >
                                        <Send className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })()}

                                {/* Mark as Notified / Reset Button */}
                                {alert.status === 'pending' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStockAlertStatus(alert.id, 'notified');
                                      showToast('Позначено як сповіщене', 'success');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                                    title="Позначити цей запит як сповіщений"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Позначити</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStockAlertStatus(alert.id, 'pending');
                                      showToast('Повернуто в очікування', 'info');
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                                    title="Повернути запит в статус очікування"
                                  >
                                    <span>↩ Очікує</span>
                                  </button>
                                )}

                                {/* Delete Button */}
                                {alertToDelete === alert.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-1 rounded-xl border border-rose-200 animate-in fade-in shrink-0 shadow-2xs">
                                    <span className="text-[10px] font-bold text-rose-700">Видалити?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteStockAlert(alert.id);
                                        setSelectedStockAlertIds(prev => prev.filter(id => id !== alert.id));
                                        setAlertToDelete(null);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                    >
                                      Так
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAlertToDelete(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                                    >
                                      Ні
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAlertToDelete(alert.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-200"
                                    title="Видалити запит"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SMS Preview / Send Modal */}
            {smsModalAlert && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
                onClick={() => setSmsModalAlert(null)}
              >
                <div 
                  className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">SMS-сповіщення клієнта</h4>
                        <p className="text-[11px] text-blue-100">Повідомлення про появу товару на складі</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSmsModalAlert(null)}
                      className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Отримувач:</span>
                        <span className="font-bold text-slate-800">{smsModalAlert.alert.name || 'Покупець'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Телефон:</span>
                        <span className="font-mono font-bold text-blue-700">{smsModalAlert.alert.phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Товар:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[260px]">{smsModalAlert.alert.productName}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Текст повідомлення (можна редагувати):
                      </label>
                      <textarea
                        rows={4}
                        value={smsModalAlert.text}
                        onChange={(e) => setSmsModalAlert({ ...smsModalAlert, text: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-xl bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>Символів: {smsModalAlert.text.length}</span>
                        <span>Відправник: {settingsForm.smsSenderName || 'ISKRA'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <a
                          href={generateSmsUrl(smsModalAlert.alert.phone, smsModalAlert.text)}
                          onClick={() => {
                            updateStockAlertStatus(smsModalAlert.alert.id, 'notified');
                            showToast('Відкрито додаток SMS. Клієнта позначено як сповіщеного!', 'success');
                            setSmsModalAlert(null);
                          }}
                          className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer text-center"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>В SMS</span>
                        </a>

                        <a
                          href={generateViberUrl(smsModalAlert.alert.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            updateStockAlertStatus(smsModalAlert.alert.id, 'notified');
                            showToast('Відкрито чат у Viber. Клієнта позначено як сповіщеного!', 'info');
                            setSmsModalAlert(null);
                          }}
                          className="py-2.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>У Viber</span>
                        </a>

                        <a
                          href={generateTelegramUrl(smsModalAlert.alert.phone, smsModalAlert.text, smsModalAlert.alert.telegramUsername)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            updateStockAlertStatus(smsModalAlert.alert.id, 'notified');
                            showToast('Відкрито Telegram. Клієнта позначено як сповіщеного!', 'info');
                            setSmsModalAlert(null);
                          }}
                          className="py-2.5 px-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer text-center"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>У Telegram</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(smsModalAlert.text);
                            showToast('Текст SMS скопійовано в буфер обміну', 'info');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Скопіювати текст</span>
                        </button>

                        {settingsForm.smsGateway && settingsForm.smsGateway !== 'none' && settingsForm.smsApiKey && (
                          <button
                            type="button"
                            disabled={isSendingGatewaySms}
                            onClick={async () => {
                              setIsSendingGatewaySms(true);
                              try {
                                const res = await sendSmsViaGateway({
                                  phone: smsModalAlert.alert.phone,
                                  text: smsModalAlert.text,
                                  gateway: settingsForm.smsGateway,
                                  apiKey: settingsForm.smsApiKey,
                                  senderName: settingsForm.smsSenderName
                                });
                                if (res.success) {
                                  updateStockAlertStatus(smsModalAlert.alert.id, 'notified');
                                  showToast(res.message, 'success');
                                  setSmsModalAlert(null);
                                } else {
                                  showToast(res.message, 'error');
                                }
                              } catch {
                                showToast('Помилка відправлення через шлюз', 'error');
                              } finally {
                                setIsSendingGatewaySms(false);
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSendingGatewaySms ? 'Відправка...' : `Через ${settingsForm.smsGateway.toUpperCase()}`}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          
          {/* Header & Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span>Керування відгуками покупців</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Редагуйте, додавайте та видаляйте відгуки клієнтів. Усі зміни автоматично синхронізуються з базою даних Firebase/Firestore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddReviewModal()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Додати відгук</span>
                </button>
                <button
                  type="button"
                  onClick={resetDefaultReviews}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  title="Відновити стандартний список відгуків"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Скинути</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Всього відгуків</div>
                <div className="text-2xl font-black text-slate-900 font-display mt-0.5">{reviews.length}</div>
              </div>
              <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-100">
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Середня оцінка</div>
                <div className="text-2xl font-black text-amber-600 font-display mt-0.5 flex items-center gap-1">
                  <span>
                    {reviews.length > 0
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                      : '5.0'}
                  </span>
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-100">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Перевірені покупки</div>
                <div className="text-2xl font-black text-emerald-600 font-display mt-0.5">
                  {reviews.length > 0
                    ? `${Math.round((reviews.filter(r => r.verifiedPurchase).length / reviews.length) * 100)}%`
                    : '100%'}
                </div>
              </div>
              <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-100">
                <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Рекомендують товар</div>
                <div className="text-2xl font-black text-blue-600 font-display mt-0.5">
                  {reviews.length > 0
                    ? `${Math.round((reviews.filter(r => r.recommended).length / reviews.length) * 100)}%`
                    : '100%'}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Пошук за автором, містом або текстом відгуку..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-slate-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={reviewFilterRating}
                onChange={(e) => setReviewFilterRating(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-slate-400"
              >
                <option value="all">Всі оцінки (зірки)</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 зірок</option>
                <option value="4">⭐⭐⭐⭐ 4 зірки</option>
                <option value="3">⭐⭐⭐ 3 зірки</option>
                <option value="2">⭐⭐ 2 зірки</option>
                <option value="1">⭐ 1 зірка</option>
              </select>

              <select
                value={reviewFilterProduct}
                onChange={(e) => setReviewFilterProduct(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-slate-400 max-w-xs truncate"
              >
                <option value="all">Всі товари & загальні</option>
                <option value="general">Загальні відгуки магазину</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reviews Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Автор & Місто</th>
                    <th className="py-3 px-4">Товар</th>
                    <th className="py-3 px-4">Оцінка</th>
                    <th className="py-3 px-4 min-w-[240px]">Текст відгуку</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Корисно</th>
                    <th className="py-3 px-4 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews
                    .filter(r => {
                      const q = reviewSearch.toLowerCase();
                      const matchQ = !q || 
                        r.author.toLowerCase().includes(q) || 
                        (r.city && r.city.toLowerCase().includes(q)) || 
                        r.comment.toLowerCase().includes(q);
                      
                      const matchRating = reviewFilterRating === 'all' || String(r.rating) === reviewFilterRating;
                      
                      const matchProduct = reviewFilterProduct === 'all' 
                        ? true 
                        : reviewFilterProduct === 'general' 
                          ? (!r.productId || r.productId === '') 
                          : r.productId === reviewFilterProduct;

                      return matchQ && matchRating && matchProduct;
                    })
                    .map((rev) => {
                      const tiedProduct = products.find(p => p.id === rev.productId);

                      return (
                        <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{rev.author}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {rev.city || 'с. Оратів'} • {rev.date}
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-[200px]">
                            {tiedProduct ? (
                              <div>
                                <div className="font-semibold text-slate-800 line-clamp-1" title={tiedProduct.name}>
                                  {tiedProduct.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {tiedProduct.sku}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                Магазин ISKRA (Загальний)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-slate-700 ml-1">{rev.rating}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <p className="text-slate-700 line-clamp-2 leading-relaxed">
                              {rev.comment}
                            </p>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap space-y-1">
                            {rev.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Перевірено
                              </span>
                            )}
                            {rev.recommended && (
                              <div className="text-[10px] text-blue-600 font-medium">
                                Рекомендує
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <ThumbsUp className="w-3 h-3 text-slate-400" />
                              <span>{rev.helpfulCount || 0}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditReviewModal(rev)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Редагувати відгук"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Видалити відгук"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADD / EDIT REVIEW MODAL */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-xs text-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{editingReviewId ? 'Редагування відгуку' : 'Додавання нового відгуку'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveReview} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Ім'я автора *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Олександр М."
                        value={rAuthor}
                        onChange={(e) => setRAuthor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Місто / Населений пункт
                      </label>
                      <input
                        type="text"
                        placeholder="с. Оратів"
                        value={rCity}
                        onChange={(e) => setRCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Прив'язка до товару (або загальний відгук)
                    </label>
                    <select
                      value={rProductId}
                      onChange={(e) => setRProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500 bg-white"
                    >
                      <option value="">Загальний відгук про магазин ISKRA</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — {p.price} грн
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Оцінка (Зірки)
                      </label>
                      <select
                        value={rRating}
                        onChange={(e) => setRRating(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500 bg-white"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 зірок</option>
                        <option value={4}>⭐⭐⭐⭐ 4 зірки</option>
                        <option value={3}>⭐⭐⭐ 3 зірки</option>
                        <option value={2}>⭐⭐ 2 зірки</option>
                        <option value={1}>⭐ 1 зірка</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Дата (текстом)
                      </label>
                      <input
                        type="text"
                        placeholder="Вчора / 3 дні тому"
                        value={rDate}
                        onChange={(e) => setRDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Кількість лайків 👍
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={rHelpful}
                        onChange={(e) => setRHelpful(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Текст відгуку *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Введіть текст відгуку..."
                      value={rComment}
                      onChange={(e) => setRComment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={rVerified}
                        onChange={(e) => setRVerified(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Перевірена покупка (галочка ✓)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={rRecommended}
                        onChange={(e) => setRRecommended(e.target.checked)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                      />
                      <span>Рекомендує товар</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-sm"
                    >
                      Зберегти в базу даних
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: DESIGN & PROMO BANNER */}
      {activeTab === 'design' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateHeaderDesign(designForm);
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-2xl"
        >
          <h3 className="text-sm font-bold text-slate-900">
            Налаштування тексту та промо-банера
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Назва бренду (червоний бейдж)
              </label>
              <input
                type="text"
                value={designForm.logoBadge}
                placeholder="ISKRA"
                onChange={(e) => setDesignForm({ ...designForm, logoBadge: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Основний підпис бренду (верхній рядок)
              </label>
              <input
                type="text"
                value={designForm.logoText}
                placeholder="МАГАЗИН"
                onChange={(e) => setDesignForm({ ...designForm, logoText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Слоган / Підзаголовок (нижній рядок)
              </label>
              <input
                type="text"
                value={designForm.logoSubtitle || ''}
                placeholder="Магазин надійних рішень"
                onChange={(e) => setDesignForm({ ...designForm, logoSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
                <input
                  type="checkbox"
                  checked={designForm.promoActive}
                  onChange={(e) => setDesignForm({ ...designForm, promoActive: e.target.checked })}
                  className="rounded text-orange-600"
                />
                <span>Увімкнути промо-банер угорі сайту</span>
              </label>

              <textarea
                rows={2}
                placeholder="Текст повідомлення на банері..."
                value={designForm.promoText}
                onChange={(e) => setDesignForm({ ...designForm, promoText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Верхній бейдж над заголовком (наприклад, «Інтернет-магазин»)
                  </label>
                  <input
                    type="text"
                    placeholder="Інтернет-магазин"
                    value={designForm.heroBadge || ''}
                    onChange={(e) => setDesignForm({ ...designForm, heroBadge: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Місто / Регіон на банері (біля напису «Інтернет-магазин»)
                  </label>
                  <input
                    type="text"
                    placeholder="с. Оратів, Вінницька обл."
                    value={designForm.heroCity || ''}
                    onChange={(e) => setDesignForm({ ...designForm, heroCity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Головний заголовок банера (H1)
                </label>
                <input
                  type="text"
                  value={designForm.heroTitle}
                  onChange={(e) => setDesignForm({ ...designForm, heroTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Опис на головному банері
                </label>
                <textarea
                  rows={2}
                  value={designForm.heroDesc}
                  onChange={(e) => setDesignForm({ ...designForm, heroDesc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl"
            >
              Зберегти зміни дизайну
            </button>
          </div>
        </form>
      )}

      {/* TAB: SETTINGS & TELEGRAM */}
      {activeTab === 'settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-2xl"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Контактні дані та Telegram-сповіщення
            </h3>
            <p className="text-xs text-slate-500">
              Вкажіть номер телефону для дзвінків та токен бота для отримання замовлень у Telegram
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Телефон для замовлень</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Місто / Селище</label>
                <input
                  type="text"
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Адреса магазину</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Графік роботи</label>
              <input
                type="text"
                value={settingsForm.workHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, workHours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            {/* Telegram Bot */}
            <div className="pt-4 border-t border-slate-100 space-y-3 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-sky-600" />
                <span>Миттєві сповіщення у Telegram</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  placeholder="напр., 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={settingsForm.botToken}
                  onChange={(e) => setSettingsForm({ ...settingsForm, botToken: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs bg-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="напр., 987654321"
                  value={settingsForm.chatId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, chatId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs bg-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!settingsForm.botToken || !settingsForm.chatId) {
                    showToast('Введіть Bot Token та Chat ID для тесту', 'error');
                    return;
                  }
                  // Auto-save settings so placeOrder immediately has them
                  updateSiteSettings(settingsForm);

                  const success = await sendTelegramAlert(
                    settingsForm.botToken,
                    settingsForm.chatId,
                    "✅ Тестове сповіщення від магазину ISKRA. З'єднання працює ідеально!"
                  );
                  if (success) {
                    showToast('Тестове повідомлення надіслано в Telegram та налаштування збережено!', 'success');
                  } else {
                    showToast('Помилка надсилання в Telegram (перевірте токен, chat ID та чи натиснутий /start у боті)', 'error');
                  }
                }}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg"
              >
                Надіслати тестове повідомлення
              </button>
            </div>

            {/* SMS Gateway & Notifications Configuration */}
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>SMS-сповіщення клієнтів (TurboSMS, SMS-Fly, AlphaSMS, 1-клік)</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Активно
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Автоматичні та 1-клік сповіщення для покупців, які очікують на появу товару
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-white/90 p-3.5 rounded-xl border border-blue-200/80 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Як працює відправка SMS в магазині:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li><b>1-клік SMS & Viber (безкоштовно):</b> у вкладці «Очікування товару» натисніть кнопку «SMS» або «Viber» — на вашому телефоні або ПК одразу відкриється додаток з уже заповненим текстом і номером клієнта. Працює одразу без жодних платних підписок.</li>
                  <li><b>SMS-шлюз (TurboSMS, SMS-Fly, AlphaSMS):</b> якщо підключити API ключ українського оператора розсилок, повідомлення можна відправляти з офіційним альфа-іменем (наприклад «ISKRA»).</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    SMS-провайдер
                  </label>
                  <select
                    value={settingsForm.smsGateway || 'none'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smsGateway: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-blue-600 font-medium"
                  >
                    <option value="none">Швидкі кнопки 1-клік SMS & Viber (Рекомендовано, безкоштовно)</option>
                    <option value="turbosms">TurboSMS (api.turbosms.ua)</option>
                    <option value="smsfly">SMS-Fly (sms-fly.ua)</option>
                    <option value="alphasms">AlphaSMS (alphasms.ua)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Підпис відправника (Альфа-ім'я)
                  </label>
                  <input
                    type="text"
                    placeholder="наприклад: ISKRA"
                    value={settingsForm.smsSenderName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smsSenderName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {settingsForm.smsGateway && settingsForm.smsGateway !== 'none' && (
                <div className="animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    API Ключ (Токен) {settingsForm.smsGateway.toUpperCase()}
                  </label>
                  <input
                    type="password"
                    placeholder={`Вставте API ключ від ${settingsForm.smsGateway}`}
                    value={settingsForm.smsApiKey || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smsApiKey: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs bg-white outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Шаблон SMS про появу товару
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.smsStockAlertTemplate || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smsStockAlertTemplate: e.target.value })}
                  placeholder={`⚡ Магазин ISKRA\nВітаємо! Товар «{product}» знову в наявності ({price} грн). Замовляйте на сайті або телефонуйте!`}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Змінні: <b>{'{product}'}</b> — назва товару, <b>{'{price}'}</b> — ціна, <b>{'{name}'}</b> — ім'я покупця.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Зберегти всі налаштування (Контакти, Bot & SMS)
            </button>
          </div>
        </form>
      )}

      {/* TAB: DELIVERY CONFIGURATION (Nova Poshta & Ukrposhta) */}
      {activeTab === 'delivery' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
            showToast('Налаштування служб доставки успішно збережено!', 'success');
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-3xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-600" />
                <span>Інтеграція служб доставки (Нова Пошта & Укрпошта)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Керування автоматичним вибором міст, відділень та поштоматів для покупців
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Автопідбір активний</span>
            </span>
          </div>

          {/* Nova Poshta Settings */}
          <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                  НП
                </div>
                <h4 className="text-xs font-bold text-slate-900">Нова Пошта API</h4>
              </div>
              <a
                href="https://my.novaposhta.ua/settings/index#api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
              >
                <span>Отримати ключ в кабінеті</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-600">
              Вкажіть API ключ Нової Пошти, щоб у формі замовлення підвантажувався повний актуальний список відділень та поштоматів по всій Україні. Якщо ключ не вказано — працює надійний вбудований довідник міст.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                API Ключ Нової Пошти (32 символи)
              </label>
              <input
                type="text"
                placeholder="напр., a1b2c3d4e5f67890123456789abcdef0"
                value={settingsForm.novaPoshtaApiKey || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, novaPoshtaApiKey: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* Ukrposhta Settings */}
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  УП
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Укрпошта (Експрес / Стандарт)</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>База 28 000+ індексів активна</span>
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Автоматичний підбір відділень та індексів по всіх населених пунктах України
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-amber-200/80 space-y-1.5">
              <div className="font-bold text-slate-900">Підключені можливості для покупців:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                <li><b>Миттєвий автопідбір:</b> введення 5-значного індексу (напр. 22600) одразу заповнює населений пункт, район та відділення.</li>
                <li><b>Пошук за назвою:</b> підтримка пошуку міст, смт і сіл (наприклад: Оратів, Вінниця, Київ, Чагів, Животівка).</li>
                <li><b>Повний реєстр:</b> адреси та графіки роботи відділень поштового зв'язку.</li>
              </ul>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Персональний eComm Bearer токен Укрпошти (необов'язково)
              </label>
              <input
                type="text"
                placeholder="Введіть eComm Bearer токен (з особистого кабінету ecom.ukrposhta.ua)"
                value={settingsForm.ukrposhtaToken || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, ukrposhtaToken: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white outline-none focus:border-amber-500 shadow-2xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Якщо токен не введено, працює швидка локальна база всіх поштових індексів та відділень України без затримок.
              </span>
            </div>

            {/* Interactive Live Test Tool */}
            <div className="pt-3 border-t border-amber-200/70 space-y-2.5">
              <label className="block text-[11px] font-bold text-amber-950">
                Тестування пошуку відділення за індексом або назвою:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введіть 22600, Оратів, Вінниця, 01001..."
                  value={upTestQuery}
                  onChange={(e) => setUpTestQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!upTestQuery.trim()) return;
                    setIsTestingUp(true);
                    try {
                      const res = await searchUkrposhtaOffices(upTestQuery, settingsForm.ukrposhtaToken);
                      setUpTestResults(res);
                      showToast(`Знайдено ${res.length} відділень Укрпошти`, 'info');
                    } catch (err) {
                      console.warn(err);
                    } finally {
                      setIsTestingUp(false);
                    }
                  }}
                  disabled={isTestingUp}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTestingUp ? 'Пошук...' : 'Перевірити'}
                </button>
              </div>

              {upTestResults.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 max-h-48 overflow-y-auto space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Результати перевірки ({upTestResults.length}):
                  </div>
                  {upTestResults.slice(0, 5).map((it) => (
                    <div key={it.postcode + it.address} className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 text-xs flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {it.postcode}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900">{it.city} <span className="text-slate-500 font-normal">({it.region})</span></div>
                        <div className="text-[11px] text-slate-600">{it.name}: {it.address}</div>
                        {it.workHours && <div className="text-[10px] text-slate-400">{it.workHours}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Free Shipping Settings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Поріг безкоштовної доставки</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Сума замовлення для безкоштовної доставки (грн)
                </label>
                <input
                  type="number"
                  value={settingsForm.features?.freeShippingThreshold ?? 3000}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    features: {
                      ...settingsForm.features,
                      freeShippingThreshold: Number(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Зберегти налаштування доставки
          </button>
        </form>
      )}

      {/* TAB: ONLINE PAYMENTS (WayForPay, Monobank, LiqPay) */}
      {activeTab === 'payments' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
            showToast('Налаштування онлайн-оплати успішно збережено!', 'success');
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-3xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Онлайн-оплата карткою, Apple Pay та Google Pay</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Підключення прийому платежів через українські платіжні системи
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Безпечні платежі</span>
            </span>
          </div>

          {/* Gateway Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Оберіть платіжного провайдера:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'wayforpay' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  settingsForm.paymentGateway === 'wayforpay'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs text-slate-900 mb-0.5">WayForPay</div>
                <div className="text-[10px] text-slate-500">Apple Pay, Google Pay, Visa/Mastercard</div>
              </button>

              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'monobank' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  settingsForm.paymentGateway === 'monobank'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs text-slate-900 mb-0.5">Monobank (monoPay)</div>
                <div className="text-[10px] text-slate-500">Швидка оплата в 1 клік через застосунок mono</div>
              </button>

              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'liqpay' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  settingsForm.paymentGateway === 'liqpay'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs text-slate-900 mb-0.5">LiqPay (ПриватБанк)</div>
                <div className="text-[10px] text-slate-500">Приват24, картки будь-яких банків</div>
              </button>
            </div>
          </div>

          {/* Gateway specific fields */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
            {settingsForm.paymentGateway === 'wayforpay' && (
              <>
                <div className="font-bold text-slate-900">Налаштування мерчанта WayForPay:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Merchant Account (ID магазину)
                    </label>
                    <input
                      type="text"
                      placeholder="напр., test_merch_n1"
                      value={settingsForm.paymentMerchantId || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentMerchantId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Merchant Secret Key (Секретний ключ)
                    </label>
                    <input
                      type="password"
                      placeholder="Введіть секретний ключ"
                      value={settingsForm.paymentSecretKey || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentSecretKey: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {settingsForm.paymentGateway === 'monobank' && (
              <>
                <div className="font-bold text-slate-900">Налаштування еквайрингу Monobank:</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Токен еквайрингу Monobank (X-Token)
                  </label>
                  <input
                    type="password"
                    placeholder="Вставте токен з особистого кабінету monobank.ua/e-comm"
                    value={settingsForm.monobankToken || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, monobankToken: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                  />
                </div>
              </>
            )}

            {settingsForm.paymentGateway === 'liqpay' && (
              <>
                <div className="font-bold text-slate-900">Налаштування LiqPay (ПриватБанк):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Public Key (Публічний ключ)
                    </label>
                    <input
                      type="text"
                      placeholder="i00000000000"
                      value={settingsForm.paymentMerchantId || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentMerchantId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Private Key (Приватний ключ)
                    </label>
                    <input
                      type="password"
                      placeholder="Введіть приватний ключ"
                      value={settingsForm.paymentSecretKey || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentSecretKey: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* IBAN Bank Requisites for Bank Invoices */}
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Офіційні банківські реквізити для оплати за IBAN (Безготівковий розрахунок):</span>
              </div>
              <p className="text-xs text-slate-500">
                Ці реквізити відображаються клієнтам у модальному вікні «Реквізити IBAN» при виборі безготівкової оплати.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Номер рахунку IBAN (29 знаків)
                  </label>
                  <input
                    type="text"
                    placeholder="UA213052990000026007894561230"
                    value={settingsForm.companyIban || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyIban: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Одержувач (Назва ТОВ або ФОП)
                  </label>
                  <input
                    type="text"
                    placeholder="ТОВ «ІСКРА ЕЛЕКТРОТЕХНІКА» або ФОП ..."
                    value={settingsForm.companyName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Код ЄДРПОУ / ІПН (РНОКПП)
                  </label>
                  <input
                    type="text"
                    placeholder="43928174"
                    value={settingsForm.companyEdrpou || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyEdrpou: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Банк одержувача та МФО
                  </label>
                  <input
                    type="text"
                    placeholder="АТ КБ «ПриватБанк» (МФО 305299)"
                    value={settingsForm.companyBank || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyBank: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                  />
                </div>
              </div>

              {/* FOP Seller Legal Requisites for "Про нас" page */}
              <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>Юридичні дані ФОП для сторінки «Про нас / Реквізити» та захисту споживачів:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ФОП: ПІБ суб'єкта підприємницької діяльності
                    </label>
                    <input
                      type="text"
                      placeholder="ФОП Тарасова Ірина Анатоліївна"
                      value={settingsForm.fopName || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      РНОКПП (ІПН платника)
                    </label>
                    <input
                      type="text"
                      placeholder="3298412839"
                      value={settingsForm.fopRnokpp || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopRnokpp: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Місце державної реєстрації ФОП
                    </label>
                    <input
                      type="text"
                      placeholder="Україна, 22600, Вінницька обл., с. Оратів, вул. Героїв Майдану, 14"
                      value={settingsForm.fopRegistrationAddress || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopRegistrationAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Фактичне місце проживання / склад
                    </label>
                    <input
                      type="text"
                      placeholder="Україна, 22600, Вінницька обл., с. Оратів, вул. Героїв Майдану, 14"
                      value={settingsForm.fopActualAddress || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopActualAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Офіційний e-mail для звернень покупців
                    </label>
                    <input
                      type="email"
                      placeholder="iskra.shop.ua@gmail.com"
                      value={settingsForm.fopEmail || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Офіційний телефон ФОП
                    </label>
                    <input
                      type="text"
                      placeholder="+38 (096) 647-36-67"
                      value={settingsForm.fopPhone || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fopPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Інформація про оподаткування та включення податків у ціну
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.taxInfo || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taxInfo: e.target.value })}
                      placeholder="ФОП платник єдиного податку 2-ї групи (без сплати ПДВ). Усі ціни є кінцевими..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Інформація про ліцензії та сертифікацію
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.licenseInfo || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, licenseInfo: e.target.value })}
                      placeholder="Роздрібна торгівля не підлягає обов'язковому ліцензуванню згідно ст. 7 ЗУ..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Зберегти налаштування оплати та реквізитів
          </button>
        </form>
      )}

      {/* TAB: ABOUT US & LEGAL FOP REQUISITES */}
      {activeTab === 'about_settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
            showToast('Дані «Про нас та Реквізити ФОП» успішно збережено в базі даних!', 'success');
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-4xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-50 text-red-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Налаштування сторінки «Про нас / Реквізити ФОП»
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ці дані відображаються клієнтам на окремій публічній сторінці «Про нас / Реквізити», у футері та договорах
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти в базу даних</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Page Title & Story */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                1. Презентація та опис магазину
              </span>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Головний заголовок сторінки
                </label>
                <input
                  type="text"
                  placeholder="Про магазин «ISKRA» та офіційні реквізити продавця"
                  value={settingsForm.aboutTitle || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, aboutTitle: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Історія, місія та опис діяльності (розділяйте абзаци порожнім рядком)
                </label>
                <textarea
                  rows={4}
                  placeholder="Магазин «ISKRA» засновано з метою надати українським родинам..."
                  value={settingsForm.aboutStory || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, aboutStory: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Official FOP Identification Requisites */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                2. Офіційні реквізити продавця (ФОП)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ФОП: ПІБ підприємця *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ФОП Тарасова Ірина Анатоліївна"
                    value={settingsForm.fopName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    РНОКПП (ІПН платника податків) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="3298412839"
                    value={settingsForm.fopRnokpp || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopRnokpp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Місце державної реєстрації ФОП
                  </label>
                  <input
                    type="text"
                    placeholder="Україна, 22600, Вінницька обл., с. Оратів, вул. Героїв Майдану, 14"
                    value={settingsForm.fopRegistrationAddress || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopRegistrationAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Фактичне місце проживання / склад
                  </label>
                  <input
                    type="text"
                    placeholder="Україна, 22600, Вінницька обл., с. Оратів, вул. Героїв Майдану, 14"
                    value={settingsForm.fopActualAddress || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopActualAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Офіційний телефон ФОП
                  </label>
                  <input
                    type="text"
                    placeholder="+38 (096) 647-36-67"
                    value={settingsForm.fopPhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Офіційний e-mail для замовлень та звернень
                  </label>
                  <input
                    type="email"
                    placeholder="iskra.shop.ua@gmail.com"
                    value={settingsForm.fopEmail || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Адреса сайту (Домен)
                  </label>
                  <input
                    type="text"
                    placeholder="https://iskra-shop.ua"
                    value={settingsForm.websiteUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Адреса точки видачі / магазину
                  </label>
                  <input
                    type="text"
                    placeholder="с. Оратів, вул. Героїв Майдану, 14"
                    value={settingsForm.fopStoreAddress || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fopStoreAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            {/* Tax & License */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                3. Інформація про оподаткування та ліцензування
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Оподаткування та податки в ціні
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ФОП платник єдиного податку 2-ї групи (без сплати ПДВ)..."
                    value={settingsForm.taxInfo || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, taxInfo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ліцензії та сертифікація товару
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Роздрібна торгівля не підлягає обов'язковому ліцензуванню згідно ст. 7 ЗУ..."
                    value={settingsForm.licenseInfo || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, licenseInfo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                4. Банківські реквізити IBAN
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Номер рахунку IBAN
                  </label>
                  <input
                    type="text"
                    placeholder="UA213052990000026007894561230"
                    value={settingsForm.companyIban || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyIban: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Банк одержувача та МФО
                  </label>
                  <input
                    type="text"
                    placeholder="АТ КБ «ПриватБанк» (МФО 305299)"
                    value={settingsForm.companyBank || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyBank: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 cursor-pointer"
          >
            Зберегти всі зміни в базу даних
          </button>
        </form>
      )}

      {/* TAB: RETURNS & EXCHANGE SETTINGS */}
      {activeTab === 'returns_settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
            showToast('Умови та правила повернення успішно збережено в базі даних!', 'success');
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-4xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Налаштування сторінки «Повернення та обмін»
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Керуйте строками повернення, адресою відділення Нової Пошти, умовами оплати доставки та сервісу
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти в базу даних</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Key Timelines */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                1. Строки повернення та виплати
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Строк повернення товару (календарних днів)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    placeholder="14"
                    value={settingsForm.returnsDays || 14}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Строк повернення коштів на картку/рахунок
                  </label>
                  <input
                    type="text"
                    placeholder="1–3 робочих днів"
                    value={settingsForm.returnsRefundDays || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsRefundDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Receiver Address */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                2. Реквізити одержувача для повернень «Новою Поштою»
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ПІБ одержувача посилки
                  </label>
                  <input
                    type="text"
                    placeholder="Тарасова Ірина Анатоліївна"
                    value={settingsForm.returnsReceiverName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Телефон одержувача посилки
                  </label>
                  <input
                    type="text"
                    placeholder="+38 (096) 647-36-67"
                    value={settingsForm.returnsReceiverPhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Населений пункт (Місто / Село)
                  </label>
                  <input
                    type="text"
                    placeholder="с. Оратів"
                    value={settingsForm.returnsReceiverCity || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverCity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Відділення «Нова Пошта»
                  </label>
                  <input
                    type="text"
                    placeholder="Відділення №1"
                    value={settingsForm.returnsReceiverWarehouse || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverWarehouse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Who pays delivery */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                3. Умови оплати логістики при поверненні
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Повернення товару належної якості (не підійшов колір/розмір)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Послуги пересилання оплачує покупець за тарифами перевізника..."
                    value={settingsForm.returnsWhoPaysGood || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsWhoPaysGood: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Повернення бракованого товару / помилка складу
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Усі витрати на доставку в обидві сторони повністю оплачує магазин ISKRA..."
                    value={settingsForm.returnsWhoPaysDefect || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsWhoPaysDefect: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:border-emerald-600 text-xs"
                  />
                </div>
              </div>
            </div>

          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            Зберегти всі зміни в базу даних
          </button>
        </form>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div onPaste={handleModalPaste} className="relative bg-white rounded-2xl max-w-3xl sm:max-w-4xl lg:max-w-5xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
              <h3 className="text-base font-bold font-display text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>{editingProduct ? 'Редагувати товар' : 'Додати новий товар'}</span>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer text-lg font-bold"
                >
                  ×
                </button>
              </h3>

              <form onSubmit={handleSaveProductForm} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Назва товару *</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="напр., Змішувач для ванни одноважільний"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Виробник / Бренд</label>
                  <input
                    type="text"
                    value={pBrand}
                    onChange={(e) => setPBrand(e.target.value)}
                    placeholder="напр., WAGO, Valtec, Grohe, Cersanit"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                {/* Cascading Category Pickers */}
                {(() => {
                  // 1. Gather all main categories from categoriesTree AND all products in catalog
                  const mainSet = new Set<string>();
                  Object.keys(categoriesTree).forEach((k) => {
                    if (k && !k.startsWith('_')) mainSet.add(k.trim());
                  });
                  products.forEach((p) => {
                    if (p.mainCategory?.trim()) {
                      mainSet.add(p.mainCategory.trim());
                    } else if (p.category && p.category.includes('/')) {
                      const parts = p.category.split('/').map((s) => s.trim());
                      if (parts[0]) mainSet.add(parts[0]);
                    }
                  });
                  const allMainCategories = Array.from(mainSet);

                  // 2. Gather all subcategories for selected pMainCat
                  const subSet = new Set<string>();
                  if (pMainCat && categoriesTree[pMainCat]) {
                    Object.keys(categoriesTree[pMainCat]).forEach((k) => {
                      if (k && k !== '_leaves' && !k.startsWith('_')) subSet.add(k.trim());
                    });
                  }
                  products.forEach((p) => {
                    const matchMain = p.mainCategory?.trim() === pMainCat || (p.category && p.category.startsWith(pMainCat + ' /'));
                    if (matchMain && p.subCategory?.trim()) {
                      subSet.add(p.subCategory.trim());
                    }
                  });
                  const subCategories = Array.from(subSet);

                  // 3. Direct leaves for pMainCat
                  const directLeavesSet = new Set<string>();
                  if (pMainCat && categoriesTree[pMainCat] && Array.isArray(categoriesTree[pMainCat]._leaves)) {
                    categoriesTree[pMainCat]._leaves.forEach((l: string) => {
                      if (l?.trim()) directLeavesSet.add(l.trim());
                    });
                  }
                  products.forEach((p) => {
                    const matchMain = p.mainCategory?.trim() === pMainCat;
                    if (matchMain && (!p.subCategory || !p.subCategory.trim()) && p.category?.trim()) {
                      const cleanLeaf = p.category.includes('/') ? p.category.split('/').pop()?.trim() || p.category : p.category;
                      if (cleanLeaf) directLeavesSet.add(cleanLeaf);
                    }
                  });
                  const directLeaves = Array.from(directLeavesSet);

                  // 4. Available leaves for selected pMainCat and pSubCat
                  let availableLeaves: string[] = [];
                  const leavesSet = new Set<string>();

                  if (pMainCat) {
                    if (pSubCat) {
                      if (categoriesTree[pMainCat] && Array.isArray(categoriesTree[pMainCat][pSubCat])) {
                        categoriesTree[pMainCat][pSubCat].forEach((l: string) => {
                          if (l?.trim()) leavesSet.add(l.trim());
                        });
                      }
                      products.forEach((p) => {
                        const matchMain = p.mainCategory?.trim() === pMainCat || (p.category && p.category.startsWith(pMainCat + ' /'));
                        if (matchMain && p.subCategory?.trim() === pSubCat && p.category?.trim()) {
                          const leafName = p.category.includes('/') ? p.category.split('/').pop()?.trim() || p.category : p.category;
                          if (leafName) leavesSet.add(leafName);
                        }
                      });
                    } else {
                      if (categoriesTree[pMainCat]) {
                        if (Array.isArray(categoriesTree[pMainCat]._leaves)) {
                          categoriesTree[pMainCat]._leaves.forEach((l: string) => {
                            if (l?.trim()) leavesSet.add(l.trim());
                          });
                        }
                        subCategories.forEach((sub) => {
                          if (Array.isArray(categoriesTree[pMainCat][sub])) {
                            categoriesTree[pMainCat][sub].forEach((l: string) => {
                              if (l?.trim()) leavesSet.add(l.trim());
                            });
                          }
                        });
                      }
                      directLeaves.forEach((l) => leavesSet.add(l));
                      products.forEach((p) => {
                        if (p.mainCategory?.trim() === pMainCat && p.category?.trim()) {
                          const leafName = p.category.includes('/') ? p.category.split('/').pop()?.trim() || p.category : p.category;
                          if (leafName) leavesSet.add(leafName);
                        }
                      });
                    }
                    availableLeaves = Array.from(leavesSet);
                  }

                  return (
                    <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {/* 1. Main Category */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            1. Головна категорія *
                          </label>
                          <select
                            value={pMainCat}
                            required
                            onChange={(e) => {
                              const newMain = e.target.value;
                              setPMainCat(newMain);
                              setPSubCat('');
                              setPLeafCat('');
                            }}
                            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:border-orange-500 outline-none text-xs font-medium cursor-pointer"
                          >
                            {allMainCategories.map((main) => (
                              <option key={main} value={main}>{main}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Sub Category */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            2. Підкатегорія
                          </label>
                          <select
                            value={pSubCat}
                            onChange={(e) => {
                              const newSub = e.target.value;
                              setPSubCat(newSub);
                              setPLeafCat('');
                            }}
                            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:border-orange-500 outline-none text-xs font-medium cursor-pointer"
                          >
                            <option value="">(Без підкатегорії)</option>
                            {subCategories.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Leaf Category */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            3. Кінцева категорія
                          </label>
                          <select
                            value={pLeafCat}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPLeafCat(val);
                              if (!pSubCat && pMainCat && categoriesTree[pMainCat]) {
                                for (const sub of subCategories) {
                                  if (Array.isArray(categoriesTree[pMainCat][sub]) && categoriesTree[pMainCat][sub].includes(val)) {
                                    setPSubCat(sub);
                                    break;
                                  }
                                }
                              }
                            }}
                            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:border-orange-500 outline-none text-xs font-medium cursor-pointer"
                          >
                            <option value="">(Оберіть кінцеву категорію)</option>
                            {pLeafCat && !availableLeaves.includes(pLeafCat) && (
                              <option value={pLeafCat}>{pLeafCat}</option>
                            )}
                            {availableLeaves.map((leaf) => (
                              <option key={leaf} value={leaf}>{leaf}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Direct Leaf Category */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            4. Пряма кінцева
                          </label>
                          <select
                            value={!pSubCat && directLeaves.includes(pLeafCat) ? pLeafCat : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setPSubCat('');
                                setPLeafCat(val);
                              }
                            }}
                            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:border-orange-500 outline-none text-xs font-medium cursor-pointer"
                          >
                            <option value="">(Без прямої кінцевої)</option>
                            {directLeaves.map((leaf) => (
                              <option key={leaf} value={leaf}>{leaf}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Артикул (SKU)</label>
                    <input
                      type="text"
                      placeholder="напр., ISK-492 або залиште порожнім"
                      value={pSku}
                      onChange={(e) => setPSku(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Спеціальна мітка</label>
                    <select
                      value={pBadge}
                      onChange={(e) => setPBadge(e.target.value as ProductBadge)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                    >
                      <option value="">(Без мітки)</option>
                      <option value="Хіт продажу">🔥 Хіт продажу</option>
                      <option value="Акція">🏷️ Акція (-%)</option>
                      <option value="Новинка">✨ Новинка</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Залишок (склад)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={pStock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setPStock('');
                        } else {
                          const cleaned = raw.replace(/^0+(?=\d)/, '');
                          setPStock(cleaned);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ціна (грн)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={pPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setPPrice('');
                        } else {
                          const cleaned = raw.replace(/^0+(?=\d)/, '');
                          setPPrice(cleaned);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Одиниця виміру</label>
                    <select
                      value={pUnit}
                      onChange={(e) => setPUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="грн/шт">грн/шт</option>
                      <option value="грн/м">грн/м</option>
                      <option value="грн/кг">грн/кг</option>
                      <option value="грн/упак">грн/упак</option>
                    </select>
                  </div>
                </div>

                {/* Product Image Selection: Upload from PC or URL */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-600" />
                      <span>Зображення товару</span>
                    </label>
                    
                    <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setProductImageTab('upload')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          productImageTab === 'upload'
                            ? 'bg-white text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>З комп'ютера (ПК)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductImageTab('search')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          productImageTab === 'search'
                            ? 'bg-white text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Google / Prom / Вставка</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductImageTab('url')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          productImageTab === 'url'
                            ? 'bg-white text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>URL / Посилання</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Upload from local PC */}
                  {productImageTab === 'upload' && (
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-orange-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-2xs">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp"
                          onChange={handleProductImageFileChange}
                          disabled={isUploadingProductImage}
                          className="hidden"
                        />
                        <div className="w-12 h-12 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-2xs">
                          {isUploadingProductImage ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 text-center">
                          {isUploadingProductImage ? 'Обробка та оптимізація фото...' : 'Оберіть фотографію товару з ПК'}
                        </p>
                        <p className="text-[11px] text-slate-500 text-center mt-0.5">
                          Натисніть для вибору файлу (PNG, JPG, WEBP) • Автоматично підв'язується до бази даних
                        </p>
                      </label>

                      {productImageUploadError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{productImageUploadError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Search Google/Prom & paste from clipboard */}
                  {productImageTab === 'search' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Пошуковий запит (назва або модель товару):
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={onlineImageQuery}
                              onChange={(e) => setOnlineImageQuery(e.target.value)}
                              placeholder="Введіть назву товару або ключові слова..."
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-orange-500 font-medium"
                            />
                          </div>

                          <a
                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(onlineImageQuery || pName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 hover:shadow-xs"
                            title="Відкрити точний пошук у Google Зображення"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                            <span>Google Фото</span>
                          </a>

                          <a
                            href={`https://prom.ua/search?search_term=${encodeURIComponent(onlineImageQuery || pName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 hover:shadow-xs"
                            title="Знайти цей товар на маркетплейсі Prom.ua"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
                            <span>Prom.ua</span>
                          </a>

                          <a
                            href={`https://epicentrk.ua/ua/search/?q=${encodeURIComponent(onlineImageQuery || pName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 hover:shadow-xs"
                            title="Знайти цей товар в Епіцентрі"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                            <span>Епіцентр</span>
                          </a>
                        </div>
                      </div>

                      {/* Interactive Paste & Drop Zone */}
                      <div
                        onClick={handlePasteFromClipboard}
                        className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50/80 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-2xs"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
                          <Clipboard className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-amber-950 text-center">
                          📋 Вставити скопійоване фото (Ctrl + V)
                        </p>
                        <p className="text-[11px] text-amber-800/90 text-center mt-1 max-w-md">
                          Натисніть сюди або використовуйте гарячі клавіші <b>Ctrl + V</b> після копіювання картинки
                        </p>
                      </div>

                      {/* 3-Step Clear Guide */}
                      <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-base shrink-0">💡</span>
                          <span>Як за 2 кліки вставити точне фото саме вашого товару:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
                          <li>
                            Натисніть кнопку <b>«Google Фото»</b> або <b>«Prom.ua»</b> вище — у новій вкладці відкриється точний пошук вашого товару.
                          </li>
                          <li>
                            На потрібному фото товару натисніть правою кнопкою миші → оберіть <b>«Копіювати зображення»</b>.
                          </li>
                          <li>
                            Поверніться сюди та натисніть кнопку <b>«Вставити (Ctrl + V)»</b> (або клавіші Ctrl+V) — точне заводське фото миттєво підтягнеться в базу!
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Input URL / Path directly */}
                  {productImageTab === 'url' && (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={pImage}
                        onChange={(e) => setPImage(e.target.value)}
                        placeholder="https://... або /src/assets/images/..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 text-xs font-mono"
                      />
                      <p className="text-[11px] text-slate-500">
                        Вставте пряме інтернет-посилання або шлях до внутрішнього зображення
                      </p>
                    </div>
                  )}

                  {/* Live Image Preview Card */}
                  {pImage && (
                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center shadow-2xs">
                        <img
                          src={getSafeImageUrl(pImage)}
                          alt="Попередній перегляд"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/src/assets/images/hero_iskra_store_1790671594961.jpg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          Фото товару готове
                        </span>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                          {pImage.startsWith('data:') ? `Base64 (~${Math.round(pImage.length / 1024)} КБ)` : pImage}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors" title="Завантажити інше фото">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp"
                            onChange={handleProductImageFileChange}
                            disabled={isUploadingProductImage}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPImage('')}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Очистити фото"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Опис товару</label>
                  <textarea
                    rows={2}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Матеріал, технічні особливості, призначення..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
                  >
                    {editingProduct ? 'Зберегти зміни' : 'Створити товар'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* UKRSKLAD SYNC MODAL */}
      <UkrSkladSyncModal
        isOpen={isUkrSkladModalOpen}
        onClose={() => setIsUkrSkladModalOpen(false)}
      />

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        onImport={(importedItems) => batchSaveProducts(importedItems)}
        existingProducts={products}
      />
    </div>
  );
};
