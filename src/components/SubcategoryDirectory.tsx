import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ChevronRight, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Filter, 
  SlidersHorizontal,
  Check,
  Zap,
  Droplets,
  Wrench,
  Home,
  Cog,
  Tag,
  Building2
} from 'lucide-react';
import { ASSET_IMAGES } from '../utils/assetImages';
import { getProductBrand } from '../utils/brandHelper';

interface SubcategoryDirectoryProps {
  mainCategory: string;
  selectedSubCategory: string | null;
  onSelectSubCategory: (subCatName: string | null, leafTag?: string | null) => void;
  onSelectBrand?: (subCatName: string | null, brand: string) => void;
}

interface SubcategoryCardMeta {
  title: string;
  matchKeys: string[];
  imageType: 'lighting' | 'fittings' | 'equipment' | 'cables' | 'antennas' | 'doorbells' | 'mixers' | 'radiators' | 'pipes' | 'pumps' | 'handtools' | 'powertools' | 'consumables' | 'hardware' | 'cleaning' | 'general';
  defaultItems: string[];
  brands: string[];
  badge?: string;
}

// Visual category metadata dictionary mapping
const CATEGORY_DIRECTORY_DATA: Record<string, SubcategoryCardMeta[]> = {
  "Електротовари": [
    {
      title: "Освітлення",
      matchKeys: ["освітлен", "ламп", "світил", "прожект", "led"],
      imageType: "lighting",
      defaultItems: [
        "Лампочки LED",
        "Настільні лампи та нічники",
        "Ліхтарики, лампи переносні",
        "Світильники та прожектори",
        "Світлодіодні LED стрічки"
      ],
      brands: [
        "VELMAX",
        "Videx",
        "Philips",
        "Osram",
        "Horoz Electric",
        "Eurolamp",
        "Biom",
        "Maxus",
        "Feron"
      ],
      badge: "Топ продажів"
    },
    {
      title: "Електрофурнітура",
      matchKeys: ["фурнітур", "розетк", "вимикач", "подовжувач", "рамк"],
      imageType: "fittings",
      defaultItems: [
        "Вимикачі, димери",
        "Розетки з заземленням",
        "Мережеві фільтри та подовжувачі",
        "Перехідники та розгалужувачі",
        "Підрозетники, рамки, накладки"
      ],
      brands: [
        "Bylectrica",
        "Світоприлад",
        "Schneider Electric",
        "VIKO",
        "Legrand",
        "Hager"
      ],
      badge: "Популярне"
    },
    {
      title: "Електрообладнання",
      matchKeys: ["модульн", "обладнан", "автомат", "пзв", "реле", "щит", "лічильник"],
      imageType: "equipment",
      defaultItems: [
        "Автоматичні вимикачі, ПЗВ",
        "Низьковольтне обладнання",
        "Перетворювачі та стабілізатори",
        "Електролічильники",
        "Запобіжники та кнопки пускові"
      ],
      brands: [
        "Schneider Electric",
        "Hager",
        "ZUBR (DS Electronics)",
        "IEK",
        "E.NEXT",
        "ABB"
      ]
    },
    {
      title: "Кабель, провід, монтаж",
      matchKeys: ["кабел", "провід", "гофр", "канал", "клем", "wago"],
      imageType: "cables",
      defaultItems: [
        "Кабель силовий ВВГ / ШВВП",
        "Кабельні канали, гофра, муфти",
        "Наконечники, клемники WAGO",
        "Ізоляційна стрічка",
        "Трубки термоусадочні"
      ],
      brands: [
        "ЗЗЦМ (Запоріжжя)",
        "Одескабель",
        "WAGO",
        "DKC",
        "IEK",
        "Копос"
      ]
    },
    {
      title: "ТВ антени та комплектуючі",
      matchKeys: ["антен", "тв", "ресивер", "слаботоч", "коаксіал"],
      imageType: "antennas",
      defaultItems: [
        "ТВ антени кімнатні та зовнішні",
        "Ефірні ресивери Т2",
        "Кріплення для телевізорів та антен",
        "Підсилювачі сигналу",
        "Запчастини до антен та сплітери"
      ],
      brands: [
        "Romsat",
        "World Vision",
        "Eurosky",
        "Margon",
        "FinMark"
      ]
    },
    {
      title: "Дзвінки та автоматика",
      matchKeys: ["дзвінк", "кнопк", "сигнал", "автоматик", "датчик"],
      imageType: "doorbells",
      defaultItems: [
        "Кнопки до дзвінків",
        "Дзвінки бездротові та провідні",
        "Датчики руху",
        "Таймери та реле часу"
      ],
      brands: [
        "Feron",
        "Zamel",
        "Lemanso",
        "Horoz Electric",
        "Expert"
      ]
    }
  ],

  "Сантехніка та опалення": [
    {
      title: "Змішувачі та комплектуючі",
      matchKeys: ["змішувач", "кран", "душ", "сифон", "шланг", "лійк"],
      imageType: "mixers",
      defaultItems: [
        "Змішувачі для кухні та ванни",
        "Душові системи та гарнітури",
        "Сифони та трапи для зливу",
        "Шланги підведення води",
        "Лійки, тримачі та аксесуари"
      ],
      brands: [
        "Grohe",
        "Hansgrohe",
        "FERRO",
        "Mixxus",
        "Haiba",
        "Kraus"
      ],
      badge: "Хіт"
    },
    {
      title: "Радіатори та опалення",
      matchKeys: ["радіат", "опален", "котел", "бойлер", "конвектор", "термо"],
      imageType: "radiators",
      defaultItems: [
        "Радіатори біметалеві та алюмінієві",
        "Бойлери та водонагрівачі",
        "Котли електричні та твердопаливні",
        "Термоголовки та клапани",
        "Циркуляційні насоси опалення"
      ],
      brands: [
        "Mirado",
        "Fondital",
        "Atlantic",
        "Protherm",
        "Tenko",
        "Buderus"
      ]
    },
    {
      title: "Труби, фітинги та крани",
      matchKeys: ["труб", "фітинг", "поліпропілен", "каналізац", "муфт", "кран кульов"],
      imageType: "pipes",
      defaultItems: [
        "Труби поліпропіленові (PPR)",
        "Труби металопластикові",
        "Фітинги різьбові та під пайку",
        "Труби каналізаційні та фасонні",
        "Крани кульові для води та газу"
      ],
      brands: [
        "Valtec",
        "Fado",
        "Ekoplastik (Wavin)",
        "Ostendorf",
        "Rehau"
      ]
    },
    {
      title: "Водопостачання та насоси",
      matchKeys: ["насос", "водопостач", "фільтр", "станці", "гідроакумул"],
      imageType: "pumps",
      defaultItems: [
        "Насоси свердловинні та дренажні",
        "Насосні станції автоматичні",
        "Гідроакумулятори та розширювальні баки",
        "Фільтри очищення води та картриджі",
        "Лічильники води (водоміри)"
      ],
      brands: [
        "Aquatica",
        "Pedrollo",
        "Grundfos",
        "Ecosoft",
        "Aquafilter"
      ]
    }
  ],

  "Інструменти та обладнання": [
    {
      title: "Ручний інструмент",
      matchKeys: ["ручн", "ключ", "викрут", "молот", "плоскогуб", "рулетк", "рівен"],
      imageType: "handtools",
      defaultItems: [
        "Ключі гайкові, накидні, тріскачки",
        "Викрутки діелектричні та точні",
        "Молотки, сокири, зубила",
        "Плоскогубці, кліщі, кусачки",
        "Рулетки, лазерні рівні, косинці"
      ],
      brands: [
        "Stanley",
        "YATO",
        "Toptul",
        "Dnipro-M",
        "Sigma",
        "Intertool"
      ],
      badge: "Перевірено"
    },
    {
      title: "Електроінструмент",
      matchKeys: ["електроінструмент", "дриль", "шуруповерт", "болгарк", "перфоратор", "лобзик"],
      imageType: "powertools",
      defaultItems: [
        "Дрилі та перфоратори SDS",
        "Шурупокрути акумуляторні",
        "Кутові шліфмашини (болгарки)",
        "Лобзики та циркулярні пили",
        "Зварювальні інвертори та маски"
      ],
      brands: [
        "Bosch",
        "Makita",
        "DeWalt",
        "Dnipro-M",
        "Metabo"
      ]
    },
    {
      title: "Витратні матеріали та оснастка",
      matchKeys: ["витратн", "свердл", "бур", "диск", "біт", "насадк"],
      imageType: "consumables",
      defaultItems: [
        "Свердла по металу, дереву, бетону",
        "Бури для перфораторів SDS-plus",
        "Диски відрізні та алмазні круги",
        "Біти для шурупокрутів, магнітні тримачі",
        "Коронки по кахлю та бетону"
      ],
      brands: [
        "DiStar",
        "Klingspor",
        "Bosch",
        "Makita",
        "Dnipro-M"
      ]
    }
  ],

  "Господарчі товари": [
    {
      title: "Кріплення та замки",
      matchKeys: ["кріплен", "замок", "дюбел", "шуруп", "болт", "петл"],
      imageType: "hardware",
      defaultItems: [
        "Замки навісні та врізні",
        "Дюбелі швидкого монтажу, анкери",
        "Саморізи по дереву та металу",
        "Петлі дверні та меблеві",
        "Цвяхи, скоби, кріпильні пластини"
      ],
      brands: [
        "Apecs",
        "KALE KILIT",
        "Wkret-Met (Klimas)",
        "Koelner",
        "Amig"
      ],
      badge: "Хіт"
    },
    {
      title: "Господарський інвентар",
      matchKeys: ["інвентар", "прибиран", "відр", "швабр", "щітк", "драбин"],
      imageType: "cleaning",
      defaultItems: [
        "Драбини та стрем'янки",
        "Відра, тази господарські",
        "Швабри, запаски з мікрофібри",
        "Мішки будівельні, сміттєві пакети",
        "Рукавички робочі х/б та нітрилові"
      ],
      brands: [
        "Vileda",
        "York",
        "Curver",
        "Itoss",
        "Alve"
      ]
    }
  ]
};

export const SubcategoryDirectory: React.FC<SubcategoryDirectoryProps> = ({
  mainCategory,
  selectedSubCategory,
  onSelectSubCategory,
  onSelectBrand
}) => {
  const { categoriesTree, products, siteTheme } = useStore();
  const isPremium = siteTheme === 'premium';
  const [activeTabByCard, setActiveTabByCard] = useState<Record<string, 'categories' | 'collections'>>({});

  const cardsMeta = CATEGORY_DIRECTORY_DATA[mainCategory] || [];
  const treeSubcategories = categoriesTree[mainCategory] || {};

  // Find matching items from actual catalog state
  const getSubcategoryItems = (card: SubcategoryCardMeta) => {
    // Check if matching tree subcategory exists
    const treeMatchKey = Object.keys(treeSubcategories).find(k => {
      const l = k.toLowerCase();
      return card.matchKeys.some(mk => l.includes(mk));
    });

    if (treeMatchKey && Array.isArray(treeSubcategories[treeMatchKey]) && treeSubcategories[treeMatchKey].length > 0) {
      return {
        treeKey: treeMatchKey,
        items: treeSubcategories[treeMatchKey]
      };
    }

    return {
      treeKey: card.title,
      items: card.defaultItems
    };
  };

  // Find brands for subcategory (dynamic from store + fallback defaults)
  const getSubcategoryBrands = (card: SubcategoryCardMeta) => {
    const dynamicBrands = new Set<string>();
    const matchK = card.matchKeys;

    products.forEach(p => {
      const pSub = (p.subCategory || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pMain = (p.mainCategory || '').toLowerCase();

      if (
        (pMain && pMain.includes(mainCategory.toLowerCase())) &&
        matchK.some(mk => pSub.includes(mk) || pCat.includes(mk))
      ) {
        const b = getProductBrand(p);
        if (b && b !== 'Інші виробники' && b !== 'Без бренду') {
          dynamicBrands.add(b);
        }
      }
    });

    const merged = Array.from(new Set([...Array.from(dynamicBrands), ...(card.brands || [])]));
    return merged.slice(0, 6);
  };

  // Render SVG / Image Visual Collage for each subcategory
  const renderVisualCollage = (imageType: SubcategoryCardMeta['imageType']) => {
    switch (imageType) {
      case 'lighting':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-amber-100/60 group-hover:border-amber-300 transition-all">
            <div className="absolute inset-0 bg-radial from-amber-200/40 to-transparent blur-xl pointer-events-none"></div>
            
            <div className="flex items-center justify-center gap-4 relative z-10">
              {/* LED Bulb */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-14 h-18 bg-white/90 border border-slate-200 rounded-full shadow-md flex items-center justify-center p-1 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-amber-400/30 border border-amber-400/50 flex items-center justify-center animate-pulse">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-4 bg-slate-200 border-t border-slate-300 flex flex-col justify-evenly px-2">
                    <div className="h-0.5 bg-slate-400 rounded-full"></div>
                    <div className="h-0.5 bg-slate-400 rounded-full"></div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-1">LED E27</span>
              </div>

              {/* Ceiling Fixture / Spot */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-300 shadow-md flex items-center justify-center p-1.5 ring-4 ring-amber-100">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-100 to-amber-50 border border-amber-300 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white shadow-xs flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-1">Світильник</span>
              </div>

              {/* Chandelier / Lantern */}
              <div className="flex flex-col items-center group-hover:translate-y-0.5 transition-transform duration-300">
                <div className="w-12 h-18 bg-slate-900 text-amber-300 rounded-xl shadow-md border border-slate-800 flex flex-col items-center justify-between p-1.5">
                  <div className="w-4 h-1 bg-amber-400 rounded-full"></div>
                  <div className="w-6 h-8 bg-amber-400/20 border border-amber-400/40 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-4 bg-amber-300 rounded-full blur-[1px]"></div>
                  </div>
                  <div className="w-8 h-1.5 bg-slate-700 rounded"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-1">Прожектор</span>
              </div>
            </div>
          </div>
        );

      case 'fittings':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-slate-50 via-white to-slate-100/50 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-200 group-hover:border-slate-400 transition-all">
            <div className="flex items-center justify-center gap-3 relative z-10">
              {/* White Switch */}
              <div className="w-14 h-14 bg-white rounded-xl shadow-md border border-slate-300 p-2 flex items-center justify-center group-hover:-rotate-3 transition-transform">
                <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg shadow-inner flex items-center justify-center relative">
                  <div className="w-full h-0.5 bg-slate-300 absolute"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5"></div>
                </div>
              </div>

              {/* Double Socket */}
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-300 p-2 flex flex-col items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                <div className="w-10 h-5 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
                <div className="w-10 h-5 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
              </div>

              {/* Rotary Dimmer */}
              <div className="w-14 h-14 bg-white rounded-xl shadow-md border border-slate-300 p-2 flex items-center justify-center group-hover:rotate-6 transition-transform">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'equipment':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-sky-50/40 via-white to-slate-100/50 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-sky-200/80 group-hover:border-sky-400 transition-all">
            <div className="flex items-center justify-center gap-3 relative z-10">
              {/* Electric Meter */}
              <div className="w-14 h-18 bg-slate-900 rounded-xl shadow-md border border-slate-800 p-1.5 flex flex-col items-center justify-between text-white group-hover:-translate-y-1 transition-transform">
                <div className="w-full bg-emerald-950/80 border border-emerald-500/40 rounded px-1 py-0.5 text-center font-mono text-[9px] text-emerald-400 font-bold">
                  04812.5
                </div>
                <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-red-500 rotate-45"></div>
                </div>
                <span className="text-[8px] text-slate-400">220V 50Hz</span>
              </div>

              {/* Circuit Breakers (DIN) */}
              <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-md p-1 group-hover:scale-105 transition-transform">
                <div className="w-7 h-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center justify-between py-1">
                  <div className="w-3 h-1 bg-slate-400 rounded"></div>
                  <div className="w-4 h-6 bg-red-600 rounded flex items-center justify-center text-white font-bold text-[8px]">
                    I
                  </div>
                  <span className="text-[8px] font-mono font-bold text-slate-700">C16</span>
                </div>
                <div className="w-7 h-16 bg-slate-50 flex flex-col items-center justify-between py-1">
                  <div className="w-3 h-1 bg-slate-400 rounded"></div>
                  <div className="w-4 h-6 bg-slate-800 rounded flex items-center justify-center text-white font-bold text-[8px]">
                    0
                  </div>
                  <span className="text-[8px] font-mono font-bold text-slate-700">C25</span>
                </div>
              </div>

              {/* Voltage Relay Zubr */}
              <div className="w-12 h-16 bg-slate-100 rounded-xl shadow-md border border-slate-300 p-1 flex flex-col items-center justify-between group-hover:translate-y-0.5 transition-transform">
                <div className="w-full bg-red-600 rounded text-white text-[9px] font-mono font-bold text-center py-0.5 shadow-xs">
                  228V
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                </div>
                <span className="text-[7px] font-bold text-slate-600">РЕLE</span>
              </div>
            </div>
          </div>
        );

      case 'cables':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-amber-50/30 via-white to-slate-100/50 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-200 group-hover:border-amber-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Copper Cable Section */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                <div className="w-14 h-16 bg-slate-900 rounded-xl p-1.5 shadow-md flex flex-col justify-between items-center border border-slate-800">
                  <div className="flex gap-1 mt-1">
                    <div className="w-2.5 h-6 bg-blue-600 rounded-t border border-blue-400"></div>
                    <div className="w-2.5 h-6 bg-amber-500 rounded-t border border-amber-300"></div>
                    <div className="w-2.5 h-6 bg-green-600 rounded-t border border-green-400"></div>
                  </div>
                  <span className="text-[8px] font-mono text-slate-300">ВВГ-П 3x2.5</span>
                </div>
              </div>

              {/* Corrugated Conduit */}
              <div className="w-12 h-16 flex flex-col justify-between py-1 group-hover:-translate-y-1 transition-transform">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-2 w-full bg-slate-400 border border-slate-500 rounded-full shadow-2xs"></div>
                ))}
                <span className="text-[8px] font-bold text-center text-slate-600 mt-1">Гофра</span>
              </div>

              {/* WAGO Terminals */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform">
                <div className="w-14 h-12 bg-amber-500 rounded-xl shadow-md border border-amber-600 p-1 flex items-center justify-around">
                  <div className="w-2.5 h-7 bg-orange-600 rounded-t"></div>
                  <div className="w-2.5 h-7 bg-orange-600 rounded-t"></div>
                  <div className="w-2.5 h-7 bg-orange-600 rounded-t"></div>
                </div>
                <span className="text-[9px] font-black text-amber-800 mt-1">WAGO 221</span>
              </div>
            </div>
          </div>
        );

      case 'antennas':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-slate-50 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-200 group-hover:border-slate-400 transition-all">
            <div className="flex items-center justify-center gap-4 relative z-10">
              {/* Antenna Disc */}
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center relative group-hover:scale-105 transition-transform bg-slate-100">
                <div className="w-full h-0.5 bg-slate-800 absolute"></div>
                <div className="h-full w-0.5 bg-slate-800 absolute"></div>
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
              </div>

              {/* T2 Receiver */}
              <div className="w-20 h-12 bg-slate-900 rounded-xl shadow-md border border-slate-800 p-1.5 flex flex-col justify-between group-hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-emerald-400">CH-01</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                </div>
                <div className="flex justify-end gap-1">
                  <div className="w-3 h-1 bg-slate-700 rounded"></div>
                  <div className="w-3 h-1 bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'doorbells':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-blue-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-blue-200/60 group-hover:border-blue-400 transition-all">
            <div className="flex items-center justify-center gap-4 relative z-10">
              {/* Main Wireless Chime Unit */}
              <div className="w-16 h-20 bg-white rounded-2xl shadow-lg border border-slate-300 p-2 flex flex-col items-center justify-between group-hover:scale-105 transition-transform">
                <div className="w-8 h-8 rounded-full border-2 border-blue-400/40 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500/20"></div>
                </div>
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                  <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                  <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                </div>
                <span className="text-[8px] font-bold text-slate-700">32 мелодії</span>
              </div>

              {/* Waterproof Push Button */}
              <div className="w-10 h-16 bg-slate-900 rounded-xl shadow-md border border-slate-800 p-1 flex flex-col items-center justify-between group-hover:-translate-y-1 transition-transform">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1"></div>
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <div className="w-4 h-4 rounded-full bg-slate-200 border border-slate-400"></div>
                </div>
                <span className="text-[7px] text-slate-400">IP44</span>
              </div>
            </div>
          </div>
        );

      case 'mixers':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-cyan-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-cyan-200/60 group-hover:border-cyan-400 transition-all">
            <div className="flex items-center justify-center gap-4 relative z-10">
              {/* Chrome Mixer Faucet */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-18 bg-white/90 border border-cyan-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  <div className="w-10 h-3 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-full shadow-xs"></div>
                  <div className="w-3.5 h-10 bg-gradient-to-b from-slate-200 via-white to-slate-300 rounded-md border border-slate-300 flex items-center justify-center">
                    <div className="w-1 h-6 bg-cyan-400/40 rounded-full"></div>
                  </div>
                  <div className="w-8 h-2 bg-slate-300 rounded-sm"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-1">Змішувач</span>
              </div>

              {/* Flexible Hose */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-16 bg-slate-50 border border-slate-300 rounded-2xl shadow-md p-1.5 flex flex-col justify-around items-center">
                  <div className="w-6 h-3 bg-amber-500 rounded-xs border border-amber-600"></div>
                  <div className="w-4 h-6 border-2 border-dashed border-slate-400 rounded-full"></div>
                  <div className="w-6 h-3 bg-cyan-600 rounded-xs border border-cyan-700"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Шланг 1/2"</span>
              </div>

              {/* Shower Head */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-14 h-16 bg-white border border-cyan-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-white border-2 border-cyan-300 flex items-center justify-center shadow-inner">
                    <div className="grid grid-cols-3 gap-0.5">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-cyan-500"></div>
                      ))}
                    </div>
                  </div>
                  <div className="w-2.5 h-4 bg-slate-300 rounded-b"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Лійка душ</span>
              </div>
            </div>
          </div>
        );

      case 'radiators':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-rose-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-rose-200/60 group-hover:border-rose-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Radiator Section */}
              <div className="flex bg-white border border-slate-300 rounded-xl shadow-md p-1 group-hover:scale-105 transition-transform duration-300">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-3.5 h-18 bg-slate-50 border-r border-slate-200 last:border-0 flex flex-col justify-between py-1">
                    <div className="h-1.5 w-full bg-slate-300 rounded"></div>
                    <div className="h-1.5 w-full bg-slate-300 rounded"></div>
                  </div>
                ))}
              </div>
              
              {/* Thermostatic Valve */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-16 bg-white border border-rose-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-300 flex items-center justify-center text-[9px] font-black text-rose-700 shadow-inner">
                    5★
                  </div>
                  <div className="w-4 h-4 bg-slate-700 rounded-xs"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Термоголовка</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full block text-center shadow-xs">Біметал</span>
                <span className="text-[9px] text-slate-600 block text-center font-medium">до 35 бар</span>
              </div>
            </div>
          </div>
        );

      case 'pipes':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-blue-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-blue-200/70 group-hover:border-blue-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* PPR Pipes Bundle */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-18 bg-white border border-slate-300 rounded-xl shadow-md p-1.5 flex justify-around items-center">
                  {/* PPR Cold Pipe */}
                  <div className="w-3 h-14 bg-slate-100 border border-slate-300 rounded-full flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-0.5 h-full bg-blue-500"></div>
                  </div>
                  {/* PPR Hot Pipe */}
                  <div className="w-3 h-14 bg-slate-100 border border-slate-300 rounded-full flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-0.5 h-full bg-red-500"></div>
                  </div>
                  {/* Metal-plastic */}
                  <div className="w-3.5 h-14 bg-slate-200 border border-slate-400 rounded-full"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">PPR Ø20-32</span>
              </div>

              {/* Brass Ball Valve */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-14 h-18 bg-white border border-amber-300 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Red Handle Butterfly */}
                  <div className="w-10 h-3.5 bg-red-600 rounded-full shadow-xs flex items-center justify-center border border-red-700">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  {/* Brass Body */}
                  <div className="w-7 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-md border border-amber-700 flex items-center justify-center shadow-xs">
                    <div className="w-3 h-3 rounded-full bg-slate-100 border border-amber-800"></div>
                  </div>
                  <span className="text-[8px] font-black text-amber-900 font-mono">1/2" PN40</span>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Кран кульовий</span>
              </div>

              {/* Threaded Fittings & Elbow */}
              <div className="flex flex-col items-center group-hover:rotate-6 transition-transform duration-300">
                <div className="w-12 h-16 bg-slate-900 border border-slate-800 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-around text-amber-400">
                  <div className="w-6 h-6 border-2 border-amber-400 rounded-tr-lg border-l-0 border-b-0"></div>
                  <span className="text-[8px] font-mono font-bold">Кутник 90°</span>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Фітинги</span>
              </div>
            </div>
          </div>
        );

      case 'pumps':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-sky-50/40 via-white to-blue-50/30 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-sky-200 group-hover:border-sky-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Submersible Pump Cylinder */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-10 h-20 bg-gradient-to-r from-slate-300 via-white to-slate-400 border border-slate-400 rounded-full shadow-lg flex flex-col justify-between items-center py-1.5">
                  <div className="w-4 h-2 bg-slate-700 rounded-xs"></div>
                  <div className="w-8 h-8 rounded-full bg-sky-50 border border-sky-300 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="w-6 h-3 bg-slate-600 rounded-b-md"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Свердловинний</span>
              </div>

              {/* Water Filter Flask */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-18 bg-blue-600 border border-blue-700 rounded-2xl shadow-md p-1 flex flex-col items-center justify-between">
                  <div className="w-10 h-3 bg-blue-900 rounded-t-lg"></div>
                  <div className="w-8 h-10 bg-blue-400/50 border border-blue-300 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-8 bg-white/90 rounded-sm shadow-inner"></div>
                  </div>
                  <span className="text-[7px] text-white font-bold">10" SLIM</span>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Фільтр води</span>
              </div>

              {/* Pressure Gauge (Манометр) */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-14 h-16 bg-white border border-slate-300 rounded-xl shadow-md p-1 flex flex-col items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shadow-inner relative">
                    <div className="w-1 h-1 rounded-full bg-slate-900 z-10"></div>
                    <div className="w-3.5 h-0.5 bg-red-600 absolute right-4 rotate-45 origin-left"></div>
                    <span className="absolute bottom-1 text-[6px] font-bold text-slate-500">BAR</span>
                  </div>
                  <div className="w-2.5 h-3 bg-amber-500 rounded-xs"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Манометр</span>
              </div>
            </div>
          </div>
        );

      case 'handtools':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-emerald-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-emerald-200/70 group-hover:border-emerald-400 transition-all">
            <div className="flex items-center justify-center gap-3 relative z-10">
              {/* Steel Hammer */}
              <div className="flex flex-col items-center group-hover:-rotate-6 transition-transform duration-300">
                <div className="w-12 h-18 bg-white border border-slate-300 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Hammer Head */}
                  <div className="w-10 h-4 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xs border border-slate-950 shadow-xs flex items-center justify-between px-1">
                    <div className="w-1 h-3 bg-slate-500 rounded-xs"></div>
                    <div className="w-1 h-1 rounded-full bg-amber-400"></div>
                  </div>
                  {/* Fibreglass Handle */}
                  <div className="w-2.5 h-10 bg-emerald-600 rounded-b-md border border-emerald-800 relative flex flex-col justify-end p-0.5">
                    <div className="w-full h-4 bg-slate-900 rounded-b-xs"></div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Молоток 500г</span>
              </div>

              {/* Ratchet Wrench */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-18 bg-white border border-slate-300 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Chrome Ratchet Head */}
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 via-white to-slate-400 border-2 border-slate-600 flex items-center justify-center shadow-xs">
                    <div className="w-2.5 h-2.5 bg-slate-800 rounded-xs"></div>
                  </div>
                  {/* Handle */}
                  <div className="w-2.5 h-8 bg-slate-300 rounded-b border border-slate-400"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Тріскачка 1/2"</span>
              </div>

              {/* Screwdriver + Level */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-12 h-18 bg-white border border-emerald-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Screwdriver */}
                  <div className="w-3.5 h-7 bg-red-600 rounded-t-md border border-red-700"></div>
                  <div className="w-1 h-6 bg-slate-500 rounded-b"></div>
                  {/* Spirit bubble */}
                  <div className="w-8 h-2.5 bg-emerald-400 rounded-full border border-emerald-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Викрутки</span>
              </div>
            </div>
          </div>
        );

      case 'powertools':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-amber-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-amber-200/80 group-hover:border-amber-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Cordless Drill / Screwdriver */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-16 h-18 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-1.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-4 h-4 bg-amber-500 rounded-l border border-amber-600"></div>
                    <div className="w-8 h-5 bg-teal-600 rounded-r-lg border border-teal-700"></div>
                  </div>
                  <div className="w-3.5 h-5 bg-slate-800 self-center rounded-xs"></div>
                  <div className="w-10 h-3.5 bg-amber-500 rounded-lg self-center border border-amber-600 shadow-xs flex items-center justify-center text-[7px] text-slate-950 font-black">
                    20V Li-Ion
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-800 mt-1">Шуруповерт</span>
              </div>

              {/* Angle Grinder (Болгарка) */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-18 bg-white border border-slate-300 rounded-2xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Guard and Disc */}
                  <div className="flex items-center gap-1">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    </div>
                    <div className="w-5 h-6 bg-teal-600 rounded-r-md border border-teal-700"></div>
                  </div>
                  <div className="w-4 h-6 bg-slate-900 rounded-b"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-800 mt-1">Болгарка 125</span>
              </div>

              {/* Rotary Hammer SDS */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-14 h-18 bg-slate-100 border border-slate-300 rounded-xl shadow-md p-1.5 flex flex-col justify-between items-center">
                  <div className="w-3 h-5 bg-slate-700 rounded-t"></div>
                  <div className="w-10 h-6 bg-red-600 rounded-lg border border-red-700 flex items-center justify-center text-[7px] font-black text-white">
                    SDS+
                  </div>
                  <div className="w-4 h-4 bg-slate-800 rounded-b"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Перфоратор</span>
              </div>
            </div>
          </div>
        );

      case 'consumables':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-slate-50 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-200 group-hover:border-slate-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Diamond Blade Disc */}
              <div className="flex flex-col items-center group-hover:rotate-12 transition-transform duration-300">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-amber-400 shadow-md flex items-center justify-center relative">
                  <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                  </div>
                  <div className="absolute inset-0 rounded-full border border-dashed border-amber-300/60 pointer-events-none"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Алмазний диск</span>
              </div>

              {/* SDS Plus Drill Bits */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-18 bg-white border border-slate-300 rounded-xl shadow-md p-1.5 flex justify-around items-end">
                  <div className="w-1.5 h-14 bg-slate-600 rounded-t border-t-2 border-amber-400"></div>
                  <div className="w-2 h-12 bg-slate-700 rounded-t border-t-2 border-amber-400"></div>
                  <div className="w-2.5 h-10 bg-slate-800 rounded-t border-t-2 border-amber-400"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Бури SDS+</span>
              </div>

              {/* Bit Set Box */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-14 bg-amber-500 border border-amber-600 rounded-xl shadow-md p-1 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-amber-600/40 rounded">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-1.5 h-3 bg-slate-200 rounded-xs"></div>
                    ))}
                  </div>
                  <span className="text-[7px] font-black text-amber-950 text-center">PH2/PZ2</span>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Набір біт</span>
              </div>
            </div>
          </div>
        );

      case 'hardware':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-indigo-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-indigo-200/70 group-hover:border-indigo-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Heavy Duty Padlock with Key */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-14 h-18 bg-white border border-slate-300 rounded-2xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  {/* Steel Shackle */}
                  <div className="w-8 h-7 border-4 border-slate-700 rounded-t-full border-b-0"></div>
                  {/* Brass / Steel Body */}
                  <div className="w-10 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-lg border border-amber-700 shadow-inner flex items-center justify-center">
                    <div className="w-1.5 h-3 bg-slate-900 rounded-full"></div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-800 mt-1">Замок навісний</span>
              </div>

              {/* Wall Anchors / Dowels (Дюбелі) */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-18 bg-slate-50 border border-slate-300 rounded-xl shadow-md p-1.5 flex justify-around items-end">
                  {/* Yellow Nylon Dowel */}
                  <div className="w-2.5 h-14 bg-amber-400 border border-amber-500 rounded-b flex flex-col justify-evenly">
                    <div className="w-full h-0.5 bg-amber-600"></div>
                    <div className="w-full h-0.5 bg-amber-600"></div>
                  </div>
                  {/* Steel Screw */}
                  <div className="w-1.5 h-12 bg-slate-700 rounded-b"></div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Дюбель 6x40</span>
              </div>

              {/* Door Hinge / Screws */}
              <div className="flex flex-col items-center group-hover:rotate-6 transition-transform duration-300">
                <div className="w-12 h-16 bg-white border border-indigo-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-around">
                  <div className="w-8 h-10 border-2 border-slate-600 rounded flex justify-between p-0.5">
                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                  </div>
                  <span className="text-[8px] font-bold text-indigo-700 font-mono">Петля 100</span>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Фурнітура</span>
              </div>
            </div>
          </div>
        );

      case 'cleaning':
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-teal-50/40 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-teal-200/70 group-hover:border-teal-400 transition-all">
            <div className="flex items-center justify-center gap-3.5 relative z-10">
              {/* Cleaning Bucket with Wringer */}
              <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-18 bg-white border border-slate-300 rounded-2xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  <div className="w-12 h-2.5 bg-teal-600 rounded-full"></div>
                  <div className="w-10 h-10 bg-teal-500 border border-teal-600 rounded-b-xl flex items-center justify-center text-white text-[8px] font-black shadow-inner">
                    12L
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Відро з віджимом</span>
              </div>

              {/* Telescopic Microfibre Mop */}
              <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-18 bg-slate-50 border border-slate-300 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-between">
                  <div className="w-1.5 h-12 bg-slate-400 rounded-full border border-slate-500"></div>
                  <div className="w-10 h-3 bg-red-500 rounded-lg border border-red-600 shadow-xs flex items-center justify-center">
                    <div className="w-8 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">Швабра</span>
              </div>

              {/* Step Ladder */}
              <div className="flex flex-col items-center group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-12 h-18 bg-white border border-teal-200 rounded-xl shadow-md p-1.5 flex flex-col items-center justify-around">
                  <div className="w-8 h-14 border-x-2 border-slate-700 flex flex-col justify-around py-1">
                    <div className="h-0.5 w-full bg-slate-700"></div>
                    <div className="h-0.5 w-full bg-slate-700"></div>
                    <div className="h-0.5 w-full bg-slate-700"></div>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 mt-1">Драбина 3 ст.</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="relative w-full h-36 bg-gradient-to-b from-slate-50 via-white to-slate-100 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-200 group-hover:border-slate-300 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
              <Layers className="w-8 h-8 text-red-600" />
            </div>
          </div>
        );
    }
  };

  const getCategoryHeaderTheme = (cat: string) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('інструмент')) {
      return {
        accent: 'emerald',
        border: isPremium ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-2 border-emerald-500/80 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/5',
        bg: isPremium ? 'bg-[#0a1614] border-emerald-500/40 text-white' : 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 text-slate-900',
        topGradient: 'from-emerald-600 via-teal-500 to-emerald-400',
        badge: isPremium ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80',
        icon: <Wrench className="w-5 h-5 text-white" />,
        iconBg: 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-500',
        activeText: 'text-emerald-700',
        cardActiveBorder: isPremium ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/30 shadow-2xl bg-[#0a1614]' : 'border-2 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl bg-emerald-50/30',
        cardHoverBorder: isPremium ? 'hover:border-emerald-400/70 hover:shadow-emerald-500/15' : 'hover:border-emerald-400/80 hover:shadow-emerald-500/10',
        tabActiveText: isPremium ? 'text-emerald-400 border-b-2 border-emerald-400 font-black' : 'text-emerald-600 border-b-2 border-emerald-600 font-black',
        btnActive: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white font-black shadow-md shadow-emerald-500/30',
        btnHover: isPremium ? 'hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-slate-950 hover:shadow-emerald-500/25' : 'hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 hover:text-white hover:shadow-emerald-500/25',
      };
    }
    if (lower.includes('електр')) {
      return {
        accent: 'amber',
        border: isPremium ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-2 border-amber-500/80 ring-4 ring-amber-500/10 shadow-lg shadow-amber-500/5',
        bg: isPremium ? 'bg-[#181206] border-amber-500/40 text-white' : 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 text-slate-900',
        topGradient: 'from-amber-500 via-orange-500 to-yellow-500',
        badge: isPremium ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100/90 text-amber-950 border-amber-300/80',
        icon: <Zap className="w-5 h-5 text-white" />,
        iconBg: 'bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500',
        activeText: 'text-amber-700',
        cardActiveBorder: isPremium ? 'border-2 border-amber-400 ring-2 ring-amber-400/30 shadow-2xl bg-[#181206]' : 'border-2 border-amber-500 ring-2 ring-amber-500/30 shadow-xl bg-amber-50/30',
        cardHoverBorder: isPremium ? 'hover:border-amber-400/70 hover:shadow-amber-500/15' : 'hover:border-amber-400/80 hover:shadow-amber-500/10',
        tabActiveText: isPremium ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-amber-600 border-b-2 border-amber-600 font-black',
        btnActive: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30',
        btnHover: isPremium ? 'hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 hover:shadow-amber-500/25' : 'hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white hover:shadow-amber-500/25',
      };
    }
    if (lower.includes('господар')) {
      return {
        accent: 'indigo',
        border: isPremium ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-2 border-indigo-500/80 ring-4 ring-indigo-500/10 shadow-lg shadow-indigo-500/5',
        bg: isPremium ? 'bg-[#110d1f] border-indigo-500/40 text-white' : 'bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 text-slate-900',
        topGradient: 'from-indigo-600 via-violet-500 to-purple-500',
        badge: isPremium ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100/90 text-indigo-950 border-indigo-300/80',
        icon: <Home className="w-5 h-5 text-white" />,
        iconBg: 'bg-gradient-to-tr from-indigo-600 via-violet-500 to-purple-500',
        activeText: 'text-indigo-700',
        cardActiveBorder: isPremium ? 'border-2 border-indigo-400 ring-2 ring-indigo-400/30 shadow-2xl bg-[#110d1f]' : 'border-2 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl bg-indigo-50/30',
        cardHoverBorder: isPremium ? 'hover:border-indigo-400/70 hover:shadow-indigo-500/15' : 'hover:border-indigo-400/80 hover:shadow-indigo-500/10',
        tabActiveText: isPremium ? 'text-indigo-400 border-b-2 border-indigo-400 font-black' : 'text-indigo-600 border-b-2 border-indigo-600 font-black',
        btnActive: 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black shadow-md shadow-indigo-500/30',
        btnHover: isPremium ? 'hover:bg-gradient-to-r hover:from-indigo-500 hover:to-violet-500 hover:text-slate-950 hover:shadow-indigo-500/25' : 'hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600 hover:text-white hover:shadow-indigo-500/25',
      };
    }
    if (lower.includes('інш') || lower.includes('нерозподіл')) {
      return {
        accent: 'sky',
        border: isPremium ? 'border-sky-500/50 ring-1 ring-sky-500/30' : 'border-2 border-sky-500/80 ring-4 ring-sky-500/10 shadow-lg shadow-sky-500/5',
        bg: isPremium ? 'bg-[#091122] border-sky-500/40 text-white' : 'bg-gradient-to-br from-sky-50/70 via-white to-slate-50/30 text-slate-900',
        topGradient: 'from-sky-600 via-blue-600 to-indigo-600',
        badge: isPremium ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-sky-100/90 text-sky-950 border-sky-300/80',
        icon: <Cog className="w-5 h-5 text-white" />,
        iconBg: 'bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600',
        activeText: 'text-sky-700',
        cardActiveBorder: isPremium ? 'border-2 border-sky-400 ring-2 ring-sky-400/30 shadow-2xl bg-[#091122]' : 'border-2 border-sky-500 ring-2 ring-sky-500/30 shadow-xl bg-sky-50/30',
        cardHoverBorder: isPremium ? 'hover:border-sky-400/70 hover:shadow-sky-500/15' : 'hover:border-sky-400/80 hover:shadow-sky-500/10',
        tabActiveText: isPremium ? 'text-sky-400 border-b-2 border-sky-400 font-black' : 'text-sky-600 border-b-2 border-sky-600 font-black',
        btnActive: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white font-black shadow-md shadow-sky-500/30',
        btnHover: isPremium ? 'hover:bg-gradient-to-r hover:from-sky-500 hover:to-blue-500 hover:text-slate-950 hover:shadow-sky-500/25' : 'hover:bg-gradient-to-r hover:from-sky-600 hover:to-blue-600 hover:text-white hover:shadow-sky-500/25',
      };
    }
    // Default (Сантехніка та опалення)
    return {
      accent: 'blue',
      border: isPremium ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-2 border-sky-500/80 ring-4 ring-sky-500/10 shadow-lg shadow-sky-500/5',
      bg: isPremium ? 'bg-[#091122] border-blue-500/40 text-white' : 'bg-gradient-to-br from-blue-50/70 via-white to-sky-50/30 text-slate-900',
      topGradient: 'from-blue-600 via-sky-500 to-cyan-500',
      badge: isPremium ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100/90 text-blue-950 border-blue-300/80',
      icon: <Droplets className="w-5 h-5 text-white" />,
      iconBg: 'bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-500',
      activeText: 'text-sky-700',
      cardActiveBorder: isPremium ? 'border-2 border-sky-400 ring-2 ring-sky-400/30 shadow-2xl bg-[#091122]' : 'border-2 border-sky-500 ring-2 ring-sky-500/30 shadow-xl bg-sky-50/30',
      cardHoverBorder: isPremium ? 'hover:border-sky-400/70 hover:shadow-sky-500/15' : 'hover:border-sky-400/80 hover:shadow-sky-500/10',
      tabActiveText: isPremium ? 'text-sky-400 border-b-2 border-sky-400 font-black' : 'text-sky-600 border-b-2 border-sky-600 font-black',
      btnActive: 'bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white font-black shadow-md shadow-sky-500/30',
      btnHover: isPremium ? 'hover:bg-gradient-to-r hover:from-sky-500 hover:to-blue-500 hover:text-slate-950 hover:shadow-sky-500/25' : 'hover:bg-gradient-to-r hover:from-sky-600 hover:to-blue-600 hover:text-white hover:shadow-sky-500/25',
    };
  };

  const headerTheme = getCategoryHeaderTheme(mainCategory);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Category Header & Filter Indicator */}
      <div className={`relative rounded-3xl p-5 sm:p-7 border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all overflow-hidden ${
        headerTheme.bg
      } ${
        headerTheme.border
      }`}>
        {/* Top Accent Gradient Bar matching Category color */}
        <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${headerTheme.topGradient} transition-all`} />

        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold mb-2.5 flex-wrap">
            <button 
              type="button"
              onClick={() => onSelectSubCategory(null)}
              className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Каталог
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className={`font-black ${headerTheme.activeText}`}>{mainCategory}</span>
            {selectedSubCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={`font-black ${headerTheme.activeText}`}>{selectedSubCategory}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className={`w-11 h-11 rounded-2xl ${headerTheme.iconBg} flex items-center justify-center shadow-md shadow-black/10 shrink-0`}>
              {headerTheme.icon}
            </div>

            <h2 className={`text-2xl sm:text-3xl font-black font-display tracking-tight flex items-center gap-3 ${
              isPremium ? 'text-white' : 'text-slate-950'
            }`}>
              <span>{mainCategory}</span>
              <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border shadow-2xs ${headerTheme.badge}`}>
                {cardsMeta.length} підкатегорій
              </span>
            </h2>
          </div>

          <p className={`text-xs sm:text-sm mt-2 max-w-2xl ${
            isPremium ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Оберіть підкатегорію або конкретного виробника для перегляду асортименту на складі
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          {selectedSubCategory && (
            <button
              type="button"
              onClick={() => onSelectSubCategory(null)}
              className={`px-4 py-2 border rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                headerTheme.badge
              }`}
            >
              <span>Показати всі підкатегорії</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Subcategory Cards with Premium styling & Laser accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cardsMeta.map((card) => {
          const { treeKey, items } = getSubcategoryItems(card);
          const brands = getSubcategoryBrands(card);
          const isSelected = selectedSubCategory === treeKey || selectedSubCategory === card.title;
          const currentTab = activeTabByCard[card.title] || 'categories';

          return (
            <div
              key={card.title}
              className={`relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group cursor-pointer ${
                isSelected 
                  ? headerTheme.cardActiveBorder
                  : isPremium
                  ? `bg-gradient-to-b from-[#0e1628]/95 via-[#0b101f] to-[#070b14] border-white/10 ${headerTheme.cardHoverBorder} text-white shadow-xl hover:shadow-[0_12px_30px_rgba(234,88,12,0.15)] hover:-translate-y-1.5`
                  : `bg-white border-slate-200/90 ${headerTheme.cardHoverBorder} text-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1.5`
              }`}
              onClick={() => {
                const { items } = getSubcategoryItems(card);
                onSelectSubCategory(treeKey, items[0] || null);
              }}
            >
              {/* Top Laser Accent Line */}
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${headerTheme.topGradient} ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity duration-300 pointer-events-none z-20`} />

              {/* Card Header with Tabs (Категорії | Підбірки) */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`px-4 pt-3.5 pb-2 border-b flex items-center justify-between relative z-10 ${
                  isPremium ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTabByCard(prev => ({ ...prev, [card.title]: 'categories' }))}
                    className={`pb-1 transition-colors relative cursor-pointer ${
                      currentTab === 'categories' 
                        ? headerTheme.tabActiveText
                        : isPremium ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Категорії
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabByCard(prev => ({ ...prev, [card.title]: 'collections' }))}
                    className={`pb-1 transition-colors relative cursor-pointer ${
                      currentTab === 'collections' 
                        ? headerTheme.tabActiveText
                        : isPremium ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Підбірки
                  </button>
                </div>

                {card.badge && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    isPremium 
                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                      : 'bg-red-50 text-red-600 border-red-200/80'
                  }`}>
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Visual Collage Area */}
              <div 
                className="p-4 cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                title={`Переглянути ${card.title}`}
              >
                {renderVisualCollage(card.imageType)}
              </div>

              {/* Card Title and Content (Subcategories or Brands based on active tab) */}
              <div className="px-5 pb-5 pt-1 space-y-3 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <div
                    className={`text-left font-black text-base leading-snug transition-colors flex items-center justify-between w-full ${
                      isPremium 
                        ? 'text-white group-hover:text-amber-400' 
                        : 'text-slate-900 group-hover:text-red-600'
                    }`}
                  >
                    <span>{card.title}</span>
                    <ChevronRight className={`w-4 h-4 group-hover:translate-x-1 transition-all shrink-0 ${
                      isPremium ? 'text-slate-400 group-hover:text-amber-400' : 'text-slate-400 group-hover:text-red-600'
                    }`} />
                  </div>

                  {/* Tab 1: Категорії (List of Child Subcategory Links) */}
                  {currentTab === 'categories' && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 space-y-1 animate-in fade-in duration-150"
                    >
                      {items.slice(0, 6).map((subItem) => (
                        <button
                          key={subItem}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSubCategory(treeKey, subItem);
                          }}
                          className={`text-left flex items-center gap-1.5 text-xs transition-all w-full truncate py-1 px-1.5 rounded-lg cursor-pointer ${
                            isPremium 
                              ? 'text-slate-300 hover:text-amber-300 hover:bg-white/5 hover:translate-x-0.5' 
                              : 'text-slate-600 hover:text-red-600 hover:bg-slate-50 hover:translate-x-0.5'
                          }`}
                          title={`Фільтрувати: ${subItem}`}
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${isPremium ? 'bg-amber-400/60' : 'bg-red-400/60'}`} />
                          <span className="truncate">{subItem}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Підбірки (Виробник / Бренд) */}
                  {currentTab === 'collections' && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 space-y-2 animate-in fade-in duration-150"
                    >
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Виробник:</span>
                      </div>
                      <div className="space-y-1">
                        {brands.map((brandName) => (
                          <button
                            key={brandName}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectBrand) {
                                onSelectBrand(treeKey, brandName);
                              } else {
                                onSelectSubCategory(treeKey);
                              }
                            }}
                            className={`text-left flex items-center gap-1.5 text-xs font-semibold transition-all w-full truncate py-1 px-1.5 rounded-lg cursor-pointer ${
                              isPremium 
                                ? 'text-slate-300 hover:text-amber-300 hover:bg-white/5 hover:translate-x-0.5' 
                                : 'text-slate-700 hover:text-red-600 hover:bg-slate-50 hover:translate-x-0.5'
                            }`}
                            title={`Показати товари бренду ${brandName}`}
                          >
                            <span className={`w-1 h-1 rounded-full shrink-0 ${isPremium ? 'bg-amber-400/60' : 'bg-red-400/60'}`} />
                            <span className="truncate">{brandName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const { items } = getSubcategoryItems(card);
                    onSelectSubCategory(treeKey, items[0] || null);
                  }}
                  className={`w-full mt-3 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.98] ${
                    isSelected 
                      ? headerTheme.btnActive 
                      : isPremium
                      ? `bg-slate-800/90 text-slate-200 ${headerTheme.btnHover}`
                      : `bg-slate-100 text-slate-800 ${headerTheme.btnHover}`
                  }`}
                >
                  <span>{isSelected ? '✓ Обрано (Показати товари)' : 'Переглянути всі товари'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
