import React, { useEffect, useState, useRef, useMemo } from 'react';
import { X, Mic, Volume2, AlertCircle, Sparkles, Search, RotateCcw, ArrowRight, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript?: (query: string) => void;
  onSearch?: (query: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
  onSearch,
}) => {
  const { products } = useStore();
  const [speechState, setSpeechState] = useState<'listening' | 'processing' | 'error' | 'unsupported'>('listening');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const finishTimeoutRef = useRef<any>(null);

  // Dynamic curated hints tailored specifically to the store's inventory (electrical & plumbing)
  const popularHints = useMemo(() => {
    const curatedDefaults = [
      'Кабель ВВГнг',
      'Змішувач для кухні',
      'Бойлер 80 л',
      'Шуруповерт 18В',
      'Радіатор біметалевий',
      'Реле напруги Зубр',
      'Клемники WAGO',
      'Автоматичний вимикач',
      'Лампа LED',
      'Фільтр для води',
      'Труба поліпропіленова',
      'Зварювальний інвертор',
    ];

    if (!products || products.length === 0) {
      return curatedDefaults;
    }

    // Grab popular/hit products from actual store database
    const hits = products
      .filter((p) => p.badge === 'Хіт продажу' || p.badge === 'Акція' || (p.stock && p.stock > 0))
      .slice(0, 6)
      .map((p) => {
        const shortName = p.name
          .replace(/\(.*?\)/g, '')
          .replace(/\[.*?\]/g, '')
          .split(',')[0]
          .trim();
        return shortName.length > 25 ? shortName.slice(0, 25).trim() : shortName;
      })
      .filter((name) => name.length >= 4);

    const merged = Array.from(new Set([...hits, ...curatedDefaults])).slice(0, 8);
    return merged;
  }, [products]);

  // Live matching products while user speaks
  const matchedProducts = useMemo(() => {
    const q = interimText.trim().toLowerCase();
    if (!q || q.length < 2 || !products) return [];
    return products
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      })
      .slice(0, 3);
  }, [interimText, products]);

  const handleEmitResult = (query: string) => {
    const cleanText = query.replace(/[.,!?]+$/, '').trim();
    if (!cleanText) return;

    if (onTranscript) {
      onTranscript(cleanText);
    }
    if (onSearch) {
      onSearch(cleanText);
    }
    onClose();
  };

  const startListening = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechState('unsupported');
      setErrorMessage(
        'Голосовий пошук не підтримується вашим поточним браузером. Будь ласка, скористайтеся Google Chrome, Safari, Samsung Internet або Edge.'
      );
      return;
    }

    setSpeechState('listening');
    setErrorMessage('');
    setInterimText('');

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'uk-UA';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setSpeechState('listening');
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        const trimmed = transcript.trim();
        setInterimText(trimmed);

        if (isFinal && trimmed) {
          setSpeechState('processing');
          if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
          finishTimeoutRef.current = setTimeout(() => {
            handleEmitResult(trimmed);
          }, 450);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice search error:', event.error);
        if (event.error === 'no-speech') {
          return;
        }

        setSpeechState('error');
        if (event.error === 'not-allowed') {
          setErrorMessage(
            'Доступ до мікрофона заблоковано в налаштуваннях браузера. Натисніть значок замочка 🔒 або налаштувань біля адреси сайту та надайте дозвіл на використання мікрофона.'
          );
        } else if (event.error === 'network') {
          setErrorMessage('Мережева помилка розпізнавання. Перевірте з’єднання з інтернетом.');
        } else {
          setErrorMessage('Не вдалося розпізнати мову. Будь ласка, повторіть голосніше та чіткіше.');
        }
      };

      recognition.onend = () => {
        setInterimText((prev) => {
          if (prev.trim() && speechState !== 'error') {
            setSpeechState('processing');
            if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = setTimeout(() => {
              handleEmitResult(prev.trim());
            }, 500);
          }
          return prev;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechState('error');
      setErrorMessage('Не вдалося активувати мікрофон. Перевірте дозволи вашого браузера.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      setInterimText('');
      setErrorMessage('');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Keyboard navigation: Escape closes modal, Enter accepts recognized text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && interimText.trim()) {
        handleEmitResult(interimText);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, interimText]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Голосовий пошук товарів"
      >
        {/* Subtle Decorative Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer z-10"
          aria-label="Закрити"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Store Micro-Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold mb-2">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span>Голосовий пошук по складу ISKRA</span>
        </div>

        {/* Large Animated Microphone Circle (Exact Comfy layout & styling) */}
        <div className="my-5 relative flex items-center justify-center">
          {/* Ripple rings while listening */}
          {speechState === 'listening' && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-emerald-400/25 animate-ping opacity-75" />
              <div className="absolute w-44 h-44 rounded-full bg-emerald-400/15 animate-pulse" />
              <div className="absolute w-52 h-52 rounded-full bg-emerald-400/10 animate-pulse duration-1000" />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              if (speechState === 'listening') {
                if (interimText.trim()) {
                  handleEmitResult(interimText);
                } else {
                  startListening();
                }
              } else {
                startListening();
              }
            }}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 flex items-center justify-center transition-all duration-300 relative z-10 cursor-pointer shadow-xl ${
              speechState === 'listening'
                ? 'border-emerald-100 bg-white shadow-emerald-500/20 hover:scale-105'
                : speechState === 'processing'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-500/25 scale-105'
                : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
            title="Натисніть для запуску або підтвердження"
          >
            <Mic
              className={`w-14 h-14 sm:w-16 sm:h-16 transition-all duration-300 ${
                speechState === 'listening'
                  ? 'text-emerald-500 scale-105'
                  : speechState === 'processing'
                  ? 'text-emerald-600 animate-bounce'
                  : speechState === 'error'
                  ? 'text-rose-500'
                  : 'text-slate-400'
              }`}
              strokeWidth={2.2}
            />
          </button>
        </div>

        {/* Status / Title Text */}
        <div className="min-h-[70px] flex flex-col items-center justify-center mb-3 px-2 w-full">
          {speechState === 'listening' && (
            <>
              <h3 className="text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
                Говоріть
              </h3>
              {interimText ? (
                <p className="mt-2 text-base font-bold text-emerald-600 break-words max-w-xs animate-in fade-in">
                  «{interimText}»
                </p>
              ) : (
                <p className="mt-2 text-xs sm:text-sm text-slate-400">
                  Назвіть електротовар, сантехніку або інструмент...
                </p>
              )}
            </>
          )}

          {speechState === 'processing' && (
            <>
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>Шукаємо...</span>
                <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
              </h3>
              <p className="mt-2 text-sm text-emerald-600 font-semibold break-words max-w-xs">
                «{interimText}»
              </p>
            </>
          )}

          {(speechState === 'error' || speechState === 'unsupported') && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-rose-600 font-semibold mb-1 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Помилка голосового пошуку</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {errorMessage || 'Не вдалося розпізнати. Спробуйте ще раз.'}
              </p>
              <button
                type="button"
                onClick={startListening}
                className="mt-3.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Спробувати ще раз</span>
              </button>
            </div>
          )}
        </div>

        {/* Instant Matches Preview (if speaking recognized a matching product in real time) */}
        {matchedProducts.length > 0 && speechState === 'listening' && (
          <div className="w-full mb-3 text-left bg-slate-50 rounded-2xl p-2.5 border border-slate-100 animate-in fade-in">
            <div className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1 tracking-wider">
              Знайдено серед товарів:
            </div>
            <div className="space-y-1">
              {matchedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleEmitResult(p.name)}
                  className="w-full text-left flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={p.image}
                      alt=""
                      className="w-6 h-6 object-cover rounded shrink-0 border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-slate-800 font-medium truncate group-hover:text-emerald-600">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0 ml-2">
                    {p.price} ₴
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: Search Recognized Text Now */}
        {speechState === 'listening' && interimText && (
          <button
            type="button"
            onClick={() => handleEmitResult(interimText)}
            className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Знайти «{interimText}»</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}

        {/* Comfy-like Hints / Examples at bottom - Tailored to Store's Actual Goods */}
        <div className="mt-1 pt-3.5 border-t border-slate-100 w-full text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-2 font-medium">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Наприклад:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 max-h-28 overflow-y-auto">
            {popularHints.map((hint, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleEmitResult(hint)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer border border-transparent hover:border-emerald-200 active:scale-95"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
