import React, { useState, useMemo } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  ThumbsUp, 
  MessageSquarePlus, 
  Sparkles, 
  ShieldCheck, 
  X,
  Send,
  UserCheck
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductReview } from '../types/store';

export const StoreReviewsSection: React.FC = () => {
  const { reviews, addReview, voteHelpfulReview, showToast, currentClient } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Form states
  const [author, setAuthor] = useState(currentClient?.name || '');
  const [city, setCity] = useState(currentClient ? 'с-ще. Оратів' : '');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recommended, setRecommended] = useState(true);

  // Compute average score & stats
  const { avgRating, recommendedPercent } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { avgRating: '4.9', recommendedPercent: 98 };
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = (sum / reviews.length).toFixed(1);
    const recCount = reviews.filter((r) => r.recommended !== false).length;
    const percent = Math.round((recCount / reviews.length) * 100);
    return { avgRating: avg, recommendedPercent: percent };
  }, [reviews]);

  const handleVote = (id: string) => {
    if (votedIds.includes(id)) return;
    voteHelpfulReview(id);
    setVotedIds(prev => [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("Будь ласка, напишіть текст відгуку", "info");
      return;
    }

    addReview({
      productId: '',
      author: author.trim() || 'Покупець ISKRA',
      city: city.trim() || 'Україна',
      rating,
      comment: comment.trim(),
      verifiedPurchase: true,
      recommended
    });

    setIsModalOpen(false);
    setComment('');
    showToast("Дякуємо! Ваш відгук успішно опубліковано", "success");
  };

  return (
    <section id="reviews-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
      
      {/* Header with Rating Summary & Action Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500 text-slate-950 shadow-2xs">
              <Star className="w-4 h-4 fill-slate-950" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 font-display">
              Оцінки та довіра
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-950 tracking-tight">
            Відгуки наших клієнтів
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Думка реальних покупців, майстрів та будівельних бригад про сервіс та якість товарів
          </p>
        </div>

        {/* Right: Score Card & Leave Review Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-amber-50/80 px-4 py-2 rounded-2xl border border-amber-200">
            <div className="text-2xl font-black font-mono text-amber-950 leading-none">
              {avgRating}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <div className="text-[10px] text-amber-900 font-semibold mt-0.5">
                {recommendedPercent}% рекомендують магазин
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>+ Залишити відгук</span>
          </button>
        </div>
      </div>

      {/* Reviews Grid (Top 4 reviews) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.slice(0, 4).map((rev) => (
          <div 
            key={rev.id}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{rev.author}</span>
                    {rev.verifiedPurchase && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>Перевірений покупець</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {rev.city || 'с-ще. Оратів'} · {rev.date || 'Нещодавно'}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <Star 
                      key={st} 
                      className={`w-3.5 h-3.5 ${st <= (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed italic">
                «{rev.comment}»
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Рекомендує магазин</span>
              </span>

              <button
                type="button"
                onClick={() => handleVote(rev.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  votedIds.includes(rev.id) 
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                }`}
                title="Корисний відгук"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{rev.helpfulCount || 0}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Залишити відгук про ISKRA
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ваша оцінка:</label>
                <div className="flex items-center gap-1 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-200'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-slate-700 text-sm">{hoverRating || rating} / 5</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ваше ім'я:</label>
                  <input
                    type="text"
                    required
                    placeholder="Іван"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:border-red-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Місто / Село:</label>
                  <input
                    type="text"
                    placeholder="с-ще. Оратів"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ваш відгук або враження від замовлення:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Опишіть якість товару, швидкість відправки чи враження від консультації..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:border-red-600 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recCheck"
                  checked={recommended}
                  onChange={(e) => setRecommended(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
                <label htmlFor="recCheck" className="text-slate-700 font-medium cursor-pointer">
                  Рекомендую магазин «ISKRA» друзям та майстрам
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Опублікувати відгук</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
