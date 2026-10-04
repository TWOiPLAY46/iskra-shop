import React, { useState, useMemo } from 'react';
import { 
  Star, 
  ShieldCheck, 
  ThumbsUp, 
  MessageSquarePlus, 
  CheckCircle2, 
  UserCheck, 
  Sparkles,
  Award,
  Send
} from 'lucide-react';
import { Product, ProductReview } from '../types/store';
import { useStore } from '../context/StoreContext';

interface ProductReviewsSectionProps {
  product: Product;
  isPlumbing: boolean;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ product, isPlumbing }) => {
  const { currentClient, showToast, reviews: allReviews, addReview, voteHelpfulReview } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  
  // New review form states
  const [author, setAuthor] = useState(currentClient?.name || '');
  const [city, setCity] = useState(currentClient ? 'с-ще. Оратів' : '');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recommended, setRecommended] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter reviews for this specific product or general store reviews
  const productReviews = useMemo(() => {
    const specific = allReviews.filter(r => r.productId === product.id);
    if (specific.length > 0) return specific;
    
    // If no specific reviews, show category-relevant reviews + general reviews
    return allReviews.filter(r => {
      if (!r.productId || r.productId === '') return true;
      if (isPlumbing && (r.productId.includes('ort') || r.productId.includes('grohe') || r.productId.includes('pipe') || r.productId.includes('bim') || r.productId.includes('eco') || r.productId.includes('lux') || r.productId.includes('fum'))) {
        return true;
      }
      if (!isPlumbing && (r.productId.includes('vvg') || r.productId.includes('avt') || r.productId.includes('pvs') || r.productId.includes('led') || r.productId.includes('ele'))) {
        return true;
      }
      return false;
    });
  }, [allReviews, product.id, isPlumbing]);

  const averageRating = useMemo(() => {
    if (productReviews.length === 0) return 5.0;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / productReviews.length).toFixed(1);
  }, [productReviews]);

  const handleVoteHelpful = (reviewId: string) => {
    if (votedIds.includes(reviewId)) return;
    voteHelpfulReview(reviewId);
    setVotedIds(prev => [...prev, reviewId]);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("Будь ласка, напишіть текст відгуку", "info");
      return;
    }

    setIsSubmitting(true);
    addReview({
      productId: product.id,
      author: author.trim() || 'Покупець ISKRA',
      city: city.trim() || 'с-ще. Оратів',
      rating,
      comment: comment.trim(),
      verifiedPurchase: true,
      recommended
    });

    setIsSubmitting(false);
    setIsFormOpen(false);
    setComment('');
  };

  return (
    <div className="pt-6 border-t border-slate-200">
      
      {/* Top Header & Trust Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span>Відгуки покупців</span>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                {productReviews.length}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-800">{averageRating} / 5.0</span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 inline" /> 98% рекомендують
            </span>
          </div>
        </div>

        {/* Action Button: Add Review */}
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs active:scale-95"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>{isFormOpen ? 'Закрити форму' : 'Залишити відгук'}</span>
        </button>
      </div>

      {/* Trust Badges Bar */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 mb-5 text-center text-[10px] sm:text-[11px] font-medium text-slate-600">
        <div className="flex items-center justify-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Перевірені покупці</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 border-x border-slate-200 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>100% Оригінал ISKRA</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Гарантія якості</span>
        </div>
      </div>

      {/* Write Review Collapsible Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmitReview} className="mb-6 bg-slate-50/90 border border-red-100 rounded-2xl p-4 sm:p-5 text-xs text-slate-800 space-y-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              Ваш відгук про товар
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 mr-1">Оцінка:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      (hoverRating || rating) >= star 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ваше ім'я *
              </label>
              <input
                type="text"
                required
                placeholder="Олександр"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Місто / Населений пункт
              </label>
              <input
                type="text"
                placeholder="с-ще. Оратів"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Текст відгуку *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Опишіть ваші враження від товару, якість матеріалів та роботу магазину..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={recommended}
                onChange={(e) => setRecommended(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span>Рекомендую цей товар іншим</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white text-xs transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Опублікувати</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {productReviews.map((rev) => {
          const isVoted = votedIds.includes(rev.id);

          return (
            <div 
              key={rev.id} 
              className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 text-xs text-slate-800 transition-all hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[11px]">
                    {rev.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 leading-none">
                      {rev.author}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {rev.city || 'Покупець'} • {rev.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Verified purchase tag */}
              {rev.verifiedPurchase && (
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md mb-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Перевірена покупка</span>
                </div>
              )}

              {/* Comment body */}
              <p className="text-slate-700 text-xs leading-relaxed">
                {rev.comment}
              </p>

              {/* Footer: Recommendation & Helpful Button */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/60 text-[11px]">
                {rev.recommended ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Рекомендує товар
                  </span>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => handleVoteHelpful(rev.id)}
                  disabled={isVoted}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    isVoted 
                      ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Корисно {rev.helpfulCount > 0 && `(${rev.helpfulCount})`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
