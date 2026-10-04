import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Truck, 
  CreditCard, 
  ShieldCheck, 
  RotateCcw, 
  PhoneCall, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export const StoreFaqSection: React.FC = () => {
  const { siteSettings } = useStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const threshold = siteSettings.features?.freeShippingThreshold ?? 3000;
  const storeCity = siteSettings.city || 'с-ще. Оратів';
  const storeAddress = siteSettings.address || 'вул. Котляревського, 7';

  const faqs: FaqItem[] = [
    {
      question: "Як здійснюється доставка та в які терміни?",
      answer: "Ми щодня відправляємо замовлення по всій Україні службою «Нова Пошта». Замовлення, оформлені до 16:00, відправляються в той самий день. Термін доставки зазвичай складає 1-2 дні до вашого відділення або поштомату.",
      icon: <Truck className="w-4 h-4 text-orange-500" />
    },
    {
      question: "Як отримати безкоштовну доставку?",
      answer: threshold > 0 
        ? `При замовленні на суму від ${threshold.toLocaleString('uk-UA')} грн доставка у будь-яке відділення Нової Пошти по всій Україні — повністю БЕЗКОШТОВНА за рахунок магазину ISKRA!`
        : `Доставка у будь-яке відділення Нової Пошти по всій Україні — повністю БЕЗКОШТОВНА за рахунок магазину ISKRA!`,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />
    },
    {
      question: "Які способи оплати доступні?",
      answer: "Ви можете сплатити замовлення: 1) Онлайн банківською карткою без комісії (Google Pay / Apple Pay / Visa / Mastercard); 2) Післяплатою при отриманні у відділенні Нової Пошти; 3) Готівкою або карткою при самовивозі в магазині; 4) Безготівковим розрахунком за реквізитами IBAN для підприємств та ФОП.",
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />
    },
    {
      question: "Чи можу я забрати замовлення самовивозом?",
      answer: `Так! Ви можете безкоштовно забрати своє замовлення безпосередньо у нашому фізичному магазині за адресою: ${storeAddress}, ${storeCity}, Вінницька область, 22601. Ми зберемо та підготуємо замовлення до вашого приїзду.`,
      icon: <MapPin className="w-4 h-4 text-red-500" />
    },
    {
      question: "Як працює гарантія, обмін та повернення товару?",
      answer: "На всі товари діє офіційна гарантія від виробника. Згідно Закону України «Про захист прав споживачів», ви маєте право обміняти або повернути товар належної якості протягом 14 днів з моменту покупки, якщо збережено товарний вигляд та упаковку.",
      icon: <RotateCcw className="w-4 h-4 text-blue-500" />
    },
    {
      question: "Чи можу я отримати консультацію або допомогу з розрахунком?",
      answer: "Звісно! Наші спеціалісти безкоштовно допоможуть розрахувати переріз силового кабелю, підібрати номінали автоматичних вимикачів, ПЗВ, реле напруги або укомплектувати сантехнічну систему за вашим списком чи планом.",
      icon: <PhoneCall className="w-4 h-4 text-indigo-500" />
    }
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-2xs">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 font-display">
              Питання та відповіді
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-950 tracking-tight">
            Часті запитання покупців
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Все про оплату, доставку, гарантію та роботу магазину ISKRA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div 
              key={index}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? 'bg-slate-50/90 border-slate-300 shadow-sm' 
                  : 'bg-white hover:bg-slate-50/50 border-slate-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
                    {faq.icon}
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                </div>

                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 mt-1 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 animate-in fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
