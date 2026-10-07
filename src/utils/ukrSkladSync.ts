import { Product, Order } from '../types/store';
import { formatUnit, normalizeStorageUnit } from './unitFormatter';
import { classifyProduct } from './categoryClassifier';

export interface UkrSkladParsedData {
  products: Partial<Product>[];
  categories: { id: string; name: string; parentId?: string }[];
  totalParsed: number;
  errors: string[];
}

/**
 * Robustly parses UkrSklad CSV export (semicolon separated) or XML CommerceML feed
 */
export function parseUkrSkladFeed(rawText: string): UkrSkladParsedData {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<') || trimmed.includes('<КоммерческаяИнформация')) {
    return parseUkrSkladXML(trimmed);
  } else {
    return parseUkrSkladCSV(trimmed);
  }
}

/**
 * Parses UkrSklad CSV export (semicolon separated, Windows-1251 or UTF-8)
 */
export function parseUkrSkladCSV(csvText: string): UkrSkladParsedData {
  const result: UkrSkladParsedData = {
    products: [],
    categories: [],
    totalParsed: 0,
    errors: []
  };

  try {
    const rawLines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 1) {
      result.errors.push('Файл CSV порожній.');
      return result;
    }

    // Detect delimiter
    const firstLine = rawLines[0] || '';
    let delimiter = ';';
    if (firstLine.includes(';') && firstLine.split(';').length >= firstLine.split(',').length) {
      delimiter = ';';
    } else if (firstLine.includes(',') && firstLine.split(',').length > firstLine.split(';').length) {
      delimiter = ',';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    // Helper to parse CSV line with quotes and delimiter
    const parseCSVLine = (line: string): string[] => {
      const row: string[] = [];
      let inQuotes = false;
      let currentVal = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          row.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim().replace(/^["']|["']$/g, ''));
      return row;
    };

    const firstRowCols = parseCSVLine(rawLines[0]).map(h => h.toLowerCase());
    const hasHeader = firstRowCols.some(h => 
      h.includes('код') || h.includes('sku') || h.includes('арт') ||
      h.includes('назв') || h.includes('наймен') || h.includes('товар') ||
      h.includes('цін') || h.includes('цен') || h.includes('кол') || h.includes('остат')
    );

    let codeIdx = firstRowCols.findIndex(h => h.includes('код') || h.includes('sku') || h.includes('арт'));
    let nameIdx = firstRowCols.findIndex(h => h.includes('назв') || h.includes('наймен') || h.includes('товар'));
    
    // Prioritize actual quantity ("К-ть", "Кількість", "Залишок") and exclude "Мін. залишок" / "В резерві"
    let stockIdx = firstRowCols.findIndex(h => {
      const isExcluded = h.includes('мін') || h.includes('min') || h.includes('резерв') || h.includes('упаков') || h.includes('ящик');
      if (isExcluded) return false;
      return h === 'к-ть' || h === 'к-сть' || h.includes('к-ть') || h.includes('к-сть') ||
             h.includes('кільк') || h.includes('кіл-') || h.includes('кол-во') ||
             (h.includes('залиш') && !h.includes('мін')) ||
             (h.includes('остат') && !h.includes('мин')) ||
             h.includes('наличи') || h.includes('stock') || h.includes('qty');
    });

    // Prioritize retail / store selling price over purchase/incoming price
    const isIncomingPrice = (h: string) => h.includes('прих') || h.includes('вхід') || h.includes('закуп') || h.includes('себестоим') || h.includes('собіварт') || h.includes('вход');
    const isOptPrice = (h: string) => h.includes('опт') || h.includes('дилер');

    let priceIdx = firstRowCols.findIndex(h => 
      !isIncomingPrice(h) && !isOptPrice(h) && (
        h === 'розд. ціна' || h === 'розд.ціна' || h === 'розд.ціна(грн)' || h === 'роздрібна ціна' ||
        h.includes('розд') || h.includes('розниц') || h.includes('магазин') || h.includes('продаж') || 
        h.includes('роздріб') || h.includes('видач') || h === 'ціна' || h === 'цена' || h === 'ціна 1(грн)' || h === 'ціна 1'
      )
    );
    if (priceIdx === -1) {
      priceIdx = firstRowCols.findIndex(h => 
        !isIncomingPrice(h) && (h.includes('цен') || h.includes('цін') || h.includes('грн') || h.includes('вартість'))
      );
    }
    if (priceIdx === -1) {
      priceIdx = firstRowCols.findIndex(h => 
        h.includes('цен') || h.includes('цін') || h.includes('грн') || h.includes('вартість')
      );
    }

    let unitIdx = firstRowCols.findIndex(h => h.includes('ед') || h.includes('од') || h.includes('один'));
    let catIdx = firstRowCols.findIndex(h => h.includes('катег') || h.includes('груп') || h.includes('розділ'));

    if (!hasHeader) {
      codeIdx = 0;
      nameIdx = 1;
      unitIdx = 2;
      stockIdx = 3;
      priceIdx = 5;
    } else {
      if (nameIdx === -1) nameIdx = 1;
      if (codeIdx === -1) codeIdx = 0;
      if (stockIdx === -1 && firstRowCols.length >= 4) stockIdx = 3;
    }

    const startLineIdx = hasHeader ? 1 : 0;

    for (let i = startLineIdx; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      if (cols.length < 2) continue;

      // Find best name
      let rawName = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx] : (cols[1] || cols[0]);
      const name = cleanCyrillicText(rawName);
      if (!name || name.length < 2 || name === '(Blob)') continue;

      // Find SKU
      let sku = (codeIdx >= 0 && cols[codeIdx]) ? cols[codeIdx] : `SKU-${i}`;
      if (sku === name && cols[0] && cols[0] !== name) sku = cols[0];

      // Parse stock and price robustly for UkrSklad CSV exports
      const numericCols: { index: number; value: number; raw: string }[] = [];
      for (let c = 0; c < cols.length; c++) {
        if (c === nameIdx || c === codeIdx) continue;
        const rawVal = (cols[c] || '').replace(',', '.').trim();
        const num = parseFloat(rawVal);
        if (!isNaN(num) && rawVal !== '' && !/[a-zA-Zа-яА-ЯіІїЇєЄґҐ]{2,}/.test(rawVal)) {
          numericCols.push({ index: c, value: num, raw: rawVal });
        }
      }

      let stock = 10;
      if (stockIdx >= 0 && cols[stockIdx]) {
        const sNum = parseFloat(cols[stockIdx].replace(',', '.'));
        if (!isNaN(sNum)) stock = Math.round(sNum);
      } else if (cols.length >= 4 && cols[3] && !isNaN(parseFloat(cols[3].replace(',', '.')))) {
        stock = Math.round(parseFloat(cols[3].replace(',', '.')));
      } else if (numericCols.length > 0) {
        stock = Math.round(numericCols[0].value);
      }

      let price = 100;
      if (priceIdx >= 0 && cols[priceIdx]) {
        const pNum = parseFloat(cols[priceIdx].replace(',', '.'));
        if (!isNaN(pNum) && pNum > 0) price = Math.round(pNum);
      } else if (cols.length >= 8 && cols[7] && !isNaN(parseFloat(cols[7].replace(',', '.')))) {
        // In UkrSklad, column 7 is retail price (Розд. ціна)
        const pVal = parseFloat(cols[7].replace(',', '.'));
        if (pVal > 0) price = Math.round(pVal);
      } else if (cols.length >= 23 && cols[22] && !isNaN(parseFloat(cols[22].replace(',', '.')))) {
        // Column 22 is Розд.ціна(грн)
        const pVal = parseFloat(cols[22].replace(',', '.'));
        if (pVal > 0) price = Math.round(pVal);
      } else if (cols.length >= 6 && cols[5] && !isNaN(parseFloat(cols[5].replace(',', '.')))) {
        const pVal = parseFloat(cols[5].replace(',', '.'));
        if (pVal > 0) price = Math.round(pVal);
      } else if (numericCols.length > 1) {
        price = Math.round(numericCols[1].value);
      } else if (numericCols.length === 1) {
        price = Math.round(numericCols[0].value);
      }

      const rawUnit = (cols[2] && cols[2].length <= 5) ? cols[2] : (unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : 'шт');
      const unit = normalizeStorageUnit(rawUnit);

      // Smart category mapping
      let mainCategory = 'Електротовари';
      let subCategory = 'Освітлення';
      let category = 'Світильники';

      const rawCat = catIdx >= 0 && cols[catIdx] ? cols[catIdx].trim() : '';
      if (rawCat) {
        category = rawCat;
        subCategory = rawCat;

        const catLower = category.toLowerCase();
        const nameLower = name.toLowerCase();
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
        }
      } else {
        const classified = classifyProduct(name, sku);
        mainCategory = classified.mainCategory;
        subCategory = classified.subCategory;
        category = classified.category;
      }

      result.products.push({
        id: `ukr-csv-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        sku,
        category,
        mainCategory,
        subCategory,
        price,
        stock,
        unit: normalizeStorageUnit(unit),
        desc: `Товар з облікової програми УкрСклад (Артикул: ${sku})`,
        image: '',
        badge: ''
      });
    }

    result.totalParsed = result.products.length;
  } catch (err: any) {
    result.errors.push('Помилка читання CSV: ' + err.message);
  }

  return result;
}

/**
 * Helper to clean broken encoding characters if uploaded CSV is CP1251 decoded as UTF-8
 */
function cleanCyrillicText(text: string): string {
  if (!text) return '';
  // If it contains typical mojibake characters, return clean string or fallback
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Parses UkrSklad CommerceML 2.0 XML (import.xml or offers.xml)
 */
export function parseUkrSkladXML(xmlString: string): UkrSkladParsedData {
  const result: UkrSkladParsedData = {
    products: [],
    categories: [],
    totalParsed: 0,
    errors: []
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      result.errors.push('Помилка XML: ' + parseError.textContent?.slice(0, 100));
      return result;
    }

    const groupElements = doc.querySelectorAll('Группы > Группа, Groups > Group, categories > category');
    const categoryMap = new Map<string, string>();

    groupElements.forEach(el => {
      const id = el.querySelector('Ид, Id, ID')?.textContent?.trim() || el.getAttribute('id') || '';
      const name = el.querySelector('Наименование, Name, name')?.textContent?.trim() || el.textContent?.trim() || '';
      const parentId = el.querySelector('ИдРодителя, ParentId')?.textContent?.trim();

      if (id && name) {
        categoryMap.set(id, name);
        result.categories.push({ id, name, parentId });
      }
    });

    const itemElements = doc.querySelectorAll('Товары > Товар, offers > offer, items > item, Каталог > Товар');

    itemElements.forEach((el, index) => {
      try {
        const id = el.querySelector('Ид, Id, ID')?.textContent?.trim() || el.getAttribute('id') || `ukr-xml-${index}`;
        const name = el.querySelector('Наименование, Name, name, title')?.textContent?.trim() || '';
        const sku = el.querySelector('Артикул, Code, SKU, sku, Штрихкод, Barcode')?.textContent?.trim() || `SKU-${index}`;
        const desc = el.querySelector('Описание, Description, description, ПолноеНаименование')?.textContent?.trim() || '';
        
        let catName = 'Сантехніка та опалення';
        const catId = el.querySelector('Группы > Ид, CategoryId, categoryId')?.textContent?.trim() || el.querySelector('category')?.textContent?.trim();
        if (catId && categoryMap.has(catId)) {
          catName = categoryMap.get(catId)!;
        }

        let price = 100;
        const priceStr = el.querySelector('Цены > Цена > ЦенаЗаЕдиницу, price, Price, розница, Цена')?.textContent?.trim();
        if (priceStr) {
          const num = parseFloat(priceStr.replace(',', '.').replace(/[^\d.]/g, ''));
          if (!isNaN(num) && num > 0) price = Math.round(num);
        }

        let stock = 10;
        const stockStr = el.querySelector('Количество, Stock, stock, Остаток, amount, quantity')?.textContent?.trim();
        if (stockStr) {
          const num = parseInt(stockStr.replace(/[^\d-]/g, ''), 10);
          if (!isNaN(num)) stock = num;
        }

        const unit = el.querySelector('БазоваяЕдиница, Unit, unit, Единица')?.textContent?.trim() || 'шт';
        const image = el.querySelector('Картинка, Image, image, picture, photo')?.textContent?.trim() || '';

        if (name) {
          let mainCategory = 'Електротовари';
          let subCategory = catName !== 'Сантехніка та опалення' ? catName : 'Освітлення';
          let category = subCategory;

          if (!catId || catName === 'Сантехніка та опалення') {
            const classified = classifyProduct(name, sku);
            mainCategory = classified.mainCategory;
            subCategory = classified.subCategory;
            category = classified.category;
          }

          result.products.push({
            id,
            name,
            sku,
            category,
            mainCategory,
            subCategory,
            price,
            stock,
            unit: normalizeStorageUnit(unit),
            desc,
            image,
            badge: ''
          });
        }
      } catch (err: any) {}
    });

    result.totalParsed = result.products.length;
  } catch (error: any) {
    result.errors.push('Помилка XML: ' + error.message);
  }

  return result;
}

/**
 * Generates CommerceML 2.0 orders.xml for UkrSklad
 */
export function generateCommerceMLOrdersXML(orders: Order[]): string {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<КоммерческаяИнформация ВерсияСхемы="2.09" ДатаФормирования="${currentDate}T${currentTime}">\n`;

  orders.forEach(order => {
    xml += `  <Документ>\n`;
    xml += `    <Ид>${order.id}</Ид>\n`;
    xml += `    <Номер>${order.id}</Номер>\n`;
    xml += `    <Дата>${order.date || currentDate}</Дата>\n`;
    xml += `    <ХозОперация>Заказ товара</ХозОперация>\n`;
    xml += `    <Роль>Продавец</Роль>\n`;
    xml += `    <Валюта>UAH</Валюта>\n`;
    xml += `    <Курс>1</Курс>\n`;
    xml += `    <Сумма>${order.total}</Сумма>\n`;
    
    xml += `    <Контрагенты>\n`;
    xml += `      <Контрагент>\n`;
    xml += `        <Ид>${order.phone.replace(/[^\d]/g, '')}</Ид>\n`;
    xml += `        <Наименование>${escapeXML(order.fio)}</Наименование>\n`;
    xml += `        <ПолноеНаименование>${escapeXML(order.fio)}</ПолноеНаименование>\n`;
    xml += `        <Роль>Покупатель</Роль>\n`;
    xml += `        <Контакты>\n`;
    xml += `          <Контакт>\n`;
    xml += `            <Тип>Телефон</Тип>\n`;
    xml += `            <Значение>${escapeXML(order.phone)}</Значение>\n`;
    xml += `          </Контакт>\n`;
    xml += `        </Контакты>\n`;
    xml += `        <АдресДоставки>\n`;
    xml += `          <Представление>${escapeXML(order.city + ', ' + order.delivery)}</Представление>\n`;
    xml += `        </АдресДоставки>\n`;
    xml += `      </Контрагент>\n`;
    xml += `    </Контрагенты>\n`;

    xml += `    <Товары>\n`;
    order.items.forEach(item => {
      xml += `      <Товар>\n`;
      xml += `        <Ид>${escapeXML(item.sku || item.name)}</Ид>\n`;
      xml += `        <Артикул>${escapeXML(item.sku || '')}</Артикул>\n`;
      xml += `        <Наименование>${escapeXML(item.name)}</Наименование>\n`;
      xml += `        <БазоваяЕдиница Код="796" НаименованиеПолное="${escapeXML(item.unit || 'шт')}">${escapeXML(item.unit || 'шт')}</БазоваяЕдиница>\n`;
      xml += `        <ЦенаЗаЕдиницу>${item.price}</ЦенаЗаЕдиницу>\n`;
      xml += `        <Количество>${item.qty}</Количество>\n`;
      xml += `        <Сумма>${item.price * item.qty}</Сумма>\n`;
      xml += `      </Товар>\n`;
    });
    xml += `    </Товары>\n`;
    xml += `    <Комментарий>Статус: ${order.status}. Оплата: ${order.isPaid ? 'ОПЛАЧЕНО' : 'Очікує оплати'}. ${escapeXML(order.notes || '')}</Комментарий>\n`;
    xml += `  </Документ>\n`;
  });

  xml += `</КоммерческаяИнформация>`;
  return xml;
}

function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
