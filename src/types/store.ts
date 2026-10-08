export type ProductBadge = 'Хіт продажу' | 'Акція' | 'Новинка' | '';

export interface Product {
  id: string;
  name: string;
  category: string;
  mainCategory?: string;
  subCategory?: string;
  badge: ProductBadge;
  sku: string;
  stock: number;
  price: number;
  unit: string;
  desc: string;
  image: string;
  brand?: string;
  barcode?: string;
  specs?: Record<string, string>;
}

export type CategoryTree = {
  [mainCat: string]: {
    _leaves?: string[];
    [subCat: string]: any;
  };
};

export interface CartItem extends Product {
  qty: number;
}

export type OrderStatus = 'Створено' | 'Оплачено' | 'Збирається' | 'Відправлено' | 'Доставлено';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  unit: string;
  sku?: string;
  image?: string;
}

export interface Order {
  id: string;
  fio: string;
  phone: string;
  delivery: string;
  city: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: OrderStatus;
  ttn?: string;
  paymentMethod?: 'cash_on_delivery' | 'card_online' | 'bank_invoice';
  isPaid?: boolean;
  paidAt?: string;
  paymentTransactionId?: string;
  paymentProvider?: string;
  notes?: string;
}

export interface ClientData {
  name: string;
  balance: number;
  discount: number;
  city?: string;
  notes?: string;
  email?: string;
  phone?: string;
  password?: string;
  defaultCity?: string;
  defaultWarehouse?: string;
  messenger?: string;
  avatarUrl?: string;
}

export interface WeeklyDealConfig {
  enabled: boolean;
  title: string;
  badgeText: string;
  subtitle: string;
  productId: string;
  discountPercent: number;
  customPrice?: number;
  endDateText?: string;
  endTimestamp?: number;
}

export interface SiteFeatures {
  ordersEnabled: boolean;
  loyaltyEnabled: boolean;
  reviewsEnabled?: boolean;
  personalDiscountEnabled?: boolean;
  defaultPersonalDiscountPercent?: number;
  maxPersonalDiscountPercent?: number;
  minOrderSumForPersonalDiscount?: number;
  combinePersonalDiscountWithPromo?: boolean;
  autoTierDiscountEnabled?: boolean;
  cashbackPercent?: number;
  showExactStock: boolean;
  floatingCallBtn: boolean;
  minOrderSum: number;
  freeShippingThreshold: number;
  weeklyDealEnabled?: boolean;
  topFlagshipEnabled?: boolean;
  quickCategoriesEnabled?: boolean;
  lowStockThreshold?: number;
  lowStockTelegramNotify?: boolean;
  showLowStockBadgeToBuyers?: boolean;
}

export interface HomepageBlock {
  id: 'hero' | 'weekly_deal' | 'bestsellers' | 'categories' | 'catalog_grid' | 'brands' | 'about' | 'reviews' | 'faq';
  name: string;
  description: string;
  enabled: boolean;
}

export interface SiteSettings {
  homepageBlocks?: HomepageBlock[];
  phone: string;
  email?: string;
  viber: string;
  telegram: string;
  callbackText: string;
  botToken: string;
  chatId: string;
  city: string;
  address: string;
  workHours: string;
  novaPoshtaApiKey?: string;
  ukrposhtaToken?: string;
  // Online Payment Gateways (WayForPay, Monobank, LiqPay)
  paymentGateway?: 'wayforpay' | 'monobank' | 'liqpay' | 'manual';
  paymentMerchantId?: string;
  paymentSecretKey?: string;
  monobankToken?: string;
  companyName?: string;
  companyEdrpou?: string;
  companyIban?: string;
  companyBank?: string;
  // Seller / FOP Requisites & Legal Info
  fopName?: string;
  fopRegistrationAddress?: string;
  fopActualAddress?: string;
  fopRnokpp?: string;
  fopEmail?: string;
  fopPhone?: string;
  fopStoreAddress?: string;
  websiteUrl?: string;
  licenseInfo?: string;
  taxInfo?: string;
  aboutTitle?: string;
  aboutStory?: string;
  // Flagship Spotlight in Banner Settings
  topFlagshipTitle?: string;
  topFlagshipProductIds?: string[];
  topFlagshipInterval?: number;
  topFlagshipAutoplay?: boolean;
  topFlagshipBadgeText?: string;
  // Returns & Exchange Settings
  returnsDays?: number;
  returnsWhoPaysGood?: string;
  returnsWhoPaysDefect?: string;
  returnsReceiverName?: string;
  returnsReceiverPhone?: string;
  returnsReceiverCity?: string;
  returnsReceiverWarehouse?: string;
  returnsRefundDays?: string;
  returnsWarrantyInfo?: string;
  returnsNotes?: string;
  returnsTitle?: string;
  returnsSubtitle?: string;
  returnsLegalBasis?: string;
  returnsProtectionDays?: number;
  returnsCondition1?: string;
  returnsCondition2?: string;
  returnsCondition3?: string;
  returnsCondition4?: string;
  returnsStep1Title?: string;
  returnsStep1Text?: string;
  returnsStep2Title?: string;
  returnsStep2Text?: string;
  returnsStep3Title?: string;
  returnsStep3Text?: string;
  returnsStep4Title?: string;
  returnsStep4Text?: string;
  returnsNoCodNotice?: string;
  returnsWarranty1Title?: string;
  returnsWarranty1Text?: string;
  returnsWarranty2Title?: string;
  returnsWarranty2Text?: string;
  returnsWarranty3Title?: string;
  returnsWarranty3Text?: string;
  // SMS Notification Gateway (TurboSMS, SMS-Fly, AlphaSMS, manual)
  smsGateway?: 'none' | 'turbosms' | 'smsfly' | 'alphasms';
  smsApiKey?: string;
  smsSenderName?: string;
  smsStockAlertTemplate?: string;
  callbackTelegramNotify?: boolean;
  callbackAutoSmsEnabled?: boolean;
  callbackSmsTemplate?: string;
  features: SiteFeatures;
}

export interface ReturnRequest {
  id: string;
  orderNumber?: string;
  buyerPhone: string;
  buyerName?: string;
  reason: 'not_fit' | 'defect' | 'wrong_item' | 'warranty' | 'other';
  comment?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  adminNotes?: string;
}

export type CustomRequestStatus = 'new' | 'processing' | 'quoted' | 'ordered' | 'completed' | 'rejected';

export interface CustomProductRequest {
  id: string;
  clientPhone: string;
  clientName: string;
  title: string;
  category?: string;
  quantity?: string;
  description?: string;
  linkOrPhoto?: string;
  createdAt: string;
  status: CustomRequestStatus;
  adminQuotePrice?: number;
  adminDeliveryDays?: string;
  adminNotes?: string;
}

export interface StockAlertRequest {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  productPrice?: number;
  phone: string;
  name?: string;
  channel?: 'sms' | 'viber' | 'telegram' | 'whatsapp' | 'call';
  telegramUsername?: string;
  createdAt: string;
  status: 'pending' | 'notified' | 'cancelled';
  notifiedAt?: string;
}

export interface ProductReview {
  id: string;
  productId?: string;
  author: string;
  city?: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  recommended: boolean;
  helpfulCount: number;
}

export interface HeaderDesign {
  bgColor: string;
  logoBadge: string;
  logoText: string;
  logoSubtitle?: string;
  promoActive: boolean;
  promoText: string;
  heroBadge: string;
  heroTitle: string;
  heroDesc: string;
  heroAddress: string;
  heroCity: string;
  footerDesc?: string;
  footerTrust1?: string;
  footerTrust2?: string;
  // Hero Quick Direction Navigation Hub (Сантехніка, Електрика, Інструмент, Господарчі)
  heroQuickNavEnabled?: boolean;
  // Hero 4 Live Store Metrics Pills
  heroStatsEnabled?: boolean;
  heroStat1Label?: string;
  heroStat1Value?: string;
  heroStat1Sub?: string;
  heroStat2Label?: string;
  heroStat2Value?: string;
  heroStat2Sub?: string;
  heroStat3Label?: string;
  heroStat3Value?: string;
  heroStat3Sub?: string;
  heroStat4Label?: string;
  heroStat4Value?: string;
  heroStat4Sub?: string;
}

export interface FirebaseConnectionConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  enabled: boolean;
  autoSync: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderSum?: number;
  expiresAt?: string;
  usageCount: number;
  usageLimit?: number;
  isActive: boolean;
  notes?: string;
}

