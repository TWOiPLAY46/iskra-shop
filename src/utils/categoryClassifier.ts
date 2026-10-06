/**
 * Intelligent Category & Subcategory Classifier for ISKRA store
 * Accurately analyzes product names, codes, and keywords to map items
 * into the 3-level CategoryTree:
 * 1. mainCategory (e.g., "Електротовари", "Сантехніка та опалення")
 * 2. subCategory (e.g., "Освітлення", "Змішувачі та комплектуючі")
 * 3. category / leaf (e.g., "Світильники", "Лампи LED", "Змішувач")
 */

export interface CategoryClassification {
  mainCategory: string;
  subCategory: string;
  category: string;
}

export function classifyProduct(name: string, sku: string = ''): CategoryClassification {
  const text = `${name} ${sku}`.toLowerCase().trim();

  if (text.includes('lebron') || text.includes('філамент') || text.includes('filament') || text.includes('філаментна')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Лампи LED'
    };
  }

  // 1. LIGHTING / СВІТЛОТЕХНІКА (LED, світильники, лампи, панелі, прожектори)
  if (
    text.includes('світил') || text.includes('светил') ||
    text.includes('edp') || text.includes('ndp') || text.includes('спот') ||
    text.includes('spot') || text.includes('downlight') || text.includes('даунлайт') ||
    text.includes('панел') || text.includes('люстр') || text.includes('бра ') ||
    text.includes('плафон') || text.includes('треков') || text.includes('торшер')
  ) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Світильники'
    };
  }

  if (
    text.includes('ламп') || text.includes('лампа') || text.includes('лампочк') ||
    text.includes('цокол') || text.includes('e27') || text.includes('e14') ||
    text.includes('gu10') || text.includes('gu5.3') || text.includes('g4') ||
    text.includes('g9') || text.includes('t8') || text.includes('філамент') || text.includes('filament')
  ) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Лампи LED'
    };
  }

  if (text.includes('прожект') || text.includes('floodlight')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Прожектори'
    };
  }

  if (text.includes('стріч') || text.includes('лент') || text.includes('led strip') || text.includes('неон') || text.includes('neon')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Світлодіодна стрічка'
    };
  }

  if (text.includes('ліхтар') || text.includes('фонар') || text.includes('налобн')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Ліхтарі'
    };
  }

  // General LED / Lighting catch-all defaults to Лампи LED unless fixture keywords are present
  if (text.includes('led') || text.includes('світлодіод') || text.includes('etron') || text.includes('norte') || text.includes('lebron')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Освітлення',
      category: 'Лампи LED'
    };
  }

  // 2. CABLE & WIRING / КАБЕЛЬНА ПРОДУКЦІЯ
  if (text.includes('пвс') || text.includes('шввп') || text.includes('провід') || text.includes('провод')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Кабельна продукція',
      category: 'Провід ПВС ШВВП'
    };
  }

  if (text.includes('ввг') || text.includes('аввг') || text.includes('силови') || (text.includes('кабел') && !text.includes('кабель-канал'))) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Кабельна продукція',
      category: 'Кабель силовий ВВГ'
    };
  }

  if (text.includes('гофр') || text.includes('гофротруб')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Кабельна продукція',
      category: 'Гофротруба ПВХ/ПНД'
    };
  }

  if (text.includes('кабель-канал') || text.includes('кабельканал') || text.includes('короб пластик')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Кабельна продукція',
      category: 'Кабель-канали'
    };
  }

  if (text.includes('металорукав')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Кабельна продукція',
      category: 'Металорукав'
    };
  }

  // 3. MODULAR EQUIPMENT / МОДУЛЬНЕ ОБЛАДНАННЯ
  if (text.includes('зубр') || text.includes('zubr') || text.includes('реле напруг')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Реле напруги (Зубр)'
    };
  }

  if (text.includes('диференц') || text.includes('дифавтомат') || text.includes('пзв') || text.includes('узо')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Диференційні автомати та ПЗВ'
    };
  }

  if (text.includes('етімат') || text.includes('etimat') || text.includes('автомат') || text.includes('вимикач автомат') || text.includes('рубильник')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Автоматичні вимикачі'
    };
  }

  if (text.includes('лічильник електр') || text.includes('електролічильник')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Лічильники електроенергії'
    };
  }

  if (text.includes('щит') || text.includes('бокс пластик') || text.includes('бокс метал') || text.includes('розподільчий щит')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Електрощити та бокси'
    };
  }

  if (text.includes('стабілізатор') || text.includes('luxeon')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Модульне обладнання',
      category: 'Стабілізатори напруги'
    };
  }

  // 4. ELECTRICAL ACCESSORIES / ЕЛЕКТРОФУРНІТУРА
  if (text.includes('подовжувач') || text.includes('колодк') || text.includes('удлинитель')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Електрофурнітура',
      category: 'Подовжувачі та колодки'
    };
  }

  if (text.includes('вимикач') || text.includes('перемикач') || text.includes('кнопка дзвінка')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Електрофурнітура',
      category: 'Вимикачі прихованого монтажу'
    };
  }

  if (text.includes('розетк')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Електрофурнітура',
      category: 'Розетки з заземленням'
    };
  }

  if (text.includes('рамк')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: 'Електрофурнітура',
      category: 'Рамки декоративні'
    };
  }

  if (text.includes('вилка') || text.includes('гніздо') || text.includes('адаптер') || text.includes('перехідник')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: "Силові роз'єми та вилки",
      category: 'Вилки електричні'
    };
  }

  if (text.includes('wago') || text.includes('ваго') || text.includes('клемник') || text.includes('клема')) {
    return {
      mainCategory: 'Електротовари',
      subCategory: "Силові роз'єми та вилки",
      category: 'Клемники WAGO'
    };
  }

  // 5. PLUMBING / САНТЕХНІКА ТА ОПАЛЕННЯ
  if (text.includes('змішувач') || text.includes('смеситель') || text.includes('гусак') || text.includes('картридж для змішувача') || text.includes('кран для кухні') || text.includes('кран для ванни')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Змішувачі та комплектуючі',
      category: 'Змішувач'
    };
  }

  if (text.includes('лійк') || text.includes('лейк')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Змішувачі та комплектуючі',
      category: 'Лійки'
    };
  }

  if (text.includes('душ') || text.includes('гарнітур душов') || text.includes('душов') || text.includes('панель душов')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Змішувачі та комплектуючі',
      category: 'Душові системи'
    };
  }

  if (text.includes('шланг для душ') || text.includes('шланг підводк') || text.includes('гнучка підводка')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Змішувачі та комплектуючі',
      category: 'Шланги'
    };
  }

  if (text.includes('радіатор') || text.includes('батаре') || text.includes('секція радіатор') || text.includes('біметал')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Радіатори та опалення',
      category: 'Радіатори'
    };
  }

  if (text.includes('бойлер') || text.includes('водонагрівач') || text.includes('арістон') || text.includes('ariston') || text.includes('атлантік') || text.includes('atlantic')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Бойлери та водонагрівачі',
      category: 'Бойлер'
    };
  }

  if (text.includes('котел') || text.includes('котл')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Радіатори та опалення',
      category: 'Котел'
    };
  }

  if (text.includes('конвектор')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Радіатори та опалення',
      category: 'Конвектори'
    };
  }

  if (text.includes('термоголовк') || text.includes('термостат') || text.includes('danfoss')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Радіатори та опалення',
      category: 'Термоголовки'
    };
  }

  if (text.includes('кран кульов') || text.includes('кран шаровий') || text.includes('кран метелик') || text.includes('кран важіль')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Труби та фітинги',
      category: 'Крани кульові'
    };
  }

  if (text.includes('поліпропілен') || text.includes('ппр') || text.includes('ppr') || text.includes('труба паяння')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Труби та фітинги',
      category: 'Поліпропілен'
    };
  }

  if (text.includes('каналізац') || text.includes('коліно кан') || text.includes('трійник кан')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Труби та фітинги',
      category: 'Каналізація'
    };
  }

  if (text.includes('фітинг') || text.includes('муфт') || text.includes('кут') || text.includes('ніпель') || text.includes('трійник') || text.includes('американка')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Труби та фітинги',
      category: 'Фітинги'
    };
  }

  if (text.includes('труб')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Труби та фітинги',
      category: 'Труби'
    };
  }

  if (text.includes('унітаз') || text.includes('компакт') || text.includes('бачок')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Санфаянс',
      category: 'Унітази'
    };
  }

  if (text.includes('умивальник') || text.includes('раковин') || text.includes('мийка')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Санфаянс',
      category: 'Умивальники'
    };
  }

  if (text.includes('інсталяц') || text.includes('кнопка інсталяції') || text.includes('geberit')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Санфаянс',
      category: 'Інсталяції'
    };
  }

  if (text.includes('насос') || text.includes('водолій') || text.includes('гідрофор')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Водопостачання та насоси',
      category: 'Насоси поверхневі'
    };
  }

  if (text.includes('гідроакумулятор') || text.includes('бак мембран')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Водопостачання та насоси',
      category: 'Гідроакумулятори'
    };
  }

  if (text.includes('водомір') || text.includes('лічильник води')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Водопостачання та насоси',
      category: 'Лічильники води'
    };
  }

  if (text.includes('фільтр') || text.includes('картридж') || text.includes('колба')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Радіатори та опалення',
      category: 'Фільтри для води'
    };
  }

  if (text.includes('сифон') || text.includes('трап')) {
    return {
      mainCategory: 'Сантехніка та опалення',
      subCategory: 'Ванни та душові кабіни',
      category: 'Трапи та сифони'
    };
  }

  // 6. TOOLS / ІНСТРУМЕНТИ ТА ОБЛАДНАННЯ
  if (text.includes('перфоратор') || text.includes('відбійний молоток')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Перфоратори та молотки'
    };
  }

  if (text.includes('шуруповерт') || text.includes('шурупокрут') || text.includes('гайковерт')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Шуруповерти і гайковерти'
    };
  }

  if (text.includes('болгарк') || text.includes('ушм') || text.includes('шліфмашин')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Болгарки (УШМ)'
    };
  }

  if (text.includes('лобзик') || text.includes('дискова пила') || text.includes('циркулярк')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Лобзики і циркулярні пили'
    };
  }

  if (text.includes('зварювальн') || text.includes('інвертор звар')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Зварювальні інвертори'
    };
  }

  if (text.includes('дриль') || text.includes('дрель')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Електроінструмент',
      category: 'Дрилі та перфоратори'
    };
  }

  if (text.includes('ключ') || text.includes('тріскачк') || text.includes('головка торцев')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Ручний інструмент',
      category: 'Ключі гайкові'
    };
  }

  if (text.includes('викрутк') || text.includes('отвертк')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Ручний інструмент',
      category: 'Викрутки'
    };
  }

  if (text.includes('молоток') || text.includes('кувалд') || text.includes('киянк') || text.includes('зубил')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Ручний інструмент',
      category: 'Молотки та зубила'
    };
  }

  if (text.includes('плоскогубц') || text.includes('пасатиж') || text.includes('кусачк') || text.includes('кліщі')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Ручний інструмент',
      category: 'Плоскогубці та кусачки'
    };
  }

  if (text.includes('рулетк') || text.includes('рівень') || text.includes('лазерний рівень') || text.includes('штангенциркуль')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Ручний інструмент',
      category: 'Рулетки та рівні'
    };
  }

  if (text.includes('свердл') || text.includes('сверло') || text.includes('бур')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Витратні матеріали',
      category: 'Свердла і бури'
    };
  }

  if (text.includes('диск відрізн') || text.includes('круг відрізн') || text.includes('диск алмазн')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Витратні матеріали',
      category: 'Диски відрізні та алмазні'
    };
  }

  if (text.includes('біта') || text.includes('набір біт') || text.includes('насадка')) {
    return {
      mainCategory: 'Інструменти та обладнання',
      subCategory: 'Витратні матеріали',
      category: 'Біти та насадки'
    };
  }

  // 7. HARDWARE & HOUSEHOLD / ГОСПОДАРЧІ ТОВАРИ
  if (text.includes('замок') || text.includes('циліндр замк') || text.includes('серцевина')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Кріплення та фурнітура',
      category: 'Замки навісні'
    };
  }

  if (text.includes('дюбел') || text.includes('саморіз') || text.includes('шуруп') || text.includes('болт') || text.includes('гайк') || text.includes('шайб')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Кріплення та фурнітура',
      category: 'Дюбелі та шурупи'
    };
  }

  if (text.includes('цвях') || text.includes('гвоздь')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Кріплення та фурнітура',
      category: 'Цвяхи'
    };
  }

  if (text.includes('відро') || text.includes('таз')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Господарський інвентар',
      category: 'Відра та тази'
    };
  }

  if (text.includes('швабр') || text.includes('віник') || text.includes('щітк')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Господарський інвентар',
      category: 'Швабри та запаски'
    };
  }

  if (text.includes('рукавич') || text.includes('перчатк')) {
    return {
      mainCategory: 'Господарчі товари',
      subCategory: 'Засоби захисту та боротьби',
      category: 'Рукавички робочі'
    };
  }

  // Fallback defaults
  return {
    mainCategory: 'Електротовари',
    subCategory: 'Освітлення',
    category: 'Світильники'
  };
}
