import React from 'react';
import { Truck, ShieldCheck, Wrench, Percent, Sparkles, CheckCircle2, Clock, PhoneCall } from 'lucide-react';

export const StoreBenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: <Truck className="w-6 h-6 text-white" />,
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20",
      badge: "Швидка доставка",
      title: "Відправка день у день",
      desc: "Замовлення відправляємо Новою Поштою по всій Україні або видаємо у магазині в смт. Оратів без затримок."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20",
      badge: "100% Оригінал",
      title: "Офіційна заводська якість",
      desc: "Прямі поставки від перевірених заводів. Тільки сертифікований ГОСТ кабель, надійна автоматика та сантехніка."
    },
    {
      icon: <Wrench className="w-6 h-6 text-white" />,
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20",
      badge: "Допомога фахівця",
      title: "Консультація майстра",
      desc: "Безкоштовно розрахуємо переріз кабелю, підберемо автомати захисту, насос чи необхідні фітинги під ваш об'єкт."
    },
    {
      icon: <Percent className="w-6 h-6 text-white" />,
      iconBg: "bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-rose-500/20",
      badge: "Програма знижок",
      title: "Чесні ціни та бонуси",
      desc: "Накопичувальні знижки 3%, 5%, 7% для постійних клієнтів, майстрів-електриків та сантехніків у кабінеті."
    }
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-red-600 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-red-600 font-display">
              Переваги магазину
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-950 tracking-tight">
            Чому покупці та майстри обирають ISKRA
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Перевірений асортимент на складі</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {benefits.map((b, idx) => (
          <div 
            key={idx}
            className="p-5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all duration-200 hover:shadow-md flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${b.iconBg}`}>
                  {b.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {b.badge}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
