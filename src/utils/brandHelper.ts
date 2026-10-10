import { Product } from '../types/store';

// Comprehensive dictionary of recognized brands and their aliases (lowercase)
const BRAND_DICTIONARY: { name: string; aliases: string[] }[] = [
  // Lighting & Electrical
  { name: 'LEBRON', aliases: ['lebron', 'леброн'] },
  { name: 'ETRON', aliases: ['etron', 'етрон'] },
  { name: 'NORTE', aliases: ['norte', 'норте'] },
  { name: 'VIOLUX', aliases: ['violux', 'віолюкс', 'виолюкс'] },
  { name: 'ENERLIGHT', aliases: ['enerlight', 'енерлайт'] },
  { name: 'ISKRA', aliases: ['iskra', 'іскра', 'искра'] },
  { name: 'VELMAX', aliases: ['velmax', 'велмакс'] },
  { name: 'VIDEX', aliases: ['videx', 'відекс', 'видекс'] },
  { name: 'HOROZ ELECTRIC', aliases: ['horoz electric', 'horoz', 'хороз'] },
  { name: 'PHILIPS', aliases: ['philips', 'філіпс', 'филипс'] },
  { name: 'OSRAM', aliases: ['osram', 'осрам'] },
  { name: 'LEDVANCE', aliases: ['ledvance', 'ледванс'] },
  { name: 'LEZARD', aliases: ['lezard', 'лезард'] },
  { name: 'VIKO', aliases: ['viko', 'віко', 'вико'] },
  { name: 'IEK', aliases: ['iek', 'іек', 'иэк'] },
  { name: 'E.NEXT', aliases: ['e.next', 'enext', 'е.некст', 'енекст'] },
  { name: 'ABB', aliases: ['abb', 'абб'] },
  { name: 'LEGRAND', aliases: ['legrand', 'легранд'] },
  { name: 'HAGER', aliases: ['hager', 'хагер'] },
  { name: 'EATON', aliases: ['eaton', 'ітон', 'итон'] },
  { name: 'Schneider Electric', aliases: ['schneider electric', 'schneider', 'шнайдер'] },
  { name: 'WAGO', aliases: ['wago', 'ваго'] },
  { name: 'DEVI', aliases: ['devi', 'деві', 'деви'] },
  { name: 'NEXANS', aliases: ['nexans', 'нексанс'] },
  { name: 'ZUBR', aliases: ['zubr', 'зубр'] },
  { name: 'DigiTOP', aliases: ['digitop', 'діджітоп', 'диджитоп'] },
  { name: 'Novatek', aliases: ['novatek', 'новатек'] },
  { name: 'Luxel', aliases: ['luxel', 'люксель', 'люксел'] },
  { name: 'Global', aliases: ['global', 'глобал'] },
  { name: 'MAXUS', aliases: ['maxus', 'максус'] },
  { name: 'Biom', aliases: ['biom', 'біом', 'биом'] },
  { name: 'Eurolamp', aliases: ['eurolamp', 'євроламп', 'евроламп'] },
  { name: 'Bellson', aliases: ['bellson', 'беллсон'] },
  { name: 'Right Haus', aliases: ['right haus', 'righthaus'] },
  { name: 'Gunsan', aliases: ['gunsan', 'гунсан'] },
  { name: 'Mutlusan', aliases: ['mutlusan'] },
  { name: 'ЗЗЦМ', aliases: ['ззцм', 'запорізький завод'] },
  { name: 'Одескабель', aliases: ['одескабель', 'одесакабель'] },
  { name: 'Южкабель', aliases: ['южкабель'] },
  { name: 'Промпровід', aliases: ['промпровід'] },
  { name: 'Luxeon', aliases: ['luxeon', 'люксеон'] },
  { name: 'Vito', aliases: ['vito', 'віто'] },

  // Plumbing & Heating
  { name: 'Valtec', aliases: ['valtec', 'валтек'] },
  { name: 'Grohe', aliases: ['grohe', 'гроє', 'грое'] },
  { name: 'Hansgrohe', aliases: ['hansgrohe', 'хансгрое'] },
  { name: 'Wavin', aliases: ['wavin', 'ekoplastik', 'вавін', 'екопластик'] },
  { name: 'FADO', aliases: ['fado', 'фадо'] },
  { name: 'KOER', aliases: ['koer', 'коер'] },
  { name: 'Kermi', aliases: ['kermi', 'кермі'] },
  { name: 'Cersanit', aliases: ['cersanit', 'церсаніт'] },
  { name: 'Atlantic', aliases: ['atlantic', 'атлантік', 'атлантик'] },
  { name: 'Danfoss', aliases: ['danfoss', 'данфосс'] },
  { name: 'Aquafilter', aliases: ['aquafilter', 'аквафільтр'] },
  { name: 'Mirado', aliases: ['mirado', 'мірадо'] },
  { name: 'Kolo', aliases: ['kolo', 'коло'] },
  { name: 'Kraft', aliases: ['kraft', 'крафт'] },
  { name: 'Tucai', aliases: ['tucai', 'тукай'] },
  { name: 'Ariston', aliases: ['ariston', 'арістон'] },
  { name: 'Baxi', aliases: ['baxi', 'баксі'] },
  { name: 'Vaillant', aliases: ['vaillant', 'вайлант', 'вайллант'] },
  { name: 'Protherm', aliases: ['protherm', 'протерм'] },
  { name: 'Ferroli', aliases: ['ferroli', 'ферролі'] },
  { name: 'Ferro', aliases: ['ferro', 'ферро'] },
  { name: 'Gorenje', aliases: ['gorenje', 'гореніє', 'гореньє'] },
  { name: 'Thermex', aliases: ['thermex', 'термекс'] },
  { name: 'Pedrollo', aliases: ['pedrollo', 'педролло'] },
  { name: 'Aquatica', aliases: ['aquatica', 'акватика'] },
  { name: 'Grundfos', aliases: ['grundfos', 'грундфос'] },
  { name: 'Wilo', aliases: ['wilo', 'віло'] },
  { name: 'Optima', aliases: ['optima', 'оптіма'] },
  { name: 'Euroaqua', aliases: ['euroaqua', 'євроаква'] },
  { name: 'Santehplast', aliases: ['santehplast', 'сантехпласт'] },
  { name: 'Herz', aliases: ['herz', 'герц'] },
  { name: 'Giacomini', aliases: ['giacomini', 'джакоміні'] },
  { name: 'TECE', aliases: ['tece', 'тесе'] },
  { name: 'Rehau', aliases: ['rehau', 'рехау'] },
  { name: 'Geberit', aliases: ['geberit', 'геберіт'] },
  { name: 'Viega', aliases: ['viega', 'вієга'] },
  { name: 'Alcaplast', aliases: ['alcaplast', 'алкапласт', 'alcadrain'] },
  { name: 'Ravak', aliases: ['ravak', 'равак'] },
  { name: 'Volle', aliases: ['volle', 'волле'] },
  { name: 'Imprese', aliases: ['imprese', 'імпрезе'] },
  { name: 'Kraus', aliases: ['kraus', 'краус'] },
  { name: 'Franke', aliases: ['franke', 'франке'] },
  { name: 'Blanco', aliases: ['blanco', 'бланко'] },
  { name: 'Roca', aliases: ['roca', 'рока'] },
  { name: 'Laufen', aliases: ['laufen', 'лауфен'] },
  { name: 'Villeroy & Boch', aliases: ['villeroy & boch', 'villeroy boch', 'villeroy'] },
  { name: 'Colombo', aliases: ['colombo', 'коломбо'] },
  { name: 'Kroner', aliases: ['kroner', 'кронер'] },
  { name: 'Haiba', aliases: ['haiba', 'хайба'] },
  { name: 'Cron', aliases: ['cron', 'крон'] },
  { name: 'Zerix', aliases: ['zerix', 'зерікс'] },
  { name: 'Santep', aliases: ['santep', 'сантеп'] },
  { name: 'Sprut', aliases: ['sprut', 'спрут'] },
  { name: 'Shimge', aliases: ['shimge', 'шимге'] },
  { name: 'Leo', aliases: ['leo', 'лео'] },
  { name: 'Dongyin', aliases: ['dongyin', 'донгін'] },
  { name: 'Wetron', aliases: ['wetron', 'ветрон'] },

  // Tools & Hardware
  { name: 'Dnipro-M', aliases: ['dnipro-m', 'dnipro m', 'дніпро-м', 'дніпро м'] },
  { name: 'Intertool', aliases: ['intertool', 'інтертул'] },
  { name: 'Sigma', aliases: ['sigma', 'сигма'] },
  { name: 'Mastertool', aliases: ['mastertool', 'мастертул'] },
  { name: 'Topex', aliases: ['topex', 'топекс'] },
  { name: 'Neo Tools', aliases: ['neo tools', 'нео тулс'] },
  { name: 'Yato', aliases: ['yato', 'ято'] },
  { name: 'Makita', aliases: ['makita', 'макіта'] },
  { name: 'Bosch', aliases: ['bosch', 'бош'] },
  { name: 'DeWalt', aliases: ['dewalt', 'деволт'] },
  { name: 'Metabo', aliases: ['metabo', 'метабо'] },
  { name: 'Milwaukee', aliases: ['milwaukee', 'мілуокі'] },
  { name: 'Stanley', aliases: ['stanley', 'стенлі'] },
  { name: 'Black+Decker', aliases: ['black+decker', 'black & decker', 'black decker'] },
  { name: 'Fiskars', aliases: ['fiskars', 'фіскарс'] },
  { name: 'Stihl', aliases: ['stihl', 'штіль'] },
  { name: 'Husqvarna', aliases: ['husqvarna', 'хускварна'] },
  { name: 'Karcher', aliases: ['karcher', 'кьорхер', 'керхер'] },
  { name: 'Edon', aliases: ['edon', 'едон'] },
  { name: 'Vorhut', aliases: ['vorhut', 'ворхут'] },
  { name: 'Miol', aliases: ['miol', 'міол'] },
  { name: 'Bahco', aliases: ['bahco', 'бако'] },
  { name: 'Knipex', aliases: ['knipex', 'кніпекс'] },
  { name: 'Wera', aliases: ['wera', 'вера'] },
  { name: 'Wiha', aliases: ['wiha', 'віха'] },
  { name: 'Einhell', aliases: ['einhell', 'ейнхель'] },
  { name: 'Apecs', aliases: ['apecs', 'апекс'] },
  { name: 'Kale', aliases: ['kale kilit', 'kale', 'кале'] },
  { name: 'Mul-T-Lock', aliases: ['mul-t-lock', 'мультилок'] },
  { name: 'Abloy', aliases: ['abloy', 'аблой'] },
  { name: 'Gerda', aliases: ['gerda', 'герда'] },
  { name: 'Elbor', aliases: ['elbor', 'ельбор'] },
  { name: 'Kedr', aliases: ['kedr', 'кедр'] },
  { name: 'Fuaro', aliases: ['fuaro', 'фуаро'] },
  { name: 'Armadillo', aliases: ['armadillo', 'армаділло'] },
  { name: 'Punto', aliases: ['punto', 'пунто'] },
  { name: 'USK', aliases: ['usk', 'уск'] },
  { name: 'Siba', aliases: ['siba', 'сіба'] },

  // Building Materials & Chemistry
  { name: 'Ceresit', aliases: ['ceresit', 'церезіт', 'церезит'] },
  { name: 'Knauf', aliases: ['knauf', 'кнауф'] },
  { name: 'Siltek', aliases: ['siltek', 'сілтек', 'силтек'] },
  { name: 'Caparol', aliases: ['caparol', 'капарол'] },
  { name: 'Polimin', aliases: ['polimin', 'полімін'] },
  { name: 'Lafarge', aliases: ['lafarge', 'лафарж'] },
  { name: 'Siniat', aliases: ['siniat', 'сініат'] },
  { name: 'Dufa', aliases: ['düfa', 'dufa', 'дюфа'] },
  { name: 'Triora', aliases: ['triora', 'тріора'] },
  { name: 'Kolorit', aliases: ['kolorit', 'колоріт'] },
  { name: 'Farbex', aliases: ['farbex', 'фарбекс'] },
  { name: 'Alpina', aliases: ['alpina', 'альпіна'] },
  { name: 'Soudal', aliases: ['soudal', 'соудал', 'содал'] },
  { name: 'Tytan', aliases: ['tytan', 'титан'] },
  { name: 'Penosil', aliases: ['penosil', 'пеносіл'] },
  { name: 'Den Braven', aliases: ['den braven', 'ден бравен'] },
  { name: 'Moment', aliases: ['момент', 'moment'] },
  { name: 'Henkel', aliases: ['henkel', 'хенкель'] },
  { name: '3M', aliases: ['3m', '3м'] },
  { name: 'Tesa', aliases: ['tesa', 'теса'] },
  { name: 'Baumit', aliases: ['baumit', 'бауміт'] },
  { name: 'Polirem', aliases: ['polirem', 'полірем'] },
  { name: 'Master', aliases: ['майстер', 'master'] },
  { name: 'Budmajster', aliases: ['будмайстер', 'budmajster'] },
  { name: 'Kronospan', aliases: ['kronospan', 'кроноспан'] },
  { name: 'Egger', aliases: ['egger', 'еггер'] },
  { name: 'Swiss Krono', aliases: ['swiss krono', 'свісс кроно'] },
  { name: 'Ursa', aliases: ['ursa', 'урса'] },
  { name: 'Isover', aliases: ['isover', 'ізовер'] },
  { name: 'Rockwool', aliases: ['rockwool', 'роквул'] },
  { name: 'Technonicol', aliases: ['техноніколь', 'технониколь', 'technonicol'] },
  { name: 'Penoplex', aliases: ['пеноплекс', 'піноплекс', 'penoplex'] },
  { name: 'Sweetondale', aliases: ['sweetondale', 'світондейл'] },
  { name: 'Izovat', aliases: ['izovat', 'ізоват'] },
  { name: 'Termolife', aliases: ['termolife', 'термолайф'] },
  { name: 'Paroc', aliases: ['paroc', 'парок'] },
  { name: 'Leifheit', aliases: ['leifheit', 'лайфхайт'] },
  { name: 'Buro', aliases: ['buro', 'бюро'] },
  { name: 'Gardena', aliases: ['gardena', 'гардена'] },
  { name: 'Marolex', aliases: ['marolex', 'маролекс'] },
  { name: 'Cellfast', aliases: ['cellfast', 'целлфаст'] },
];

// Common abbreviations and technical words that shouldn't be treated as auto-detected brands
const TECHNICAL_NON_BRANDS = new Set([
  'LED', 'SMD', 'COB', 'RGB', 'RGBW', 'USB', 'IP20', 'IP44', 'IP54', 'IP65', 'IP67', 'IP68',
  'PPR', 'PVC', 'PEX', 'HDPE', 'LDPE', 'PN10', 'PN16', 'PN20', 'PN25', 'DN15', 'DN20', 'DN25', 'DN32', 'DN40', 'DN50',
  'ШВВП', 'ВВГ', 'ПВС', 'СІП', 'АВВГ', 'ВВГ-П', 'ВВГНГ', 'АПВ', 'ПВ-1', 'ПВ-3', 'ГОСТ', 'ДСТУ', 'ТУ',
  'PRO', 'MAX', 'PLUS', 'MINI', 'SLIM', 'ECO', 'NEW', 'TOP', 'SET', 'DIN', 'ISO', 'EURO',
  'E27', 'E14', 'GU10', 'GU5.3', 'G13', 'G4', 'G9', 'T8', 'A60', 'C37', 'G45', 'MR16',
  '12V', '24V', '220V', '230V', '380V', '10W', '20W', '30W', '50W', '100W', '4000K', '6500K', '3000K',
  'ШТ', 'М', 'КГ', 'ММ', 'СМ', 'Л', 'УП', 'КОМПЛЕКТ', 'НАБІР', 'ТОВ', 'ФОП', 'ПП', 'ТМ'
]);

/**
 * Extracts and normalizes the brand name for a product
 */
export const getProductBrand = (product: Product): string => {
  // 1. Explicit brand field
  if (product.brand && product.brand.trim() !== '') {
    const rawBrand = product.brand.trim();
    // Check if it matches a known brand alias for standard casing
    for (const item of BRAND_DICTIONARY) {
      if (item.name.toLowerCase() === rawBrand.toLowerCase() || item.aliases.some(a => a.toLowerCase() === rawBrand.toLowerCase())) {
        return item.name;
      }
    }
    return rawBrand;
  }
  
  // 2. Specifications fields (Виробник, Бренд, Manufacturer, etc.)
  if (product.specs) {
    for (const key of ['Виробник', 'Бренд', 'Manufacturer', 'Brand', 'Марка', 'ТМ', 'Торгова марка', 'Виробництво']) {
      if (product.specs[key] && typeof product.specs[key] === 'string' && product.specs[key].trim() !== '') {
        const specVal = product.specs[key].trim();
        for (const item of BRAND_DICTIONARY) {
          if (item.name.toLowerCase() === specVal.toLowerCase() || item.aliases.some(a => a.toLowerCase() === specVal.toLowerCase())) {
            return item.name;
          }
        }
        return specVal;
      }
    }
  }

  // 3. Search in dictionary against product name and description
  const combinedText = `${product.name} ${product.desc || ''}`.toLowerCase();
  
  for (const item of BRAND_DICTIONARY) {
    for (const alias of item.aliases) {
      // Word boundary check
      const regex = new RegExp(`(^|[^a-zа-яіїє0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zа-яіїє0-9]|$)`, 'i');
      if (regex.test(combinedText)) {
        return item.name;
      }
    }
  }

  // 4. Extract explicit TM or brand in quotes: ТМ "Brand" or ТМ «Brand»
  const tmMatch = product.name.match(/(?:ТМ|тм|Бренд|бренд)\s*["«]([^"»]+)["»]/i);
  if (tmMatch && tmMatch[1] && tmMatch[1].trim().length >= 2) {
    const extracted = tmMatch[1].trim();
    if (!TECHNICAL_NON_BRANDS.has(extracted.toUpperCase())) {
      return extracted;
    }
  }

  // 5. Look for standalone prominent brand tokens in uppercase (e.g. VELMAX, VIDEX, FADO, etc.)
  const words = product.name.split(/[\s,()"/\\«»[\]-]+/);
  for (const word of words) {
    const cleanWord = word.trim();
    if (cleanWord.length >= 3 && /^[A-ZА-ЯІЇЄ]{3,}[0-9]*$/.test(cleanWord)) {
      if (!TECHNICAL_NON_BRANDS.has(cleanWord.toUpperCase())) {
        // Find if matches standard brand or return formatted
        for (const item of BRAND_DICTIONARY) {
          if (item.name.toLowerCase() === cleanWord.toLowerCase() || item.aliases.includes(cleanWord.toLowerCase())) {
            return item.name;
          }
        }
        return cleanWord;
      }
    }
  }

  return 'Інші виробники';
};

/**
 * Intelligent multi-token search for products that matches:
 * - Product name
 * - Product SKU / Barcode
 * - Category / Subcategory / MainCategory
 * - Brand / Manufacturer
 * - Description & Specifications
 */
export const matchProductSearch = (product: Product, searchQuery: string): boolean => {
  if (!searchQuery || searchQuery.trim() === '') return true;

  // Clean punctuation from search tokens (e.g. from speech recognition like 'кабель.', 'реле,')
  const rawTokens = searchQuery
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);
  if (rawTokens.length === 0) return true;

  const pName = (product.name || '').toLowerCase();
  const pSku = (product.sku || '').toLowerCase();
  const pBarcode = (product.barcode || '').toLowerCase();
  const pCat = (product.category || '').toLowerCase();
  const pMainCat = (product.mainCategory || '').toLowerCase();
  const pSubCat = (product.subCategory || '').toLowerCase();
  const pDesc = (product.desc || '').toLowerCase();
  const pExplicitBrand = (product.brand || '').toLowerCase();
  const pDetectedBrand = getProductBrand(product).toLowerCase();
  
  // Collect all spec keys and values
  let specsText = '';
  if (product.specs) {
    specsText = Object.entries(product.specs)
      .map(([k, v]) => `${k} ${v}`)
      .join(' ')
      .toLowerCase();
  }

  // Every token must match at least one field
  return rawTokens.every(token => {
    return (
      pName.includes(token) ||
      pSku.includes(token) ||
      pBarcode.includes(token) ||
      pCat.includes(token) ||
      pMainCat.includes(token) ||
      pSubCat.includes(token) ||
      pExplicitBrand.includes(token) ||
      pDetectedBrand.includes(token) ||
      pDesc.includes(token) ||
      specsText.includes(token)
    );
  });
};
