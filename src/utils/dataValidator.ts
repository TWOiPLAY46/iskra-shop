import { Product, ProductBadge, Order, ClientData, ProductReview } from '../types/store';
import { normalizeStorageUnit } from './unitFormatter';
import { classifyProduct } from './categoryClassifier';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitized: T;
}

/**
 * Validates and sanitizes a Product object prior to saving in state/Firestore
 */
export function validateProduct(raw: Partial<Product>, defaultIdx: number = 0): ValidationResult<Product> {
  const errors: string[] = [];

  // Name validation
  const name = typeof raw.name === 'string' && raw.name.trim().length > 0
    ? raw.name.trim()
    : `Товар без назви #${defaultIdx + 1}`;
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Назва товару обов\'язкова');
  }

  // SKU validation
  const sku = typeof raw.sku === 'string' && raw.sku.trim().length > 0
    ? raw.sku.trim().toUpperCase()
    : `SKU-${Date.now().toString().slice(-6)}-${defaultIdx}`;

  // Price validation (Must be a positive number)
  let price = Number(raw.price);
  if (isNaN(price) || price < 0) {
    errors.push('Ціна повинна бути невід\'ємним числом');
    price = 0;
  }
  price = Math.round(price * 100) / 100;

  // Stock validation (Must be an integer >= 0)
  let stock = Number(raw.stock);
  if (isNaN(stock) || stock < 0) {
    stock = 0;
  }
  stock = Math.max(0, Math.floor(stock));

  // Category auto-classification if missing or invalid
  const classified = classifyProduct(name, sku);
  const mainCategory = raw.mainCategory && raw.mainCategory.trim() !== '' ? raw.mainCategory.trim() : classified.mainCategory;
  const subCategory = raw.subCategory && raw.subCategory.trim() !== '' ? raw.subCategory.trim() : classified.subCategory;
  const category = raw.category && raw.category.trim() !== '' ? raw.category.trim() : classified.category;

  // Unit normalization
  const unit = normalizeStorageUnit(raw.unit);

  // Image URL validation
  let image = typeof raw.image === 'string' ? raw.image.trim() : '';

  // Brand validation
  const brand = typeof raw.brand === 'string' && raw.brand.trim().length > 0 ? raw.brand.trim() : 'Інші виробники';

  // Badge validation
  let badge: ProductBadge = '';
  if (raw.badge === 'Хіт продажу' || raw.badge === 'Акція' || raw.badge === 'Новинка') {
    badge = raw.badge;
  }

  const sanitized: Product = {
    id: raw.id && String(raw.id).trim() !== '' ? String(raw.id).trim() : `prod-${Date.now()}-${defaultIdx}`,
    name,
    sku,
    price,
    stock,
    unit,
    mainCategory,
    subCategory,
    category,
    brand,
    image,
    badge,
    desc: typeof raw.desc === 'string' ? raw.desc.trim() : '',
    specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : {}
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validates buyer Order payload before placing order
 */
export function validateOrderData(data: {
  fio: string;
  phone: string;
  delivery: string;
  city: string;
  notes?: string;
}): ValidationResult<{ fio: string; phone: string; delivery: string; city: string; notes?: string }> {
  const errors: string[] = [];

  // Buyer FIO
  const fio = typeof data.fio === 'string' ? data.fio.trim() : '';
  if (fio.length < 2) {
    errors.push('Вкажіть ім\'я та прізвище (мінімум 2 символи)');
  }

  // Phone validation (Ukrainian phone format)
  const cleanPhone = typeof data.phone === 'string' ? data.phone.replace(/[^0-9+]/g, '') : '';
  if (!cleanPhone || cleanPhone.length < 10) {
    errors.push('Вкажіть коректний номер телефону (наприклад, +380966473667)');
  }

  // Delivery & City
  const delivery = typeof data.delivery === 'string' && data.delivery.trim() !== '' ? data.delivery.trim() : 'Нова Пошта';
  const city = typeof data.city === 'string' && data.city.trim() !== '' ? data.city.trim() : 'с-ще. Оратів';

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      fio,
      phone: cleanPhone,
      delivery,
      city,
      notes: typeof data.notes === 'string' ? data.notes.trim() : ''
    }
  };
}

/**
 * Validates Product Review data
 */
export function validateReviewData(data: Partial<ProductReview>): ValidationResult<ProductReview> {
  const errors: string[] = [];

  const author = typeof data.author === 'string' && data.author.trim().length > 0 ? data.author.trim() : 'Анонімний покупець';
  const comment = typeof data.comment === 'string' ? data.comment.trim() : '';
  if (comment.length < 5) {
    errors.push('Текст відгуку повинен містити щонайменше 5 символів');
  }

  let rating = Number(data.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    rating = 5;
  }

  const sanitized: ProductReview = {
    id: data.id || `rev-${Date.now()}`,
    productId: data.productId || '',
    author,
    city: typeof data.city === 'string' ? data.city.trim() : 'с-ще. Оратів',
    rating,
    comment,
    date: data.date || new Date().toISOString().split('T')[0],
    verifiedPurchase: Boolean(data.verifiedPurchase ?? true),
    recommended: Boolean(data.recommended ?? true),
    helpfulCount: Number(data.helpfulCount || 0)
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}
