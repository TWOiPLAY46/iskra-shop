/**
 * Smart CSV Product Parser for ISKRA store
 * Handles Ukrainian & English headers, multiple delimiters, dirty data,
 * supplier price lists, stock text statuses ('в наявності', '+', '>10'),
 * UkrSklad retail price detection, price rounding, and units formatting.
 */

import { Product } from '../types/store';
import { normalizeStorageUnit } from './unitFormatter';
import { classifyProduct } from './categoryClassifier';
import { getProductBrand } from './brandHelper';

export interface CsvImportOptions {
  defaultStock?: number;
  overrideStockWithDefault?: boolean;
  setStockIfZero?: boolean;
  roundPriceToInteger?: boolean; // Round prices to whole numbers (e.g. 65.50 -> 66 грн)
  defaultCategory?: string;
  defaultMainCategory?: string;
}

export interface ParsedCsvResult {
  products: Product[];
  totalRows: number;
  validCount: number;
  delimiter: string;
  headersDetected: string[];
}

export function parseProductCSV(csvText: string, options?: CsvImportOptions): ParsedCsvResult {
  const defaultStock = options?.defaultStock !== undefined ? options.defaultStock : 10;
  const setStockIfZero = options?.setStockIfZero !== false; // default true
  const overrideStockWithDefault = !!options?.overrideStockWithDefault;
  const roundPriceToInteger = options?.roundPriceToInteger !== false; // default true (целые заокругленные цены)
  const defaultCategory = options?.defaultCategory || 'Електротовари';
  const defaultMainCategory = options?.defaultMainCategory || 'Електротовари';

  if (!csvText || !csvText.trim()) {
    return { products: [], totalRows: 0, validCount: 0, delimiter: ',', headersDetected: [] };
  }

  // Detect delimiter
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { products: [], totalRows: 0, validCount: 0, delimiter: ',', headersDetected: [] };
  }

  const firstLine = lines[0];
  let delimiter = ';';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (semiCount >= commaCount && semiCount >= tabCount && semiCount >= pipeCount && semiCount > 0) {
    delimiter = ';';
  } else if (tabCount >= commaCount && tabCount > 0) {
    delimiter = '\t';
  } else if (pipeCount >= commaCount && pipeCount > 0) {
    delimiter = '|';
  } else {
    delimiter = ',';
  }

  const parseLine = (line: string): string[] => {
    const row: string[] = [];
    let inQuote = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuote = !inQuote;
        }
      } else if (char === delimiter && !inQuote) {
        row.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim().replace(/^["']|["']$/g, ''));
    return row;
  };

  const rawHeader = parseLine(lines[0]);
  const headerCols = rawHeader.map(h => h.toLowerCase().trim());

  // Check if first row is header
  const hasHeader = headerCols.some(h => 
    h.includes('name') || h.includes('назв') || h.includes('наймен') || h.includes('товар') ||
    h.includes('sku') || h.includes('арт') || h.includes('код') || h.includes('штрих') ||
    h.includes('price') || h.includes('цін') || h.includes('цен') || h.includes('вартість') ||
    h.includes('stock') || h.includes('залиш') || h.includes('кільк') || h.includes('остат') ||
    h.includes('склад') || h.includes('наявн') || h.includes('доступн') || h.includes('unit') || h.includes('од.')
  );

  let idIdx = -1;
  let nameIdx = -1;
  let skuIdx = -1;
  let brandIdx = -1;
  let priceIdx = -1;
  let stockIdx = -1;
  let unitIdx = -1;
  let catIdx = -1;
  let badgeIdx = -1;
  let descIdx = -1;
  let imageIdx = -1;

  if (hasHeader) {
    // 1. Identify Name
    nameIdx = headerCols.findIndex(col => 
      col === 'повна назва товару' || col === 'назва товару' || col === 'назва' || col === 'name' || col === 'title' ||
      col.includes('повна назва') || col.includes('назв') || col.includes('наймен') || col.includes('товар') || col.includes('номенклатура')
    );

    // 2. Identify SKU / Code
    skuIdx = headerCols.findIndex(col => 
      col === 'код' || col === 'код товару' || col === 'sku' || col === 'артикул' || col === 'арт.' || col === 'арт' ||
      col.includes('sku') || col.includes('арт') || col.includes('штрих') || col.includes('код_тов')
    );

    // 3. Identify Brand / Manufacturer
    brandIdx = headerCols.findIndex(col => 
      col === 'виробник' || col === 'бренд' || col === 'brand' || col === 'manufacturer' || col.includes('виробник') || col.includes('бренд')
    );

    // 4. Identify Retail / Store Price (CRITICAL: Prioritize "Розд. ціна" / "Ціна магазину" over "Ціна прих." and "Опт. ціна")
    const isIncomingPrice = (col: string) => 
      col.includes('прих') || col.includes('вхід') || col.includes('закуп') || col.includes('себестоим') || col.includes('собіварт') || col.includes('вход');
    const isOptPrice = (col: string) => 
      col.includes('опт') || col.includes('дилер');

    // Primary search: explicit Retail / Store price
    priceIdx = headerCols.findIndex(col => 
      !isIncomingPrice(col) && !isOptPrice(col) && (
        col === 'розд. ціна' || col === 'розд.ціна' || col === 'розд.ціна(грн)' || col === 'роздрібна ціна' ||
        col.includes('розд') || col.includes('розниц') || col.includes('магазин') || col.includes('продаж') || col.includes('роздріб') ||
        col === 'ціна' || col === 'цена' || col === 'price' || col === 'ціна 1(грн)' || col === 'ціна 1'
      )
    );

    // Secondary search: any price column that is NOT incoming/wholesale
    if (priceIdx === -1) {
      priceIdx = headerCols.findIndex(col => 
        !isIncomingPrice(col) && (col.includes('price') || col.includes('цін') || col.includes('цен') || col.includes('вартість') || col.includes('грн'))
      );
    }

    // Tertiary search fallback
    if (priceIdx === -1) {
      priceIdx = headerCols.findIndex(col => 
        col.includes('price') || col.includes('цін') || col.includes('цен') || col.includes('вартість') || col.includes('грн')
      );
    }

    // 5. Identify Stock / Quantity
    stockIdx = headerCols.findIndex(col => {
      const isExcluded = col.includes('мін') || col.includes('min') || col.includes('резерв') || col.includes('паков') || col.includes('ящик') || col.includes('колір');
      if (isExcluded) return false;
      return col === 'к-ть' || col === 'к-сть' || col.includes('к-ть') || col.includes('к-сть') ||
             col.includes('кільк') || col.includes('кол-во') || col.includes('stock') || col.includes('залиш') ||
             col.includes('остат') || col.includes('наявн') || col.includes('qty');
    });

    // 6. Unit
    unitIdx = headerCols.findIndex(col => 
      col === 'од.вим.' || col === 'од. вим.' || col === 'од.' || col === 'unit' || col.includes('од.вим') || col.includes('один') || col.includes('ед.')
    );

    // 7. Category
    catIdx = headerCols.findIndex(col => 
      col.includes('cat') || col.includes('катег') || col.includes('груп') || col.includes('розділ') || col.includes('вид')
    );

    // 8. Badge, Desc, Image
    badgeIdx = headerCols.findIndex(col => col.includes('badge') || col.includes('бейдж') || col.includes('акція') || col.includes('мітка'));
    descIdx = headerCols.findIndex(col => col.includes('desc') || col.includes('опис') || col.includes('приміт') || col.includes('характер'));
    imageIdx = headerCols.findIndex(col => col.includes('imag') || col.includes('фото') || col.includes('зображ') || col.includes('url'));

    if (nameIdx === -1 && skuIdx !== 0) {
      nameIdx = 1;
    } else if (nameIdx === -1) {
      nameIdx = 0;
    }
  } else {
    // Positional fallback for headless UkrSklad CSV
    skuIdx = 0;
    nameIdx = 1;
    unitIdx = 2;
    stockIdx = 3;
    priceIdx = 7; // UkrSklad column 7 is retail price (Розд. ціна)
  }

  const parseStockValue = (raw: string | undefined): number => {
    if (overrideStockWithDefault) {
      return defaultStock;
    }
    if (!raw || typeof raw !== 'string') {
      return setStockIfZero ? defaultStock : 0;
    }

    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
      return setStockIfZero ? defaultStock : 0;
    }

    // Availability text keywords -> in stock!
    const inStockKeywords = ['в наявності', 'в наличии', 'є', 'так', 'yes', 'true', 'доступно', 'багато', '+', '++', '+++', 'є на складі', 'на складі', 'в наличии есть'];
    if (inStockKeywords.some(kw => trimmed === kw || trimmed.includes(kw))) {
      return defaultStock > 0 ? defaultStock : 10;
    }

    // Out of stock keywords
    const outOfStockKeywords = ['немає', 'нет', 'відсутній', 'відсутнє', 'закінчився', '0', 'нуль', 'zero', 'ні', 'no', 'false', '-'];
    if (outOfStockKeywords.some(kw => trimmed === kw)) {
      return setStockIfZero ? defaultStock : 0;
    }

    // Parse numbers from strings like "15 шт", "> 10", "10+", "від 5"
    const digitsOnly = trimmed.replace(/[^\d]/g, '');
    if (digitsOnly) {
      const num = parseInt(digitsOnly, 10);
      if (!isNaN(num)) {
        if (num === 0 && setStockIfZero) {
          return defaultStock;
        }
        return num;
      }
    }

    return setStockIfZero ? defaultStock : 0;
  };

  const parsePriceValue = (raw: string | undefined): number => {
    if (!raw) return 0;
    const cleanStr = String(raw).replace(/\s+/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return 0;
    return roundPriceToInteger ? Math.round(num) : Math.round(num * 100) / 100;
  };

  const parsedProducts: Product[] = [];
  const startRow = hasHeader ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseLine(line);
    if (cols.length === 0 || cols.every(c => !c)) continue;

    // Extract name
    let name = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx] : '';
    if (!name && cols.length > 1) {
      name = cols[1] || cols[0];
    }
    if (!name || !name.trim()) continue;
    name = name.trim();

    // Extract SKU
    let sku = (skuIdx >= 0 && cols[skuIdx]) ? cols[skuIdx].trim() : '';
    if (!sku) {
      sku = `SKU-${Date.now().toString().slice(-6)}-${i}`;
    }

    // ID
    let id = (idIdx >= 0 && cols[idIdx]) ? cols[idIdx].trim() : '';
    if (!id) {
      const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '-');
      id = safeSku ? `prod-${safeSku}` : `prod-csv-${Date.now()}-${i}`;
    }

    // Brand
    let brand = (brandIdx >= 0 && cols[brandIdx]) ? cols[brandIdx].trim() : '';

    // Category & Subcategory classification
    let category = (catIdx >= 0 && cols[catIdx]) ? cols[catIdx].trim() : '';
    let mainCategory = defaultMainCategory;
    let subCategory = category;

    if (!category) {
      const classified = classifyProduct(name, sku);
      mainCategory = classified.mainCategory;
      subCategory = classified.subCategory;
      category = classified.category;
    } else {
      const catLower = category.toLowerCase();
      const nameLower = name.toLowerCase();

      // Disambiguate fixtures vs lamps even if column was rough
      if (
        (catLower.includes('ламп') || catLower === 'лампи led') &&
        (nameLower.includes('світильник') || nameLower.includes('светильник') || nameLower.includes('downlight') || nameLower.includes('ndp') || nameLower.includes('люстра') || nameLower.includes('спот') || nameLower.includes('панель'))
      ) {
        mainCategory = 'Електротовари';
        subCategory = 'Освітлення';
        category = 'Світильники';
      } else if (
        catLower.includes('світильник') &&
        (nameLower.includes('лампа') || nameLower.includes('лампочк') || nameLower.includes('філамент')) &&
        !nameLower.includes('світильник') && !nameLower.includes('светильник')
      ) {
        mainCategory = 'Електротовари';
        subCategory = 'Освітлення';
        category = 'Лампи LED';
      } else if (catLower.includes('світл') || catLower.includes('освітл') || catLower.includes('електр') || catLower.includes('кабель') || catLower.includes('автомат')) {
        mainCategory = 'Електротовари';
      } else if (catLower.includes('сантех') || catLower.includes('опален') || catLower.includes('кран') || catLower.includes('змішувач') || catLower.includes('труб')) {
        mainCategory = 'Сантехніка та опалення';
      } else if (catLower.includes('інструм') || catLower.includes('облад')) {
        mainCategory = 'Інструменти та обладнання';
      } else if (catLower.includes('господ') || catLower.includes('сад')) {
        mainCategory = 'Господарчі товари';
      }
    }

    // Price extraction: Prioritize column 7 (Розд. ціна in UkrSklad) over column 5 (Ціна прих.)
    let price = priceIdx >= 0 ? parsePriceValue(cols[priceIdx]) : 0;
    if (price === 0) {
      // In UkrSklad export format, column 7 is retail price (Розд. ціна), column 22 is retail грн
      if (cols.length > 7 && cols[7] && !isNaN(parseFloat(cols[7].replace(',', '.')))) {
        price = parsePriceValue(cols[7]);
      } else if (cols.length > 22 && cols[22] && !isNaN(parseFloat(cols[22].replace(',', '.')))) {
        price = parsePriceValue(cols[22]);
      } else if (cols.length > 5 && cols[5] && !isNaN(parseFloat(cols[5].replace(',', '.')))) {
        price = parsePriceValue(cols[5]);
      } else {
        const pCol = cols.find((c, idx) => idx > 2 && c && !isNaN(parseFloat(c.replace(',', '.'))) && parseFloat(c.replace(',', '.')) >= 1);
        price = pCol ? parsePriceValue(pCol) : 100;
      }
    }

    // Stock extraction
    let stock = stockIdx >= 0 ? parseStockValue(cols[stockIdx]) : NaN;
    if (isNaN(stock)) {
      if (cols.length > 3 && cols[3] && !isNaN(parseFloat(cols[3].replace(',', '.')))) {
        stock = Math.round(parseFloat(cols[3].replace(',', '.')));
      } else {
        const sCol = cols.find((c, idx) => idx > 1 && c && !isNaN(parseFloat(c.replace(',', '.'))) && parseFloat(c.replace(',', '.')) < 1000);
        stock = sCol ? Math.round(parseFloat(sCol.replace(',', '.'))) : defaultStock;
      }
    }
    if (stock === 0 && setStockIfZero && defaultStock > 0) {
      stock = defaultStock;
    }

    // Unit
    const rawUnit = unitIdx >= 0 ? cols[unitIdx] : undefined;
    const unit = normalizeStorageUnit(rawUnit);

    // Badge
    const badge = (badgeIdx >= 0 && cols[badgeIdx] ? cols[badgeIdx].trim() : '') as any;

    // Desc & Image
    const desc = descIdx >= 0 && cols[descIdx] ? cols[descIdx].trim() : '';
    const image = imageIdx >= 0 && cols[imageIdx] ? cols[imageIdx].trim() : '';

    const tempProduct: Product = {
      id,
      name,
      category,
      mainCategory,
      subCategory: category,
      badge,
      sku,
      stock,
      price,
      unit,
      desc,
      image,
      brand: brand || undefined
    };

    // Auto-detect brand if not explicitly provided
    if (!brand || brand.trim() === '') {
      const detectedBrand = getProductBrand(tempProduct);
      if (detectedBrand && detectedBrand !== 'Інші виробники') {
        tempProduct.brand = detectedBrand;
      }
    }

    parsedProducts.push(tempProduct);
  }

  return {
    products: parsedProducts,
    totalRows: lines.length - startRow,
    validCount: parsedProducts.length,
    delimiter,
    headersDetected: hasHeader ? rawHeader : []
  };
}
