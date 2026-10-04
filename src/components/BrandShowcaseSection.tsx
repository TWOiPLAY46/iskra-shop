import React from 'react';
import { Tag, Sparkles, ArrowRight, Check } from 'lucide-react';

interface BrandShowcaseSectionProps {
  onSelectBrand: (brandName: string) => void;
  selectedBrands: string[];
}

interface BrandMeta {
  name: string;
  category: string;
  country: string;
  badge?: string;
  badgeColor?: string;
}

const FEATURED_BRANDS: BrandMeta[] = [
  { name: 'Schneider Electric', category: 'Автоматика та щити', country: 'Франція', badge: 'Преміум', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { name: 'Hager', category: 'Модульне обладнання', country: 'Німеччина', badge: 'Топ надійність', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
  { name: 'ЗЗЦМ', category: 'Силовий ГОСТ кабель', country: 'Запоріжжя', badge: '100% Мідь', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  { name: 'Одескабель', category: 'Кабель та провід', country: 'Одеса', badge: 'Еталон якості', badgeColor: 'bg-orange-100 text-orange-900 border-orange-300' },
  { name: 'Videx', category: 'LED освітлення та лампи', country: 'Україна', badge: 'Хіт продажів', badgeColor: 'bg-red-100 text-red-800 border-red-300' },
  { name: 'Velmax', category: 'Прожектори та світильники', country: 'Україна / ЄС' },
  { name: 'WAGO', category: 'Пружинні експрес-клеми', country: 'Німеччина', badge: 'Швидкий монтаж', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { name: 'Biom', category: 'LED стрічки та блоки 12V', country: 'Україна' },
  { name: 'Horoz Electric', category: 'Освітлення та монтаж', country: 'Туреччина' },
  { name: 'Bylectrica', category: 'Електрофурнітура та розетки', country: 'Білорусь' },
  { name: 'Світоприлад', category: 'Подовжувачі та розетки', country: 'Україна' },
  { name: 'ZUBR', category: 'Реле захисту від стрибків напруги', country: 'Україна', badge: 'Захист 220V', badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export const BrandShowcaseSection: React.FC<BrandShowcaseSectionProps> = ({ onSelectBrand, selectedBrands }) => {
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-slate-900 text-amber-400 shadow-2xs">
              <Tag className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 font-display">
              Офіційні виробники
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-950 tracking-tight">
            Перевірені бренди та заводи
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Натисніть на бренд, щоб переглянути всі його товари в нашому каталозі
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Поставки напряму від офіційних дистриб'юторів
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {FEATURED_BRANDS.map((b) => {
          const isSelected = selectedBrands.includes(b.name);

          return (
            <button
              key={b.name}
              type="button"
              onClick={() => onSelectBrand(b.name)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-red-500 scale-[1.02]' 
                  : 'bg-slate-50/70 hover:bg-white text-slate-900 border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isSelected 
                      ? 'bg-slate-800 text-slate-300 border-slate-700' 
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}>
                    {b.country}
                  </span>

                  {b.badge && (
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                      isSelected 
                        ? 'bg-red-600 text-white border-red-500' 
                        : (b.badgeColor || 'bg-amber-100 text-amber-900 border-amber-300')
                    }`}>
                      {b.badge}
                    </span>
                  )}
                </div>

                <div className="font-black text-sm sm:text-base tracking-tight font-display group-hover:text-red-600 transition-colors">
                  {b.name}
                </div>

                <div className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {b.category}
                </div>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-bold ${
                isSelected ? 'border-slate-800 text-amber-400' : 'border-slate-200/60 text-slate-500 group-hover:text-red-600'
              }`}>
                <span>{isSelected ? '✓ Вибрано' : 'Дивитися товари'}</span>
                <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-red-600'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
