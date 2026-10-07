/**
 * Intelligent Category & Subcategory Classifier for ISKRA store
 * Accurately analyzes product names, SKU/codes, and keywords to map items
 * into the exact 3-level CategoryTree without cross-category errors.
 * 
 * Rules Priority:
 * 1. Specific multi-word phrases & compound terms first (e.g. "кран-букса", "кран кульовий", "фільтр для води", "кабель-канал")
 * 2. Medium specific terms (e.g. "дифавтомат", "зубр", "реле напруги", "гофротруба", "філамент")
 * 3. General category keywords
 * 4. Fallback: "Інше / Нерозподілені"
 */

export interface CategoryClassification {
  mainCategory: string;
  subCategory: string;
  category: string;
}

interface ClassificationRule {
  mainCategory: string;
  subCategory: string;
  category: string;
  keywords: string[];
}

const PRIORITY_RULES: ClassificationRule[] = [
  // --- 1. ВЕРХНІЙ ПРІОРИТЕТ: СПЕЦИФІЧНІ СКЛАДНІ ФРАЗИ ---
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Змішувачі та комплектуючі',
    category: 'Аксесуари',
    keywords: ['кран-букса', 'кран букса', 'маховик крана', 'аератор для змішувача']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Крани кульові',
    keywords: ['кран кульовий', 'кран шаровий', 'кран метелик', 'кран важіль', 'кран американка', 'кран підводки']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Фільтри для води',
    category: 'Фільтри для води',
    keywords: ['фільтр для води', 'колба фільтра', 'картридж для води', 'картридж механічний', 'потрійний фільтр', 'зворотний осмос']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Кабельна продукція',
    category: 'Кабель-канали',
    keywords: ['кабель-канал', 'кабельканал', 'короб пластиковий']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Кабельна продукція',
    category: 'Гофротруба ПВХ/ПНД',
    keywords: ['гофротруба', 'гофра пвх', 'гофра пнд', 'гофрована труба']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Модульне обладнання',
    category: 'Диференційні автомати та ПЗВ',
    keywords: ['дифавтомат', 'диференційний автомат', 'пзв', 'узо']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Модульне обладнання',
    category: 'Реле напруги (Зубр)',
    keywords: ['реле напруги', 'зубр', 'zubr']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Модульне обладнання',
    category: 'Лічильники електроенергії',
    keywords: ['лічильник електр', 'електролічильник', 'лічильник однофазний', 'лічильник трифазний']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: "Силові роз'єми та вилки",
    category: 'Клемники WAGO',
    keywords: ['wago', 'ваго', 'клемник wago', 'клема wago', 'самозатискна клема']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Бойлери та водонагрівачі',
    category: 'Бойлер',
    keywords: ['бойлер', 'водонагрівач', 'водонагреватель', 'накопичувальний бак']
  },

  // --- 2. СЕРЕДНІЙ ПРІОРИТЕТ: СПЕЦІАЛІЗОВАНІ ТОВАРНІ ГРУПИ ---
  // Освітлення
  {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Лампи LED',
    keywords: ['лампа', 'ламп', 'лампочк', 'філамент', 'filament', 'e27', 'e14', 'gu10', 'gu5.3', 'lebron', 'etron', 'norte']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Світильники',
    keywords: ['світильник', 'светильник', 'люстра', 'плафон', 'трековий', 'спот', 'spot', 'downlight', 'даунлайт', 'панель led']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Прожектори',
    keywords: ['прожектор', 'floodlight']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Світлодіодна стрічка',
    keywords: ['стрічка led', 'лента led', 'led strip', 'неон', 'neon']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Ліхтарі',
    keywords: ['ліхтар', 'фонар', 'налобний']
  },

  // Кабельна продукція
  {
    mainCategory: 'Електротовари',
    subCategory: 'Кабельна продукція',
    category: 'Провід ПВС ШВВП',
    keywords: ['пвс', 'шввп', 'провід', 'провод']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Кабельна продукція',
    category: 'Кабель силовий ВВГ',
    keywords: ['ввг', 'аввг', 'кабель силовий', 'силовий кабель', 'кабель']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Кабельна продукція',
    category: 'Металорукав',
    keywords: ['металорукав', 'рукав металевий']
  },

  // Модульне обладнання
  {
    mainCategory: 'Електротовари',
    subCategory: 'Модульне обладнання',
    category: 'Автоматичні вимикачі',
    keywords: ['автоматичний вимикач', 'автомат', 'етімат', 'etimat', 'рубильник']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Електрощити та бокси',
    category: 'Електрощити та бокси',
    keywords: ['щит електро', 'щиток', 'бокс пластиковий', 'бокс металевий', 'щит розподільчий']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Стабілізатори напруги',
    category: 'Стабілізатори напруги',
    keywords: ['стабілізатор напруги', 'стабілізатор', 'luxeon']
  },

  // Електрофурнітура
  {
    mainCategory: 'Електротовари',
    subCategory: 'Електрофурнітура',
    category: 'Подовжувачі та колодки',
    keywords: ['подовжувач', 'удлинитель', 'колодка подовжувача']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Електрофурнітура',
    category: 'Вимикачі прихованого монтажу',
    keywords: ['вимикач', 'перемикач', 'переключатель']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Електрофурнітура',
    category: 'Розетки з заземленням',
    keywords: ['розетка', 'розетк']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: 'Електрофурнітура',
    category: 'Рамки декоративні',
    keywords: ['рамка декоративна', 'рамка 2-на', 'рамка 3-на']
  },
  {
    mainCategory: 'Електротовари',
    subCategory: "Силові роз'єми та вилки",
    category: 'Вилки електричні',
    keywords: ['вилка електрична', 'вилка пряма', 'вилка кутова', 'гніздо переносне', 'адаптер мережевий']
  },

  // Сантехніка
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Змішувачі та комплектуючі',
    category: 'Змішувач',
    keywords: ['змішувач', 'смеситель', 'гусак', 'вилив']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Змішувачі та комплектуючі',
    category: 'Лійки',
    keywords: ['лійка', 'лейка']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Змішувачі та комплектуючі',
    category: 'Душові системи',
    keywords: ['душова система', 'душ гарнітур', 'душова стійка', 'душова панель']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Змішувачі та комплектуючі',
    category: 'Шланги',
    keywords: ['шланг для душу', 'гнучка підводка', 'підводка для змішувача']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Радіатори та опалення',
    category: 'Радіатори',
    keywords: ['радіатор', 'батарея', 'секція радіатора', 'біметал']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Радіатори та опалення',
    category: 'Котел',
    keywords: ['котел опалення', 'котел газовий', 'котел електричний', 'котел']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Радіатори та опалення',
    category: 'Конвектори',
    keywords: ['конвектор']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Радіатори та опалення',
    category: 'Термоголовки',
    keywords: ['термоголовка', 'термостат радіатора', 'danfoss']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Поліпропілен',
    keywords: ['поліпропілен', 'ппр', 'ppr', 'паяння']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Каналізація',
    keywords: ['каналізація', 'каналізаційна', 'сифон каналізаційний']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Муфти',
    keywords: ['муфта сантехнічна', 'муфта обтискна']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Фітинги',
    keywords: ['фітинг', 'ніпель', 'коліно', 'трійник', 'американка']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Труби та фітинги',
    category: 'Труби',
    keywords: ['труба', 'труби']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Санфаянс',
    category: 'Унітази',
    keywords: ['унітаз', 'компакт', 'бачок унітазу']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Санфаянс',
    category: 'Умивальники',
    keywords: ['умивальник', 'раковина', 'мийка']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Санфаянс',
    category: 'Інсталяції',
    keywords: ['інсталяція', 'geberit', 'кнопка інсталяції']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Водопостачання та насоси',
    category: 'Насоси поверхневі',
    keywords: ['насос', 'гідрофор', 'водолій']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Водопостачання та насоси',
    category: 'Гідроакумулятори',
    keywords: ['гідроакумулятор', 'мембранний бак']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Водопостачання та насоси',
    category: 'Лічильники води',
    keywords: ['лічильник води', 'водомір']
  },
  {
    mainCategory: 'Сантехніка та опалення',
    subCategory: 'Ванни та душові кабіни',
    category: 'Трапи та сифони',
    keywords: ['сифон', 'трап для душу']
  },

  // Інструменти
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Електроінструмент',
    category: 'Перфоратори та молотки',
    keywords: ['перфоратор', 'відбійний молоток']
  },
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Електроінструмент',
    category: 'Шуруповерти і гайковерти',
    keywords: ['шуруповерт', 'гайковерт']
  },
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Електроінструмент',
    category: 'Болгарки (УШМ)',
    keywords: ['болгарка', 'ушм', 'шліфмашина']
  },
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Електроінструмент',
    category: 'Дрилі та перфоратори',
    keywords: ['дриль', 'дрель']
  },
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Ручний інструмент',
    category: 'Ключі гайкові',
    keywords: ['ключ гайковий', 'набір ключів', 'тріскачка']
  },
  {
    mainCategory: 'Інструменти та обладнання',
    subCategory: 'Ручний інструмент',
    category: 'Викрутки',
    keywords: ['викрутка', 'отвертка']
  },

  // Господарчі товари
  {
    mainCategory: 'Господарчі товари',
    subCategory: 'Кріплення та фурнітура',
    category: 'Замки навісні',
    keywords: ['замок навісний', 'серцевина замка', 'циліндр замка']
  },
  {
    mainCategory: 'Господарчі товари',
    subCategory: 'Кріплення та фурнітура',
    category: 'Дюбелі та шурупи',
    keywords: ['дюбель', 'саморіз', 'шуруп', 'болт', 'гайка', 'шайба']
  }
];

export function classifyProduct(name: string, sku: string = ''): CategoryClassification {
  if (!name || typeof name !== 'string') {
    return {
      mainCategory: 'Інше / Нерозподілені',
      subCategory: 'Нерозподілені',
      category: 'Інше'
    };
  }

  const text = `${name} ${sku}`.toLowerCase().trim().replace(/\s+/g, ' ');

  // Проходимо по впорядкованому списку правил (від найспецифічніших до загальних)
  for (const rule of PRIORITY_RULES) {
    const matched = rule.keywords.some((kw) => text.includes(kw));
    if (matched) {
      return {
        mainCategory: rule.mainCategory,
        subCategory: rule.subCategory,
        category: rule.category
      };
    }
  }

  // Fallback якщо жодне правило не підійшло
  return {
    mainCategory: 'Інше / Нерозподілені',
    subCategory: 'Нерозподілені',
    category: 'Інше'
  };
}
