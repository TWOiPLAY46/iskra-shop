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
  BarChart3,
  Activity,
  Calendar,
  TrendingDown,
  Layers,
  Award,
  Download,
  FolderTree,
  Folder,
  CircleDollarSign,
  Coins,
  Zap,
  Headphones,
  PhoneCall,
  QrCode,
  Smartphone,
  Info,
  Store,
  Navigation,
  Globe,
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
import { Order, OrderStatus, Product, ProductBadge, ProductReview, StockAlertRequest, ReturnRequest, FirebaseConnectionConfig } from '../types/store';
import { LiveTrackingWidget } from './LiveTrackingWidget';
import { UkrSkladSyncModal } from './UkrSkladSyncModal';
import { CsvImportModal } from './CsvImportModal';
import { formatUnit, formatPriceUnit, normalizeStorageUnit } from '../utils/unitFormatter';
import { getProductBrand, matchProductSearch } from '../utils/brandHelper';
import { 
  trackNovaPoshtaTTN, 
  searchUkrposhtaOffices, 
  searchNovaPoshtaCities,
  getNovaPoshtaWarehouses,
  UkrposhtaOffice,
  DeliveryCity,
  DeliveryWarehouse
} from '../services/deliveryService';
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
  searchQuery?: string;
}> = ({
  mainCat,
  mainObj,
  onDeleteMain,
  onAddSub,
  onDeleteSub,
  onAddLeaf,
  onDeleteLeaf,
  searchQuery = ''
}) => {
  const [subInput, setSubInput] = useState('');
  const [directLeafInput, setDirectLeafInput] = useState('');
  const [leafInputs, setLeafInputs] = useState<Record<string, string>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmSubDelete, setConfirmSubDelete] = useState<string | null>(null);

  const directLeaves: string[] = Array.isArray(mainObj._leaves) ? mainObj._leaves : [];
  const subCats = Object.keys(mainObj).filter((k) => k !== '_leaves' && !k.startsWith('_'));

  // Total leaf count for stats
  const totalLeafCount = directLeaves.length + subCats.reduce((acc, sub) => {
    const l = Array.isArray(mainObj[sub]) ? mainObj[sub] : [];
    return acc + l.length;
  }, 0);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm hover:border-emerald-300/80 transition-all hover:shadow-md">
      {/* Category Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 font-display text-base tracking-tight">
                {mainCat}
              </h3>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                {subCats.length} підкатегорій
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                {totalLeafCount} кінцевих груп
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Головна категорія верхнього рівня у випадаючому меню магазину
            </p>
          </div>
        </div>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1.5 animate-in fade-in bg-rose-50 p-1.5 rounded-2xl border border-rose-200">
            <span className="text-xs text-rose-700 font-bold pl-1">Видалити категорію з усіма підгрупами?</span>
            <button
              type="button"
              onClick={() => {
                onDeleteMain(mainCat);
                setIsConfirmingDelete(false);
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Так, видалити
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
            >
              Скасувати
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Видалити категорію</span>
          </button>
        )}
      </div>

      {/* Input forms for Subcategory and Direct Leaf */}
      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (subInput.trim()) {
              onAddSub(mainCat, subInput.trim());
              setSubInput('');
            }
          }}
          className="flex items-center gap-2 flex-1 min-w-[240px]"
        >
          <div className="relative flex-1">
            <FolderPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Нова підкатегорія у "${mainCat}"...`}
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer shrink-0"
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
          className="flex items-center gap-2 flex-1 min-w-[220px]"
        >
          <div className="relative flex-1">
            <Plus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Пряма кінцева група (без підкатегорії)..."
              value={directLeafInput}
              onChange={(e) => setDirectLeafInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            + Кінцева
          </button>
        </form>
      </div>

      {/* Direct Leaves (if any) */}
      {directLeaves.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl space-y-2">
          <span className="text-[11px] text-amber-900 font-extrabold flex items-center gap-1">
            <span>📌 Прямі групи в категоріі «{mainCat}»:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {directLeaves.map((leaf) => (
              <span
                key={leaf}
                className="inline-flex items-center gap-1.5 bg-white text-amber-950 border border-amber-300 text-xs px-2.5 py-1 rounded-xl shadow-2xs font-bold"
              >
                <span>{leaf}</span>
                <button
                  type="button"
                  onClick={() => onDeleteLeaf(mainCat, null, leaf)}
                  className="text-amber-700 hover:text-rose-600 font-bold ml-0.5 cursor-pointer hover:bg-rose-50 rounded p-0.5"
                  title="Видалити кінцеву групу"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subcategories Grid */}
      {subCats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {subCats.map((sub) => {
            const leaves: string[] = Array.isArray(mainObj[sub]) ? mainObj[sub] : [];

            return (
              <div key={sub} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-xs shadow-2xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-slate-900 pb-2 border-b border-slate-200/60">
                    <span className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-emerald-600" />
                      <span className="font-extrabold text-sm">{sub}</span>
                    </span>

                    {confirmSubDelete === sub ? (
                      <span className="inline-flex items-center gap-1 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSub(mainCat, sub);
                            setConfirmSubDelete(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Так
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSubDelete(null)}
                          className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-[10px] cursor-pointer"
                        >
                          Ні
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmSubDelete(sub)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                        title="Видалити підкатегорію"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Leaf groups under subcategory */}
                  <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                    {leaves.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Немає кінцевих категорій</span>
                    ) : (
                      leaves.map((leaf) => (
                        <span
                          key={leaf}
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/90 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <span>{leaf}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteLeaf(mainCat, sub, leaf)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer p-0.5 rounded hover:bg-rose-50"
                            title="Видалити кінцеву категорію"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Inline add leaf form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = (leafInputs[sub] || '').trim();
                    if (val) {
                      onAddLeaf(mainCat, sub, val);
                      setLeafInputs((prev) => ({ ...prev, [sub]: '' }));
                    }
                  }}
                  className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60"
                >
                  <input
                    type="text"
                    placeholder="+ Кінцева група..."
                    value={leafInputs[sub] || ''}
                    onChange={(e) => setLeafInputs((prev) => ({ ...prev, [sub]: e.target.value }))}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl flex-1 outline-none focus:border-emerald-500 bg-white font-medium"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
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
    returnRequests,
    updateReturnRequestStatus,
    deleteReturnRequest,
    clearAllReturnRequests,
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

  // Delivery Tab State
  const [showNpApiKey, setShowNpApiKey] = useState(false);
  const [showUpToken, setShowUpToken] = useState(false);
  const [copyDeliveryFeedback, setCopyDeliveryFeedback] = useState<string | null>(null);
  const [npCityTestQuery, setNpCityTestQuery] = useState('Вінниця');
  const [npCityTestResults, setNpCityTestResults] = useState<DeliveryCity[]>([]);
  const [npWarehouseTestResults, setNpWarehouseTestResults] = useState<DeliveryWarehouse[]>([]);
  const [selectedNpTestCity, setSelectedNpTestCity] = useState<DeliveryCity | null>(null);
  const [isTestingNp, setIsTestingNp] = useState(false);
  const [isTestingNpWh, setIsTestingNpWh] = useState(false);
  const [upTestQuery, setUpTestQuery] = useState('22600');
  const [upTestResults, setUpTestResults] = useState<UkrposhtaOffice[]>([]);
  const [isTestingUp, setIsTestingUp] = useState(false);
  const [deliveryActivePreviewTab, setDeliveryActivePreviewTab] = useState<'np' | 'up' | 'pickup'>('np');

  // Returns Tab State
  const [returnsSubTab, setReturnsSubTab] = useState<'editor' | 'requisites' | 'requests' | 'preview'>('editor');
  const [returnsFilterStatus, setReturnsFilterStatus] = useState<string>('all');
  const [returnsFilterReason, setReturnsFilterReason] = useState<string>('all');
  const [returnsSearch, setReturnsSearch] = useState<string>('');
  const [returnsCopyFeedback, setReturnsCopyFeedback] = useState<string | null>(null);
  const [returnToDelete, setReturnToDelete] = useState<string | null>(null);

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

  // Payments Tab State
  const [showPaymentSecret, setShowPaymentSecret] = useState(false);
  const [copyPaymentFeedback, setCopyPaymentFeedback] = useState<string | null>(null);
  const [paymentPreviewSimulated, setPaymentPreviewSimulated] = useState(false);

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
  const [categorySearch, setCategorySearch] = useState('');

  // Order management states
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [confirmClearAllOrders, setConfirmClearAllOrders] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [addOrderItemId, setAddOrderItemId] = useState<string>('');

  // Analytics states
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | '30d' | '7d' | 'today'>('all');
  const [analyticsMetric, setAnalyticsMetric] = useState<'revenue' | 'orders'>('revenue');

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
  const [clientFilter, setClientFilter] = useState<'all' | 'has_bonus' | 'has_discount' | 'vip'>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Settings & DB Form
  const [settingsForm, setSettingsForm] = useState(siteSettings);
  const [designForm, setDesignForm] = useState(headerDesign);
  const [dbConfigForm, setDbConfigForm] = useState<FirebaseConnectionConfig>(firebaseConfig);
  const [dbSubTab, setDbSubTab] = useState<'status' | 'config' | 'collections' | 'ukrsklad' | 'backup'>('status');
  const [showDbApiKey, setShowDbApiKey] = useState(false);
  const [dbPingMs, setDbPingMs] = useState<number | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
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
    setRCity('с-ще. Оратів');
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
        city: rCity.trim() || 'с-ще. Оратів',
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
        city: rCity.trim() || 'с-ще. Оратів',
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
          <p style="font-size: 11px; color: #64748b;">Дякуємо за покупку в магазині ISKRA! (с-ще. Оратів, вул. Котляревського, 7, тел: ${siteSettings.phone})</p>
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

      {/* Compact Improved KPI Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs mb-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Товари */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70">
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 text-[11px]">Товари:</span>
            <span className="font-bold text-slate-900 font-mono text-xs">{totalProducts}</span>
          </div>

          {/* Замовлень */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70">
            <ShoppingCart className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-slate-500 text-[11px]">Замовлень:</span>
            <span className="font-bold text-slate-900 font-mono text-xs">{totalOrders}</span>
          </div>

          {/* Оборот */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 text-[11px]">Оборот:</span>
            <span className="font-bold text-emerald-600 font-mono text-xs">{totalSalesSum.toFixed(0)} грн</span>
          </div>

          {/* БД */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500 text-[11px]">БД:</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${firebaseConfig.enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${firebaseConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {firebaseConfig.enabled ? 'RTDB Онлайн' : 'Офлайн'}
            </span>
          </div>
        </div>

        {/* ФОП */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px]">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">ФОП:</span>
          <span className="font-bold text-slate-800">{siteSettings.fopName || 'Тарасова Ірина Анатоліївна'}</span>
        </div>
      </div>

      {/* Quick Action Blocks (Operations & Settings) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 mb-5 space-y-4">
        {/* БЛОК 1: Операції, товари та продажі */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Операції, товари та продажі</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">8 розділів</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {/* 1. Товари */}
            <button
              type="button"
              onClick={() => handleTabChange('products')}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'products'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'products' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-500/40' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'products' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Товари
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'products' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {products.length} шт
                  </div>
                </div>
              </div>
              {totalCriticalStockCount > 0 ? (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none shrink-0 ${
                  activeTab === 'products'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-amber-100 text-amber-900 border border-amber-300/80'
                }`}>
                  <AlertTriangle className={`w-3 h-3 stroke-[2.5] shrink-0 ${
                    activeTab === 'products' ? 'text-slate-950 fill-slate-950/20' : 'text-amber-800 fill-amber-800/20'
                  }`} />
                  <span>{totalCriticalStockCount}</span>
                </span>
              ) : activeTab === 'products' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 2. Замовлення */}
            <button
              type="button"
              onClick={() => handleTabChange('orders')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'orders'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'orders' ? 'bg-sky-400 text-slate-950 font-bold shadow-xs shadow-sky-400/40' : 'bg-sky-100 text-sky-700'
                }`}>
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'orders' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Замовлення
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'orders' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {orders.length} шт
                  </div>
                </div>
              </div>
              {orders.filter(o => o.status === 'Створено').length > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse shrink-0 shadow-xs">
                  +{orders.filter(o => o.status === 'Створено').length}
                </span>
              ) : activeTab === 'orders' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 3. Категорії */}
            <button
              type="button"
              onClick={() => handleTabChange('categories')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'categories'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'categories' ? 'bg-indigo-400 text-slate-950 font-bold shadow-xs shadow-indigo-400/40' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <FolderPlus className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'categories' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Категорії
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'categories' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Каталог
                  </div>
                </div>
              </div>
              {activeTab === 'categories' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 4. Акція тижня */}
            <button
              type="button"
              onClick={() => handleTabChange('weekly_deal')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'weekly_deal'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'weekly_deal' ? 'bg-orange-500 text-white font-bold shadow-xs shadow-orange-500/40' : 'bg-orange-100 text-orange-600'
                }`}>
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'weekly_deal' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Акція тижня
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'weekly_deal' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {weeklyDeal.enabled ? 'Увімкнено' : 'Вимкнено'}
                  </div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${weeklyDeal.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            </button>

            {/* 5. Відгуки */}
            <button
              type="button"
              onClick={() => handleTabChange('reviews')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'reviews'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'reviews' ? 'bg-amber-400 text-slate-950 font-bold shadow-xs shadow-amber-400/40' : 'bg-amber-100 text-amber-600'
                }`}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'reviews' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Відгуки
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'reviews' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {reviews.length} відг.
                  </div>
                </div>
              </div>
              {activeTab === 'reviews' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 6. Клієнти */}
            <button
              type="button"
              onClick={() => handleTabChange('clients')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'clients'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'clients' ? 'bg-violet-400 text-slate-950 font-bold shadow-xs shadow-violet-400/40' : 'bg-violet-100 text-violet-700'
                }`}>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'clients' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Клієнти
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'clients' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {Object.keys(clients).length} баз.
                  </div>
                </div>
              </div>
              {activeTab === 'clients' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 7. Очікують товар */}
            <button
              type="button"
              onClick={() => {
                setStockAlertFilterProduct('');
                handleTabChange('stock_alerts');
              }}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'stock_alerts'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'stock_alerts' ? 'bg-amber-400 text-slate-950 font-bold shadow-xs shadow-amber-400/40' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'stock_alerts' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Очікують
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'stock_alerts' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Сповіщення
                  </div>
                </div>
              </div>
              {pendingStockAlertsCount > 0 ? (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                  activeTab === 'stock_alerts'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-amber-500 text-slate-950 animate-pulse'
                }`}>
                  {pendingStockAlertsCount}
                </span>
              ) : activeTab === 'stock_alerts' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 8. Аналітика */}
            <button
              type="button"
              onClick={() => handleTabChange('analytics')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'analytics' ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs shadow-cyan-400/40' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'analytics' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Аналітика
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'analytics' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Звіти & Дохід
                  </div>
                </div>
              </div>
              {activeTab === 'analytics' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* БЛОК 2: ⚙️ Усі налаштування та сервіси */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">⚙️ Усі налаштування та сервіси</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">8 розділів</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {/* 9. База даних (БД) */}
            <button
              type="button"
              onClick={() => handleTabChange('database')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'database'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'database' ? 'bg-emerald-400 text-slate-950 font-bold shadow-xs shadow-emerald-400/40' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'database' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    База даних
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'database' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Firebase RTDB
                  </div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${firebaseConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            </button>

            {/* 10. Доставка (НП/УП) */}
            <button
              type="button"
              onClick={() => handleTabChange('delivery')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'delivery'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'delivery' ? 'bg-orange-400 text-slate-950 font-bold shadow-xs shadow-orange-400/40' : 'bg-orange-100 text-orange-700'
                }`}>
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'delivery' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Доставка
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'delivery' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    НП / Укрпошта
                  </div>
                </div>
              </div>
              {activeTab === 'delivery' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 11. Онлайн-оплата */}
            <button
              type="button"
              onClick={() => handleTabChange('payments')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'payments'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'payments' ? 'bg-emerald-400 text-slate-950 font-bold shadow-xs shadow-emerald-400/40' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'payments' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Онлайн-оплата
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'payments' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Mono / WayForPay
                  </div>
                </div>
              </div>
              {activeTab === 'payments' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 12. Модулі сайту */}
            <button
              type="button"
              onClick={() => handleTabChange('features')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'features'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'features' ? 'bg-slate-200 text-slate-900 font-bold shadow-xs' : 'bg-slate-100 text-slate-700'
                }`}>
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'features' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Модулі сайту
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'features' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Функції & Банери
                  </div>
                </div>
              </div>
              {activeTab === 'features' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 13. Дизайн */}
            <button
              type="button"
              onClick={() => handleTabChange('design')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'design'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'design' ? 'bg-purple-400 text-slate-950 font-bold shadow-xs shadow-purple-400/40' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Palette className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'design' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Дизайн
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'design' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Тема & Стиль
                  </div>
                </div>
              </div>
              {activeTab === 'design' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 14. Про нас / Реквізити */}
            <button
              type="button"
              onClick={() => handleTabChange('about_settings')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'about_settings'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'about_settings' ? 'bg-rose-400 text-slate-950 font-bold shadow-xs shadow-rose-400/40' : 'bg-red-100 text-red-700'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'about_settings' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Про нас
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'about_settings' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    ФОП & Юр.дані
                  </div>
                </div>
              </div>
              {activeTab === 'about_settings' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 15. Повернення та обмін */}
            <button
              type="button"
              onClick={() => handleTabChange('returns_settings')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'returns_settings'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'returns_settings' ? 'bg-teal-400 text-slate-950 font-bold shadow-xs shadow-teal-400/40' : 'bg-teal-100 text-teal-700'
                }`}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'returns_settings' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Повернення
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'returns_settings' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Умови 14 днів
                  </div>
                </div>
              </div>
              {activeTab === 'returns_settings' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 16. Telegram & SMS */}
            <button
              type="button"
              onClick={() => handleTabChange('settings')}
              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus:ring-0 select-none ${
                activeTab === 'settings'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/10'
                  : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'settings' ? 'bg-sky-400 text-slate-950 font-bold shadow-xs' : 'bg-sky-100 text-sky-700'
                }`}>
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs truncate leading-tight ${activeTab === 'settings' ? 'text-white font-extrabold' : 'text-slate-800 font-bold'}`}>
                    Telegram & SMS
                  </div>
                  <div className={`text-[10px] font-mono leading-tight ${activeTab === 'settings' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    Сповіщення & боти
                  </div>
                </div>
              </div>
              {activeTab === 'settings' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB: DATABASE CONNECTION (Firebase Firestore + Realtime DB) */}
      {activeTab === 'database' && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          
          {/* Top Hero Status Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Firebase Cloud Engine v9+</span>
                  </span>

                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                    dbStatus === 'connected'
                      ? 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-100 shadow-emerald-500/20'
                      : dbStatus === 'syncing'
                      ? 'bg-amber-500/30 border border-amber-400/60 text-amber-100 animate-pulse'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      dbStatus === 'connected' ? 'bg-emerald-400 animate-ping' : dbStatus === 'syncing' ? 'bg-amber-400 animate-bounce' : 'bg-slate-400'
                    }`} />
                    <span>
                      {dbStatus === 'connected'
                        ? 'В МЕРЕЖІ (Firestore + Realtime DB)'
                        : dbStatus === 'syncing'
                        ? 'СИНХРОНІЗАЦІЯ ХМАРИ...'
                        : 'ОФЛАЙН (LocalStorage)'}
                    </span>
                  </span>

                  {dbPingMs !== null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-emerald-300 border border-white/10 shadow-inner">
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>{dbPingMs}ms latency</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>База даних Firebase</span>
                  <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                    iskra-8d036
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Центральний високошвидкісний рушій проєкту <strong>iskra-8d036</strong>. Подвійна хмарна архітектура поєднує транзакційну бакалаврську базу <strong>Cloud Firestore</strong> та стрімінговий канал <strong>Realtime Database (WebSockets)</strong> для миттєвої синхронізації залишків і замовлень.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <a
                  href="https://console.firebase.google.com/project/iskra-8d036/firestore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  <span>Консоль Firebase</span>
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    setIsTestingDb(true);
                    const res = await testDbConnection();
                    setIsTestingDb(false);
                    if (res && res.pingMs !== undefined) {
                      setDbPingMs(res.pingMs);
                    }
                  }}
                  disabled={isTestingDb}
                  className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isTestingDb ? 'animate-spin' : ''}`} />
                  <span>{isTestingDb ? 'Тестування...' : 'Перевірити з\'єднання'}</span>
                </button>

                <button
                  type="button"
                  onClick={syncToCloud}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                >
                  <CloudUpload className="w-4 h-4 text-emerald-200" />
                  <span>Вивантажити в хмару</span>
                </button>
              </div>

            </div>
          </div>

          {/* Sub-tabs Navigation Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setDbSubTab('status')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dbSubTab === 'status'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>1. Моніторинг та рушії</span>
            </button>

            <button
              type="button"
              onClick={() => setDbSubTab('config')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dbSubTab === 'config'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Key className="w-4 h-4 text-emerald-600" />
              <span>2. Реквізити ключів</span>
            </button>

            <button
              type="button"
              onClick={() => setDbSubTab('collections')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dbSubTab === 'collections'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Database className="w-4 h-4 text-sky-600" />
              <span>3. Таблиці & Статистика</span>
            </button>

            <button
              type="button"
              onClick={() => setDbSubTab('ukrsklad')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dbSubTab === 'ukrsklad'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>4. УкрСклад (CommerceML)</span>
            </button>

            <button
              type="button"
              onClick={() => setDbSubTab('backup')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dbSubTab === 'backup'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>5. Резервна копія JSON</span>
            </button>
          </div>

          {/* SUBTAB 1: STATUS & DUAL ENGINES */}
          {dbSubTab === 'status' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* System Health Dashboard Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Товари БД</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{products.length}</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Синхронізовано з Firestore</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Замовлення</span>
                    <ShoppingCart className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{orders.length}</div>
                  <div className="text-[10px] text-sky-700 font-medium">Журнал замовлень</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Клієнти</span>
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{Object.keys(clients).length}</div>
                  <div className="text-[10px] text-violet-700 font-medium">База покупців</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Заявки</span>
                    <RotateCcw className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{returnRequests.length}</div>
                  <div className="text-[10px] text-purple-700 font-medium">Повернення & Обмін</div>
                </div>
              </div>

              {/* Dual Engines Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Engine 1: Firestore */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Cloud Firestore (NoSQL)</h3>
                          <p className="text-[11px] text-slate-500">Основне сховище документів</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        Активно
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Забезпечує надійне збереження структурованих колекцій: каталог товарів, замовлення, профілі клієнтів, відгуки, сповіщення та повернення.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200/80 text-xs">
                      <div className="flex justify-between items-center text-slate-600 border-b border-slate-200/60 pb-1.5">
                        <span>ID Проєкта:</span>
                        <b className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">iskra-8d036</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 border-b border-slate-200/60 pb-1.5">
                        <span>Регіон хостингу:</span>
                        <b className="font-mono text-slate-900">europe-west1</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Статус колекцій:</span>
                        <b className="text-emerald-700 font-bold">6 колекцій синхронізовано</b>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex gap-2">
                    <button
                      type="button"
                      onClick={syncToCloud}
                      className="w-full py-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Синхронізувати Firestore</span>
                    </button>
                  </div>
                </div>

                {/* Engine 2: Realtime Database */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Realtime Database (WebSockets)</h3>
                          <p className="text-[11px] text-slate-500">Стрімінг залишків та замовлень</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                        Realtime
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Забезпечує миттєву передачу нових замовлень та зміну залишків товарів у реальному часі без необхідності оновлювати сторінку браузера.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200/80 text-xs">
                      <div className="flex justify-between items-center text-slate-600 border-b border-slate-200/60 pb-1.5">
                        <span>Протокол зв'язку:</span>
                        <b className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">WSS (WebSockets)</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 border-b border-slate-200/60 pb-1.5">
                        <span>Авто-синхронізація:</span>
                        <b className={dbConfigForm.autoSync ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {dbConfigForm.autoSync ? 'Увімкнено (100ms)' : 'Вимкнено'}
                        </b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Статус каналу:</span>
                        <b className="text-emerald-700 font-bold">{dbStatus === 'connected' ? 'З\'єднання активне' : 'Очікування'}</b>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex gap-2">
                    <button
                      type="button"
                      onClick={fetchFromCloud}
                      className="w-full py-2.5 bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      <span>Завантажити з Realtime DB</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Mode Control Switches */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Режими робочої бази даних</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:bg-slate-100/80 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={dbConfigForm.enabled}
                      onChange={(e) => {
                        const updated = { ...dbConfigForm, enabled: e.target.checked };
                        setDbConfigForm(updated);
                        updateFirebaseConfig(updated);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 mt-0.5 cursor-pointer focus:ring-emerald-500"
                    />
                    <div>
                      <b className="text-slate-900 block text-xs group-hover:text-emerald-700 transition-colors">
                        Використовувати хмарну БД Firebase
                      </b>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Якщо увімкнено, усі замовлення, клієнти та товари зберігаються у хмарі. Якщо вимкнено — сайт працює локально (LocalStorage).
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:bg-slate-100/80 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={dbConfigForm.autoSync}
                      onChange={(e) => {
                        const updated = { ...dbConfigForm, autoSync: e.target.checked };
                        setDbConfigForm(updated);
                        updateFirebaseConfig(updated);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 mt-0.5 cursor-pointer focus:ring-emerald-500"
                    />
                    <div>
                      <b className="text-slate-900 block text-xs group-hover:text-emerald-700 transition-colors">
                        Автоматична синхронізація у реальному часі
                      </b>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Миттєве отримання сповіщень про нові замовлення покупців та зміну залишків через живий канал.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* SUBTAB 2: CREDENTIALS CONFIGURATION */}
          {dbSubTab === 'config' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Реквізити підключення проєкту Firebase</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ключі доступу, ендпоінти та параметри аутентифікації</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const defaultCfg: FirebaseConnectionConfig = {
                      apiKey: dbConfigForm.apiKey || '',
                      authDomain: 'iskra-8d036.firebaseapp.com',
                      databaseURL: 'https://iskra-8d036-default-rtdb.europe-west1.firebasedatabase.app',
                      projectId: 'iskra-8d036',
                      storageBucket: 'iskra-8d036.firebasestorage.app',
                      messagingSenderId: '472272282956',
                      appId: '1:472272282956:web:iskra8d036',
                      enabled: true,
                      autoSync: true
                    };
                    setDbConfigForm(defaultCfg);
                    showToast('Застосовано рекомендовані реквізити проєкту iskra-8d036', 'info');
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Застосувати пресет iskra-8d036</span>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateFirebaseConfig(dbConfigForm);
                  showToast('Конфігурацію бази даних успішно збережено!', 'success');
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Database URL (Firebase Realtime Database) *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={dbConfigForm.databaseURL}
                      onChange={(e) => setDbConfigForm({ ...dbConfigForm, databaseURL: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white text-slate-900 font-bold"
                      placeholder="https://iskra-8d036-default-rtdb.europe-west1.firebasedatabase.app"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dbConfigForm.databaseURL);
                        showToast('Скопійовано URL бази даних!', 'info');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Скопіювати"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      API Key (Ключ доступу Firebase) *
                    </label>
                    <div className="relative">
                      <input
                        type={showDbApiKey ? "text" : "password"}
                        required
                        value={dbConfigForm.apiKey}
                        onChange={(e) => setDbConfigForm({ ...dbConfigForm, apiKey: e.target.value })}
                        className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white text-slate-900 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDbApiKey(!showDbApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showDbApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Project ID *</label>
                    <input
                      type="text"
                      required
                      value={dbConfigForm.projectId}
                      onChange={(e) => setDbConfigForm({ ...dbConfigForm, projectId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Auth Domain</label>
                    <input
                      type="text"
                      value={dbConfigForm.authDomain}
                      onChange={(e) => setDbConfigForm({ ...dbConfigForm, authDomain: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Storage Bucket</label>
                    <input
                      type="text"
                      value={dbConfigForm.storageBucket}
                      onChange={(e) => setDbConfigForm({ ...dbConfigForm, storageBucket: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Зберегти реквізити БД</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 3: COLLECTIONS METRICS */}
          {dbSubTab === 'collections' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Синхронізовані таблиці та колекції БД</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Кількість документів та швидкий перехід до перегляду записів</p>
                  </div>

                  <button
                    type="button"
                    onClick={syncToCloud}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 shrink-0 self-start sm:self-auto"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Синхронізувати всі колекції</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Collection 1: products */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/products</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          {products.length} записів
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Каталог товарів, ціни, артикули, залишки та специфікації.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="text-xs text-emerald-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Управління товарами</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Collection 2: orders */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-sky-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/orders</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold">
                          {orders.length} замовлень
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Історія покупок, реквізити доставки Нової Пошти, ТТН та оплати.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-sky-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Журнал замовлень</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Collection 3: clients */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-violet-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/clients</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-extrabold">
                          {Object.keys(clients).length} клієнтів
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Клієнтські профілі, баланс кешбеку та особисті знижки.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clients')}
                      className="text-xs text-violet-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>База клієнтів</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Collection 4: reviews */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-amber-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/reviews</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                          {reviews.length} відгуків
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Відгуки покупців, оцінки товарів та верифікація покупок.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className="text-xs text-amber-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Модерація відгуків</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Collection 5: stock_alerts */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-red-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/stock_alerts</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold">
                          {stockAlerts.length} запитів
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Запити покупців на сповіщення про надходження товарів.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('stock_alerts')}
                      className="text-xs text-red-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Сповіщення наявності</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Collection 6: return_requests */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-purple-300 transition-all space-y-3 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/return_requests</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                          {returnRequests.length} заявок
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Онлайн-заявки покупців на повернення та обмін товарів.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('returns_settings')}
                      className="text-xs text-purple-700 font-bold hover:underline self-start cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Заявки повернення</span>
                      <span>→</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4: UKRSKLAD INTEGRATION HUB */}
          {dbSubTab === 'ukrsklad' && (
            <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-5 sm:p-7 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Синхронізація з програмою «УкрСклад»</span>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950">
                        CommerceML 2.0
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Імпортуйте нові товари, ціни та залишки з програми УкрСклад, або вивантажуйте замовлення клієнтів у форматі XML / CSV.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUkrSkladModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-amber-600/30 active:scale-95"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Відкрити модуль УкрСклад</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 5: BACKUP & RESTORE */}
          {dbSubTab === 'backup' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Повна резервна копія сайту (JSON Backup)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Збережіть усі товари, замовлення, клієнтів та структуру каталогу у файл на комп'ютері, або відновіть їх у разі потреби.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleJsonBackupDownload}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Скачати резервну копію (JSON)</span>
                </button>

                <label className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer transition-all active:scale-95">
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  <span>Відновити з файлу JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonBackupRestore}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <div className="text-xs">
                <span className="font-bold text-white">Проєкт: iskra-8d036</span>{' '}
                <span className="text-slate-300">({dbStatus === 'connected' ? "З'єднання активне" : 'Локальний режим'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  updateFirebaseConfig(dbConfigForm);
                  showToast('Параметри підключення бази даних збережено!', 'success');
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Зберегти параметри підключення БД</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB: WEEKLY DEAL (АКЦІЯ ТИЖНЯ) */}
      {activeTab === 'weekly_deal' && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          
          {/* Top Master Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 sm:p-8 text-white shadow-2xl border border-red-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Flame className="w-3.5 h-3.5 text-red-400 fill-red-400 animate-pulse" />
                    <span>Промо-модуль «Акція тижня»</span>
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-inner ${
                    weeklyDeal.enabled
                      ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                      : 'bg-slate-700/50 border border-slate-600/50 text-slate-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${weeklyDeal.enabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                    <span>{weeklyDeal.enabled ? 'Трансляція: Увімкнено' : 'Трансляція: Вимкнено'}</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Налаштування блоку «Акція тижня»</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Спеціальний промо-блок на головній сторінці магазину <strong>ISKRA</strong>. Привертайте увагу покупців лімітованою акцією із анімованим таймером, привабливою знижкою та кнопкою швидкої покупки.
                </p>

                {/* Status Badges */}
                <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400">Розміщення:</span>
                    <span className="text-white font-extrabold">Головна вітрина (Top Hero)</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-slate-400">Таймер відліку:</span>
                    <span className="text-red-300 font-extrabold">{weeklyDeal.endDateText || 'До кінця тижня'}</span>
                  </div>
                </div>
              </div>

              {/* Master Switch Action */}
              <div className="shrink-0 flex flex-col items-start lg:items-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateWeeklyDeal({ enabled: !weeklyDeal.enabled });
                    showToast(weeklyDeal.enabled ? 'Акцію тижня вимкнено з сайту' : 'Акцію тижня увімкнено на сайті!', 'info');
                  }}
                  className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2.5 cursor-pointer shadow-lg active:scale-95 ${
                    weeklyDeal.enabled
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-slate-900/40'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${weeklyDeal.enabled ? 'fill-white animate-bounce' : 'text-amber-400'}`} />
                  <span>{weeklyDeal.enabled ? 'Вимкнути показ акції' : 'Увімкнути показ на сайті'}</span>
                </button>

                <span className="text-[11px] text-slate-400 font-medium">
                  {weeklyDeal.enabled ? 'Клієнти бачать цей блок на сайті' : 'Блок приховано з головної сторінки'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick KPI Dashboard for Active Deal */}
          {(() => {
            const currentProd = products.find(p => p.id === weeklyDeal.productId) || products[0];
            if (!currentProd) return null;
            const disc = weeklyDeal.discountPercent || 25;
            const promoPrice = weeklyDeal.customPrice || Math.round(currentProd.price * (1 - disc / 100));
            const savings = currentProd.price - promoPrice;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Акційний товар</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5" title={currentProd.name}>
                    {currentProd.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{currentProd.sku}</span>
                </div>

                <div className="bg-gradient-to-br from-red-50/80 to-rose-50/40 rounded-2xl p-4 border border-red-200/80 shadow-xs flex flex-col justify-between space-y-2">
                  <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">Ціна зі знижкою</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-red-600 font-display">{promoPrice} грн</span>
                    <span className="text-xs text-slate-400 line-through font-semibold">{currentProd.price} грн</span>
                  </div>
                  <span className="text-[10px] text-red-600 font-bold">Акційна вартість</span>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex flex-col justify-between space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Знижка покупця</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 font-display">-{disc}%</span>
                    <span className="text-xs font-bold text-emerald-700">({savings} грн)</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">Чиста економія</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Залишок на складі</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black ${currentProd.stock <= 5 ? 'text-amber-600' : 'text-slate-900'} font-display`}>
                      {currentProd.stock} шт
                    </span>
                    {currentProd.stock <= 5 && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase">Мало</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Статус наявності</span>
                </div>
              </div>
            );
          })()}

          {/* 1. Step: Product Selection & Interactive Visual Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Вибір акційного товару з каталогу
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Оберіть будь-який товар із вашої бази для встановлення у головний промо-блок
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                Всього товарів: <b>{products.length}</b>
              </span>
            </div>

            {/* Select Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Оберіть товар для встановлення в блок «Акція тижня»:
              </label>
              <div className="relative">
                <select
                  value={weeklyDeal.productId}
                  onChange={(e) => updateWeeklyDeal({ productId: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all cursor-pointer shadow-2xs appearance-none"
                >
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      [{prod.sku}] {prod.name} — {prod.price} грн ({prod.category} | На складі: {prod.stock} шт)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Selected Product Visual Card */}
            {(() => {
              const activeProd = products.find(p => p.id === weeklyDeal.productId) || products[0];
              if (!activeProd) return null;
              const disc = weeklyDeal.discountPercent || 25;
              const promoPrice = weeklyDeal.customPrice || Math.round(activeProd.price * (1 - disc / 100));
              const savings = activeProd.price - promoPrice;

              return (
                <div className="bg-gradient-to-r from-slate-50 via-red-50/30 to-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Image container with discount pill */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                      {activeProd.image && activeProd.image.trim() !== '' ? (
                        <img 
                          src={getSafeImageUrl(activeProd.image)} 
                          alt={activeProd.name} 
                          className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" 
                        />
                      ) : (
                        <Package className="w-9 h-9 text-slate-400" />
                      )}
                      <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-md">
                        -{disc}%
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-red-600 bg-red-100/70 px-2 py-0.5 rounded-md">
                          {activeProd.sku}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {activeProd.category}
                        </span>
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                        {activeProd.name}
                      </h5>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                        <span>Залишок: <b className={activeProd.stock <= 5 ? 'text-amber-600 font-black' : 'text-slate-900 font-bold'}>{activeProd.stock} шт</b></span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">Готовий до відправки</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial calculation display */}
                  <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ціна за акцією</span>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 line-through font-semibold">{activeProd.price} грн</div>
                      <div className="text-xl sm:text-2xl font-black text-red-600 tracking-tight">{promoPrice} грн</div>
                      <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                        Вигода: {savings} грн
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 2. Step: Pricing & Discount Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Розмір знижки та акційна ціна
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Встановіть відсоток знижки або вкажіть фіксовану ціну
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                Поточна знижка: {weeklyDeal.discountPercent || 25}%
              </span>
            </div>

            {/* Quick preset discount buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Швидкий вибір розміру знижки в 1 клік:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 15, 20, 25, 30, 35, 40, 50, 60].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => updateWeeklyDeal({ discountPercent: pct, customPrice: undefined })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                      weeklyDeal.discountPercent === pct && !weeklyDeal.customPrice
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/25 ring-2 ring-red-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Input Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Custom % */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Довільний % знижки (від 1% до 90%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={weeklyDeal.discountPercent || 25}
                    onChange={(e) => updateWeeklyDeal({ discountPercent: Math.max(1, Math.min(90, Number(e.target.value) || 0)), customPrice: undefined })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Автоматично перераховує акційну ціну відповідно до базової ціни товару.
                </p>
              </div>

              {/* Option B: Fixed Custom Price Override */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Точна акційна ціна вручну (грн):
                  </label>
                  {weeklyDeal.customPrice && (
                    <button
                      type="button"
                      onClick={() => updateWeeklyDeal({ customPrice: undefined })}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Скинути до %
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Залишити порожнім для авторозрахунку"
                    value={weeklyDeal.customPrice || ''}
                    onChange={(e) => updateWeeklyDeal({ customPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none pr-12"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">грн</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Якщо заповнено — на сайті покажеться саме ця фіксована сума.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Step: Marketing Texts & Promo Badges */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Текстове оформлення, слогани та бейджі
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Заголовок, рекламний підзаголовок та стікер
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Block Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Заголовок блоку на вітрині:
                </label>
                <input
                  type="text"
                  value={weeklyDeal.title}
                  onChange={(e) => updateWeeklyDeal({ title: e.target.value })}
                  placeholder="Акція тижня"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Акція тижня', 'Гаряча пропозиція', 'Товар тижня', 'Суперціна'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateWeeklyDeal({ title: preset })}
                      className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Текст яскравого бейджа / стікера:
                </label>
                <input
                  type="text"
                  value={weeklyDeal.badgeText}
                  onChange={(e) => updateWeeklyDeal({ badgeText: e.target.value })}
                  placeholder="🔥 АКЦІЯ ТИЖНЯ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['🔥 АКЦІЯ ТИЖНЯ', '⚡ ХІТ СЕЗОНУ', '💣 ШОК ЦІНА', '🎯 ТОП ЗНИЖКА'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateWeeklyDeal({ badgeText: preset })}
                      className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtitle / Value Proposition */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Рекламний підзаголовок / опис спеціальної пропозиції:
              </label>
              <textarea
                rows={2}
                value={weeklyDeal.subtitle}
                onChange={(e) => updateWeeklyDeal({ subtitle: e.target.value })}
                placeholder="Спеціальна пропозиція зі знижкою 25% на преміум сантехніку. Встигніть замовити до завершення акції!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                Цей текст відображається одразу під назвою акції та мотивує відвідувача зробити покупку.
              </p>
            </div>
          </div>

          {/* 4. Step: Countdown Timer Settings */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-xs">
                  4
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Таймер зворотного відліку (дедлайн акції)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Встановіть термін дії акції для показу точного таймера відліку
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Timer Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Швидке встановлення терміну дії акції в 1 клік:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Sunday 23:59 */}
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                    const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
                    updateWeeklyDeal({ endTimestamp: nextSunday.getTime(), endDateText: 'До кінця неділі 23:59' });
                    showToast('Таймер встановлено: До кінця неділі', 'info');
                  }}
                  className="p-3.5 rounded-2xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-left transition-all cursor-pointer group active:scale-95"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-700 group-hover:text-red-800">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>До кінця неділі 23:59</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Класична щотижнева акція
                  </div>
                </button>

                {/* End of Today */}
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    updateWeeklyDeal({ endTimestamp: endOfToday.getTime(), endDateText: 'До кінця доби 23:59' });
                    showToast('Таймер встановлено: До кінця доби', 'info');
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer group active:scale-95"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>До кінця поточної доби</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Гаряча пропозиція на 24 години
                  </div>
                </button>

                {/* +3.5 Days */}
                <button
                  type="button"
                  onClick={() => {
                    updateWeeklyDeal({ endTimestamp: Date.now() + 3 * 86400000 + 12 * 3600000, endDateText: '3 дні 12 год' });
                    showToast('Таймер встановлено: +3.5 дні', 'info');
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer group active:scale-95"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>+3.5 дні від зараз</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Спеціальний експрес-період
                  </div>
                </button>

                {/* +7 Days */}
                <button
                  type="button"
                  onClick={() => {
                    updateWeeklyDeal({ endTimestamp: Date.now() + 7 * 86400000, endDateText: '7 днів' });
                    showToast('Таймер встановлено: +7 днів', 'info');
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer group active:scale-95"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+7 днів від зараз</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Повний щотижневий цикл
                  </div>
                </button>
              </div>
            </div>

            {/* Custom timer description */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600">Встановлений підпис терміну: <b className="text-slate-900 font-extrabold">{weeklyDeal.endDateText || 'До кінця неділі 23:59'}</b></span>
              <span className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ● Таймер відліку активний
              </span>
            </div>
          </div>

          {/* 5. Live Interactive Storefront Preview */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-5 sm:p-7 text-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  Живий інтерактивний попередній перегляд вітрини
                </span>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 font-mono">
                Storefront Live Preview
              </span>
            </div>

            {/* Showcase simulation */}
            <div className="bg-slate-950 rounded-2xl p-5 sm:p-6 border border-red-500/30 relative overflow-hidden shadow-2xl">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              {(() => {
                const prod = products.find(p => p.id === weeklyDeal.productId) || products[0];
                if (!prod) return null;
                const disc = weeklyDeal.discountPercent || 25;
                const pPrice = weeklyDeal.customPrice || Math.round(prod.price * (1 - disc / 100));

                return (
                  <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Left: Product Media & Info */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 w-full lg:w-auto">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-2xl p-2.5 flex items-center justify-center shrink-0 shadow-lg">
                        {prod.image && prod.image.trim() !== '' ? (
                          <img src={getSafeImageUrl(prod.image)} alt={prod.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Package className="w-10 h-10 text-slate-400" />
                        )}
                        <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow-md">
                          -{disc}%
                        </span>
                      </div>

                      <div className="text-center sm:text-left">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 text-[11px] font-mono font-bold mb-1.5">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{weeklyDeal.badgeText || '🔥 АКЦІЯ ТИЖНЯ'}</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-md">
                          {weeklyDeal.subtitle || 'Спеціальна щотижнева знижка від магазину'}
                        </p>
                        
                        <div className="flex items-baseline justify-center sm:justify-start gap-3 mt-2">
                          <span className="text-2xl font-black text-white tracking-tight">{pPrice} грн</span>
                          <span className="text-sm text-slate-500 line-through font-medium">{prod.price} грн</span>
                          <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            -{(prod.price - pPrice)} грн
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Live Countdown & Pulse CTA */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full lg:w-auto justify-center">
                      {/* Fake Timer Display */}
                      <div className="flex items-center gap-1.5 text-center">
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[42px]">
                          <span className="text-sm font-mono font-black text-white block">03</span>
                          <span className="text-[9px] text-slate-400 block font-bold">ДНІ</span>
                        </div>
                        <span className="text-slate-500 font-bold">:</span>
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[42px]">
                          <span className="text-sm font-mono font-black text-white block">14</span>
                          <span className="text-[9px] text-slate-400 block font-bold">ГОД</span>
                        </div>
                        <span className="text-slate-500 font-bold">:</span>
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[42px]">
                          <span className="text-sm font-mono font-black text-white block">28</span>
                          <span className="text-[9px] text-slate-400 block font-bold">ХВ</span>
                        </div>
                      </div>

                      {/* Pulsing Action Button */}
                      <button
                        type="button"
                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                        <span>Купити по акції</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Sticky Floating Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Flame className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              <span>
                Статус акції: <b className="text-white">{weeklyDeal.enabled ? 'Активна на сайті' : 'Прихована'}</b>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                showToast('Параметри «Акції тижня» успішно збережено в БД!', 'success');
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти блок «Акція тижня»</span>
            </button>
          </div>

        </div>
      )}

      {/* TAB: FEATURES & SITE CONTROLS */}
      {activeTab === 'features' && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          
          {/* Top Master Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 sm:p-8 text-white shadow-2xl border border-orange-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    <span>Панель керування модулями магазину</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>БД Синхронізація: Активно</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Керування функціоналом та модулями</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Гнучке та безпечне налаштування бізнес-поведінки інтернет-магазину <strong>ISKRA</strong>. Вмикайте або вимикайте ключові модулі, підключайте програми лояльності, налаштовуйте пороги безкоштовної доставки та керуйте промо-повідомленнями.
                </p>

                {/* Status Badges */}
                <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-slate-400">Активні модулі:</span>
                    <span className="text-white font-extrabold">
                      {[
                        siteSettings.features?.ordersEnabled ?? true,
                        siteSettings.features?.loyaltyEnabled ?? true,
                        siteSettings.features?.reviewsEnabled ?? true,
                        siteSettings.features?.personalDiscountEnabled ?? true,
                        siteSettings.features?.showExactStock ?? true,
                        siteSettings.features?.floatingCallBtn ?? true,
                      ].filter(Boolean).length} з 6
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Захист маржі:</span>
                    <span className="text-emerald-300 font-extrabold">Макс. {siteSettings.features?.maxPersonalDiscountPercent ?? 20}%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    showToast('Налаштування модулів та функціоналу збережено в БД', 'success');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>Зберегти всі модулі</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top Notification Promo Banner Settings */}
          <div className="bg-white rounded-3xl border border-orange-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-orange-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Верхній промо-рядок сповіщень на сайті
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Анонсуйте акції, безкоштовну доставку та спеціальні пропозиції у самому верху сайту
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                  designForm.promoActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {designForm.promoActive ? '● Банер активний' : '○ Приховано'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const next = !designForm.promoActive;
                    setDesignForm({ ...designForm, promoActive: next });
                    updateHeaderDesign({ ...designForm, promoActive: next });
                    showToast(next ? 'Промо-рядок увімкнено!' : 'Промо-рядок приховано!', 'success');
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                    designForm.promoActive ? 'bg-orange-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      designForm.promoActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Текст повідомлення на промо-банері
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <textarea
                    rows={2}
                    placeholder="🔥 Знижка -10% на всі замовлення від 1000 грн! Встигніть оформити!"
                    value={designForm.promoText}
                    onChange={(e) => setDesignForm({ ...designForm, promoText: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateHeaderDesign(designForm);
                      showToast('Текст промо-рядка збережено!', 'success');
                    }}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-orange-600/25 cursor-pointer shrink-0 self-start sm:self-auto active:scale-95"
                  >
                    Зберегти рядок
                  </button>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-bold">Швидкі шаблони:</span>
                {[
                  '🔥 Знижка -10% при замовленні від 1000 грн!',
                  '🚚 Безкоштовна доставка від 3000 грн по всій Україні!',
                  '⚡ Швидка відправка товару в день замовлення!',
                  '🎁 Подарунок до кожного замовлення цього тижня!'
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => {
                      const updated = { ...designForm, promoText: tpl, promoActive: true };
                      setDesignForm(updated);
                      updateHeaderDesign(updated);
                      showToast('Застосовано швидкий шаблон промо-рядка!', 'success');
                    }}
                    className="px-3 py-1 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* Live Banner Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Вигляд промо-банера на сайті (Storefront Live Preview):</span>
                  {designForm.promoActive ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Банер активний
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Банер вимкнено</span>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden shadow-sm border border-orange-200">
                  <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white text-xs font-bold py-2.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden truncate">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
                      <span className="truncate">{designForm.promoText || 'Текст повідомлення на промо-банері...'}</span>
                    </div>
                    <span className="text-white/80 shrink-0 p-0.5 rounded hover:bg-white/10">
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Core Storefront Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>🚀 Ключові модулі вітрини та конверсії</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">6 модулів</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. Модуль онлайн-кошика та оформлення */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Онлайн-кошик та замовлення</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.ordersEnabled ?? true) ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {(siteSettings.features?.ordersEnabled ?? true) ? 'Кошик активний' : 'Режим каталогу'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Дозволяє клієнтам оформляти покупки онлайн. Якщо вимкнено — сайт працює як електронний каталог.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ ordersEnabled: !(siteSettings.features?.ordersEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.ordersEnabled ?? true) ? 'bg-sky-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.ordersEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 2. Особистий кабінет та бонуси */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Особистий кабінет та кешбек</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.loyaltyEnabled ?? true) ? 'bg-violet-100 text-violet-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(siteSettings.features?.loyaltyEnabled ?? true) ? 'Бонуси активні' : 'Вимкнено'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Вмикає нарахування кешбеку на баланс за покупки, історію замовлень та збереження профілю покупця.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ loyaltyEnabled: !(siteSettings.features?.loyaltyEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.loyaltyEnabled ?? true) ? 'bg-violet-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.loyaltyEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 3. Персональна знижка покупців */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Персональна знижка клієнтів</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.personalDiscountEnabled ?? true) ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(siteSettings.features?.personalDiscountEnabled ?? true) ? 'Знижки активні' : 'Вимкнено'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Дозволяє покупцям накопичувати та використовувати індивідуальні знижки в кошику за номером телефону або рівнем клієнта.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ personalDiscountEnabled: !(siteSettings.features?.personalDiscountEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.personalDiscountEnabled ?? true) ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.personalDiscountEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 4. Відгуки та оцінки покупців на сайті */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Відгуки покупців на сайті</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.reviewsEnabled ?? true) ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(siteSettings.features?.reviewsEnabled ?? true) ? 'Відгуки активні' : 'Вимкнено'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Показує блок реальних відгуків, рейтинг задоволеності покупців та форму додавання оцінки на головній сторінці.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ reviewsEnabled: !(siteSettings.features?.reviewsEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.reviewsEnabled ?? true) ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.reviewsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 5. Відображення точної кількості */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Точна кількість товару на складі</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.showExactStock ?? true) ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(siteSettings.features?.showExactStock ?? true) ? 'Видно залишок' : 'Тільки наявність'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Показувати покупцям конкретний залишок (напр. «В наявності: 15 шт.») замість звичайного «В наявності».
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ showExactStock: !(siteSettings.features?.showExactStock ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.showExactStock ?? true) ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.showExactStock ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 6. Плаваюча кнопка швидкого дзвінка */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-xs sm:text-sm font-bold text-slate-900">Плаваюча кнопка швидкого дзвінка</b>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          (siteSettings.features?.floatingCallBtn ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(siteSettings.features?.floatingCallBtn ?? true) ? 'Віджет увімкнено' : 'Приховано'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Показує круглу пульсуючу кнопку консультації у правому нижньому кутку сайту для швидкого дзвінка покупця.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ floatingCallBtn: !(siteSettings.features?.floatingCallBtn ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.floatingCallBtn ?? true) ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.floatingCallBtn ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dedicated Personal Discount & Loyalty Program Configuration */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-rose-50/90 via-white to-purple-50/50 border border-rose-200/90 rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-200/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-rose-950">
                      Налаштування персональних знижок та програми лояльності
                    </h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      (siteSettings.features?.personalDiscountEnabled ?? true) ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {(siteSettings.features?.personalDiscountEnabled ?? true) ? 'Модуль увімкнено' : 'Вимкнено'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Гнучкі правила нарахування індивідуальних знижок покупцям, накопичувальні рівні та сумісність із промокодами
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleTabChange('clients')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-rose-600" />
                  <span>База клієнтів ({Object.keys(clients).length})</span>
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </button>
              </div>
            </div>

            {/* Grid of Key Personal Discount Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              {/* 1. Default Personal Discount % */}
              <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                      Базовий % для нових клієнтів
                    </label>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {siteSettings.features?.defaultPersonalDiscountPercent ?? 3}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Автоматично призначається новому покупцеві при оформленні замовлення або реєстрації.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={siteSettings.features?.defaultPersonalDiscountPercent ?? 3}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') return;
                          const val = Math.max(0, Math.min(50, parseInt(raw, 10) || 0));
                          updateSiteFeatures({ defaultPersonalDiscountPercent: val });
                        }}
                        className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold font-mono text-center bg-white text-slate-900 text-sm shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-slate-400 font-bold">%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {[0, 3, 5, 7, 10].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateSiteFeatures({ defaultPersonalDiscountPercent: pct })}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            (siteSettings.features?.defaultPersonalDiscountPercent ?? 3) === pct
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Max Discount Limit (Safety Cap) */}
              <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      Максимальний ліміт знижки (%)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      макс. {siteSettings.features?.maxPersonalDiscountPercent ?? 20}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Захист маржинальності: знижка клієнта в кошику ніколи не перевищить цей поріг.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="70"
                        value={siteSettings.features?.maxPersonalDiscountPercent ?? 20}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') return;
                          const val = Math.max(5, Math.min(70, parseInt(raw, 10) || 5));
                          updateSiteFeatures({ maxPersonalDiscountPercent: val });
                        }}
                        className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold font-mono text-center bg-white text-slate-900 text-sm shadow-2xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-slate-400 font-bold">%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {[10, 15, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateSiteFeatures({ maxPersonalDiscountPercent: pct })}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            (siteSettings.features?.maxPersonalDiscountPercent ?? 20) === pct
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Min Order Sum for Personal Discount */}
              <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      Мін. сума кошика для знижки
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      {(siteSettings.features?.minOrderSumForPersonalDiscount ?? 0) > 0 
                        ? `від ${siteSettings.features?.minOrderSumForPersonalDiscount} грн` 
                        : 'Без обмежень'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Персональна знижка спрацьовує, якщо сума замовлення перевищує вказаний поріг.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={siteSettings.features?.minOrderSumForPersonalDiscount ?? 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') return;
                          const val = Math.max(0, parseInt(raw, 10) || 0);
                          updateSiteFeatures({ minOrderSumForPersonalDiscount: val });
                        }}
                        className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold font-mono text-center bg-white text-slate-900 text-sm shadow-2xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-slate-400 font-bold text-[11px]">грн</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {[0, 200, 500, 1000].map((sum) => (
                        <button
                          key={sum}
                          type="button"
                          onClick={() => updateSiteFeatures({ minOrderSumForPersonalDiscount: sum })}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            (siteSettings.features?.minOrderSumForPersonalDiscount ?? 0) === sum
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sum === 0 ? '0 грн' : `${sum}₴`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-row: Combine with Promo Codes + Cashback % */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Combine with promo codes toggle */}
              <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <b className="text-xs font-bold text-slate-900">Суміщення з промокодами</b>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      siteSettings.features?.combinePersonalDiscountWithPromo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {siteSettings.features?.combinePersonalDiscountWithPromo ? 'Сумувати знижки' : 'Обирати найбільшу'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {siteSettings.features?.combinePersonalDiscountWithPromo 
                      ? 'Персональна знижка клієнта та промокод підсумовуються (до макс. ліміту).' 
                      : 'Застосовується виключно вигідніша для покупця знижка (або персональна, або промокод).'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateSiteFeatures({ combinePersonalDiscountWithPromo: !siteSettings.features?.combinePersonalDiscountWithPromo })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                    siteSettings.features?.combinePersonalDiscountWithPromo ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      siteSettings.features?.combinePersonalDiscountWithPromo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Cashback % */}
              <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <b className="text-xs font-bold text-slate-900">Бонусний кешбек на баланс</b>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      +{siteSettings.features?.cashbackPercent ?? 2}% за кожну покупку
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Відсоток від суми замовлення повертається на особистий рахунок покупця для наступних оплат.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={siteSettings.features?.cashbackPercent ?? 2}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const val = Math.max(0, Math.min(30, parseInt(raw, 10) || 0));
                        updateSiteFeatures({ cashbackPercent: val });
                      }}
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg font-bold font-mono text-center bg-white text-slate-900 text-xs shadow-2xs outline-none focus:border-purple-500"
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2.3: Cumulative Loyalty Tier Levels Info */}
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h5 className="font-bold text-xs text-slate-900">
                    Накопичувальні дисконтні рівні покупців магазину
                  </h5>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Автоматичне підвищення знижки від суми покупок
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl border border-amber-200/70 bg-amber-50/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1">🥉 Бронза</span>
                    <span className="font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">{siteSettings.features?.defaultPersonalDiscountPercent ?? 3}%</span>
                  </div>
                  <p className="text-[10px] text-slate-500">При першому замовленні (від 0 грн)</p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">🥈 Срібло</span>
                    <span className="font-extrabold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">5%</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Сума замовлень від 3 000 грн</p>
                </div>

                <div className="p-2.5 rounded-xl border border-yellow-200/90 bg-yellow-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-yellow-900 flex items-center gap-1">🥇 Золото</span>
                    <span className="font-extrabold text-yellow-800 bg-yellow-100 px-1.5 py-0.5 rounded text-[11px]">7%</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Сума замовлень від 10 000 грн</p>
                </div>

                <div className="p-2.5 rounded-xl border border-purple-200/90 bg-purple-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1">💎 Платина / VIP</span>
                    <span className="font-extrabold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded text-[11px]">10%</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Сума замовлень від 25 000 грн</p>
                </div>
              </div>
            </div>

            {/* Live Interactive Simulator */}
            <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Інтерактивний симулятор розрахунку вигоди клієнта в кошику
                  </span>
                </div>
                <span className="text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/60">
                  ● Живий перерахунок
                </span>
              </div>

              {(() => {
                const testSum = 2000;
                const isPDEnabled = siteSettings.features?.personalDiscountEnabled ?? true;
                const minOrder = siteSettings.features?.minOrderSumForPersonalDiscount ?? 0;
                const maxCap = siteSettings.features?.maxPersonalDiscountPercent ?? 20;
                const basePct = isPDEnabled && testSum >= minOrder
                  ? Math.min(maxCap, siteSettings.features?.defaultPersonalDiscountPercent ?? 3)
                  : 0;
                const discountVal = (testSum * basePct) / 100;
                const toPay = testSum - discountVal;
                const isLoyaltyEnabled = siteSettings.features?.loyaltyEnabled ?? true;
                const cPct = isLoyaltyEnabled ? (siteSettings.features?.cashbackPercent ?? 2) : 0;
                const bonusVal = Math.round((toPay * cPct) / 100);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                    <div className="p-2.5 bg-slate-800/90 rounded-lg border border-slate-700/80">
                      <span className="text-[10px] text-slate-400 block">Сума замовлення:</span>
                      <span className="font-bold text-white text-sm">2 000.00 грн</span>
                    </div>
                    <div className="p-2.5 bg-rose-950/50 rounded-lg border border-rose-900/60">
                      <span className="text-[10px] text-rose-300 block">Персональна знижка ({basePct}%):</span>
                      <span className="font-bold text-rose-400 text-sm">-{discountVal.toFixed(2)} грн</span>
                    </div>
                    <div className="p-2.5 bg-emerald-950/50 rounded-lg border border-emerald-900/60">
                      <span className="text-[10px] text-emerald-300 block">Разом до сплати:</span>
                      <span className="font-black text-emerald-400 text-sm">{toPay.toFixed(2)} грн</span>
                    </div>
                    <div className="p-2.5 bg-purple-950/50 rounded-lg border border-purple-900/60">
                      <span className="text-[10px] text-purple-300 block">Бонусний кешбек (+{cPct}%):</span>
                      <span className="font-bold text-purple-400 text-sm">+{bonusVal} грн</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Section 2: Low Stock Dedicated Settings Card */}
          <div className="p-5 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                <span>Контроль критичних залишків на складі</span>
              </h4>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                Поточний поріг: {siteSettings.features?.lowStockThreshold ?? lowStockThreshold} шт.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Threshold controls */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">
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
                    className="w-24 px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono text-center bg-white text-slate-900 text-sm shadow-2xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setLowStockThreshold(num);
                          updateSiteFeatures({ lowStockThreshold: num });
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          (siteSettings.features?.lowStockThreshold ?? lowStockThreshold) === num
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <span className="text-slate-500 text-[11px] pl-1 font-medium">шт.</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Товари з кількістю від 0 до цього значення позначаються значком дефіциту в адмінці та враховуються у списку сповіщень.
                </p>
              </div>

              {/* Show badge to buyers preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Плашка дефіциту для покупців
                  </label>
                  <button
                    type="button"
                    onClick={() => updateSiteFeatures({ showLowStockBadgeToBuyers: !(siteSettings.features?.showLowStockBadgeToBuyers ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 ${
                      (siteSettings.features?.showLowStockBadgeToBuyers ?? true) ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (siteSettings.features?.showLowStockBadgeToBuyers ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Вигляд на картці товару:</span>
                  </div>
                  {(siteSettings.features?.showLowStockBadgeToBuyers ?? true) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                      <span>Закінчується! Залишилося {siteSettings.features?.lowStockThreshold ?? lowStockThreshold} шт.</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Плашку приховано</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Shipping Thresholds */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Параметри замовлення та безкоштовна доставка</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Мінімальна сума замовлення */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Мінімальна сума замовлення (грн)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={siteSettings.features?.minOrderSum ?? 50}
                    onChange={(e) => updateSiteFeatures({ minOrderSum: Number(e.target.value) || 0 })}
                    className="w-full pl-8 pr-12 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-400">
                    грн
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">Швидкий вибір:</span>
                  {[0, 50, 100, 200, 500].map((sum) => (
                    <button
                      key={sum}
                      type="button"
                      onClick={() => updateSiteFeatures({ minOrderSum: sum })}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        (siteSettings.features?.minOrderSum ?? 50) === sum
                          ? 'bg-slate-900 text-white'
                          : 'bg-white hover:bg-slate-200 border border-slate-200 text-slate-600'
                      }`}
                    >
                      {sum} грн
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Покупці не зможуть відправити замовлення, якщо сума їхнього кошика менша за це значення.
                </p>
              </div>

              {/* Поріг безкоштовної доставки */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Поріг безкоштовної доставки (грн)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={siteSettings.features?.freeShippingThreshold ?? 3000}
                    onChange={(e) => updateSiteFeatures({ freeShippingThreshold: Number(e.target.value) || 0 })}
                    className="w-full pl-8 pr-12 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-400">
                    грн
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">Швидкий вибір:</span>
                  {[1000, 2000, 3000, 5000].map((sum) => (
                    <button
                      key={sum}
                      type="button"
                      onClick={() => updateSiteFeatures({ freeShippingThreshold: sum })}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        (siteSettings.features?.freeShippingThreshold ?? 3000) === sum
                          ? 'bg-slate-900 text-white'
                          : 'bg-white hover:bg-slate-200 border border-slate-200 text-slate-600'
                      }`}
                    >
                      {sum} грн
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  При досягненні цієї суми в кошику вартість доставки автоматично стає безкоштовною.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Admin Password Security */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Lock className="w-4 h-4 text-orange-600" />
                <span>Безпека та пароль адміністратора</span>
              </h4>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Key className="w-3.5 h-3.5" />
                Синхронізація з Firebase
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Встановіть новий майстер-пароль для входу в панель керування. Він зберігається в захищеному сховищі бази даних Firebase Firestore.
            </p>

            <div className="flex flex-wrap items-center gap-2 max-w-md pt-1">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Введіть новий пароль адміністратора"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                disabled={isSavingPassword || !newPasswordInput}
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
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                {isSavingPassword ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>Оновити в базі</span>
              </button>
            </div>
          </div>

          {/* Sticky Floating Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>
                Активних модулів: <b className="text-emerald-400">{[
                  siteSettings.features?.ordersEnabled ?? true,
                  siteSettings.features?.loyaltyEnabled ?? true,
                  siteSettings.features?.reviewsEnabled ?? true,
                  siteSettings.features?.personalDiscountEnabled ?? true,
                  siteSettings.features?.showExactStock ?? true,
                  siteSettings.features?.floatingCallBtn ?? true,
                ].filter(Boolean).length} з 6</b>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                updateSiteSettings(siteSettings);
                showToast('Усі параметри функціоналу та модулів збережено в БД!', 'success');
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Зберегти налаштування модулів</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (() => {
        // --- 1. PERIOD FILTERING & CALCULATION ---
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

        const filteredOrders = orders.filter((o) => {
          if (analyticsPeriod === 'all') return true;
          // Attempt parsing order date
          let orderTime = 0;
          if (o.date) {
            const parts = o.date.split('.');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              orderTime = new Date(year, month, day).getTime();
            } else {
              orderTime = new Date(o.date).getTime();
            }
          }
          if (isNaN(orderTime) || orderTime <= 0) return true; // Include if date format unparsed

          if (analyticsPeriod === 'today') return orderTime >= startOfToday;
          if (analyticsPeriod === '7d') return orderTime >= sevenDaysAgo;
          if (analyticsPeriod === '30d') return orderTime >= thirtyDaysAgo;
          return true;
        });

        // Financial KPIs
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const completedOrders = filteredOrders.filter((o) => o.status === 'Доставлено' || o.status === 'Оплачено' || o.status === 'Відправлено');
        const completedRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingOrders = filteredOrders.filter((o) => o.status === 'Створено' || o.status === 'Збирається');
        const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const ordersCount = filteredOrders.length;
        const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
        
        // Total Items Sold in Filtered Orders
        let totalItemsSold = 0;
        const productSalesMap: Record<string, { qty: number; revenue: number; product?: Product }> = {};
        const categorySalesMap: Record<string, { revenue: number; count: number }> = {};

        filteredOrders.forEach((o) => {
          if (Array.isArray(o.items)) {
            o.items.forEach((item) => {
              const qty = item.qty || 1;
              const price = item.price || 0;
              const itemTotal = price * qty;
              totalItemsSold += qty;

              // Aggregate by Product
              const pId = item.name;
              if (!productSalesMap[pId]) {
                const foundProduct = products.find(p => p.name === item.name || (item.sku && p.sku === item.sku));
                productSalesMap[pId] = {
                  qty: 0,
                  revenue: 0,
                  product: foundProduct || {
                    id: 'p_' + pId,
                    name: item.name,
                    price: item.price,
                    image: item.image || '',
                    category: 'Товари',
                    badge: '',
                    sku: item.sku || '—',
                    desc: '',
                    stock: 10,
                    unit: item.unit || 'шт'
                  }
                };
              }
              productSalesMap[pId].qty += qty;
              productSalesMap[pId].revenue += itemTotal;

              // Aggregate by Category
              const cat = productSalesMap[pId].product?.category || 'Товари';
              if (!categorySalesMap[cat]) {
                categorySalesMap[cat] = { revenue: 0, count: 0 };
              }
              categorySalesMap[cat].revenue += itemTotal;
              categorySalesMap[cat].count += qty;
            });
          }
        });

        // Top Bestseller Products
        const sortedBestsellers = Object.values(productSalesMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6);

        // Top Categories
        const sortedCategories = Object.entries(categorySalesMap)
          .map(([name, data]) => ({
            name,
            revenue: data.revenue,
            count: data.count,
            percent: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
          }))
          .sort((a, b) => b.revenue - a.revenue);

        // Deliveries Breakdown
        const deliveryMap: Record<string, number> = {
          'Нова Пошта (Відділення)': 0,
          'Нова Пошта (Поштомат)': 0,
          'Укрпошта': 0,
          'Самовивіз': 0
        };
        filteredOrders.forEach((o) => {
          const d = o.delivery || '';
          if (d.includes('Поштомат')) deliveryMap['Нова Пошта (Поштомат)']++;
          else if (d.includes('Нова Пошта')) deliveryMap['Нова Пошта (Відділення)']++;
          else if (d.includes('Укрпошта')) deliveryMap['Укрпошта']++;
          else deliveryMap['Самовивіз']++;
        });

        // Payments Breakdown
        const paymentMap: Record<string, number> = {
          'Онлайн-оплата карткою': 0,
          'Післяплата (при отриманні)': 0,
          'Безготівковий розрахунок': 0
        };
        filteredOrders.forEach((o) => {
          const p = (o.paymentMethod || '') + ' ' + (o.delivery || '');
          if (o.paymentMethod === 'card_online' || p.includes('картк') || p.includes('LiqPay') || p.includes('Mono')) {
            paymentMap['Онлайн-оплата карткою']++;
          } else if (o.paymentMethod === 'bank_invoice' || p.includes('Безготівк') || p.includes('IBAN')) {
            paymentMap['Безготівковий розрахунок']++;
          } else {
            paymentMap['Післяплата (при отриманні)']++;
          }
        });

        // Client activity & bonuses
        const totalClientsCount = Object.keys(clients).length;
        const totalCashbackLiability = Object.values(clients).reduce((sum, c) => sum + (c.balance || 0), 0);

        // 14-Day Activity Bar Chart Data Generation
        const daysCount = 14;
        const dailyTimeline: Array<{ dayLabel: string; dateStr: string; revenue: number; ordersCount: number }> = [];
        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayFormatted = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
          const dateMatch = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          let dayRev = 0;
          let dayOrders = 0;
          orders.forEach((o) => {
            if (o.date && o.date.includes(dateMatch)) {
              dayRev += o.total || 0;
              dayOrders++;
            }
          });

          dailyTimeline.push({
            dayLabel: dayFormatted,
            dateStr: dateMatch,
            revenue: dayRev,
            ordersCount: dayOrders
          });
        }

        const maxDailyRev = Math.max(...dailyTimeline.map(t => t.revenue), 1000);

        return (
          <div className="space-y-6 max-w-6xl">
            
            {/* 1. Master Header Banner & Period Filter Bar */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/90 p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/30">
              {/* Background ambient light effects */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>⚡ Live Аналітика магазину ISKRA</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                      <Calendar className="w-3.5 h-3.5 text-teal-300" />
                      <span>{analyticsPeriod === 'today' ? 'За сьогодні' : analyticsPeriod === '7d' ? 'За останні 7 днів' : analyticsPeriod === '30d' ? 'За останні 30 днів' : 'За весь період'}</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-inner">
                      <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span>Аналітика продажів та активність магазину</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Загальний оборот, структура замовлень, середній чек, динаміка виручки, рейтинг хітів продажів та аналіз категорій у реальному часі.
                  </p>
                </div>

                {/* Period Segmented Switcher & Print Button */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-white/15 backdrop-blur-md shadow-inner">
                    {[
                      { id: 'today', label: 'Сьогодні' },
                      { id: '7d', label: '7 днів' },
                      { id: '30d', label: '30 днів' },
                      { id: 'all', label: 'Весь час' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAnalyticsPeriod(p.id as any)}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          analyticsPeriod === p.id
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl transition-all shadow-sm cursor-pointer flex items-center gap-2 text-xs font-bold backdrop-blur-md"
                    title="Роздрукувати аналітичний звіт"
                  >
                    <Printer className="w-4 h-4 text-emerald-300" />
                    <span className="hidden sm:inline">Друк звіту</span>
                  </button>
                </div>
              </div>

              {/* Quick Summary Sub-Bar */}
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 relative z-10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Враховано замовлень у вибірці: <strong className="text-white font-mono font-bold">{ordersCount} шт.</strong></span>
                  <span>·</span>
                  <span>Товарів продано: <strong className="text-amber-300 font-mono font-bold">{totalItemsSold} од.</strong></span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    Оплачено/Виконано: <strong className="font-mono">{completedRevenue.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн</strong>
                  </span>
                  {pendingRevenue > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      В обробці: <strong className="font-mono">{pendingRevenue.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Primary KPI Executive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Revenue */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Загальний Оборот
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight font-mono tracking-tight">
                      {totalRevenue.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-sm font-bold text-slate-500 ml-1">грн</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Виконані замовлення:</span>
                  <span className="font-bold text-emerald-600 font-mono">{completedOrders.length} / {ordersCount}</span>
                </div>
              </div>

              {/* Card 2: Orders Count */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-orange-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Кількість Замовлень
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight font-mono tracking-tight">
                      {ordersCount}
                      <span className="text-sm font-bold text-slate-500 ml-1">замовл.</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100 shadow-2xs">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Продано товарів:</span>
                  <span className="font-bold text-orange-600 font-mono">{totalItemsSold} од.</span>
                </div>
              </div>

              {/* Card 3: Average Order Value (AOV) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-sky-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Середній Чек (AOV)
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight font-mono tracking-tight">
                      {avgOrderValue.toFixed(2)}
                      <span className="text-sm font-bold text-slate-500 ml-1">грн</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Каталог товарів:</span>
                  <span className="font-bold text-sky-600 font-mono">{products.length} позицій</span>
                </div>
              </div>

              {/* Card 4: Clients & Loyalty Program */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-purple-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      База Клієнтів
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight font-mono tracking-tight">
                      {totalClientsCount}
                      <span className="text-sm font-bold text-slate-500 ml-1">покупців</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Баланс кешбеку:</span>
                  <span className="font-bold text-purple-600 font-mono">{totalCashbackLiability.toFixed(2)} грн</span>
                </div>
              </div>
            </div>

            {/* 3. Visual 14-Day Activity & Sales Bar Chart */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    <span>Динаміка виручки та активності за останні 14 днів</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Щоденний обсяг продажів та кількість оформлених замовлень
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <span className="w-3 h-3 rounded-md bg-gradient-to-t from-emerald-600 to-teal-400 shadow-2xs" />
                    <span>Виручка (грн)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>Замовлення</span>
                  </div>
                </div>
              </div>

              {/* Interactive Bar Chart Strip */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-14 gap-1.5 sm:gap-3 items-end h-48 sm:h-56 px-1">
                  {dailyTimeline.map((item, idx) => {
                    const heightPercent = maxDailyRev > 0 ? Math.min(100, Math.max(6, Math.round((item.revenue / maxDailyRev) * 100))) : 6;
                    const isToday = idx === dailyTimeline.length - 1;

                    return (
                      <div
                        key={item.dateStr + idx}
                        className="flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform -translate-y-1 bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap">
                          <div>{item.dayLabel}: <b className="text-emerald-400 font-mono">{item.revenue.toFixed(2)} грн</b></div>
                          <div className="text-[10px] text-slate-300">{item.ordersCount} замовлень</div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-2 transform translate-y-1" />
                        </div>

                        {/* Top dot for orders count */}
                        {item.ordersCount > 0 && (
                          <span className="text-[10px] font-mono font-bold text-orange-600 mb-1 opacity-90 group-hover:opacity-100">
                            {item.ordersCount}
                          </span>
                        )}

                        {/* Bar Pillar */}
                        <div className="w-full max-w-[36px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end transition-all group-hover:bg-slate-200">
                          <div
                            className={`w-full rounded-t-xl transition-all duration-500 ${
                              item.revenue > 0
                                ? isToday
                                  ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-sm'
                                  : 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300'
                                : 'bg-slate-200'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        {/* Date Label */}
                        <div className="mt-2 text-center">
                          <span className={`text-[10px] sm:text-[11px] font-mono font-bold block truncate max-w-[40px] ${
                            isToday ? 'text-emerald-700' : 'text-slate-500'
                          }`}>
                            {isToday ? 'Сьогодні' : item.dayLabel.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Two-Column Deep Breakdown: Categories & Status Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Col: Category Share & Leaderboard */}
              <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Частка категорій у продажах</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">За вибіркою</span>
                </div>

                {sortedCategories.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {sortedCategories.map((cat, idx) => {
                      const colors = [
                        'bg-amber-500',
                        'bg-emerald-500',
                        'bg-sky-500',
                        'bg-purple-500',
                        'bg-orange-500',
                        'bg-indigo-500',
                        'bg-teal-500'
                      ];
                      const color = colors[idx % colors.length];

                      return (
                        <div key={cat.name} className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate max-w-[200px]">
                              {cat.name}
                            </span>
                            <div className="text-right font-mono">
                              <span className="font-bold text-slate-900">{cat.revenue.toFixed(2)} грн</span>
                              <span className="text-slate-400 ml-1.5 font-medium">({cat.percent}%)</span>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(4, cat.percent)}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
                            <span>{cat.count} од. продано</span>
                            <span>{cat.percent}% від обороту</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Немає даних про продажі категорій за вибраний період
                  </div>
                )}
              </div>

              {/* Right Col: Order Status Funnel & Payment/Delivery */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Status Pipeline Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <span>Воронка статусів замовлень</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-mono font-bold">Всього: {ordersCount}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { status: 'Створено', color: 'bg-amber-50 border-amber-200 text-amber-900', barColor: 'bg-amber-500', icon: Clock },
                      { status: 'Оплачено', color: 'bg-emerald-50 border-emerald-200 text-emerald-900', barColor: 'bg-emerald-500', icon: CheckCircle2 },
                      { status: 'Збирається', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', barColor: 'bg-indigo-500', icon: Package },
                      { status: 'Відправлено', color: 'bg-sky-50 border-sky-200 text-sky-900', barColor: 'bg-sky-500', icon: Truck },
                      { status: 'Доставлено', color: 'bg-teal-50 border-teal-200 text-teal-900', barColor: 'bg-teal-600', icon: Award },
                      { status: 'Скасовано', color: 'bg-rose-50 border-rose-200 text-rose-900', barColor: 'bg-rose-500', icon: AlertTriangle }
                    ].map((item) => {
                      const stOrders = filteredOrders.filter(o => o.status === item.status);
                      const stCount = stOrders.length;
                      const stSum = stOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                      const stPercent = ordersCount > 0 ? Math.round((stCount / ordersCount) * 100) : 0;
                      const IconComp = item.icon;

                      return (
                        <div key={item.status} className={`p-3 rounded-2xl border ${item.color} flex flex-col justify-between space-y-2 shadow-2xs`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold">
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.status}</span>
                            </div>
                            <span className="font-black text-sm font-mono">{stCount}</span>
                          </div>

                          <div>
                            <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mb-1">
                              <div className={`h-full ${item.barColor} rounded-full`} style={{ width: `${stPercent}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
                              <span>{stPercent}%</span>
                              <span className="font-bold">{stSum.toFixed(2)} грн</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery & Payment Distribution Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>Служби доставки та способи оплати</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Delivery List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Доставка:
                      </span>
                      {Object.entries(deliveryMap).map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-700 truncate pr-2 font-medium">{name}</span>
                          <span className="font-bold text-slate-900 shrink-0 font-mono">{count}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Оплата:
                      </span>
                      {Object.entries(paymentMap).map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-700 truncate pr-2 font-medium">{name}</span>
                          <span className="font-bold text-slate-900 shrink-0 font-mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 5. Top Bestsellers Leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs border border-orange-200">
                    <Flame className="w-5 h-5 fill-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      Хіти продажів та найпопулярніші товари (Leaderboard)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Товари, які генерують найбільшу виручку та обсяг замовлень
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTabChange('products')}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200"
                >
                  <span>Весь каталог товарів</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {sortedBestsellers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Ранг</th>
                        <th className="py-2.5 px-3">Товар</th>
                        <th className="py-2.5 px-3">Категорія</th>
                        <th className="py-2.5 px-3 text-right">Ціна за од.</th>
                        <th className="py-2.5 px-3 text-center">Продано</th>
                        <th className="py-2.5 px-3 text-right">Сума продажів</th>
                        <th className="py-2.5 px-3 text-right">Залишок</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedBestsellers.map((item, idx) => {
                        const p = item.product;
                        const rankColors = [
                          'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs',
                          'bg-slate-200 text-slate-800 border-slate-300 font-bold',
                          'bg-orange-100 text-orange-900 border-orange-300 font-bold'
                        ];
                        const rankBadge = rankColors[idx] || 'bg-slate-50 text-slate-600 border-slate-200 font-medium';

                        return (
                          <tr key={p?.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            {/* Rank */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs border ${rankBadge}`}>
                                #{idx + 1}
                              </span>
                            </td>

                            {/* Product Info */}
                            <td className="py-3 px-3 min-w-[220px]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p?.image ? (
                                    <img src={getSafeImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate max-w-[280px]">
                                    {p?.name || 'Товар'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Арт: {p?.sku || p?.id || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                              {p?.category || '—'}
                            </td>

                            {/* Unit Price */}
                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {p?.price?.toFixed(2) || '0.00'} грн
                            </td>

                            {/* Qty Sold */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                                <Zap className="w-3 h-3 text-orange-500 fill-current" />
                                {item.qty} {p?.unit || 'од.'}
                              </span>
                            </td>

                            {/* Total Revenue */}
                            <td className="py-3 px-3 text-right font-black font-mono text-emerald-600 text-sm whitespace-nowrap">
                              {item.revenue.toFixed(2)} грн
                            </td>

                            {/* Stock */}
                            <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                              {p && (
                                <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-[11px] ${
                                  p.stock <= 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : p.stock <= 3
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {p.stock} {p.unit || 'од.'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Замовлень із товарами у вибраний період не знайдено
                </div>
              )}
            </div>

            {/* 6. Live Transactions & Customer Activity Feed */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <span>Останні замовлення та активність покупців</span>
                </h4>

                <button
                  type="button"
                  onClick={() => handleTabChange('orders')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
                >
                  <span>Усі замовлення ({orders.length})</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {orders.slice(0, 7).map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setEditingOrder(o);
                      handleTabChange('orders');
                    }}
                    className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-600 flex items-center justify-center font-black font-mono text-xs shrink-0 transition-colors shadow-2xs">
                        #{o.id.slice(-4)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {o.fio} <span className="font-mono text-slate-400 font-normal">({o.phone})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2 font-medium">
                          <span>{o.date}</span>
                          <span>·</span>
                          <span>{o.delivery || 'Самовивіз'}</span>
                          {o.items && (
                            <>
                              <span>·</span>
                              <span>{o.items.length} поз.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                      <span className={`px-3 py-1 rounded-xl text-[11px] font-bold ${
                        o.status === 'Доставлено' || o.status === 'Оплачено'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : o.status === 'Відправлено'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : o.status === 'Збирається'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {o.status}
                      </span>
                      <span className="font-black text-slate-900 text-sm font-mono">
                        {o.total?.toFixed(2)} грн
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
          
          {/* Master Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30">
            {/* Ambient Background Lights */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>📦 Управління каталогом ISKRA</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Швидке редагування цін та залишків</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
                    <Package className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <span>Каталог товарів та складський облік</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Повний облік асортименту, масове коригування цін, автоматична класифікація за категоріями, контроль критичних залишків та синхронізація з УкрСклад.
                </p>
              </div>

              {/* Stat Badges Grid */}
              <div className="grid grid-cols-2 gap-3 shrink-0 min-w-[280px]">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg hover:border-slate-700 transition-all">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всього товарів</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">{products.length}</div>
                </div>

                <div className="bg-emerald-500/15 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg hover:border-emerald-500/50 transition-all">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">В наявності</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tabular-nums">{products.filter(p => p.stock > 0).length}</div>
                </div>

                <div className="bg-amber-500/15 backdrop-blur-md p-4 rounded-2xl border border-amber-500/30 shadow-lg hover:border-amber-500/50 transition-all">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Критичні
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tabular-nums">{lowStockCount}</div>
                </div>

                <div className="bg-rose-500/15 backdrop-blur-md p-4 rounded-2xl border border-rose-500/30 shadow-lg hover:border-rose-500/50 transition-all">
                  <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Відсутні</div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1 font-mono tabular-nums">{outOfStockCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Warning Alert Card */}
          {totalCriticalStockCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-sm animate-in fade-in space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>Сповіщення про залишки: товари закінчуються на складі!</span>
                      <span className="bg-amber-500 text-slate-950 text-xs font-black px-3 py-0.5 rounded-full font-mono">
                        {totalCriticalStockCount} {getUkPositionsWord(totalCriticalStockCount)}
                      </span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                      Критичний залишок (&le; {lowStockThreshold} шт.): <b className="text-amber-900">{lowStockCount} {lowStockCount % 10 === 1 && lowStockCount % 100 !== 11 ? 'позиція' : lowStockCount % 10 >= 2 && lowStockCount % 10 <= 4 && (lowStockCount % 100 < 10 || lowStockCount % 100 >= 20) ? 'позиції' : 'позицій'}</b>
                      {outOfStockCount > 0 && <span> • Повністю відсутні: <b className="text-rose-700">{outOfStockCount} {outOfStockCount % 10 === 1 && outOfStockCount % 100 !== 11 ? 'позиція' : outOfStockCount % 10 >= 2 && outOfStockCount % 10 <= 4 && (outOfStockCount % 100 < 10 || outOfStockCount % 100 >= 20) ? 'позиції' : 'позицій'}</b></span>}
                    </p>
                  </div>
                </div>

                {/* Threshold Switcher */}
                <div className="flex items-center gap-1.5 self-start lg:self-auto bg-white/90 p-1.5 rounded-2xl border border-amber-200 text-xs shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 pl-2">Поріг:</span>
                  {[1, 2, 3, 5, 10].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setLowStockThreshold(t);
                        updateSiteFeatures({ lowStockThreshold: t });
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        lowStockThreshold === t
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t} шт.
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Low Stock */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setProductFilterStock(productFilterStock === 'low_stock' ? 'all' : 'low_stock')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                    productFilterStock === 'low_stock'
                      ? 'bg-amber-600 text-white shadow-sm'
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
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Завантажити таблицю Excel/CSV для замовлення у постачальника"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Заявка постачальнику (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={printProcurementList}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Роздрукувати відомість на поповнення складу"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Друк відомості</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Action bar & Filters Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl w-full">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Шукати за назвою або артикулом..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium bg-slate-50 focus:bg-white"
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
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-2xl transition-all shadow-sm flex items-center gap-2 cursor-pointer border border-amber-600/30"
                  title="Синхронізація з програмою УкрСклад на ноутбуці"
                >
                  <Building2 className="w-4 h-4 text-slate-950" />
                  <span>Синхронізація УкрСклад</span>
                </button>

                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>+ Додати товар</span>
                </button>

                <button
                  type="button"
                  onClick={() => autoClassifyProducts()}
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
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
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
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
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Фото</th>
                  <th className="py-3.5 px-4">Назва / Категорія</th>
                  <th className="py-3.5 px-4">Артикул</th>
                  <th className="py-3.5 px-4">Склад</th>
                  <th className="py-3.5 px-4">Ціна (грн)</th>
                  <th className="py-3.5 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-amber-50/50' : ''}`}>
                    <td className="py-3 px-4 w-10 text-center">
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
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
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
      {activeTab === 'orders' && (() => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const paidOrders = orders.filter((o) => o.isPaid === true);
        const paidRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const createdCount = orders.filter((o) => o.status === 'Створено').length;
        const assemblingCount = orders.filter((o) => o.status === 'Збирається').length;
        const transitCount = orders.filter((o) => o.status === 'Відправлено').length;
        const deliveredCount = orders.filter((o) => o.status === 'Доставлено').length;

        const filteredOrders = orders.filter((o) => {
          const matchQ =
            !orderSearch ||
            o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.fio.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.phone.toLowerCase().includes(orderSearch.toLowerCase()) ||
            (o.ttn && o.ttn.includes(orderSearch));
          const matchStatus = orderFilterStatus === 'all' || o.status === orderFilterStatus;
          const isPaid = o.isPaid === true;
          const matchPayment =
            orderPaymentFilter === 'all'
              ? true
              : orderPaymentFilter === 'paid'
              ? isPaid
              : !isPaid;

          return matchQ && matchStatus && matchPayment;
        });

        const safeClients = clients || {};

        return (
          <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
            
            {/* Master Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30">
              {/* Ambient Glows */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>📦 Замовлення & Комплектація ISKRA</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Авто-трекінг ТТН Нової Пошти</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
                      <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span>Управління замовленнями покупців</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Повний цикл обробки: комплектація товарів, роздруківка товарних чеків, підтвердження платежів та синхронізація статусів посилок Нової Пошти.
                  </p>
                </div>

                {/* KPI Stat Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0 min-w-[320px]">
                  <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg hover:border-slate-700 transition-all">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всього замовлень</div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">{totalOrders}</div>
                  </div>

                  <div className="bg-emerald-500/15 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg hover:border-emerald-500/50 transition-all">
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Загальний оборот</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tabular-nums">
                      {totalRevenue.toLocaleString('uk-UA')} <span className="text-xs text-emerald-300 font-normal">грн</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/15 backdrop-blur-md p-4 rounded-2xl border border-amber-500/30 shadow-lg hover:border-amber-500/50 transition-all">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      Оплачено
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tabular-nums">
                      {paidOrders.length} <span className="text-xs text-amber-300 font-normal">({paidRevenue.toLocaleString('uk-UA')} грн)</span>
                    </div>
                  </div>

                  <div className="bg-sky-500/15 backdrop-blur-md p-4 rounded-2xl border border-sky-500/30 shadow-lg hover:border-sky-500/50 transition-all">
                    <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      В роботі
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-sky-300 mt-1 font-mono tabular-nums">{createdCount + assemblingCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar & Quick Status Tabs */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              {/* Quick Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setOrderFilterStatus('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    orderFilterStatus === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>Всі замовлення</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${orderFilterStatus === 'all' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                    {totalOrders}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterStatus('Створено')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    orderFilterStatus === 'Створено'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-sky-50 text-sky-800 border border-sky-200/80 hover:bg-sky-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Оформлено</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">{createdCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterStatus('Збирається')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    orderFilterStatus === 'Збирається'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>2. Комплектується</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">{assemblingCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterStatus('Відправлено')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    orderFilterStatus === 'Відправлено'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>3. В дорозі</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">{transitCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterStatus('Доставлено')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    orderFilterStatus === 'Доставлено'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>4. Доставлено</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">{deliveredCount}</span>
                </button>
              </div>

              {/* Search & Actions Control Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Пошук за № замовлення, ПІБ, телефоном або ТТН..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium bg-slate-50 focus:bg-white"
                    />
                    {orderSearch && (
                      <button
                        type="button"
                        onClick={() => setOrderSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Payment Filter Selector */}
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value as any)}
                    className="px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 focus:bg-white text-slate-800 font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <option value="all">Всі статуси оплати</option>
                    <option value="paid">✓ Тільки оплачені ({paidOrders.length})</option>
                    <option value="unpaid">Очікують оплати ({totalOrders - paidOrders.length})</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                          showToast(`Синхронізація успішна! Оновлено ${updatedCount} замовлень до «Доставлено» та підтверджено оплату`, 'success');
                        } else {
                          showToast(`Перевірено ${activeWithTtn.length} ТТН: всі статуси актуальні`, 'success');
                        }
                      } finally {
                        setIsSyncingTTN(false);
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    title="Автоматично перевірити всі активні ТТН через офіційне API Нової Пошти"
                  >
                    <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncingTTN ? 'animate-spin' : ''}`} />
                    <span>{isSyncingTTN ? 'Синхронізація...' : 'Перевірити ТТН Нова Пошта'}</span>
                  </button>

                  {confirmClearAllOrders ? (
                    <div className="flex items-center gap-2 animate-in fade-in bg-rose-50 border border-rose-200 p-1.5 rounded-2xl">
                      <span className="text-xs text-rose-700 font-bold pl-1">Очистити все?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearAllOrders();
                          setConfirmClearAllOrders(false);
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Так
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllOrders(false)}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                      >
                        Ні
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAllOrders(true)}
                      className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2.5 rounded-2xl transition-colors cursor-pointer"
                    >
                      Очистити замовлення
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Orders List / Empty State */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="text-base font-black text-slate-700">Замовлень не знайдено</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    За вашим запитом або обраними фільтрами замовлення відсутні. Спробуйте скинути фільтр.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearch('');
                      setOrderFilterStatus('all');
                      setOrderPaymentFilter('all');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Скинути всі фільтри</span>
                  </button>
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isPaid = o.isPaid === true;
                  const isCashOnDelivery = o.paymentMethod === 'cash_on_delivery';

                  return (
                    <div key={o.id} className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 text-xs space-y-5 shadow-sm hover:border-amber-300/80 transition-all hover:shadow-md">
                      {/* 1. Header with Order ID and Quick Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 font-black text-sm flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs">
                            #{o.id.slice(-3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 font-display text-base tracking-tight">
                                Замовлення №{o.id}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                                {o.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Покупець: <b className="text-slate-900 font-bold">{o.fio}</b> ({o.phone})
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Edit order button */}
                          <button
                            type="button"
                            onClick={() => setEditingOrder({ ...o, items: o.items.map(it => ({ ...it })) })}
                            className="px-3.5 py-2 text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Редагувати складові замовлення"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                            <span>Редагувати</span>
                          </button>

                          {/* Print order slip */}
                          <button
                            type="button"
                            onClick={() => printOrderSlip(o)}
                            className="px-3.5 py-2 text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Друкувати товарний чек для покупця"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Чек</span>
                          </button>

                          {/* Main Status Dropdown */}
                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="px-3.5 py-2 rounded-2xl border border-slate-300 font-black bg-slate-900 text-white outline-none cursor-pointer text-xs shadow-2xs focus:ring-2 focus:ring-amber-500/30"
                          >
                            <option value="Створено">1. Оформлено</option>
                            <option value="Збирається">2. Комплектується</option>
                            <option value="Відправлено">3. В дорозі</option>
                            <option value="Доставлено">4. Доставлено</option>
                            <option value="Оплачено">Оплачено (Очікує збирання)</option>
                          </select>

                          {/* Safe Delete order button */}
                          {orderToDelete === o.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in bg-rose-50 p-1 rounded-2xl border border-rose-200">
                              <span className="text-[11px] font-bold text-rose-700 pl-1">Видалити?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteOrder(o.id);
                                  setOrderToDelete(null);
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Так
                              </button>
                              <button
                                type="button"
                                onClick={() => setOrderToDelete(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded-xl text-[11px] font-medium cursor-pointer"
                              >
                                Ні
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(o.id)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer"
                              title="Видалити замовлення з бази"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Visual 5-Stage Interactive Pipeline */}
                      <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px] mb-2.5">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Етап виконання замовлення:</span>
                          </span>
                          <span className="font-semibold text-slate-600">
                            Поточний статус: <b className="text-slate-900 font-extrabold">{o.status}</b>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center text-[10px]">
                          {/* 1. Оформлено */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Створено')}
                            className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                              o.status === 'Створено' 
                                ? 'bg-sky-50 border-sky-400 text-sky-900 font-black ring-2 ring-sky-100 shadow-2xs'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                            }`}
                            title="Встановити статус: Створено (Оформлено)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate w-full">1. Оформлено</span>
                            <span className="text-[9px] opacity-75">{o.status === 'Створено' ? 'Поточний' : '✓ Прийнято'}</span>
                          </button>

                          {/* 2. Оплата */}
                          <div className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black ring-2 ring-emerald-100'
                              : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          }`}>
                            {isCashOnDelivery ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                            <span className="truncate w-full">2. Оплата</span>
                            <span className="text-[9px] truncate w-full">
                              {isPaid ? '✓ Сплачено' : isCashOnDelivery ? 'Наложка' : 'Очікує'}
                            </span>
                          </div>

                          {/* 3. Комплектується */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Збирається')}
                            className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Збирається'
                                ? 'bg-amber-50 border-amber-400 text-amber-900 font-black ring-2 ring-amber-100 shadow-2xs'
                                : ['Відправлено', 'Доставлено'].includes(o.status)
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="Встановити статус: Збирається (Комплектується)"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span className="truncate w-full">3. Комплектується</span>
                            <span className="text-[9px] truncate w-full">
                              {o.status === 'Збирається' ? 'В процесі' : ['Відправлено', 'Доставлено'].includes(o.status) ? '✓ Зібрано' : 'Очікує'}
                            </span>
                          </button>

                          {/* 4. В дорозі */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Відправлено')}
                            className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Відправлено'
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-black ring-2 ring-blue-100 shadow-2xs'
                                : o.status === 'Доставлено'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="Встановити статус: Відправлено (В дорозі)"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span className="truncate w-full">4. В дорозі</span>
                            <span className="text-[9px] truncate w-full">
                              {o.status === 'Відправлено' ? 'В дорозі' : o.status === 'Доставлено' ? '✓ Пройдено' : 'Очікує'}
                            </span>
                          </button>

                          {/* 5. Доставлено */}
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(o.id, 'Доставлено')}
                            className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-102 ${
                              o.status === 'Доставлено'
                                ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-200 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-700'
                            }`}
                            title="Встановити статус: Доставлено (Отримано покупцем)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="truncate w-full">5. Доставлено</span>
                            <span className="text-[9px] truncate w-full">{o.status === 'Доставлено' ? '✓ Отримано' : 'Завершити'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 3. Customer Info, Delivery Details & Prominent Payment Actions */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left column: Recipient Details */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-800">
                              <b>Клієнт:</b> <span className="font-bold text-slate-900">{o.fio}</span>
                            </p>
                            {/* Quick Client Card Trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                const existing = safeClients[o.phone] || {
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
                                  isNew: !safeClients[o.phone]
                                });
                                setClientModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                              title="Відкрити картку покупця у базі клієнтів"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Картка клієнта</span>
                            </button>
                          </div>

                          <p className="flex items-center gap-2">
                            <b>Телефон:</b>{' '}
                            <a href={`tel:${o.phone}`} className="text-amber-600 font-bold hover:underline font-mono">
                              {o.phone}
                            </a>
                            <a
                              href={`viber://chat?number=%2B380${extractLocalPhoneDigits(o.phone)}`}
                              className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                              title="Написати у Viber"
                            >
                              <span>Viber</span>
                            </a>
                          </p>
                          {o.city && (
                            <p className="text-slate-700"><b>Місто:</b> {o.city}</p>
                          )}
                          <p className="text-slate-700"><b>Доставка:</b> {o.delivery}</p>
                          <p className="text-slate-700">
                            <b>Спосіб оплати:</b>{' '}
                            <span className="font-semibold text-slate-900">
                              {o.paymentMethod === 'cash_on_delivery' && 'Накладений платіж (післяплата)'}
                              {o.paymentMethod === 'card_online' && 'Оплата карткою онлайн'}
                              {o.paymentMethod === 'bank_invoice' && 'Безготівковий розрахунок (IBAN)'}
                            </span>
                          </p>

                          {/* DEDICATED PROMINENT PAYMENT STATUS BANNER */}
                          <div className="pt-1">
                            {isPaid ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black tracking-tight text-emerald-900 flex items-center gap-1.5">
                                      <span>ОПЛАЧЕНО 100%</span>
                                      <span className="text-[11px] font-medium text-emerald-700">
                                        ({o.paymentProvider || (o.paymentMethod === 'card_online' ? 'Автоматичний онлайн-еквайринг' : isCashOnDelivery ? 'Накладений платіж отримано' : 'Рахунок IBAN')})
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
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
                                  className="text-[11px] text-slate-500 hover:text-rose-600 underline font-semibold transition-colors cursor-pointer ml-auto"
                                  title="Скасувати статус оплати"
                                >
                                  Скасувати
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-2xs">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0">
                                    <Clock className="w-4 h-4 stroke-[2.5]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-extrabold text-amber-950">
                                      {isCashOnDelivery 
                                        ? 'Накладений платіж (Очікує видачі)' 
                                        : o.paymentMethod === 'bank_invoice' 
                                        ? 'Рахунок IBAN (Очікує переказу)' 
                                        : 'Очікує онлайн-оплати'}
                                    </div>
                                    <div className="text-[10px] text-amber-800 mt-0.5">
                                      Сума до сплати: <b>{o.total.toFixed(2)} грн</b>
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
                                      `Замовлення №${o.id}: оплату підтверджено!`,
                                      'success'
                                    );
                                  }}
                                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-black shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
                                  title="Підтвердити оплату замовлення"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  <span>Позначити як ОПЛАЧЕНО</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-600 font-medium">Загальна вартість замовлення:</span>
                            <span className="text-emerald-700 font-black text-base font-mono tabular-nums">
                              {o.total.toFixed(2)} грн
                            </span>
                          </div>

                          {o.notes && (
                            <p className="text-[11px] text-slate-700 bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-2xl">
                              <b>Коментар до замовлення:</b> {o.notes}
                            </p>
                          )}
                        </div>

                        {/* Right column: TTN Management and Live Tracking */}
                        <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 self-start">
                          <label className="block text-[11px] font-bold text-slate-800">
                            Номер ТТН (Нова Пошта):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue={o.ttn || ''}
                              id={`ttn-input-${o.id}`}
                              placeholder="напр., 20450891234567"
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-amber-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (document.getElementById(`ttn-input-${o.id}`) as HTMLInputElement)?.value;
                                updateOrderTtn(o.id, (val || '').trim());
                              }}
                              className="px-3.5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-2xs"
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

                      {/* 4. Ordered Items Breakdown Table */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-amber-600" />
                            <span>Товари у замовленні ({o.items?.length || 0}):</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Сума товарів: <b className="text-slate-900">{o.total.toFixed(2)} грн</b>
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {o.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-colors">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>{item.name}</span>
                              </div>
                              <div className="font-mono font-bold text-slate-700 text-xs">
                                <span>{item.qty} {formatUnit(item.unit)}</span> × <span>{item.price} грн</span> = <b className="text-slate-900">{(item.qty * item.price).toFixed(2)} грн</b>
                              </div>
                            </div>
                          ))}
                        </div>
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
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
                        <Pencil className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 font-display">
                          Редагування замовлення №{editingOrder.id}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Дата оформлення: {editingOrder.date}
                        </p>
                      </div>
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
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600" />
                        <span>Дані отримувача та доставка</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            ПІБ отримувача *
                          </label>
                          <input
                            type="text"
                            required
                            value={editingOrder.fio}
                            onChange={(e) => setEditingOrder({ ...editingOrder, fio: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-amber-500 font-medium bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Номер телефону *
                          </label>
                          <input
                            type="tel"
                            required
                            value={editingOrder.phone}
                            onChange={(e) => setEditingOrder({ ...editingOrder, phone: formatUkrainianPhone(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-amber-500 font-mono bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Місто
                          </label>
                          <input
                            type="text"
                            value={editingOrder.city || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, city: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Адреса / Відділення Нової Пошти
                          </label>
                          <input
                            type="text"
                            value={editingOrder.delivery || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, delivery: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status & Payment Method */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-amber-600" />
                        <span>Параметри оплати, ТТН та нотатки</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Статус замовлення
                          </label>
                          <select
                            value={editingOrder.status}
                            onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as OrderStatus })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 outline-none focus:border-amber-500"
                          >
                            <option value="Створено">1. Оформлено</option>
                            <option value="Збирається">2. Комплектується</option>
                            <option value="Відправлено">3. В дорозі</option>
                            <option value="Доставлено">4. Доставлено</option>
                            <option value="Оплачено">Оплачено</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Номер ТТН (Нова Пошта)
                          </label>
                          <input
                            type="text"
                            placeholder="20450..."
                            value={editingOrder.ttn || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, ttn: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Спосіб оплати
                          </label>
                          <select
                            value={editingOrder.paymentMethod || 'cash_on_delivery'}
                            onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:border-amber-500"
                          >
                            <option value="cash_on_delivery">Накладений платіж</option>
                            <option value="card_online">Оплата карткою онлайн</option>
                            <option value="bank_invoice">Безготівка (IBAN)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Коментар менеджера / Примітка
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Примітки до замовлення..."
                          value={editingOrder.notes || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Order Items Table in Edit Modal */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-amber-600" />
                          <span>Товари в замовленні ({editingOrder.items.length})</span>
                        </h4>
                        <span className="font-mono font-black text-emerald-700 text-xs">
                          Всього: {editingOrder.items.reduce((s, it) => s + (it.price * it.qty), 0).toFixed(2)} грн
                        </span>
                      </div>

                      <div className="space-y-2">
                        {editingOrder.items.map((item, idx) => (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-900 flex-1 min-w-[140px]">{item.name}</span>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  const updatedItems = [...editingOrder.items];
                                  updatedItems[idx].qty = val;
                                  setEditingOrder({ ...editingOrder, items: updatedItems });
                                }}
                                className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-mono font-bold"
                              />
                              <span className="text-slate-500 font-semibold">{formatUnit(item.unit)}</span>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  const updatedItems = [...editingOrder.items];
                                  updatedItems[idx].price = val;
                                  setEditingOrder({ ...editingOrder, items: updatedItems });
                                }}
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-mono font-bold text-emerald-700"
                              />
                              <span className="text-slate-500 font-bold">грн</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = editingOrder.items.filter((_, i) => i !== idx);
                                  setEditingOrder({ ...editingOrder, items: updatedItems });
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                title="Видалити товар із замовлення"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add item from catalog */}
                      <div className="pt-2 flex items-center gap-2">
                        <select
                          value={addOrderItemId}
                          onChange={(e) => setAddOrderItemId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs outline-none focus:border-amber-500"
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
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs cursor-pointer shrink-0"
                        >
                          + Додати товар
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingOrder(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-2xl shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                      >
                        Зберегти зміни замовлення
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* TAB: CATEGORIES TREE */}
      {activeTab === 'categories' && (() => {
        const mainCatKeys = Object.keys(categoriesTree);
        const totalMainCount = mainCatKeys.length;

        // Calculate total subcategories & leaf categories
        let totalSubCount = 0;
        let totalLeafCount = 0;

        mainCatKeys.forEach((mainCat) => {
          const mainObj = categoriesTree[mainCat] || {};
          const directLeaves = Array.isArray(mainObj._leaves) ? mainObj._leaves : [];
          totalLeafCount += directLeaves.length;

          const subCats = Object.keys(mainObj).filter((k) => k !== '_leaves' && !k.startsWith('_'));
          totalSubCount += subCats.length;

          subCats.forEach((sub) => {
            const leaves = Array.isArray(mainObj[sub]) ? mainObj[sub] : [];
            totalLeafCount += leaves.length;
          });
        });

        // Filter main categories by categorySearch
        const filteredMainCats = mainCatKeys.filter((mainCat) => {
          if (!categorySearch.trim()) return true;
          const q = categorySearch.toLowerCase().trim();
          if (mainCat.toLowerCase().includes(q)) return true;

          const mainObj = categoriesTree[mainCat] || {};
          const directLeaves = Array.isArray(mainObj._leaves) ? mainObj._leaves : [];
          if (directLeaves.some((l) => l.toLowerCase().includes(q))) return true;

          const subCats = Object.keys(mainObj).filter((k) => k !== '_leaves' && !k.startsWith('_'));
          if (subCats.some((sub) => sub.toLowerCase().includes(q))) return true;

          for (const sub of subCats) {
            const leaves = Array.isArray(mainObj[sub]) ? mainObj[sub] : [];
            if (leaves.some((l) => l.toLowerCase().includes(q))) return true;
          }

          return false;
        });

        return (
          <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
            {/* Master Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/90 p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/30">
              {/* Ambient Glows */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>🌳 Структура каталогу ISKRA</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>3-рівнева ієрархія товарних груп</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-inner">
                      <FolderTree className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span>Дерево категорій та класифікація</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Керуйте 3-рівневою структурою (Головні категорії ➔ Підкатегорії ➔ Кінцеві групи). Чітка організація дозволяє покупцям миттєво знаходити потрібний сантехнічний товар.
                  </p>
                </div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0 min-w-[320px]">
                  <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg hover:border-slate-700 transition-all">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Головні категорії</div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">{totalMainCount}</div>
                  </div>

                  <div className="bg-emerald-500/15 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg hover:border-emerald-500/50 transition-all">
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Підкатегорії</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tabular-nums">{totalSubCount}</div>
                  </div>

                  <div className="bg-amber-500/15 backdrop-blur-md p-4 rounded-2xl border border-amber-500/30 shadow-lg hover:border-amber-500/50 transition-all">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" />
                      Кінцеві групи
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tabular-nums">{totalLeafCount}</div>
                  </div>

                  <div className="bg-teal-500/15 backdrop-blur-md p-4 rounded-2xl border border-teal-500/30 shadow-lg hover:border-teal-500/50 transition-all">
                    <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                      <Package className="w-3 h-3 text-teal-400" />
                      Товари у базі
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-teal-300 mt-1 font-mono tabular-nums">{products.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action & Creation Control Bar */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Шукати категорію, підкатегорію або кінцеву групу..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium bg-slate-50 focus:bg-white"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Add Main Category Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newMainCatInput.trim()) {
                      addMainCategory(newMainCatInput.trim());
                      setNewMainCatInput('');
                      showToast(`Категорію «${newMainCatInput.trim()}» успішно створено`, 'success');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Назва нової головної категорії..."
                    value={newMainCatInput}
                    onChange={(e) => setNewMainCatInput(e.target.value)}
                    className="px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 outline-none w-64 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50 focus:bg-white font-medium"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Створити категорію</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Category Cards Tree Grid */}
            <div className="space-y-4">
              {filteredMainCats.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FolderTree className="w-6 h-6" />
                  </div>
                  <div className="text-base font-black text-slate-700">Категорій не знайдено</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {categorySearch ? `За запитом «${categorySearch}» збігів не виявлено.` : 'Список категорій порожній. Створіть першу категорію вище.'}
                  </p>
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Скинути пошук
                    </button>
                  )}
                </div>
              ) : (
                filteredMainCats.map((mainCat) => (
                  <AdminCategoryCard
                    key={mainCat}
                    mainCat={mainCat}
                    mainObj={categoriesTree[mainCat] || {}}
                    onDeleteMain={deleteMainCategory}
                    onAddSub={addSubCategory}
                    onDeleteSub={deleteSubCategory}
                    onAddLeaf={addLeafCategory}
                    onDeleteLeaf={deleteLeafCategory}
                    searchQuery={categorySearch}
                  />
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB: CLIENTS & BONUSES */}
      {activeTab === 'clients' && (() => {
        const safeClients = clients || {};
        const allPhones = Object.keys(safeClients);
        const totalClients = allPhones.length;
        const totalBonusPool = Object.values(safeClients).reduce((sum, c) => sum + (c?.balance || 0), 0);
        const discountClientsCount = Object.values(safeClients).filter((c) => (c?.discount || 0) > 0).length;
        const vipClientsCount = Object.values(safeClients).filter((c) => (c?.discount || 0) >= 5 || (c?.balance || 0) >= 500).length;
        const hasBonusCount = Object.values(safeClients).filter((c) => (c?.balance || 0) > 0).length;

        // Filtering
        const filteredPhones = allPhones.filter((phone) => {
          const c = safeClients[phone] || {};
          const query = clientSearch.toLowerCase().trim();
          const matchesQuery = !query || phone.includes(query) || (c.name || '').toLowerCase().includes(query) || (c.city || '').toLowerCase().includes(query) || (c.notes || '').toLowerCase().includes(query);

          if (!matchesQuery) return false;

          if (clientFilter === 'has_bonus') return (c.balance || 0) > 0;
          if (clientFilter === 'has_discount') return (c.discount || 0) > 0;
          if (clientFilter === 'vip') return (c.discount || 0) >= 5 || (c.balance || 0) >= 500;
          return true;
        });

        // Export CSV function
        const exportClientsCSV = () => {
          const headers = ['Номер телефону', "Ім'я / Примітка", 'Місто', 'Бонусний баланс (грн)', 'Персональна знижка (%)', 'Нотатки'];
          const rows = allPhones.map((ph) => {
            const c = safeClients[ph] || {};
            return [ph, c.name || 'Покупець', c.city || '', c.balance || 0, c.discount || 0, c.notes || ''];
          });
          const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `iskra_clients_database_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const copyPhoneToClipboard = (phone: string) => {
          navigator.clipboard.writeText(phone);
          setCopiedPhone(phone);
          setTimeout(() => setCopiedPhone(null), 2000);
        };

        return (
          <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
            
            {/* Master Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/90 p-6 sm:p-8 text-white shadow-2xl border border-violet-500/30">
              {/* Ambient Glows */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span>👥 Програма лояльності ISKRA</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Накопичувальні бонуси та персональні знижки</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-violet-500/20 border border-violet-500/40 rounded-2xl text-violet-400 shadow-inner">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span>База покупців, бонуси та знижки</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Керуйте картками покупців, нараховуйте та списуйте бонусні гривні, встановлюйте персональні відсотки знижок для майстрів, виконробів та постійних клієнтів.
                  </p>
                </div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0 min-w-[300px]">
                  <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg hover:border-slate-700 transition-all">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всього покупців</div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">{totalClients}</div>
                  </div>

                  <div className="bg-emerald-500/15 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg hover:border-emerald-500/50 transition-all">
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Бонусний фонд</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tabular-nums">{totalBonusPool.toLocaleString('uk-UA')} <span className="text-xs text-emerald-300 font-normal">грн</span></div>
                  </div>

                  <div className="bg-amber-500/15 backdrop-blur-md p-4 rounded-2xl border border-amber-500/30 shadow-lg hover:border-amber-500/50 transition-all">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Percent className="w-3 h-3 text-amber-400" />
                      Зі знижками
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tabular-nums">{discountClientsCount}</div>
                  </div>

                  <div className="bg-violet-500/15 backdrop-blur-md p-4 rounded-2xl border border-violet-500/30 shadow-lg hover:border-violet-500/50 transition-all">
                    <div className="text-[11px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3 h-3 text-violet-400" />
                      VIP / Майстри
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-violet-300 mt-1 font-mono tabular-nums">{vipClientsCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar & Action Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search & Pills */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-3xl">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Шукати за телефоном, ім'ям, містом або нотатками..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setClientFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        clientFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Всі ({totalClients})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientFilter('has_bonus')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        clientFilter === 'has_bonus'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      З бонусами ({hasBonusCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientFilter('has_discount')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        clientFilter === 'has_discount'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      Зі знижкою ({discountClientsCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientFilter('vip')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        clientFilter === 'vip'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-violet-700'
                      }`}
                    >
                      VIP / Майстри ({vipClientsCount})
                    </button>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportClientsCSV}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border border-slate-300 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer text-xs"
                    title="Завантажити базу клієнтів у файл CSV (Excel)"
                  >
                    <FileDown className="w-4 h-4 text-violet-600" />
                    <span>Експорт бази (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClientForm({
                        phone: '+380',
                        name: '',
                        balance: 0,
                        discount: 3,
                        city: '',
                        notes: '',
                        isNew: true
                      });
                      setClientModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-amber-300" />
                    <span>+ Додати покупця</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Clients Table Container */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Покупець / Телефон</th>
                      <th className="py-3.5 px-4">Статус / Рівень лояльності</th>
                      <th className="py-3.5 px-4">Місто / Нотатки</th>
                      <th className="py-3.5 px-4">Бонусний баланс</th>
                      <th className="py-3.5 px-4">Персональна знижка</th>
                      <th className="py-3.5 px-4 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPhones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="max-w-xs mx-auto space-y-2">
                            <Users className="w-8 h-8 text-slate-300 mx-auto" />
                            <div className="text-sm font-bold text-slate-600">Покупців не знайдено</div>
                            <p className="text-xs text-slate-400">Спробуйте змінити фільтр або параметри пошуку</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPhones.map((phone) => {
                        const c = safeClients[phone] || {};
                        const discount = c.discount || 0;
                        const balance = c.balance || 0;

                        // Tier logic
                        let tierBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span>Покупець</span>
                          </span>
                        );

                        if (discount >= 8 || balance >= 1000) {
                          tierBadge = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-800 border border-amber-300 shadow-2xs">
                              <Award className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>🥇 Gold VIP Майстер</span>
                            </span>
                          );
                        } else if (discount >= 4 || balance >= 300) {
                          tierBadge = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200 shadow-2xs">
                              <Sparkles className="w-3 h-3 text-violet-600" />
                              <span>🥈 Silver Постійний</span>
                            </span>
                          );
                        } else if (discount > 0 || balance > 0) {
                          tierBadge = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>🥉 Bronze Учасник</span>
                            </span>
                          );
                        }

                        const cleanDigits = extractLocalPhoneDigits(phone);

                        return (
                          <tr key={phone} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Customer Phone & Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-violet-100 text-violet-800 font-black text-xs flex items-center justify-center shrink-0 border border-violet-200 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                  {(c.name || 'П')[0].toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <span>{c.name || 'Покупець'}</span>
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-600 flex items-center gap-1.5">
                                    <span>{phone}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyPhoneToClipboard(phone)}
                                      className="text-slate-400 hover:text-violet-600 transition-colors p-0.5"
                                      title="Скопіювати телефон"
                                    >
                                      {copiedPhone === phone ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Tier */}
                            <td className="py-3 px-4">
                              {tierBadge}
                            </td>

                            {/* City / Notes */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 max-w-[200px]">
                                {c.city ? (
                                  <div className="text-xs text-slate-800 font-semibold flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{c.city}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-mono">—</span>
                                )}
                                {c.notes && (
                                  <p className="text-[11px] text-slate-500 truncate" title={c.notes}>
                                    📝 {c.notes}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Bonus Balance */}
                            <td className="py-3 px-4">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs tabular-nums">
                                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{balance.toLocaleString('uk-UA')} грн</span>
                              </div>
                            </td>

                            {/* Personal Discount */}
                            <td className="py-3 px-4">
                              {discount > 0 ? (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-mono font-black text-xs tabular-nums">
                                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{discount}%</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-mono">0%</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={`viber://chat?number=%2B380${cleanDigits}`}
                                  className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                                  title="Написати у Viber"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>

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
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Редагувати дані покупця"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Редагувати</span>
                                </button>

                                {clientToDelete === phone ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl animate-in fade-in">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteClient(phone);
                                        setClientToDelete(null);
                                      }}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                                    >
                                      Видалити
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setClientToDelete(null)}
                                      className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                                    >
                                      Ні
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setClientToDelete(phone)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Видалити з бази"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit / Add Client Modal */}
            {clientModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 border border-violet-200">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 font-display">
                          {clientForm.isNew ? 'Додати нового покупця' : 'Редагувати картку покупця'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {clientForm.isNew ? 'Створення нової картки в системі лояльності' : `Телефон: ${clientForm.originalPhone || clientForm.phone}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(false)}
                      className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                      <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Номер телефону покупця *</span>
                        <span className="text-[11px] text-violet-600 font-mono">Формат: +380 (XX) XXX-XX-XX</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          placeholder="+380 (67) 000-00-00"
                          value={clientForm.phone}
                          onChange={(e) => setClientForm({ ...clientForm, phone: formatUkrainianPhone(e.target.value) })}
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 font-mono text-sm font-bold bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1.5">
                        Ім'я або назва компанії / Майстра
                      </label>
                      <input
                        type="text"
                        placeholder="Олександр (Майстер сантехнік)"
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs font-semibold bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1.5">
                          Місто / Населений пункт
                        </label>
                        <input
                          type="text"
                          placeholder="смт. Оратів, Вінниця..."
                          value={clientForm.city || ''}
                          onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs font-semibold bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>Персональна знижка (%)</span>
                          <span className="text-amber-600 font-mono font-bold">{clientForm.discount}%</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="90"
                          step="1"
                          value={clientForm.discount}
                          onChange={(e) => setClientForm({ ...clientForm, discount: parseInt(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs font-mono font-black text-amber-700 bg-amber-50/50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1.5">
                          Бонусний баланс (грн)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={clientForm.balance}
                          onChange={(e) => setClientForm({ ...clientForm, balance: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs font-mono font-black text-emerald-700 bg-emerald-50/50 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1.5">
                          Нотатки про покупця
                        </label>
                        <input
                          type="text"
                          placeholder="Монтажник, об'єкт на Вусатого..."
                          value={clientForm.notes || ''}
                          onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs font-semibold bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setClientModalOpen(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                      >
                        Зберегти в базу
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        );
      })()}

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
          <div className="space-y-6 max-w-7xl animate-in fade-in duration-200">
            {/* Master Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30">
              {/* Background ambient lights */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>⚡ Автоматичний контроль попиту</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Реєстр покупців у базі</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
                      <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span>Запити на сповіщення про наявність</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Клієнти, які підписалися на сповіщення біля товарів з нульовим залишком. При поповненні складу ви можете миттєво сповістити їх у 1 клік через
                    <strong className="text-purple-300 font-bold"> Viber</strong>, <strong className="text-sky-300 font-bold">Telegram</strong>, <strong className="text-emerald-300 font-bold">WhatsApp</strong>, <strong className="text-blue-300 font-bold">SMS</strong> або зателефонувати.
                  </p>
                </div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 gap-3 shrink-0 min-w-[280px]">
                  <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg hover:border-slate-700 transition-all">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всього запитів</div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">{stockAlerts.length}</div>
                  </div>

                  <div className="bg-amber-500/15 backdrop-blur-md p-4 rounded-2xl border border-amber-500/30 shadow-lg hover:border-amber-500/50 transition-all">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Очікують
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tabular-nums">{pendingCount}</div>
                  </div>

                  <div className="bg-emerald-500/15 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg hover:border-emerald-500/50 transition-all">
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Сповіщено</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tabular-nums">{notifiedCount}</div>
                  </div>

                  <div className="bg-blue-500/15 backdrop-blur-md p-4 rounded-2xl border border-blue-500/30 shadow-lg hover:border-blue-500/50 transition-all">
                    <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Є на складі</div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1 font-mono tabular-nums">{readyToNotifyCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing banner for items that arrived in stock */}
            {readyToNotifyCount > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl border border-emerald-400/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner border border-white/30">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black flex items-center gap-2 flex-wrap">
                      <span>🎉 Товари вже на складі! Готові до відправки</span>
                      <span className="px-3 py-0.5 rounded-full bg-white text-emerald-950 text-xs font-black shadow-sm font-mono">
                        {readyToNotifyCount} клієнтів
                      </span>
                    </h4>
                    <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 leading-relaxed">
                      Партія товару надійшла (залишок &gt; 0). Відфільтруйте покупців і надішліть їм сповіщення в 1 клік!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStockAlertInStockOnly(!stockAlertInStockOnly)}
                  className={`relative z-10 px-5 py-2.5 font-black text-xs rounded-2xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    stockAlertInStockOnly 
                      ? 'bg-emerald-950 text-white hover:bg-black ring-2 ring-white/50' 
                      : 'bg-white text-emerald-900 hover:bg-emerald-50 active:scale-98'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{stockAlertInStockOnly ? 'Показати всі запити' : `Показати готові до SMS (${readyToNotifyCount})`}</span>
                </button>
              </div>
            )}

            {/* Controls, Filters & Search Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative w-full lg:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Пошук за товаром, телефоном, ПІБ, артикулом..."
                    value={stockAlertSearch}
                    onChange={(e) => setStockAlertSearch(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                  />
                  {stockAlertSearch && (
                    <button
                      type="button"
                      onClick={() => setStockAlertSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setStockAlertStatusFilter('all');
                      setStockAlertInStockOnly(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      stockAlertStatusFilter === 'all' && !stockAlertInStockOnly
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Усі</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      stockAlertStatusFilter === 'all' && !stockAlertInStockOnly ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {stockAlerts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockAlertStatusFilter('pending');
                      setStockAlertInStockOnly(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      stockAlertStatusFilter === 'pending' && !stockAlertInStockOnly
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Очікують</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 font-mono font-bold">
                      {pendingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockAlertInStockOnly(true);
                      setStockAlertStatusFilter('pending');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      stockAlertInStockOnly
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/60'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Є на складі</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-100 font-mono font-bold">
                      {readyToNotifyCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockAlertStatusFilter('notified');
                      setStockAlertInStockOnly(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      stockAlertStatusFilter === 'notified' && !stockAlertInStockOnly
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Сповіщено</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono font-bold">
                      {notifiedCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Secondary Toolbar (Active filters & Actions) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {stockAlertInStockOnly && (
                    <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300 shadow-2xs">
                      <span>✓ Тільки ті, що є на складі</span>
                      <button
                        type="button"
                        onClick={() => setStockAlertInStockOnly(false)}
                        className="hover:text-emerald-950 ml-1 cursor-pointer font-black"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {stockAlertFilterProduct && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full text-xs text-amber-900 shadow-2xs">
                      <span>Фільтр товару: <b>{stockAlertFilterProduct}</b></span>
                      <button
                        type="button"
                        onClick={() => setStockAlertFilterProduct('')}
                        className="text-amber-800 hover:text-amber-950 font-black ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <span className="text-xs text-slate-500">
                    Знайдено запитів: <strong className="text-slate-800 font-bold font-mono">{filteredAlerts.length}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {notifiedCount > 0 && (
                    isConfirmingClearNotifiedAlerts ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 rounded-xl text-xs border border-emerald-300 animate-in fade-in shadow-2xs">
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
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-900 rounded-xl text-xs border border-rose-300 animate-in fade-in shadow-2xs">
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Перейти до налаштувань SMS-провайдера та шаблону повідомлення"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚙️ Шаблони SMS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Batch actions floating bar */}
            {selectedStockAlertIds.length > 0 && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5 text-xs font-black">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <span>Вибрано запитів для масової дії: <strong className="font-mono text-amber-400">{selectedStockAlertIds.length}</strong></span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      selectedStockAlertIds.forEach(id => updateStockAlertStatus(id, 'notified'));
                      setSelectedStockAlertIds([]);
                      showToast(`Позначено ${selectedStockAlertIds.length} запитів як сповіщені`, 'success');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Позначити всі як «Сповіщено»</span>
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
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Видалити обрані ({selectedStockAlertIds.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStockAlertIds([])}
                    className="px-3 py-1.5 text-slate-300 hover:text-white text-xs cursor-pointer font-medium hover:bg-slate-800 rounded-xl"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}

            {/* Requests Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {filteredAlerts.length === 0 ? (
                <div className="p-16 text-center text-slate-500 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center border border-amber-200 shadow-inner">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">
                    {stockAlertSearch || stockAlertStatusFilter !== 'all' || stockAlertFilterProduct
                      ? 'За обраними фільтрами запитів не знайдено'
                      : 'Запитів на сповіщення про наявність поки немає'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Коли покупці натискатимуть кнопку «Повідомити про наявність» на картках товарів із залишком 0 шт, їхні заявки з'являтимуться тут для швидкого дзвінка або відправки SMS.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                      <tr>
                        <th className="py-3.5 px-3.5 w-10 text-center">
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
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            title="Вибрати всі"
                          />
                        </th>
                        <th className="py-3.5 px-3 text-center w-24">Дата / Час</th>
                        <th className="py-3.5 px-4 min-w-[220px]">Товар</th>
                        <th className="py-3.5 px-3 text-center">Склад</th>
                        <th className="py-3.5 px-4">Клієнт та контакт</th>
                        <th className="py-3.5 px-3 text-center">Статус</th>
                        <th className="py-3.5 px-4 text-left">Швидке сповіщення (1 клік)</th>
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
                              isSelected 
                                ? 'bg-amber-50/70' 
                                : isNowInStock && alert.status === 'pending'
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center">
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
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>

                            {/* Time / Date */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center leading-tight font-mono">
                                <span className="text-[12px] font-bold text-slate-900">
                                  {new Date(alert.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  {new Date(alert.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                            </td>

                            {/* Product */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 max-w-[280px]">
                                {alert.productImage ? (
                                  <img
                                    src={getSafeImageUrl(alert.productImage)}
                                    alt=""
                                    className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 truncate leading-snug text-xs hover:text-amber-700" title={alert.productName}>
                                    {alert.productName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                    {alert.productSku && <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-semibold">Арт: {alert.productSku}</span>}
                                    {alert.productPrice && <span className="font-bold text-slate-800">{alert.productPrice} грн</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Stock status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isNowInStock ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-300 shadow-2xs animate-pulse">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                  <span>{currentStock} шт (Є!)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  <span>0 шт</span>
                                </span>
                              )}
                            </td>

                            {/* Client & Phone */}
                            <td className="py-3 px-4">
                              <div className="min-w-[150px]">
                                <div className="font-black text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                  <span>{alert.name || 'Покупець'}</span>
                                  {alert.channel === 'viber' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                                      💬 Viber
                                    </span>
                                  )}
                                  {alert.channel === 'telegram' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                                      ✈️ Telegram
                                    </span>
                                  )}
                                  {alert.channel === 'whatsapp' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      🟢 WhatsApp
                                    </span>
                                  )}
                                  {alert.channel === 'sms' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      ✉️ SMS
                                    </span>
                                  )}
                                  {alert.channel === 'call' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                                      📞 Дзвінок
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 mt-1">
                                  <a
                                    href={`tel:${alert.phone}`}
                                    className="font-mono text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 text-xs underline bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200"
                                  >
                                    <Phone className="w-3 h-3 text-amber-600" />
                                    <span>{alert.phone}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(alert.phone);
                                      showToast('Номер скопійовано: ' + alert.phone, 'info');
                                    }}
                                    className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                    title="Скопіювати номер телефону"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {alert.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Очікує</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                                  <span>Сповіщено</span>
                                </span>
                              )}
                            </td>

                            {/* Action Buttons (1-click messenger / SMS dispatch) */}
                            <td className="py-3 px-4 text-left whitespace-nowrap">
                              <div className="flex items-center justify-start gap-2">
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
                                    <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-2xs">
                                      {/* Viber */}
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
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                          alert.channel === 'viber'
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'text-purple-700 hover:bg-purple-50'
                                        }`}
                                        title="Написати у Viber"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>Viber</span>
                                      </a>

                                      {/* Telegram */}
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
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                          alert.channel === 'telegram'
                                            ? 'bg-sky-500 text-white shadow-xs'
                                            : 'text-sky-700 hover:bg-sky-50'
                                        }`}
                                        title="Написати в Telegram"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>TG</span>
                                      </a>

                                      {/* WhatsApp */}
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито WhatsApp', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                          alert.channel === 'whatsapp'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                        title="Написати у WhatsApp"
                                      >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                        <span>WA</span>
                                      </a>

                                      {/* SMS */}
                                      <a
                                        href={smsUrl}
                                        onClick={() => {
                                          if (alert.status === 'pending') {
                                            updateStockAlertStatus(alert.id, 'notified');
                                          }
                                          showToast('Відкрито SMS з готовим текстом', 'info');
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                          alert.channel === 'sms'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-blue-700 hover:bg-blue-50'
                                        }`}
                                        title="Надіслати SMS"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>SMS</span>
                                      </a>

                                      {/* Call */}
                                      <a
                                        href={`tel:${alert.phone}`}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                          alert.channel === 'call'
                                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                                            : 'text-slate-700 hover:bg-amber-50'
                                        }`}
                                        title="Зателефонувати клієнту"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>Дзвінок</span>
                                      </a>

                                      {/* SMS Gateway send button */}
                                      <button
                                        type="button"
                                        onClick={() => setSmsModalAlert({ alert, text: smsMessage })}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                        title="Відправити через SMS-шлюз (TurboSMS/SMSClub)"
                                      >
                                        <Send className="w-3.5 h-3.5" />
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
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                                    title="Позначити цей запит як сповіщений"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Сповіщено</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStockAlertStatus(alert.id, 'pending');
                                      showToast('Повернуто в очікування', 'info');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                                    title="Повернути запит в статус очікування"
                                  >
                                    <span>↩ Очікує</span>
                                  </button>
                                )}

                                {/* Delete Button */}
                                {alertToDelete === alert.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 px-2 py-1.5 rounded-xl border border-rose-200 animate-in fade-in shrink-0 shadow-2xs">
                                    <span className="text-[11px] font-bold text-rose-700">Видалити?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteStockAlert(alert.id);
                                        setSelectedStockAlertIds(prev => prev.filter(id => id !== alert.id));
                                        setAlertToDelete(null);
                                      }}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                    >
                                      Так
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAlertToDelete(null)}
                                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                    >
                                      Ні
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAlertToDelete(alert.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-200"
                                    title="Видалити цей запит"
                                  >
                                    <Trash2 className="w-4 h-4" />
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

            {/* SMS Gateway Modal */}
            {smsModalAlert && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
                onClick={() => setSmsModalAlert(null)}
              >
                <div 
                  className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Сповістити клієнта про наявність</h4>
                        <p className="text-[11px] text-amber-200/80 truncate max-w-[260px]">
                          {smsModalAlert.alert.productName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSmsModalAlert(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Recipient Details Card */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Одержувач:</span>
                        <span className="font-bold text-slate-900">{smsModalAlert.alert.name || 'Покупець'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Телефон:</span>
                        <span className="font-mono font-black text-amber-700">{smsModalAlert.alert.phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Товар:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[260px]">{smsModalAlert.alert.productName}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Текст повідомлення (можна редагувати):
                      </label>
                      <textarea
                        rows={4}
                        value={smsModalAlert.text}
                        onChange={(e) => setSmsModalAlert({ ...smsModalAlert, text: e.target.value })}
                        className="w-full p-3.5 border border-slate-300 rounded-2xl bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs font-medium transition-all"
                      />
                      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5 font-medium">
                        <span>Символів: <strong className="font-mono">{smsModalAlert.text.length}</strong> (~{Math.ceil(smsModalAlert.text.length / 70)} SMS)</span>
                        <span>Відправник: <strong>{settingsForm.smsSenderName || 'ISKRA'}</strong></span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={generateSmsUrl(smsModalAlert.alert.phone, smsModalAlert.text)}
                          onClick={() => {
                            updateStockAlertStatus(smsModalAlert.alert.id, 'notified');
                            showToast('Відкрито додаток SMS. Клієнта позначено як сповіщеного!', 'success');
                            setSmsModalAlert(null);
                          }}
                          className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center"
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
                          className="py-2.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center"
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
                          className="py-2.5 px-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center"
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
                          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
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
      {/* TAB: REVIEWS MANAGEMENT */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          
          {/* Top Master Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-yellow-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Центр репутації & Соціальних доказів</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Синхронізація з БД: Активно</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Керування відгуками покупців</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Публічна оцінка та довіра покупців до магазину <strong>ISKRA</strong>. Додавайте офіційні відгуки, модеруйте комменти, керуйте статусами перевірених покупок та підтверджуйте оцінки товарів.
                </p>

                {/* Quick Trust Badges */}
                <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Гарантія відгуків:</span>
                    <span className="text-emerald-300 font-extrabold">100% реальні покупці</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400">Індекс задоволеності:</span>
                    <span className="text-amber-300 font-extrabold">98% позитивних</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openAddReviewModal()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>Додати новий відгук</span>
                </button>

                <button
                  type="button"
                  onClick={resetDefaultReviews}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Відновити стандартний список відгуків"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Скинути до базових</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всього відгуків</span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display">{reviews.length}</span>
                <span className="text-[11px] font-semibold text-slate-500">опубліковано</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/40 rounded-2xl p-4 border border-amber-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">Середня оцінка</span>
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-700 font-display">
                  {reviews.length > 0
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                    : '5.0'}
                </span>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Перевірені покупки</span>
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-display">
                  {reviews.length > 0
                    ? `${Math.round((reviews.filter(r => r.verifiedPurchase).length / reviews.length) * 100)}%`
                    : '100%'}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">з бейджем ✓</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50/80 to-sky-50/40 rounded-2xl p-4 border border-blue-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider">Рекомендують магазин</span>
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <ThumbsUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-700 font-display">
                  {reviews.length > 0
                    ? `${Math.round((reviews.filter(r => r.recommended).length / reviews.length) * 100)}%`
                    : '100%'}
                </span>
                <span className="text-[11px] font-bold text-blue-600">лояльних</span>
              </div>
            </div>
          </div>

          {/* Search & Smart Filters Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Пошук за автором, містом або текстом відгуку..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all shadow-2xs"
                />
                {reviewSearch && (
                  <button
                    type="button"
                    onClick={() => setReviewSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Rating Filter Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={reviewFilterRating}
                  onChange={(e) => setReviewFilterRating(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-bold outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">⭐ Всі оцінки (зірки)</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 зірок (Відмінно)</option>
                  <option value="4">⭐⭐⭐⭐ 4 зірки (Добре)</option>
                  <option value="3">⭐⭐⭐ 3 зірки (Задовільно)</option>
                  <option value="2">⭐⭐ 2 зірки</option>
                  <option value="1">⭐ 1 зірка</option>
                </select>

                {/* Product Filter Dropdown */}
                <select
                  value={reviewFilterProduct}
                  onChange={(e) => setReviewFilterProduct(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-bold outline-none focus:border-amber-500 shadow-2xs max-w-xs truncate cursor-pointer"
                >
                  <option value="all">📦 Всі товари & загальні</option>
                  <option value="general">🏪 Загальні відгуки магазину ISKRA</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Star Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Швидкий фільтр:</span>
              <button
                type="button"
                onClick={() => { setReviewFilterRating('all'); setReviewFilterProduct('all'); setReviewSearch(''); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reviewFilterRating === 'all' && reviewFilterProduct === 'all' && !reviewSearch
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Всі відгуки ({reviews.length})
              </button>

              <button
                type="button"
                onClick={() => setReviewFilterRating('5')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  reviewFilterRating === '5'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-2xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>5 зірок ({reviews.filter(r => r.rating === 5).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilterProduct('general')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reviewFilterProduct === 'general'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🏪 Про магазин ({reviews.filter(r => !r.productId).length})
              </button>
            </div>
          </div>

          {/* Reviews List Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Список публічних відгуків
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Показано: {reviews.filter(r => {
                  const q = reviewSearch.toLowerCase();
                  const matchQ = !q || r.author.toLowerCase().includes(q) || (r.city && r.city.toLowerCase().includes(q)) || r.comment.toLowerCase().includes(q);
                  const matchRating = reviewFilterRating === 'all' || String(r.rating) === reviewFilterRating;
                  const matchProduct = reviewFilterProduct === 'all' ? true : reviewFilterProduct === 'general' ? (!r.productId || r.productId === '') : r.productId === reviewFilterProduct;
                  return matchQ && matchRating && matchProduct;
                }).length} відгуків
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Автор & Населений пункт</th>
                    <th className="py-3.5 px-4">Товар / Прив'язка</th>
                    <th className="py-3.5 px-4">Оцінка</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Зміст відгуку</th>
                    <th className="py-3.5 px-4">Статус покупця</th>
                    <th className="py-3.5 px-4">Корисність 👍</th>
                    <th className="py-3.5 px-4 text-right">Дії</th>
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
                        <tr key={rev.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar circle */}
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {rev.author ? rev.author.charAt(0).toUpperCase() : 'К'}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {rev.author}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{rev.city || 'с-ще. Оратів'}</span>
                                  <span>•</span>
                                  <span>{rev.date}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[200px]">
                            {tiedProduct ? (
                              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                                <div className="font-bold text-slate-800 line-clamp-1 text-[11px]" title={tiedProduct.name}>
                                  {tiedProduct.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {tiedProduct.sku} • {tiedProduct.price} грн
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-amber-200/80">
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>Магазин ISKRA (Загальний)</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                  />
                                ))}
                              </div>
                              <span className="font-black text-slate-900 text-xs">{rev.rating}.0</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed font-medium">
                              "{rev.comment}"
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap space-y-1">
                            {rev.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Перевірена покупка
                              </span>
                            )}
                            {rev.recommended && (
                              <div className="text-[10px] text-blue-600 font-extrabold flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3 text-blue-500" />
                                <span>Рекомендує товар</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                              <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                              <span>{rev.helpfulCount || 0}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditReviewModal(rev)}
                                className="p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Редагувати відгук"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Видалити відгук"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {reviews.filter(r => {
                    const q = reviewSearch.toLowerCase();
                    const matchQ = !q || r.author.toLowerCase().includes(q) || (r.city && r.city.toLowerCase().includes(q)) || r.comment.toLowerCase().includes(q);
                    const matchRating = reviewFilterRating === 'all' || String(r.rating) === reviewFilterRating;
                    const matchProduct = reviewFilterProduct === 'all' ? true : reviewFilterProduct === 'general' ? (!r.productId || r.productId === '') : r.productId === reviewFilterProduct;
                    return matchQ && matchRating && matchProduct;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 space-y-2">
                        <Star className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                        <div className="font-bold text-slate-700 text-sm">За вказаними фільтрами відгуків не знайдено</div>
                        <p className="text-xs text-slate-400">Спробуйте змінити пошуковий запит або скинути фільтри зірок.</p>
                        <button
                          type="button"
                          onClick={() => { setReviewSearch(''); setReviewFilterRating('all'); setReviewFilterProduct('all'); }}
                          className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Скинути всі фільтри
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADD / EDIT REVIEW MODAL */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-xs text-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {editingReviewId ? 'Редагування відгуку' : 'Додавання нового відгуку'}
                      </h4>
                      <p className="text-[11px] text-slate-400">Формування публічної картки клієнта</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveReview} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Ім'я автора *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Олександр М."
                        value={rAuthor}
                        onChange={(e) => setRAuthor(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Місто / Населений пункт
                      </label>
                      <input
                        type="text"
                        placeholder="с-ще. Оратів"
                        value={rCity}
                        onChange={(e) => setRCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Прив'язка до товару (або загальний відгук про магазин)
                    </label>
                    <select
                      value={rProductId}
                      onChange={(e) => setRProductId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 bg-white"
                    >
                      <option value="">🏪 Загальний відгук про магазин ISKRA</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          📦 {p.name} ({p.sku}) — {p.price} грн
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Оцінка (Зірки)
                      </label>
                      <select
                        value={rRating}
                        onChange={(e) => setRRating(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 bg-white"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 зірок</option>
                        <option value={4}>⭐⭐⭐⭐ 4 зірки</option>
                        <option value={3}>⭐⭐⭐ 3 зірки</option>
                        <option value={2}>⭐⭐ 2 зірки</option>
                        <option value={1}>⭐ 1 зірка</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Дата (текстом)
                      </label>
                      <input
                        type="text"
                        placeholder="Вчора / 3 дні тому"
                        value={rDate}
                        onChange={(e) => setRDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Кількість лайків 👍
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={rHelpful}
                        onChange={(e) => setRHelpful(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Текст відгуку *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Введіть текст відгуку..."
                      value={rComment}
                      onChange={(e) => setRComment(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-800 font-bold">
                      <input
                        type="checkbox"
                        checked={rVerified}
                        onChange={(e) => setRVerified(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Перевірена покупка (галочка ✓)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-800 font-bold">
                      <input
                        type="checkbox"
                        checked={rRecommended}
                        onChange={(e) => setRRecommended(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Рекомендує товар 👍</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black transition-all shadow-md text-xs cursor-pointer active:scale-95"
                    >
                      Зберегти відгук у БД
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: DESIGN, LOGO, CONTACTS & PROMO BANNER */}
      {activeTab === 'design' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateHeaderDesign(designForm);
            updateSiteSettings(settingsForm);
            showToast('Дизайн, логотип, контакти та промо-банери успішно збережено!', 'success');
          }}
          className="space-y-6 max-w-5xl animate-in fade-in duration-200"
        >
          {/* Top Master Hero Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-red-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span>Брендінг & Візуальний стиль</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Живий прев'ю-канал активний</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Налаштування дизайну та бренд-стилю</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Центр управління візуальною ідентичністю інтернет-магазину <strong>ISKRA</strong>. Редагуйте фірмовий логотип, промо-рядок сповіщень, перший екран Hero, контакти та футер із миттєвим попереднім переглядом.
                </p>
              </div>

              {/* Action Header Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDesignForm({
                      bgColor: 'bg-slate-900',
                      logoBadge: 'ISKRA',
                      logoText: 'МАГАЗИН',
                      logoSubtitle: 'Магазин надійних рішень',
                      promoActive: true,
                      promoText: '🔥 Знижка -10% при замовленні від 1000 грн! Встигніть оформити замовлення!',
                      heroBadge: 'Інтернет-магазин',
                      heroTitle: 'Надійна Сантехніка та Електротовари',
                      heroDesc: 'Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома.',
                      heroAddress: 'Вінницька обл., с-ще. Оратів',
                      heroCity: 'с-ще. Оратів, Вінницька обл.'
                    });
                    showToast('Застосовано фірмовий стиль ISKRA!', 'info');
                  }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Фірмовий стиль ISKRA</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Зберегти весь дизайн</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Logo & Brand Header */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <Tag className="w-4 h-4" />
                </div>
                <span>1. Фірмовий логотип та стиль шапки</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Шапка сайту
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Inputs */}
              <div className="lg:col-span-7 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Назва бренду (червоний бейдж)
                  </label>
                  <input
                    type="text"
                    value={designForm.logoBadge}
                    placeholder="ISKRA"
                    onChange={(e) => setDesignForm({ ...designForm, logoBadge: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Текст усередині яскравого червоного фірмового прямокутника.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Основний підпис (верхній рядок)
                    </label>
                    <input
                      type="text"
                      value={designForm.logoText}
                      placeholder="МАГАЗИН"
                      onChange={(e) => setDesignForm({ ...designForm, logoText: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Слоган / Підзаголовок
                    </label>
                    <input
                      type="text"
                      value={designForm.logoSubtitle || ''}
                      placeholder="Магазин надійних рішень"
                      onChange={(e) => setDesignForm({ ...designForm, logoSubtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Попередній вигляд у шапці:</span>
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Навігаційна панель
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div className="flex items-center justify-center bg-[#e5001e] text-white px-3 py-1.5 rounded-lg shadow-xs shrink-0">
                      <span className="font-black text-white text-[17px] tracking-[0.05em] font-display leading-none uppercase">
                        {designForm.logoBadge || 'ISKRA'}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center text-left min-w-0">
                      <span className="font-bold text-sm text-black tracking-tight font-display leading-tight uppercase truncate">
                        {designForm.logoText || 'МАГАЗИН'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 tracking-tight leading-tight truncate">
                        {designForm.logoSubtitle || 'Магазин надійних рішень'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Hero Banner Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Flame className="w-4 h-4" />
                </div>
                <span>2. Головний Hero-банер вітрини (перший екран)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Титульний блок
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Верхній бейдж над заголовком
                  </label>
                  <input
                    type="text"
                    placeholder="Інтернет-магазин"
                    value={designForm.heroBadge || ''}
                    onChange={(e) => setDesignForm({ ...designForm, heroBadge: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Міні-напис над великим заголовком.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Місто / Регіон на банері
                  </label>
                  <input
                    type="text"
                    placeholder="с-ще. Оратів, Вінницька обл."
                    value={designForm.heroCity || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDesignForm({ ...designForm, heroCity: val });
                      setSettingsForm({ ...settingsForm, city: val });
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Геолокація або підпис розташування складу/магазину.</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Головний заголовок банера (H1)
                </label>
                <input
                  type="text"
                  value={designForm.heroTitle}
                  onChange={(e) => setDesignForm({ ...designForm, heroTitle: e.target.value })}
                  placeholder="Надійна Сантехніка та Електротовари"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 text-sm shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Опис на головному банері
                </label>
                <textarea
                  rows={2}
                  value={designForm.heroDesc}
                  onChange={(e) => setDesignForm({ ...designForm, heroDesc: e.target.value })}
                  placeholder="Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-xs leading-relaxed"
                />
              </div>

              {/* Live Hero Banner Card Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Попередній вигляд першого екрана:</span>
                  <span className="text-purple-600 font-bold">● Hero-блок сайту</span>
                </div>

                <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Badge & City */}
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>{designForm.heroBadge || 'Інтернет-магазин'}</span>
                    {(designForm.heroCity || settingsForm.city) && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-300 normal-case">{designForm.heroCity || settingsForm.city}</span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-2xl font-black font-display text-white leading-tight">
                    {designForm.heroTitle || 'Надійна Сантехніка та Електротовари'}
                  </h2>

                  {/* Desc */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    {designForm.heroDesc || 'Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома.'}
                  </p>

                  {/* Buttons simulation */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <span className="inline-flex items-center gap-1.5 bg-red-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>Переглянути хіти продажу</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-700">
                      <Phone className="w-3.5 h-3.5 text-red-400" />
                      <span>{settingsForm.phone || siteSettings.phone || '+38 (068) 000-00-00'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Store Contact Details & Address */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Phone className="w-4 h-4" />
                </div>
                <span>3. Контактні дані, графік роботи та адреса магазину</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Контакти & Локація
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Phone */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Головний телефон для замовлень & дзвінків
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    placeholder="+38 (068) 000-00-00"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Використовується для прямих дзвінків покупців на сайті.</p>
              </div>

              {/* Work Hours */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Графік та години роботи
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="text"
                    value={settingsForm.workHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workHours: e.target.value })}
                    placeholder="Пн-Нд: 08:00 - 20:00 (без вихідних)"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Режим прийому дзвінків та обробки онлайн-замовлень.</p>
              </div>

              {/* City */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Місто / Населений пункт
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4 text-red-500" />
                  </div>
                  <input
                    type="text"
                    value={settingsForm.city}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettingsForm({ ...settingsForm, city: val });
                      setDesignForm({ ...designForm, heroCity: val });
                    }}
                    placeholder="с-ще. Оратів, Вінницька обл."
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Локація магазину / основного складу.</p>
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Адреса магазину / Пункту самовивозу
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    placeholder="вул. Котляревського, 2"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Точна фізична адреса для клієнтів у футері та контактах.</p>
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Офіційний E-mail магазину
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 text-rose-500" />
                  </div>
                  <input
                    type="email"
                    value={settingsForm.email || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettingsForm({ ...settingsForm, email: val, fopEmail: val });
                    }}
                    placeholder="iskra.shop.ua@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Для листування, запитів комерційних пропозицій та рахунків-фактур.</p>
              </div>
            </div>

            {/* Live Contacts & Location Preview */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Попередній вигляд контактного блоку (Футер сайту):</span>
                <span className="text-emerald-600 font-bold">● Контакти магазину</span>
              </div>

              <div className="p-5 bg-slate-950 text-slate-300 rounded-2xl border border-slate-900 shadow-md space-y-3.5 max-w-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-900">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    Контакти магазину
                  </h4>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Приймаємо замовлення
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Address */}
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Адреса магазину / Самовивіз:</span>
                      <span className="text-white font-bold">
                        {settingsForm.city || 'с-ще. Оратів'}, {settingsForm.address || 'вул. Котляревського, 2'}
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Телефон для замовлень:</span>
                      <a 
                        href={`tel:${(settingsForm.phone || '+38 (096) 647-36-67').replace(/[^0-9+]/g, '')}`} 
                        className="text-red-400 hover:text-red-300 font-bold font-mono text-sm"
                      >
                        {settingsForm.phone || '+38 (096) 647-36-67'}
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">E-mail:</span>
                      <a 
                        href={`mailto:${settingsForm.email || 'iskra.shop.ua@gmail.com'}`} 
                        className="text-slate-200 hover:text-red-400 font-mono"
                      >
                        {settingsForm.email || 'iskra.shop.ua@gmail.com'}
                      </a>
                    </div>
                  </div>

                  {/* Work Hours */}
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Графік роботи:</span>
                      <span className="text-slate-200">
                        {settingsForm.workHours || 'Пн-Пт: 08:00 - 17:00, Сб: 08:00 - 15:00, Нд: Вихідний'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Footer Brand Description & Trust Advantages */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>4. Інформаційний блок футера (Опис магазину, логотип та гарантії)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Нижній колонтитул
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Footer Store Description */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Опис спеціалізації магазину у футері
                </label>
                <textarea
                  rows={2}
                  value={designForm.footerDesc || ''}
                  onChange={(e) => setDesignForm({ ...designForm, footerDesc: e.target.value })}
                  placeholder="Спеціалізований інтернет-магазин та точка продажу інверторів, акумуляторів, сонячного, електромонтажного та сантехнічного обладнання."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-xs leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Короткий опис під логотипом про асортимент та напрямок магазину.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trust 1: Delivery */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-500" />
                    <span>Перевага 1 (Доставка)</span>
                  </label>
                  <input
                    type="text"
                    value={designForm.footerTrust1 || ''}
                    onChange={(e) => setDesignForm({ ...designForm, footerTrust1: e.target.value })}
                    placeholder="Доставка Новою Поштою по всій Україні"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {/* Trust 2: Warranty */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Перевага 2 (Гарантія)</span>
                  </label>
                  <input
                    type="text"
                    value={designForm.footerTrust2 || ''}
                    onChange={(e) => setDesignForm({ ...designForm, footerTrust2: e.target.value })}
                    placeholder="Офіційна заводська гарантія (12–60 міс.)"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Live Footer Brand & Trust Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Попередній вигляд блоку футера сайту:</span>
                  <span className="text-red-500 font-bold">● Футер сайту (Колонка 1)</span>
                </div>

                <div className="p-5 bg-slate-950 text-slate-300 rounded-2xl border border-slate-900 shadow-md space-y-4 max-w-xl">
                  {/* Brand header */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center bg-[#e5001e] text-white px-2.5 py-1.5 rounded-[6px] text-sm font-black tracking-tight shrink-0 shadow-xs">
                      <span className="font-black text-white text-[15px] tracking-[0.05em] font-display leading-none transform scale-y-110 scale-x-105 inline-block uppercase select-none">
                        {designForm.logoBadge || 'ISKRA'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-white tracking-tight font-display leading-tight uppercase">
                        {designForm.logoText || 'МАГАЗИН'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 tracking-tight leading-tight">
                        {designForm.logoSubtitle || 'Магазин надійних рішень'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {designForm.footerDesc || 'Спеціалізований інтернет-магазин та точка продажу інверторів, акумуляторів, сонячного, електромонтажного та сантехнічного обладнання.'}
                  </p>

                  {/* Trust Points */}
                  <div className="pt-1 text-xs space-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>{designForm.footerTrust1 || 'Доставка Новою Поштою по всій Україні'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{designForm.footerTrust2 || 'Офіційна заводська гарантія (12–60 міс.)'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDesignForm({
                  bgColor: 'bg-slate-900',
                  logoBadge: 'ISKRA',
                  logoText: 'МАГАЗИН',
                  logoSubtitle: 'Магазин надійних рішень',
                  promoActive: true,
                  promoText: '🔥 Знижка -10% при замовленні від 1000 грн! Встигніть оформити замовлення!',
                  heroBadge: 'Інтернет-магазин',
                  heroTitle: 'Надійна Сантехніка та Електротовари',
                  heroDesc: 'Найбільший асортимент товарів для ремонту, монтажу та будівництва у вас вдома.',
                  heroAddress: 'Вінницька обл., с-ще. Оратів',
                  heroCity: 'с-ще. Оратів, Вінницька обл.'
                });
                showToast('Значення дизайну скинуто до початкових', 'info');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 w-full sm:w-auto text-center"
            >
              Скинути до стандартних
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти весь дизайн, контакти та банери</span>
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
            showToast('Telegram-бот та SMS-сервіси успішно збережено!', 'success');
          }}
          className="space-y-6 max-w-5xl animate-in fade-in duration-200"
        >
          {/* Top Master Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 sm:p-8 text-white shadow-2xl border border-sky-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Миттєві сповіщення & Месенджери</span>
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-inner ${
                    settingsForm.botToken && settingsForm.chatId
                      ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                      : 'bg-amber-500/20 border border-amber-400/30 text-amber-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settingsForm.botToken && settingsForm.chatId ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <span>{settingsForm.botToken && settingsForm.chatId ? 'Telegram Бот: Активний' : 'Telegram Бот: Потребує ключів'}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold shadow-inner">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>SMS: {settingsForm.smsGateway && settingsForm.smsGateway !== 'none' ? settingsForm.smsGateway.toUpperCase() : '1-Клік Free'}</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Telegram-бот та SMS-сповіщення</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Центр зв'язку та авто-сповіщень магазину <strong>ISKRA</strong>. Отримуйте миттєві інтерактивні картки замовлень у Telegram, підключайте SMS-шлюзи (TurboSMS, SMS-Fly, AlphaSMS) та керуйте кнопками прямого зв'язку покупців.
                </p>

                {/* Status Badges Bar */}
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400">Швидкість сповіщень:</span>
                    <span className="text-white font-extrabold">&lt; 1 секунди</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Захист каналу:</span>
                    <span className="text-emerald-300 font-extrabold">SSL / Bot API 2.0</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={isTestingTelegram}
                  onClick={async () => {
                    if (!settingsForm.botToken || !settingsForm.chatId) {
                      showToast('Введіть Bot Token та Chat ID у Секції 1 для перевірки з\'єднання', 'error');
                      return;
                    }
                    setIsTestingTelegram(true);
                    updateSiteSettings(settingsForm);

                    try {
                      const success = await sendTelegramAlert(
                        settingsForm.botToken,
                        settingsForm.chatId,
                        "⚡ *ТЕСТОВЕ СПОВІЩЕННЯ ВІД МАТЕРИНСЬКОЇ СИСТЕМИ ISKRA*\n\n✅ З'єднання з Telegram-ботом налаштовано успішно!\n\n🛍️ Тепер усі нові замовлення, дзвінки та запити на консультацію будуть миттєво надходити сюди у вигляді детальних карточок."
                      );
                      if (success) {
                        showToast('✅ Тестове повідомлення надіслано в Telegram та налаштування збережено!', 'success');
                      } else {
                        showToast('❌ Помилка надсилання в Telegram (перевірте токен, chat ID та чи натиснутий START у боті)', 'error');
                      }
                    } catch {
                      showToast('Помилка відправки в Telegram', 'error');
                    } finally {
                      setIsTestingTelegram(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs font-bold rounded-xl transition-all border border-sky-400/30 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isTestingTelegram ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-sky-300" />
                  )}
                  <span>Тест бота в Telegram</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Зберегти налаштування</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Telegram Bot Integration */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    1. Миттєві сповіщення про замовлення у Telegram
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Отримуйте картку покупця, склад та кошик прямо в приватний чат або групу співробітників
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                settingsForm.botToken && settingsForm.chatId ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {settingsForm.botToken && settingsForm.chatId ? '● Бот підключено' : '○ Очікує налаштування'}
              </span>
            </div>

            {/* Quick Setup Instructions Box */}
            <div className="p-4 bg-gradient-to-r from-sky-50/90 via-blue-50/50 to-slate-50/80 rounded-2xl border border-sky-100 text-xs text-slate-700 space-y-2.5">
              <div className="font-extrabold text-sky-950 flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Як підключити Telegram-бота за 3 простих кроки:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white/90 rounded-xl border border-sky-100 shadow-2xs space-y-1">
                  <div className="text-[10px] font-black text-sky-600 uppercase tracking-wider">Крок 1</div>
                  <p className="text-[11px] text-slate-700 font-medium leading-normal">
                    Знайдіть <b>@BotFather</b> у Telegram, надішліть команду <code>/newbot</code> та скопіюйте отриманий <b>Bot Token</b>.
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-sky-100 shadow-2xs space-y-1">
                  <div className="text-[10px] font-black text-sky-600 uppercase tracking-wider">Крок 2</div>
                  <p className="text-[11px] text-slate-700 font-medium leading-normal">
                    Перейдіть у вашого нового бота та обов'язково натисніть кнопку <b>START</b> або <code>/start</code>.
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-sky-100 shadow-2xs space-y-1">
                  <div className="text-[10px] font-black text-sky-600 uppercase tracking-wider">Крок 3</div>
                  <p className="text-[11px] text-slate-700 font-medium leading-normal">
                    Дізнайтеся ваш <b>Chat ID</b> у бота <b>@userinfobot</b> або додайте бота в групу менеджерів (ID групи починається з мінуса, напр. <code>-100123456789</code>).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Bot Token */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Telegram Bot Token *</span>
                  <span className="text-[10px] font-mono text-slate-400">з @BotFather</span>
                </label>
                <div className="relative">
                  <input
                    type={showBotToken ? 'text' : 'password'}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={settingsForm.botToken}
                    onChange={(e) => setSettingsForm({ ...settingsForm, botToken: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Chat ID */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Telegram Chat ID (користувача або групи) *</span>
                  <span className="text-[10px] font-mono text-slate-400">з @userinfobot</span>
                </label>
                <input
                  type="text"
                  placeholder="наприклад: 987654321 або -100123456789"
                  value={settingsForm.chatId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, chatId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            {/* Live Interactive Telegram Order Card Preview */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-xs font-bold text-sky-300">Прев'ю повідомлення замовлення у вашому Telegram:</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Telegram Client Preview</span>
              </div>

              <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700/80 font-mono text-[11px] leading-relaxed text-slate-200 space-y-1 shadow-inner">
                <div className="text-sky-400 font-extrabold text-xs">🛍️ НОВЕ ЗАМОВЛЕННЯ #ISKRA-1048</div>
                <div>-----------------------------------</div>
                <div>👤 <b>Покупець:</b> Олександр Ковальчук</div>
                <div>📞 <b>Телефон:</b> +38 (068) 555-43-21</div>
                <div>📍 <b>Доставка:</b> Нова Пошта, м. Київ, відділення №12</div>
                <div>💳 <b>Спосіб оплати:</b> При отриманні (Накладений платіж)</div>
                <div>-----------------------------------</div>
                <div>📦 <b>Товари:</b></div>
                <div className="pl-2 text-emerald-300">1. Змішувач ISKRA Pro-500 — 1 шт. × 1,850 грн</div>
                <div className="pl-2 text-emerald-300">2. Кабель силовий ВВГнг 3х2.5 — 20 м × 45 грн</div>
                <div>-----------------------------------</div>
                <div className="text-amber-300 font-bold">💰 ЗАГАЛЬНА СУМА: 2,750 грн</div>
                <div className="text-slate-400 text-[10px]">⏰ Час: {new Date().toLocaleTimeString('uk-UA')}</div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={isTestingTelegram}
                  onClick={async () => {
                    if (!settingsForm.botToken || !settingsForm.chatId) {
                      showToast('Введіть Bot Token та Chat ID для відправки тестового сповіщення', 'error');
                      return;
                    }
                    setIsTestingTelegram(true);
                    updateSiteSettings(settingsForm);

                    try {
                      const success = await sendTelegramAlert(
                        settingsForm.botToken,
                        settingsForm.chatId,
                        "🛍️ *ТЕСТОВЕ ЗАМОВЛЕННЯ #ISKRA-1048*\n-----------------------------------\n👤 *Покупець:* Олександр Ковальчук\n📞 *Телефон:* +38 (068) 555-43-21\n📍 *Доставка:* Нова Пошта, м. Київ, відділення №12\n💳 *Оплата:* При отриманні\n-----------------------------------\n📦 *Товари:*\n1. Змішувач ISKRA Pro-500 — 1 шт. (1,850 грн)\n2. Кабель ВВГнг 3х2.5 — 20 м (900 грн)\n-----------------------------------\n💰 *ЗАГАЛЬНА СУМА:* 2,750 грн\n⏰ *Час:* " + new Date().toLocaleTimeString('uk-UA')
                      );
                      if (success) {
                        showToast('✅ Картку замовлення надіслано в Telegram та налаштування збережено!', 'success');
                      } else {
                        showToast('❌ Помилка надсилання в Telegram (перевірте токен, chat ID та чи натиснутий START у боті)', 'error');
                      }
                    } catch {
                      showToast('Помилка відправки в Telegram', 'error');
                    } finally {
                      setIsTestingTelegram(false);
                    }
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  {isTestingTelegram ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Надіслати тестову картку в Telegram</span>
                </button>

                <span className="text-[11px] text-slate-400 font-medium italic">
                  При натисканні тестового повідомлення параметри збережуться в БД
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SMS Gateway & Stock Notifications */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    2. SMS-сповіщення покупців (TurboSMS, SMS-Fly, AlphaSMS, 1-Клік)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Автоматичні SMS про появу товарів на складі та статуси замовлень
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Active SMS Gateway
              </span>
            </div>

            <div className="text-xs text-slate-700 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Як працює відправка SMS в магазині ISKRA:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed font-medium">
                <li><b>Швидкі кнопки 1-Клік SMS & Viber (безкоштовно):</b> У вкладці «Очікують товар» натисніть кнопку «SMS» або «Viber» — на вашому смартфоні або ПК одразу відкриється додаток з готовим текстом та номером покупця. Без жодних щомісячних плат!</li>
                <li><b>Платні SMS-шлюзи (TurboSMS, SMS-Fly, AlphaSMS):</b> Підключіть API ключ вашого оператора для повністю автоматичної масової відправки з офіційним брендовим альфа-іменем.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  SMS-провайдер розсилок
                </label>
                <select
                  value={settingsForm.smsGateway || 'none'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smsGateway: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 shadow-2xs outline-none focus:border-blue-600 font-bold"
                >
                  <option value="none">Швидкі кнопки 1-клік SMS & Viber (Рекомендовано, безкоштовно)</option>
                  <option value="turbosms">TurboSMS (api.turbosms.ua)</option>
                  <option value="smsfly">SMS-Fly (sms-fly.ua)</option>
                  <option value="alphasms">AlphaSMS (alphasms.ua)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Підпис відправника (Альфа-ім'я)
                </label>
                <input
                  type="text"
                  placeholder="наприклад: ISKRA"
                  value={settingsForm.smsSenderName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smsSenderName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 shadow-2xs outline-none focus:border-blue-600 font-bold"
                />
              </div>
            </div>

            {settingsForm.smsGateway && settingsForm.smsGateway !== 'none' && (
              <div className="animate-in fade-in text-xs">
                <label className="block font-bold text-slate-800 mb-1">
                  API Ключ (Токен доступу) {settingsForm.smsGateway.toUpperCase()}
                </label>
                <div className="relative">
                  <input
                    type={showSmsApiKey ? 'text' : 'password'}
                    placeholder={`Вставте приватний API ключ від ${settingsForm.smsGateway}`}
                    value={settingsForm.smsApiKey || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smsApiKey: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showSmsApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Template & Smartphone Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs pt-2">
              {/* Left 2 Cols: Template Config */}
              <div className="lg:col-span-2 space-y-2">
                <label className="block font-bold text-slate-800">
                  Шаблон SMS про появу товару в наявності
                </label>
                <textarea
                  rows={4}
                  value={settingsForm.smsStockAlertTemplate || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smsStockAlertTemplate: e.target.value })}
                  placeholder={`⚡ Магазин ISKRA\nВітаємо! Товар «{product}» знову в наявності ({price} грн). Замовляйте на сайті або телефонуйте!`}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 shadow-2xs outline-none focus:border-blue-600 leading-relaxed font-medium"
                />

                {/* Clickable Variable Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Вставити змінну:</span>
                  {[
                    { tag: '{product}', label: '{product} — назва товару' },
                    { tag: '{price}', label: '{price} — ціна' },
                    { tag: '{name}', label: '{name} — ім\'я клієнта' }
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => {
                        const cur = settingsForm.smsStockAlertTemplate || '';
                        setSettingsForm({ ...settingsForm, smsStockAlertTemplate: cur + ' ' + v.tag });
                      }}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-[11px] font-mono text-blue-700 transition-all cursor-pointer font-bold active:scale-95"
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Col: Smartphone Frame Preview */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between text-white shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-sky-400" />
                      <span>Прев'ю SMS покупця</span>
                    </span>
                    <span className="font-bold text-sky-300">{settingsForm.smsSenderName || 'ISKRA'}</span>
                  </div>

                  <div className="p-3 bg-slate-800/90 rounded-xl text-[11px] leading-relaxed font-sans text-slate-200 border border-slate-700/60 shadow-inner">
                    {(settingsForm.smsStockAlertTemplate || `⚡ Магазин ISKRA\nВітаємо! Товар «{product}» знову в наявності ({price} грн).`)
                      .replace('{product}', 'Змішувач ISKRA Pro-500')
                      .replace('{price}', '1,850 грн')
                      .replace('{name}', 'Іван')}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono text-right pt-2">
                  1 повідомлення (GSM 7-bit)
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Quick Consultation & Callback Notifications */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    3. Швидка консультація, месенджери та зворотний дзвінок (Callback)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Налаштуйте прямий зв'язок покупців через Viber/Telegram та сповіщення менеджерів
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                (settingsForm.callbackTelegramNotify ?? true) ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {(settingsForm.callbackTelegramNotify ?? true) ? '● Callback в Telegram: Увімкнено' : '○ Вимкнено'}
              </span>
            </div>

            {/* Sub-section A: Direct Messenger Channels for Buyers */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <h5 className="font-extrabold text-xs text-slate-900">
                    Прямі канали зв'язку у віджеті консультації (Прямий чат з консультантом)
                  </h5>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Клієнт пише у 1 клік
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Viber */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                    <span>Viber номер для консультацій покупців</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={settingsForm.viber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, viber: e.target.value })}
                      placeholder="+38 (068) 000-00-00"
                      className="w-full pl-3.5 pr-16 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                    {settingsForm.viber && (
                      <a
                        href={`viber://chat?number=${settingsForm.viber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-y-1.5 right-1.5 px-2.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        Тест
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Відкриває прямий чат у Viber при кліку на віджет консультації.
                  </p>
                </div>

                {/* Telegram Username */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-500" />
                    <span>Telegram канал або прямий юзернейм</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={settingsForm.telegram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                      placeholder="@iskra_shop або t.me/iskra_shop"
                      className="w-full pl-3.5 pr-16 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                    {settingsForm.telegram && (
                      <a
                        href={settingsForm.telegram.startsWith('http') ? settingsForm.telegram : `https://t.me/${settingsForm.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-y-1.5 right-1.5 px-2.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        Тест
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Відкриває прямий діалог в Telegram із консультантом.
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-section B: Callback Button Text and Telegram Notifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Callback Button Text */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Текст кнопки у віджеті консультації
                </label>
                <input
                  type="text"
                  placeholder="наприклад: Замовити дзвінок за 30 сек"
                  value={settingsForm.callbackText || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, callbackText: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Швидкі варіанти:</span>
                  {[
                    'Замовити дзвінок за 30 сек',
                    'Швидка консультація',
                    'Передзвоніть мені',
                    'Консультація спеціаліста'
                  ].map((txt) => (
                    <button
                      key={txt}
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, callbackText: txt })}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-md text-[10px] text-slate-700 transition-all cursor-pointer font-medium"
                    >
                      {txt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle: Telegram Notification for Callbacks */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-slate-900 block text-xs font-bold">Надсилати запити Callback у Telegram-бот</b>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Миттєве сповіщення менеджерам з ім'ям, телефоном та темою
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, callbackTelegramNotify: !(settingsForm.callbackTelegramNotify ?? true) })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      (settingsForm.callbackTelegramNotify ?? true) ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (settingsForm.callbackTelegramNotify ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Використовує Bot Token та Chat ID</span>
                  <button
                    type="button"
                    disabled={isTestingTelegram}
                    onClick={async () => {
                      if (!settingsForm.botToken || !settingsForm.chatId) {
                        showToast('Введіть Bot Token та Chat ID у Секції 1 для перевірки зв\'язку', 'error');
                        return;
                      }
                      setIsTestingTelegram(true);
                      updateSiteSettings(settingsForm);
                      try {
                        const success = await sendTelegramAlert(
                          settingsForm.botToken,
                          settingsForm.chatId,
                          "⚡ *ТЕСТОВИЙ ЗАПИТ НА ШВИДКУ КОНСУЛЬТАЦІЮ!*\n\n👤 *Ім'я:* Тестовий клієнт\n📞 *Телефон:* +38 (068) 000-00-00\n📌 *Тема:* Сантехніка та електрика ISKRA\n⏰ *Час:* " + new Date().toLocaleTimeString('uk-UA')
                        );
                        if (success) {
                          showToast('✅ Тестове сповіщення консультації надіслано в Telegram!', 'success');
                        } else {
                          showToast('❌ Помилка надсилання в Telegram (перевірте токен і chat ID)', 'error');
                        }
                      } catch {
                        showToast('Помилка відправки в Telegram', 'error');
                      } finally {
                        setIsTestingTelegram(false);
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3 h-3" />
                    <span>Тест Callback у Telegram</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-row: Auto SMS Template to Buyer on Callback */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Шаблон SMS-підтвердження покупцеві при замовленні консультації</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {settingsForm.callbackAutoSmsEnabled ? 'SMS активно' : 'SMS вимкнено'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, callbackAutoSmsEnabled: !settingsForm.callbackAutoSmsEnabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      settingsForm.callbackAutoSmsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        settingsForm.callbackAutoSmsEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={settingsForm.callbackSmsTemplate || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, callbackSmsTemplate: e.target.value })}
                placeholder="⚡ Магазин ISKRA&#10;Дякуємо за запит на консультацію! Наш фахівець зв'яжеться з вами протягом 2-3 хвилин."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 shadow-2xs outline-none focus:border-emerald-600 leading-relaxed font-medium"
              />
            </div>
          </div>

          {/* Sticky Bottom Action Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSettingsForm(siteSettings);
                showToast('Налаштування скинуто до збережених', 'info');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 w-full sm:w-auto text-center"
            >
              Скасувати незбережені зміни
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти налаштування Telegram & SMS</span>
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
          className="space-y-6 max-w-5xl animate-in fade-in duration-150"
        >
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-6 sm:p-8 text-white shadow-xl border border-red-500/30">
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-red-400" />
                  <span>Логістичний центр · Доставка по всій Україні</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                  Інтеграція служб доставки
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Повна автоматизація логістики інтернет-магазину <span className="font-bold text-amber-400">ISKRA</span>. Автоматичний підбір міст, відділень та поштоматів Нової Пошти, поштових індексів Укрпошти та самовивозу.
                </p>
              </div>

              {/* Status KPI mini cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
                <div className="bg-slate-800/80 backdrop-blur-xs p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Нова Пошта</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>20 000+ точок</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-0.5">Відділення & Поштомати</div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur-xs p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Укрпошта</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>28 000+ індексів</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-0.5">Експрес / Стандарт</div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur-xs p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Самовивіз</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Оратів</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">0 грн (Безкоштовно)</div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur-xs p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Безкоштовно від</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <span>{settingsForm.features?.freeShippingThreshold ?? 3000} грн</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Поріг доставки</div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN DELIVERY PROVIDERS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. NOVA POSHTA CARD */}
            <div className="bg-white rounded-3xl border border-red-200 shadow-md overflow-hidden flex flex-col justify-between">
              <div>
                {/* Provider Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white text-red-600 font-black text-sm flex items-center justify-center shadow-md">
                      НП
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black tracking-tight text-white">Нова Пошта</h4>
                        <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold">API v2.0</span>
                      </div>
                      <p className="text-xs text-red-100 mt-0.5">Відділення, поштомати та кур'єрська доставка</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Активно</span>
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Supported Methods */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Доступні формати доставки для покупця:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-center">
                        <Boxes className="w-4 h-4 text-red-600 mx-auto mb-1" />
                        <span className="font-bold text-slate-800 block text-[11px]">Відділення</span>
                        <span className="text-[10px] text-slate-500">до 30 кг / вантажні</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-center">
                        <Package className="w-4 h-4 text-red-600 mx-auto mb-1" />
                        <span className="font-bold text-slate-800 block text-[11px]">Поштомати</span>
                        <span className="text-[10px] text-slate-500">до 20 кг</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-center">
                        <Navigation className="w-4 h-4 text-red-600 mx-auto mb-1" />
                        <span className="font-bold text-slate-800 block text-[11px]">Кур'єр</span>
                        <span className="text-[10px] text-slate-500">до дверей</span>
                      </div>
                    </div>
                  </div>

                  {/* API Key Configuration */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-red-600" />
                        <span>API Ключ Нової Пошти (32 символи)</span>
                      </label>
                      <a
                        href="https://my.novaposhta.ua/settings/index#api"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Кабінет my.novaposhta.ua</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showNpApiKey ? 'text' : 'password'}
                        placeholder="Введіть 32-значний ключ API Нової Пошти..."
                        value={settingsForm.novaPoshtaApiKey || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, novaPoshtaApiKey: e.target.value })}
                        className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all shadow-inner"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowNpApiKey(!showNpApiKey)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title={showNpApiKey ? 'Приховати ключ' : 'Показати ключ'}
                        >
                          {showNpApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {settingsForm.novaPoshtaApiKey && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(settingsForm.novaPoshtaApiKey || '');
                              setCopyDeliveryFeedback('np_key');
                              setTimeout(() => setCopyDeliveryFeedback(null), 2000);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Скопіювати ключ"
                          >
                            {copyDeliveryFeedback === 'np_key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        При наявності ключа список відділень та поштоматів синхронізується безпосередньо з серверами Нової Пошти в режимі реального часу. Якщо ключ не вказано — активується швидка локальна база популярних міст та відділень.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Live NP Tester */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-red-600" />
                        <span>Тестування онлайн-пошуку міст та відділень НП:</span>
                      </span>
                      {selectedNpTestCity && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNpTestCity(null);
                            setNpWarehouseTestResults([]);
                          }}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Очистити вибір
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Введіть назву міста (напр. Вінниця, Оратів, Київ, Львів)..."
                        value={npCityTestQuery}
                        onChange={(e) => setNpCityTestQuery(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-red-600 font-medium"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!npCityTestQuery.trim()) return;
                          setIsTestingNp(true);
                          try {
                            const cities = await searchNovaPoshtaCities(npCityTestQuery, settingsForm.novaPoshtaApiKey);
                            setNpCityTestResults(cities);
                            setSelectedNpTestCity(null);
                            setNpWarehouseTestResults([]);
                            showToast(`Знайдено ${cities.length} населених пунктів`, 'info');
                          } catch (err) {
                            console.warn(err);
                          } finally {
                            setIsTestingNp(false);
                          }
                        }}
                        disabled={isTestingNp}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingNp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Пошук</span>
                      </button>
                    </div>

                    {/* City Results */}
                    {npCityTestResults.length > 0 && !selectedNpTestCity && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Оберіть місто для завантаження відділень ({npCityTestResults.length}):
                        </div>
                        {npCityTestResults.slice(0, 6).map((c) => (
                          <div
                            key={c.ref || c.name + c.area}
                            onClick={async () => {
                              setSelectedNpTestCity(c);
                              setIsTestingNpWh(true);
                              try {
                                const whs = await getNovaPoshtaWarehouses(c.ref || c.name, 'all', settingsForm.novaPoshtaApiKey);
                                setNpWarehouseTestResults(whs);
                              } catch (err) {
                                console.warn(err);
                              } finally {
                                setIsTestingNpWh(false);
                              }
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-red-50 hover:border-red-200 border border-slate-200 text-xs flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="font-bold text-slate-900">{c.name}</span>
                              <span className="text-[11px] text-slate-500">({c.area || c.region || 'Україна'})</span>
                            </div>
                            <span className="text-[10px] text-red-600 font-bold">Відділення &rarr;</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warehouse Results for Selected City */}
                    {selectedNpTestCity && (
                      <div className="p-3 bg-red-50/50 rounded-2xl border border-red-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-600" />
                            <span>{selectedNpTestCity.name} ({npWarehouseTestResults.length} відділень / поштоматів):</span>
                          </span>
                          {isTestingNpWh && <RefreshCw className="w-3.5 h-3.5 text-red-600 animate-spin" />}
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {npWarehouseTestResults.slice(0, 5).map((wh) => (
                            <div key={wh.ref || wh.number + wh.name} className="p-2 rounded-xl bg-white border border-red-100 text-xs">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-mono font-bold">
                                  №{wh.number}
                                </span>
                                <span className="truncate">{wh.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {wh.type === 'postomat' ? '📦 Поштомат (до 20 кг)' : '🏢 Відділення (до 30 кг / вантажне)'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. UKRPOSHTA CARD */}
            <div className="bg-white rounded-3xl border border-amber-200 shadow-md overflow-hidden flex flex-col justify-between">
              <div>
                {/* Provider Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 font-black text-sm flex items-center justify-center shadow-md">
                      УП
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black tracking-tight text-slate-950">Укрпошта</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-950/20 text-slate-950 text-[10px] font-bold">Експрес & Стандарт</span>
                      </div>
                      <p className="text-xs text-amber-950/80 mt-0.5">Найбільша мережа відділень у кожному селі</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/15 text-slate-950 border border-slate-950/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                    <span>База 28 000+ індексів</span>
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Feature Highlights */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Переваги підключеного модуля Укрпошти:</span>
                    </div>
                    <ul className="space-y-1 text-slate-700 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><b>Миттєвий автопідбір:</b> введення 5 цифр індексу (напр. 22600) одразу визначає населений пункт та відділення.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><b>Пошук міст і сіл:</b> Оратів, Чагів, Животівка, Романівка, Вінниця, Київ тощо.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><b>Економічна доставка:</b> доступні тарифи для габаритних та дрібних замовлень.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Ukrposhta Bearer Token */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Персональний eComm Bearer токен (необов'язково)</span>
                      </label>
                      <a
                        href="https://ecom.ukrposhta.ua/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>ecom.ukrposhta.ua</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showUpToken ? 'text' : 'password'}
                        placeholder="Введіть eComm Bearer токен з кабінету Укрпошти..."
                        value={settingsForm.ukrposhtaToken || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, ukrposhtaToken: e.target.value })}
                        className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowUpToken(!showUpToken)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title={showUpToken ? 'Приховати токен' : 'Показати токен'}
                        >
                          {showUpToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {settingsForm.ukrposhtaToken && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(settingsForm.ukrposhtaToken || '');
                              setCopyDeliveryFeedback('up_token');
                              setTimeout(() => setCopyDeliveryFeedback(null), 2000);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                            title="Скопіювати токен"
                          >
                            {copyDeliveryFeedback === 'up_token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Якщо токен не введено, працює швидка вбудована база всіх поштових індексів та відділень України без затримок і збоїв зв'язку.
                    </p>
                  </div>

                  {/* Interactive Live UP Tester */}
                  <div className="pt-2 space-y-3">
                    <span className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-600" />
                      <span>Тестування пошуку відділення за індексом або назвою:</span>
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Введіть індекс або назву (напр. 22600, Оратів, Вінниця, 01001)..."
                        value={upTestQuery}
                        onChange={(e) => setUpTestQuery(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-amber-500 font-medium"
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
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Перевірити</span>
                      </button>
                    </div>

                    {upTestResults.length > 0 && (
                      <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200 max-h-48 overflow-y-auto space-y-2">
                        <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                          Результати пошуку ({upTestResults.length}):
                        </div>
                        {upTestResults.slice(0, 5).map((it) => (
                          <div key={it.postcode + it.address} className="p-2.5 rounded-xl bg-white border border-amber-200/80 text-xs flex items-start gap-2.5 shadow-2xs">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs shrink-0 mt-0.5 shadow-xs">
                              {it.postcode}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900">{it.city} <span className="text-slate-500 font-normal">({it.region})</span></div>
                              <div className="text-[11px] text-slate-600 mt-0.5">{it.name}: {it.address}</div>
                              {it.workHours && <div className="text-[10px] text-slate-400 mt-0.5">Графік: {it.workHours}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. STORE PICK-UP & LOGISTICS RULES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Self-Pickup Settings */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Самовивіз з магазину (Iskra Shop)</h4>
                    <p className="text-xs text-slate-500">Пункт видачі інтернет-замовлень</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Безкоштовно (0 грн)
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Адреса точки видачі:</span>
                      <span className="text-slate-600">с-ще. Оратів, вул. Котляревського, 2 (Вінницька обл.)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Графік видачі замовлень:</span>
                      <span className="text-slate-600">Пн-Пт: 08:00 - 17:00, Сб: 08:00 - 15:00, Нд: Вихідний</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Покупець може забрати товар одразу після оформлення або після телефонного підтвердження менеджером.
                </div>
              </div>
            </div>

            {/* Free Delivery Threshold & Tariff rules */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Поріг безкоштовної доставки</h4>
                    <p className="text-xs text-slate-500">Маркетинговий стимул збільшення середнього чека</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Активно в кошику
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Мінімальна сума замовлення для безкоштовної доставки (грн):
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={settingsForm.features?.freeShippingThreshold ?? 3000}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        features: {
                          ...settingsForm.features,
                          freeShippingThreshold: Number(e.target.value) || 0
                        }
                      })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="absolute right-4 text-xs font-bold text-slate-400">грн</span>
                  </div>
                </div>

                {/* Quick preset buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Швидкий вибір суми:</span>
                  <div className="flex flex-wrap gap-2">
                    {[1500, 2000, 3000, 4000, 5000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setSettingsForm({
                          ...settingsForm,
                          features: {
                            ...settingsForm.features,
                            freeShippingThreshold: amount
                          }
                        })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (settingsForm.features?.freeShippingThreshold ?? 3000) === amount
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {amount} грн
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    При замовленні від <b>{settingsForm.features?.freeShippingThreshold ?? 3000} грн</b> у кошику клієнта з'являється зелений бейдж <b>«Безкоштовна доставка»</b>.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. LIVE CHECKOUT DELIVERY SIMULATOR */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    Попередній вигляд блоку доставки для покупця (Checkout Live Simulator)
                  </h4>
                  <p className="text-xs text-slate-400">Так виглядає крок вибору способу доставки у формі замовлення на сайті</p>
                </div>
              </div>

              {/* Delivery type preview switcher */}
              <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryActivePreviewTab('np')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    deliveryActivePreviewTab === 'np' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Нова Пошта</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryActivePreviewTab('up')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    deliveryActivePreviewTab === 'up' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Укрпошта</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryActivePreviewTab('pickup')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    deliveryActivePreviewTab === 'pickup' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Самовивіз</span>
                </button>
              </div>
            </div>

            {/* Simulated UI container */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              {deliveryActivePreviewTab === 'np' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Нова Пошта (доставка 1-2 дні)</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">за тарифами перевізника (~80 грн)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">1. Населений пункт:</span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>смт. Оратів (Вінницька обл.)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">2. Відділення або поштомат:</span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-red-500" />
                        <span>Відділення №1 (вул. Героїв Майдану, 72)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {deliveryActivePreviewTab === 'up' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Укрпошта Експрес / Стандарт (доставка 2-4 дні)</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">від 45 грн</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Поштовий індекс:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">22600</span>
                      <span className="text-slate-300 ml-2 font-medium">с-ще. Оратів, Вінницька обл. (ВПЗ Оратів)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      Автопідбір 100%
                    </span>
                  </div>
                </div>
              )}

              {deliveryActivePreviewTab === 'pickup' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>Самовивіз з точки продажу ISKRA</span>
                    </span>
                    <span className="text-emerald-400 font-bold text-xs">0 грн (Безкоштовно)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-300 font-semibold">
                      с-ще. Оратів, вул. Котляревського, 2 · Точка продажу інверторів, акумуляторів та сантехніки
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Готовність до видачі: 15-30 хвилин після підтвердження замовлення.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  Служби доставки готові до роботи
                </div>
                <div className="text-[11px] text-slate-400">
                  Нова Пошта (API) · Укрпошта (Індекси) · Самовивіз (Оратів)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/25 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Зберегти налаштування служб доставки</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB: ONLINE PAYMENTS (WayForPay, Monobank, LiqPay, Apple Pay & Google Pay) */}
      {activeTab === 'payments' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSiteSettings(settingsForm);
            showToast('Налаштування онлайн-оплати та банківських реквізитів успішно збережено!', 'success');
          }}
          className="space-y-6 max-w-4xl"
        >
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/30">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Онлайн-еквайринг 24/7</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PCI DSS Level 1 • 3D-Secure 2.0</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-inner">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <span>Онлайн-оплата: Apple Pay, Google Pay та картки</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Миттєвий прийом платежів від клієнтів в 1 клік з карток будь-яких банків (Visa, Mastercard, Простір), через 
                  <strong className="text-white font-bold"> Apple Pay</strong>, <strong className="text-white font-bold">Google Pay</strong> та додаток <strong className="text-white font-bold">monobank</strong> з автоматичною фіксацією статусу «Оплачено» в базі замовлень.
                </p>
              </div>

              {/* Live Status Card */}
              <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 min-w-[220px] shadow-lg">
                <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                  Поточний активний шлюз:
                </div>
                <div className="text-base font-black text-emerald-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  {settingsForm.paymentGateway === 'monobank'
                    ? 'Monobank (monoPay)'
                    : settingsForm.paymentGateway === 'liqpay'
                    ? 'LiqPay (ПриватБанк)'
                    : 'WayForPay (Рекомендовано)'}
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-700/70 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Статус ключів:</span>
                  {(settingsForm.paymentGateway === 'monobank' && settingsForm.monobankToken) ||
                  (settingsForm.paymentGateway !== 'monobank' && settingsForm.paymentMerchantId && settingsForm.paymentSecretKey) ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Активний
                    </span>
                  ) : (
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Потрібні ключі
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Payment Logos Row */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Підтримувані методи:</span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold text-white border border-white/10 flex items-center gap-1.5">
                  <span>Pay</span> Apple Pay
                </span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold text-white border border-white/10 flex items-center gap-1.5">
                  <span className="text-blue-400 font-black">G</span>Pay Google Pay
                </span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold text-white border border-white/10">
                  Visa & Mastercard
                </span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold text-white border border-white/10">
                  monoPay / Приват24
                </span>
              </div>
              <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" /> 256-bit SSL захист
              </div>
            </div>
          </div>

          {/* Step 1: Provider Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">1</span>
                  <span>Оберіть платіжний сервіс (еквайринг)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Усі платежі надходять безпосередньо на ваш розрахунковий рахунок ФОП або ТОВ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* WayForPay Card */}
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'wayforpay' })}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  settingsForm.paymentGateway === 'wayforpay'
                    ? 'border-emerald-500 bg-gradient-to-b from-emerald-50/90 to-white ring-2 ring-emerald-500/30 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                {settingsForm.paymentGateway === 'wayforpay' && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                    АКТИВНИЙ
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      W
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 leading-tight">WayForPay</div>
                      <div className="text-[10px] font-semibold text-emerald-700">Універсальний шлюз</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Найпопулярніший платіжний агрегатор в Україні. Включає Apple Pay, Google Pay, Visa/Mastercard, розстрочку та інтеграцію з ПРРО.
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Apple Pay & Google Pay</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Картки будь-яких банків</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Миттєве зарахування на рахунок</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Комісія сервісу:</span>
                  <span className="font-bold text-slate-900">від 2.0%</span>
                </div>
              </button>

              {/* Monobank Card */}
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'monobank' })}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  settingsForm.paymentGateway === 'monobank'
                    ? 'border-slate-900 bg-gradient-to-b from-slate-100 to-white ring-2 ring-slate-900/30 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                {settingsForm.paymentGateway === 'monobank' && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white shadow-xs">
                    АКТИВНИЙ
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      M
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 leading-tight">Monobank (monoPay)</div>
                      <div className="text-[10px] font-semibold text-slate-600">Інтернет-еквайринг</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Швидка та зручна оплата через застосунок Monobank в 1 клік або за QR-кодом для десктопу. Мінімальна комісія.
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                      <span>Оплата в 1 клік через mono-додаток</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                      <span>Apple Pay & Google Pay</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                      <span>QR-код на екрані для комп'ютера</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Комісія сервісу:</span>
                  <span className="font-bold text-slate-900">від 1.3%</span>
                </div>
              </button>

              {/* LiqPay Card */}
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, paymentGateway: 'liqpay' })}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  settingsForm.paymentGateway === 'liqpay'
                    ? 'border-emerald-600 bg-gradient-to-b from-emerald-50/70 to-white ring-2 ring-emerald-600/30 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                {settingsForm.paymentGateway === 'liqpay' && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white shadow-xs">
                    АКТИВНИЙ
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      L
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 leading-tight">LiqPay (ПриватБанк)</div>
                      <div className="text-[10px] font-semibold text-emerald-800">Еквайринг ПриватБанку</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Платіжний сервіс від ПриватБанку. Повна інтеграція з Приват24, підтримка карток закордонних та українських банків.
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Пряма оплата через Приват24</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Apple Pay & Google Pay</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Надійність державного банку</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Комісія сервісу:</span>
                  <span className="font-bold text-slate-900">від 1.5%</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Merchant API Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">2</span>
                  <span>
                    Налаштування ключів мерчанта: {settingsForm.paymentGateway === 'monobank' ? 'Monobank' : settingsForm.paymentGateway === 'liqpay' ? 'LiqPay' : 'WayForPay'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Введіть параметри підключення з особистого кабінету вашого платіжного шлюзу
                </p>
              </div>

              {/* External link to cabinet */}
              {settingsForm.paymentGateway === 'wayforpay' && (
                <a
                  href="https://wayforpay.com/uk/login"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Кабінет WayForPay</span>
                </a>
              )}
              {settingsForm.paymentGateway === 'monobank' && (
                <a
                  href="https://web.monobank.ua/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Кабінет Monobank Еквайринг</span>
                </a>
              )}
              {settingsForm.paymentGateway === 'liqpay' && (
                <a
                  href="https://www.liqpay.ua/uk/adminbusiness"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Кабінет LiqPay</span>
                </a>
              )}
            </div>

            {/* WayForPay Fields */}
            {settingsForm.paymentGateway === 'wayforpay' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Merchant Account (ID магазину)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="напр., test_merch_n1 або ваш_мерчант"
                      value={settingsForm.paymentMerchantId || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentMerchantId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-xs transition-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Знаходиться у меню: WayForPay → Налаштування магазину → Реквізити
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Merchant Secret Key (Секретний ключ)</span>
                        <span className="text-red-500">*</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPaymentSecret(!showPaymentSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-normal"
                      >
                        {showPaymentSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPaymentSecret ? 'Приховати' : 'Показати'}</span>
                      </button>
                    </label>
                    <input
                      type={showPaymentSecret ? 'text' : 'password'}
                      placeholder="Введіть секретний ключ мерчанта"
                      value={settingsForm.paymentSecretKey || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentSecretKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-xs transition-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Використовується для безпечного підпису запитів та генерації HMAC-MD5 підпису
                    </p>
                  </div>
                </div>

                {/* Helpful quick note */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Тестовий режим WayForPay:</strong> Для тестування можна використовувати ID <code className="px-1.5 py-0.5 bg-white rounded font-mono font-bold text-emerald-700">test_merch_n1</code> та Secret Key <code className="px-1.5 py-0.5 bg-white rounded font-mono font-bold text-emerald-700">flk3409refn54t54t*fnusb</code>.
                  </div>
                </div>
              </div>
            )}

            {/* Monobank Fields */}
            {settingsForm.paymentGateway === 'monobank' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-900" />
                      <span>Токен інтернет-еквайрингу Monobank (X-Token)</span>
                      <span className="text-red-500">*</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentSecret(!showPaymentSecret)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-normal"
                    >
                      {showPaymentSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPaymentSecret ? 'Приховати' : 'Показати'}</span>
                    </button>
                  </label>
                  <input
                    type={showPaymentSecret ? 'text' : 'password'}
                    placeholder="Вставте X-Token з кабінету monobank.ua/e-comm"
                    value={settingsForm.monobankToken || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, monobankToken: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none font-mono text-xs transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Створіть токен у розділі «Еквайринг» особистого кабінету monobank для юридичних осіб або ФОП
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Особливість monoPay:</strong> Клієнти на смартфонах можуть оплатити замовлення в 1 клік відкриттям застосунку Monobank, а на комп'ютері — миттєвим скануванням QR-коду камерою телефона.
                  </div>
                </div>
              </div>
            )}

            {/* LiqPay Fields */}
            {settingsForm.paymentGateway === 'liqpay' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Public Key (Публічний ключ LiqPay)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="напр., i00000000000"
                      value={settingsForm.paymentMerchantId || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentMerchantId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none font-mono text-xs transition-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Отримується в кабінеті LiqPay → Налаштування → API
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Private Key (Приватний ключ)</span>
                        <span className="text-red-500">*</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPaymentSecret(!showPaymentSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-normal"
                      >
                        {showPaymentSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPaymentSecret ? 'Приховати' : 'Показати'}</span>
                      </button>
                    </label>
                    <input
                      type={showPaymentSecret ? 'text' : 'password'}
                      placeholder="Введіть приватний ключ LiqPay"
                      value={settingsForm.paymentSecretKey || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentSecretKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none font-mono text-xs transition-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ніколи не передавайте приватний ключ третім особам
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Interactive Live Customer Checkout Preview Simulator */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 text-white shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Попередній вигляд вікна оплати для покупця</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                      Live Preview
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ось як зручно виглядає форма онлайн-оплати для покупця під час оформлення замовлення
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaymentPreviewSimulated(true);
                  showToast('Тестова симуляція: оплата карткою через ' + (settingsForm.paymentGateway || 'WayForPay') + ' пройшла успішно!', 'success');
                  setTimeout(() => setPaymentPreviewSimulated(false), 4000);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Симуляція успішної оплати</span>
              </button>
            </div>

            {/* Mock Checkout Window */}
            <div className="max-w-md mx-auto bg-slate-950 rounded-2xl p-5 border border-slate-700/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Безпечна оплата замовлення</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">1 450.00 грн</span>
              </div>

              {/* Express Buttons: Apple Pay & Google Pay */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full py-2.5 px-4 bg-black hover:bg-zinc-900 text-white font-bold rounded-xl border border-white/20 text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span className="text-sm font-black">Pay</span>
                  <span>Оплатити з Apple Pay</span>
                </button>

                <button
                  type="button"
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span className="text-blue-600 font-black">G</span>
                  <span>Google Pay</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-800" />
                <span className="shrink mx-2 text-[10px] uppercase font-bold text-slate-500">або карткою будь-якого банку</span>
                <div className="grow border-t border-slate-800" />
              </div>

              {/* Card Mock inputs */}
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Номер банківської картки</span>
                    <span className="text-slate-500 font-mono">Visa / Mastercard / Простір</span>
                  </div>
                  <div className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 flex items-center justify-between">
                    <span>4149 •••• •••• 8821</span>
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">Термін дії</div>
                    <div className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200">
                      12 / 28
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">CVV / CVC</div>
                    <div className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200">
                      •••
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Оплатити 1 450.00 грн ({settingsForm.paymentGateway === 'monobank' ? 'monoPay' : settingsForm.paymentGateway === 'liqpay' ? 'LiqPay' : 'WayForPay'})</span>
              </button>

              {paymentPreviewSimulated && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center text-xs font-bold text-emerald-300 animate-fade-in flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Транзакція підтверджена! Статус замовлення оновлено на «Оплачено».</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Official IBAN Bank Requisites for Bank Invoices */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Банківські реквізити IBAN (Безготівковий розрахунок)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Відображаються покупцям у рахунку-фактурі та в спливаючому вікні «Реквізити IBAN»
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                Рахунок для юр. осіб та ФОП
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Номер рахунку IBAN (29 знаків)</span>
                  {settingsForm.companyIban && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(settingsForm.companyIban || '');
                        setCopyPaymentFeedback('iban');
                        setTimeout(() => setCopyPaymentFeedback(null), 2000);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      {copyPaymentFeedback === 'iban' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copyPaymentFeedback === 'iban' ? 'Скопійовано' : 'Копіювати'}</span>
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="UA213052990000026007894561230"
                  value={settingsForm.companyIban || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, companyIban: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono text-xs transition-all font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Одержувач (Назва ФОП або ТОВ)
                </label>
                <input
                  type="text"
                  placeholder="ФОП Тарасова Ірина Анатоліївна або ТОВ «ІСКРА»"
                  value={settingsForm.companyName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Код ЄДРПОУ / ІПН (РНОКПП)
                </label>
                <input
                  type="text"
                  placeholder="3298412839 або 43928174"
                  value={settingsForm.companyEdrpou || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, companyEdrpou: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono text-xs transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Банк одержувача та МФО
                </label>
                <input
                  type="text"
                  placeholder="АТ КБ «ПриватБанк» (МФО 305299) або АТ «Універсал Банк»"
                  value={settingsForm.companyBank || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, companyBank: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Formatted Invoice Preview Badge */}
            <div className="p-3.5 rounded-xl bg-indigo-950 text-indigo-100 text-xs space-y-1 font-mono shadow-inner">
              <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-1">
                Зразок реквізитів у рахунку покупця:
              </div>
              <div><strong className="text-white">Одержувач:</strong> {settingsForm.companyName || 'ФОП Тарасова Ірина Анатоліївна'}</div>
              <div><strong className="text-white">Рахунок IBAN:</strong> {settingsForm.companyIban || 'UA213052990000026007894561230'}</div>
              <div><strong className="text-white">ЄДРПОУ/ІПН:</strong> {settingsForm.companyEdrpou || '3298412839'} • <strong className="text-white">Банк:</strong> {settingsForm.companyBank || 'АТ КБ «ПриватБанк»'}</div>
              <div><strong className="text-white">Призначення:</strong> Оплата замовлення №__ за електрообладнання згідно з рахунком без ПДВ</div>
            </div>
          </div>

          {/* Step 5: FOP Seller Legal Requisites */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Юридичні дані ФОП для сторінки «Про нас / Реквізити»
                  </h3>
                  <p className="text-xs text-slate-500">
                    Офіційні дані суб'єкта підприємницької діяльності для захисту прав споживачів
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ФОП: Повне ПІБ підприємця
                </label>
                <input
                  type="text"
                  placeholder="ФОП Тарасова Ірина Анатоліївна"
                  value={settingsForm.fopName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  РНОКПП (ІПН платника податків)
                </label>
                <input
                  type="text"
                  placeholder="3298412839"
                  value={settingsForm.fopRnokpp || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopRnokpp: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-mono text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Місце державної реєстрації ФОП
                </label>
                <input
                  type="text"
                  placeholder="Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 7"
                  value={settingsForm.fopRegistrationAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopRegistrationAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Фактичне місце знаходження / Склад
                </label>
                <input
                  type="text"
                  placeholder="Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 2"
                  value={settingsForm.fopActualAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopActualAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Офіційний e-mail для звернень покупців
                </label>
                <input
                  type="email"
                  placeholder="iskra.shop.ua@gmail.com"
                  value={settingsForm.fopEmail || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Офіційний телефон ФОП
                </label>
                <input
                  type="text"
                  placeholder="+38 (096) 647-36-67"
                  value={settingsForm.fopPhone || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Інформація про оподаткування та ціноутворення
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.taxInfo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, taxInfo: e.target.value })}
                  placeholder="ФОП платник єдиного податку 2-ї групи (без сплати ПДВ). Усі ціни є кінцевими..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Інформація про ліцензії та сертифікацію
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.licenseInfo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, licenseInfo: e.target.value })}
                  placeholder="Роздрібна торгівля електротоварами не підлягає обов'язковому ліцензуванню..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Активний провайдер: <strong className="text-slate-900 uppercase font-black">{settingsForm.paymentGateway || 'WayForPay'}</strong>
              </span>
            </div>

            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Зберегти налаштування онлайн-оплати та реквізитів</span>
            </button>
          </div>
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
          className="space-y-6 max-w-5xl animate-in fade-in duration-200"
        >
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-6 sm:p-8 text-white shadow-2xl border border-rose-500/20">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-red-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-extrabold uppercase tracking-wider shadow-inner">
                    <Building2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Юридичні дані & Профіль продавця</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Публічні оферти & IBAN</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
                  <span>Сторінка «Про нас / Реквізити ФОП»</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Повний онлайн-кабінет керування публічною сторінкою бренду <strong>ISKRA</strong>: історія розвитку магазину, розширені юридичні реквізити реєстрації ФОП, інформація про систему оподаткування та банківські розрахунки IBAN.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('about');
                    showToast('Перехід на публічну сторінку «Про нас»', 'info');
                  }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  <span>Переглянути «Про нас»</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsForm({
                      ...settingsForm,
                      aboutTitle: 'Про магазин «ISKRA» та офіційні реквізити продавця',
                      aboutStory: 'Магазин «ISKRA» засновано з метою надати українським родинам та майстрам якісну, сертифіковану та надійну сантехніку, електротовари, інвертори та обладнання для енергонезалежності.\n\nМи працюємо напряму з провідними заводськими виробниками та імпортерами, що дозволяє гарантувати чесні ціни, швидку відправку в день замовлення та офіційну гарантію на всі товари.',
                      fopName: 'ФОП Тарасова Ірина Анатоліївна',
                      fopRnokpp: '3298412839',
                      fopRegistrationAddress: 'Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 7',
                      fopActualAddress: 'Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 7',
                      fopPhone: '+38 (096) 647-36-67',
                      fopEmail: 'iskra.shop.ua@gmail.com',
                      websiteUrl: 'https://iskra-shop.ua',
                      fopStoreAddress: 'с-ще. Оратів, вул. Котляревського, 7',
                      taxInfo: 'ФОП платник єдиного податку 2-ї групи (без сплати ПДВ)',
                      licenseInfo: 'Роздрібна торгівля непродовольчими товарами не підлягає обов\'язковому ліцензуванню згідно ст. 7 ЗУ «Про ліцензування видів господарської діяльності». Всі товари сертифіковані.',
                      companyIban: 'UA213052990000026007894561230',
                      companyBank: 'АТ КБ «ПриватБанк» (МФО 305299)'
                    });
                    showToast('Заповнено офіційні реквізити ФОП Тарасова І.А.', 'info');
                  }}
                  className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                  <span>Реквізити ФОП ISKRA</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Зберегти реквізити</span>
                </button>
              </div>
            </div>
          </div>

          {/* Block 1: Presentation & Story */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>1. Презентація та історія магазину</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Публічна сторінка «Про нас»
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Головний заголовок сторінки
                </label>
                <input
                  type="text"
                  placeholder="Про магазин «ISKRA» та офіційні реквізити продавця"
                  value={settingsForm.aboutTitle || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, aboutTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Історія, місія та опис діяльності (розділяйте абзаци порожнім рядком)
                </label>
                <textarea
                  rows={4}
                  placeholder="Магазин «ISKRA» засновано з метою надати українським родинам..."
                  value={settingsForm.aboutStory || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, aboutStory: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-xs leading-relaxed"
                />
              </div>

              {/* Live Story Preview Card */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Попередній вигляд презентації на сторінці:</span>
                  <span className="text-rose-600 font-bold">● Публічний блок «Про нас»</span>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <h3 className="text-base font-black text-slate-900 font-display">
                    {settingsForm.aboutTitle || 'Про магазин «ISKRA» та офіційні реквізити продавця'}
                  </h3>
                  <div className="text-xs text-slate-600 leading-relaxed space-y-2 whitespace-pre-line">
                    {settingsForm.aboutStory || 'Магазин «ISKRA» засновано з метою надати українським родинам та майстрам якісну, сертифіковану та надійну сантехніку та електротовари.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 2: Official FOP Legal Requisites */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <span>2. Офіційні юридичні реквізити суб'єкта господарювання (ФОП)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Державний реєстр ФОП
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  ПІБ Фізичної особи-підприємця (ФОП) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ФОП Тарасова Ірина Анатоліївна"
                  value={settingsForm.fopName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  РНОКПП (ІПН платника податків) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="3298412839"
                  value={settingsForm.fopRnokpp || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopRnokpp: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Місце державної реєстрації ФОП
                </label>
                <input
                  type="text"
                  placeholder="Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 7"
                  value={settingsForm.fopRegistrationAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopRegistrationAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Фактичне місце проживання / Склад
                </label>
                <input
                  type="text"
                  placeholder="Україна, 22601, Вінницька обл., Вінницький р-н, с-ще. Оратів, вул. Котляревського, 7"
                  value={settingsForm.fopActualAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopActualAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Офіційний телефон ФОП
                </label>
                <input
                  type="text"
                  placeholder="+38 (096) 647-36-67"
                  value={settingsForm.fopPhone || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Офіційний E-mail для звернень
                </label>
                <input
                  type="email"
                  placeholder="iskra.shop.ua@gmail.com"
                  value={settingsForm.fopEmail || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Адреса сайту (Домен)
                </label>
                <input
                  type="text"
                  placeholder="https://iskra-shop.ua"
                  value={settingsForm.websiteUrl || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, websiteUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Адреса точки видачі / Магазину
                </label>
                <input
                  type="text"
                  placeholder="с-ще. Оратів, вул. Котляревського, 7"
                  value={settingsForm.fopStoreAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fopStoreAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          </div>

          {/* Block 3: Bank IBAN & Taxes */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>3. Банківські реквізити IBAN та система оподаткування</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Оплата & Ліцензії
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Номер розрахункового рахунку IBAN
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="UA213052990000026007894561230"
                    value={settingsForm.companyIban || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyIban: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {settingsForm.companyIban && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(settingsForm.companyIban || '');
                        showToast('Скопійовано IBAN!', 'info');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Скопіювати IBAN"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Обслуговуючий банк одержувача та МФО
                </label>
                <input
                  type="text"
                  placeholder="АТ КБ «ПриватБанк» (МФО 305299)"
                  value={settingsForm.companyBank || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, companyBank: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Оподаткування та податки в ціні
                </label>
                <textarea
                  rows={3}
                  placeholder="ФОП платник єдиного податку 2-ї групи (без сплати ПДВ)..."
                  value={settingsForm.taxInfo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, taxInfo: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ліцензії та сертифікація товару
                </label>
                <textarea
                  rows={3}
                  placeholder="Роздрібна торгівля непродовольчими товарами не підлягає обов'язковому ліцензуванню..."
                  value={settingsForm.licenseInfo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, licenseInfo: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Block 4: Live Official Certificate Preview */}
          <div className="bg-slate-950 text-slate-200 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Офіційна картка юридичних реквізитів продавця
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Захищено ЗУ «Про електронну коммерцію»
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div className="text-[10px] uppercase text-slate-500 font-sans font-bold">Суб'єкт господарювання:</div>
                <div className="text-sm font-bold text-white font-sans">{settingsForm.fopName || 'ФОП Тарасова Ірина Анатоліївна'}</div>
                <div className="text-slate-400 pt-1">РНОКПП (ІПН): <b className="text-amber-300">{settingsForm.fopRnokpp || '3298412839'}</b></div>
                <div className="text-slate-400">Тел: <b className="text-emerald-300 font-sans">{settingsForm.fopPhone || '+38 (096) 647-36-67'}</b></div>
                <div className="text-slate-400">E-mail: <b className="text-slate-200 font-sans">{settingsForm.fopEmail || 'iskra.shop.ua@gmail.com'}</b></div>
              </div>

              <div className="space-y-2 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div className="text-[10px] uppercase text-slate-500 font-sans font-bold">Банківський рахунок IBAN:</div>
                <div className="text-sm font-bold text-emerald-400 break-all">{settingsForm.companyIban || 'UA213052990000026007894561230'}</div>
                <div className="text-slate-400 pt-1">Банк: <b className="text-slate-200 font-sans">{settingsForm.companyBank || 'АТ КБ «ПриватБанк» (МФО 305299)'}</b></div>
                <div className="text-slate-400">Податковий режим: <b className="text-slate-300 font-sans">{settingsForm.taxInfo || 'Єдиний податок 2-ї групи'}</b></div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300 font-semibold">Всі реквізити синхронізуються з базою даних у реальному часі</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти юридичні дані та історію в БД</span>
            </button>
          </div>
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
          className="space-y-6 max-w-5xl animate-in fade-in duration-150"
        >
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-bold uppercase tracking-wider">
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  <span>Політика повернення та захист покупця</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black font-display text-white tracking-tight">
                  Керування сторінкою «Повернення та обмін»
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Повне налаштування всіх 5 розділів публічної сторінки: правова база за ст. 9 ЗУ «Про захист прав споживачів», чек-листи, 4 кроки алгоритму, реквізити Нової Пошти, гарантійні зобов'язання та обробка заявок від клієнтів.
                </p>

                {/* Counter Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Захист покупця: <b className="text-white">{settingsForm.returnsDays || 14} днів</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-slate-200">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    Виплата: <b className="text-white">{settingsForm.returnsRefundDays || '1–3 дн.'}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Заявок у базі: <b className="text-white">{returnRequests.length}</b>
                  </span>
                  {returnRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/30 border border-red-400/50 text-[11px] font-bold text-red-200 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      Нових заявок: {returnRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-row lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('returns');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-4 h-4 text-slate-200" />
                  <span>Відкрити на сайті</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Зберегти зміни</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setReturnsSubTab('editor')}
              className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                returnsSubTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span>1. Тексти та умови сторінки</span>
            </button>

            <button
              type="button"
              onClick={() => setReturnsSubTab('requisites')}
              className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                returnsSubTab === 'requisites'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Truck className="w-4 h-4 text-red-600" />
              <span>2. Реквізити та доставка</span>
            </button>

            <button
              type="button"
              onClick={() => setReturnsSubTab('requests')}
              className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                returnsSubTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>3. Заявки клієнтів</span>
              {returnRequests.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  returnRequests.filter(r => r.status === 'pending').length > 0
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {returnRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setReturnsSubTab('preview')}
              className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                returnsSubTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>4. Передперегляд сторінки</span>
            </button>
          </div>

          {/* SUBTAB 1: EDITOR (Тексти та умови сторінки) */}
          {returnsSubTab === 'editor' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              
              {/* 1. Header & Legal Basis */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">1. Заголовок, правова база та ключові строки</h3>
                    <p className="text-[11px] text-slate-500">Заголовок сторінки, законодавча база та строки повернення/виплати</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Головний заголовок сторінки (H1):
                    </label>
                    <input
                      type="text"
                      placeholder="Повернення та обмін товару в магазині «ISKRA»"
                      value={settingsForm.returnsTitle || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsTitle: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-red-600 outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Правова основа та вступний текст:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ми цінуємо довіру кожного клієнта і суворо дотримуємося ст. 9 Закону України «Про захист прав споживачів»..."
                      value={settingsForm.returnsLegalBasis || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsLegalBasis: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-red-600 outline-none text-slate-800 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Строк повернення товару:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={90}
                          placeholder="14"
                          value={settingsForm.returnsDays || 14}
                          onChange={(e) => setSettingsForm({ ...settingsForm, returnsDays: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none font-bold text-slate-900 font-mono"
                        />
                        <span className="text-xs text-slate-500 font-semibold shrink-0">днів</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Строк виплати коштів:
                      </label>
                      <input
                        type="text"
                        placeholder="1–3 робочих днів"
                        value={settingsForm.returnsRefundDays || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, returnsRefundDays: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Гарантійні зобов'язання:
                      </label>
                      <input
                        type="text"
                        placeholder="Офіційна заводська гарантія від 12 до 60 місяців..."
                        value={settingsForm.returnsWarrantyInfo || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarrantyInfo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Conditions of return (4 Requirements) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">2. Умови повернення належної якості (Чек-лист 4 пунктів)</h3>
                    <p className="text-[11px] text-slate-500">Тексти вимог, що відображаються у розділі №1 на публічній сторінці</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Вимога 1 (Відсутність слідів експлуатації):
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Товар не був у вжитку, відсутні сліди експлуатації, монтажу чи підключення до мережі."
                      value={settingsForm.returnsCondition1 || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsCondition1: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Вимога 2 (Товарний вигляд та упаковка):
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Збережено товарний вигляд, оригінальну заводську упаковку, ярлики, наклейки та пломби."
                      value={settingsForm.returnsCondition2 || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsCondition2: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Вимога 3 (Повна заводська комплектація):
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Збережено повну комплектацію (інструкції, кабелі, кріплення, перехідники, гарантійний талон)."
                      value={settingsForm.returnsCondition3 || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsCondition3: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Вимога 4 (Розрахунковий документ / чек):
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Наявний розрахунковий документ (чек, накладна, номер замовлення або SMS/електронне підтвердження)."
                      value={settingsForm.returnsCondition4 || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsCondition4: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Step-by-Step Instructions (4 Steps) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">3. Покроковий порядок дій для клієнта (4 кроки)</h3>
                    <p className="text-[11px] text-slate-500">Алгоритм дій покупця від першого дзвінка до виплати коштів</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Крок 1</span>
                    <input
                      type="text"
                      placeholder="Звернення до нас"
                      value={settingsForm.returnsStep1Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep1Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Зателефонуйте менеджеру або заповніть онлайн-форму..."
                      value={settingsForm.returnsStep1Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep1Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Крок 2</span>
                    <input
                      type="text"
                      placeholder="Підготовка товару"
                      value={settingsForm.returnsStep2Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep2Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Акуратно упакуйте товар у рідну коробку..."
                      value={settingsForm.returnsStep2Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep2Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Крок 3</span>
                    <input
                      type="text"
                      placeholder="Відправка перевізником"
                      value={settingsForm.returnsStep3Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep3Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Надішліть посилку «Новою Поштою» без післяплати..."
                      value={settingsForm.returnsStep3Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep3Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Крок 4</span>
                    <input
                      type="text"
                      placeholder="Огляд і виплата"
                      value={settingsForm.returnsStep4Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep4Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Після огляду товару протягом 1–3 днів повертаємо гроші..."
                      value={settingsForm.returnsStep4Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsStep4Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* 4. Warranty Cases (3 Blocks) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">4. Товари неналежної якості та гарантійне обслуговування (3 варіанти)</h3>
                    <p className="text-[11px] text-slate-500">Умови заміни, сервісного ремонту та повернення коштів при заводському браку</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Варіант 1: Заміна</span>
                    <input
                      type="text"
                      placeholder="1. Заміна на новий товар"
                      value={settingsForm.returnsWarranty1Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty1Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Якщо під час гарантійного строку виявлено істотний заводський брак, замінюємо на новий..."
                      value={settingsForm.returnsWarranty1Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty1Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Варіант 2: Ремонт</span>
                    <input
                      type="text"
                      placeholder="2. Гарантійний ремонт"
                      value={settingsForm.returnsWarranty2Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty2Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Безкоштовне усунення дефектів в авторизованих сервісних центрах виробників..."
                      value={settingsForm.returnsWarranty2Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty2Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Варіант 3: Відшкодування</span>
                    <input
                      type="text"
                      placeholder="3. Повне повернення коштів"
                      value={settingsForm.returnsWarranty3Title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty3Title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Якщо ремонт неможливий, а аналогічного товару немає в наявності, негайно повертаємо 100%..."
                      value={settingsForm.returnsWarranty3Text || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWarranty3Text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* SUBTAB 2: REQUISITES & LOGISTICS (Реквізити та доставка) */}
          {returnsSubTab === 'requisites' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              
              {/* Shipping Address */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Реквізити одержувача для повернень «Новою Поштою»</h3>
                    <p className="text-[11px] text-slate-500">Адреса та контакти особи або представника магазину, яка приймає посилки</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ПІБ одержувача посилки:
                    </label>
                    <input
                      type="text"
                      placeholder="Тарасова Ірина Анатоліївна"
                      value={settingsForm.returnsReceiverName || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverName: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Контактний телефон одержувача:
                    </label>
                    <input
                      type="text"
                      placeholder="+38 (096) 647-36-67"
                      value={settingsForm.returnsReceiverPhone || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverPhone: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Місто / Населений пункт:
                    </label>
                    <input
                      type="text"
                      placeholder="с-ще. Оратів, Вінницька обл."
                      value={settingsForm.returnsReceiverCity || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverCity: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Відділення / Поштомат «Нова Пошта»:
                    </label>
                    <input
                      type="text"
                      placeholder="Відділення №1"
                      value={settingsForm.returnsReceiverWarehouse || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsReceiverWarehouse: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Важливе застереження щодо накладеного платежу (післяплати):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Зверніть увагу: відправлення приймаються без послуги «післяплата» (накладений платіж)..."
                    value={settingsForm.returnsNoCodNotice || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, returnsNoCodNotice: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Who pays delivery */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Розподіл витрат на логістику при поверненні</h3>
                    <p className="text-[11px] text-slate-500">Чіткі правила оплати пересилання згідно ст. 9 ЗУ «Про захист прав споживачів»</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Повернення товару належної якості (не підійшов колір/розмір):
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Послуги пересилання оплачує покупець за тарифами перевізника «Нова Пошта»."
                      value={settingsForm.returnsWhoPaysGood || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWhoPaysGood: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-red-600 outline-none text-slate-800"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                    <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      Заводський брак / помилка комплектації складу:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Усі витрати на доставку в обидві сторони повністю оплачує магазин ISKRA."
                      value={settingsForm.returnsWhoPaysDefect || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, returnsWhoPaysDefect: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white focus:border-emerald-600 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SUBTAB 3: CUSTOMER RETURN REQUESTS LOG (Журнал онлайн-заявок) */}
          {returnsSubTab === 'requests' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Пошук за телефоном, номером замовлення, коментарем..."
                      value={returnsSearch}
                      onChange={(e) => setReturnsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/60 focus:bg-white focus:border-red-600 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={returnsFilterStatus}
                      onChange={(e) => setReturnsFilterStatus(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                    >
                      <option value="all">Усі статуси ({returnRequests.length})</option>
                      <option value="pending">⏳ Очікують ({returnRequests.filter(r => r.status === 'pending').length})</option>
                      <option value="in_review">🔍 В обробці ({returnRequests.filter(r => r.status === 'in_review').length})</option>
                      <option value="approved">✅ Схвалено ({returnRequests.filter(r => r.status === 'approved').length})</option>
                      <option value="completed">🎉 Завершено ({returnRequests.filter(r => r.status === 'completed').length})</option>
                      <option value="rejected">❌ Відхилено ({returnRequests.filter(r => r.status === 'rejected').length})</option>
                    </select>

                    <select
                      value={returnsFilterReason}
                      onChange={(e) => setReturnsFilterReason(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white outline-none focus:border-red-600"
                    >
                      <option value="all">Всі причини</option>
                      <option value="not_fit">Не підійшов</option>
                      <option value="defect">Виробничий брак</option>
                      <option value="wrong_item">Помилка складу</option>
                      <option value="warranty">Гарантія</option>
                      <option value="other">Інше</option>
                    </select>

                    {returnRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Ви впевнені, що бажаєте очистити всі заявки на повернення?')) {
                            clearAllReturnRequests();
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Очистити всі заявки"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Requests List */}
              {(() => {
                const filtered = returnRequests.filter(r => {
                  if (returnsFilterStatus !== 'all' && r.status !== returnsFilterStatus) return false;
                  if (returnsFilterReason !== 'all' && r.reason !== returnsFilterReason) return false;
                  if (returnsSearch.trim()) {
                    const q = returnsSearch.toLowerCase();
                    const matchPhone = r.buyerPhone.toLowerCase().includes(q);
                    const matchName = (r.buyerName || '').toLowerCase().includes(q);
                    const matchOrder = (r.orderNumber || '').toLowerCase().includes(q);
                    const matchComment = (r.comment || '').toLowerCase().includes(q);
                    if (!matchPhone && !matchName && !matchOrder && !matchComment) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <RotateCcw className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Заявок на повернення не знайдено</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {returnRequests.length === 0 
                          ? 'Коли покупці заповнюватимуть онлайн-форму на сторінці «Повернення та обмін», їхні звернення миттєво з\'являтимуться тут.'
                          : 'Спробуйте скинути фільтри або змінити пошуковий запит.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map((req) => {
                      const reasonInfo = {
                        not_fit: { label: 'Не підійшов розмір / характеристики', color: 'bg-slate-100 text-slate-800' },
                        defect: { label: '⚠️ Виявлено заводський брак', color: 'bg-red-100 text-red-800' },
                        wrong_item: { label: '📦 Не відповідає замовленому', color: 'bg-amber-100 text-amber-800' },
                        warranty: { label: '🛡️ Гарантійне обслуговування', color: 'bg-blue-100 text-blue-800' },
                        other: { label: 'Інша причина', color: 'bg-slate-100 text-slate-700' }
                      }[req.reason] || { label: req.reason, color: 'bg-slate-100 text-slate-800' };

                      const cleanPhoneDigits = req.buyerPhone.replace(/[^0-9]/g, '');

                      return (
                        <div
                          key={req.id}
                          className={`bg-white rounded-3xl border transition-all p-5 shadow-xs space-y-3 ${
                            req.status === 'pending'
                              ? 'border-red-300 ring-1 ring-red-100'
                              : 'border-slate-200/90'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-2xl ${
                                req.status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
                              }`}>
                                <RotateCcw className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {req.buyerName || 'Покупець'}
                                  </h4>
                                  {req.orderNumber && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                                      {req.orderNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {new Date(req.createdAt).toLocaleString('uk-UA')}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${reasonInfo.color}`}>
                                {reasonInfo.label}
                              </span>

                              <select
                                value={req.status}
                                onChange={(e) => updateReturnRequestStatus(req.id, e.target.value as ReturnRequest['status'])}
                                className={`px-3 py-1 text-xs font-bold rounded-xl border outline-none cursor-pointer ${
                                  req.status === 'pending'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : req.status === 'in_review'
                                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                                    : req.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                    : req.status === 'completed'
                                    ? 'bg-purple-50 text-purple-900 border-purple-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                <option value="pending">⏳ Очікує розгляду</option>
                                <option value="in_review">🔍 В обробці</option>
                                <option value="approved">✅ Схвалено до повернення</option>
                                <option value="completed">🎉 Завершено (гроші виплачено)</option>
                                <option value="rejected">❌ Відхилено</option>
                              </select>
                            </div>
                          </div>

                          {/* Details & Comments */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Контакти клієнта:
                              </span>
                              <div className="flex items-center justify-between">
                                <a
                                  href={`tel:${req.buyerPhone}`}
                                  className="font-bold text-slate-900 hover:text-red-600 font-mono text-sm transition-colors"
                                >
                                  {req.buyerPhone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.buyerPhone);
                                    setReturnsCopyFeedback(req.id);
                                    setTimeout(() => setReturnsCopyFeedback(null), 2000);
                                  }}
                                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                                >
                                  {returnsCopyFeedback === req.id ? 'Скопійовано!' : 'Копіювати'}
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <a
                                  href={`tel:${cleanPhoneDigits}`}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Дзвінок</span>
                                </a>
                                <a
                                  href={`viber://chat?number=%2B${cleanPhoneDigits}`}
                                  className="px-2.5 py-1 rounded-lg bg-[#7360f2] hover:bg-[#604ee0] text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                                >
                                  <span>Viber</span>
                                </a>
                                <a
                                  href={`sms:${cleanPhoneDigits}`}
                                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>SMS</span>
                                </a>
                              </div>
                            </div>

                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Коментар клієнта:
                              </span>
                              <p className="text-slate-700 leading-relaxed italic">
                                {req.comment ? `«${req.comment}»` : 'Без додаткового коментаря.'}
                              </p>
                            </div>
                          </div>

                          {/* Admin Notes & Delete */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Примітка менеджера:</span>
                              <input
                                type="text"
                                placeholder="Вкажіть номер ТТН повернення, статус огляду або IBAN..."
                                defaultValue={req.adminNotes || ''}
                                onBlur={(e) => updateReturnRequestStatus(req.id, req.status, e.target.value)}
                                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:border-red-600 outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Видалити цю заявку на повернення?')) {
                                  deleteReturnRequest(req.id);
                                }
                              }}
                              className="text-xs text-slate-400 hover:text-red-600 font-semibold cursor-pointer shrink-0 self-end sm:self-center px-2 py-1"
                            >
                              Видалити
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

          {/* SUBTAB 4: LIVE PREVIEW (Інтерактивний передперегляд сторінки) */}
          {returnsSubTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Нижче наведено точну копію того, як виглядає сторінка <b>«Повернення та обмін товару»</b> для ваших покупців на сайті.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('returns');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Перейти до повної сторінки
                </button>
              </div>

              {/* Render Preview Frame */}
              <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-lg bg-slate-50 p-4 sm:p-6 space-y-6">
                
                {/* Hero Preview */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white rounded-2xl p-6 relative overflow-hidden">
                  <div className="space-y-3 relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <RotateCcw className="w-3 h-3 text-red-400" />
                      <span>Правила та умови</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black font-display text-white">
                      {settingsForm.returnsTitle || 'Повернення та обмін товару в магазині «ISKRA»'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {settingsForm.returnsLegalBasis || 'Ми цінуємо довіру кожного клієнта і суворо дотримуємося ст. 9 Закону України «Про захист прав споживачів»...'}
                    </p>
                  </div>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-base font-black text-red-600">{settingsForm.returnsDays || 14}</span>
                    <h5 className="text-xs font-bold text-slate-900">Термін повернення</h5>
                    <p className="text-[10px] text-slate-500">{settingsForm.returnsDays || 14} днів з моменту отримання</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h5 className="text-xs font-bold text-slate-900">Повернення коштів</h5>
                    <p className="text-[10px] text-slate-500">{settingsForm.returnsRefundDays || '1–3 робочих днів'}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-slate-900">Доставка</h5>
                    <p className="text-[10px] text-slate-500">При браку — безкоштовно</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-bold text-slate-900">Гарантія</h5>
                    <p className="text-[10px] text-slate-500">Офіційна від заводу</p>
                  </div>
                </div>

                {/* Receiver Info Box Preview */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <h5 className="text-xs font-bold text-slate-900">Куди відправляти посилку (Нова Пошта):</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><b>Одержувач:</b> {settingsForm.returnsReceiverName || 'Тарасова Ірина Анатоліївна'}</div>
                    <div><b>Телефон:</b> {settingsForm.returnsReceiverPhone || '+38 (096) 647-36-67'}</div>
                    <div><b>Місто:</b> {settingsForm.returnsReceiverCity || 'с-ще. Оратів, Вінницька обл.'}</div>
                    <div><b>Відділення:</b> {settingsForm.returnsReceiverWarehouse || 'Відділення №1'}</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-white">Керування політикою повернення та обміну:</span>{' '}
                <span className="text-slate-300">усі зміни синхронізуються з базою даних</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Зберегти всі зміни в базу даних</span>
              </button>
            </div>
          </div>

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
