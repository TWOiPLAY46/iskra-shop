import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  Award, 
  Users, 
  Boxes,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const StoreAboutSection: React.FC = () => {
  const { siteSettings, headerDesign, products } = useStore();

  return (
    <section id="about-section" className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden space-y-8">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Спеціалізований магазин електротехніки та сантехніки</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white leading-tight">
          Магазин «{headerDesign.logoBadge || 'ISKRA'}» — надійний партнер для ремонту, монтажу та будівництва
        </h2>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Ми працюємо у <b>смт. Оратів (Вінницька область)</b> та забезпечуємо якісними матеріалами як приватних господарів, так і професійних електриків, сантехніків та будівельні бригади. У нашому каталозі зібрано перевірений часом асортимент з прямими поставками від заводів.
        </p>
      </div>

      {/* 4 Stat Highlights */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-400 mb-2">
            <Boxes className="w-6 h-6" />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">Склад</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {products.length > 0 ? `${products.length}+` : '1000+'}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            товарів у постійній наявності
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">ГОСТ</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            100%
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            оригінальна продукція з заводів
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <Truck className="w-6 h-6" />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Швидкість</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            1 день
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            відправка замовлень по Україні
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <Award className="w-6 h-6" />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Рейтинг</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            ★ 4.9
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            середня оцінка відгуків клієнтів
          </div>
        </div>
      </div>

      {/* Principles & Store Contact Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
        
        {/* Principles */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Наші стандарти роботи та контролю якості</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
              <b className="text-white text-sm">Чесний метраж та переріз</b>
              <p className="text-slate-400 leading-relaxed">
                Тільки повноцінний мідний кабель ВВГ та ШВВП згідно стандартів ГОСТ/ДСТУ (ЗЗЦМ, Одескабель).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
              <b className="text-white text-sm">Перевірка перед відправкою</b>
              <p className="text-slate-400 leading-relaxed">
                Кожен лічильник, автомат чи змішувач візуально перевіряється та надійно упаковується для транспортування.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
              <b className="text-white text-sm">Підбір та консультація</b>
              <p className="text-slate-400 leading-relaxed">
                Допоможемо розрахувати все необхідне за вашим списком або схемою електрощитка/опалення.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
              <b className="text-white text-sm">Безпечна оплата та повернення</b>
              <p className="text-slate-400 leading-relaxed">
                Оплата онлайн або при отриманні на пошті. Гарантія обміну та повернення протягом 14 днів.
              </p>
            </div>
          </div>
        </div>

        {/* Location & Quick Contact Card */}
        <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-500" />
              <h4 className="font-bold text-white text-sm font-display uppercase tracking-wide">
                Фізичний магазин
              </h4>
            </div>

            <div className="text-xs space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{siteSettings.city}, {siteSettings.address}</span>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{siteSettings.workHours}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400 shrink-0" />
                <a href={`tel:${siteSettings.phone.replace(/[^0-9+]/g, '')}`} className="text-amber-400 hover:text-amber-300 font-bold font-mono text-sm">
                  {siteSettings.phone}
                </a>
              </div>
            </div>
          </div>

          <a 
            href={`tel:${siteSettings.phone.replace(/[^0-9+]/g, '')}`}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-red-600/30"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Зателефонувати в магазин</span>
          </a>
        </div>

      </div>
    </section>
  );
};
