import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  Sparkles,
  Search,
  RotateCcw,
  ArrowRight,
  Zap,
  Lock,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript?: (transcript: string) => void;
  onSearch?: (query: string) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResultItem[];
  length: number;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
  onSearch,
}) => {
  const { products } = useStore();
  const [speechState, setSpeechState] = useState<
    'idle' | 'listening' | 'processing' | 'permission_denied' | 'error' | 'unsupported'
  >('idle');
  const [interimText, setInterimText] = useState('');
  const [manualText, setManualText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showHowToUnlock, setShowHowToUnlock] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Quick suggestions from the store catalog
  const popularHints = useMemo(() => [
    'Кабель ВВГнг',
    'Автоматичний вимикач',
    'Змішувач для кухні',
    'Болгарка DeWalt',
    'Реле напруги ZUBR',
    'Клема WAGO',
    'Перфоратор',
    'Труба паяльна',
  ], []);

  // Instant matches from actual store catalog based on current spoken phrase
  const activeQuery = interimText || manualText;
  const matchedProducts = useMemo(() => {
    if (!activeQuery || activeQuery.trim().length < 2) return [];
    const q = activeQuery.toLowerCase().trim();
    return products
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      })
      .slice(0, 3);
  }, [activeQuery, products]);

  const stopActiveStream = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, []);

  const handleEmitResult = useCallback((query: string) => {
    const cleanText = query.replace(/[.,!?]+$/, '').trim();
    if (!cleanText) return;
    
    stopActiveStream();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    if (onTranscript) {
      onTranscript(cleanText);
    }
    if (onSearch) {
      onSearch(cleanText);
    }
    onClose();
  }, [onClose, onSearch, onTranscript, stopActiveStream]);

  /**
   * Starts SpeechRecognition with user interaction context
   */
  const startListeningWithRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechState('unsupported');
      setErrorMessage(
        'Ваш браузер не підтримує розпізнавання мови. Ви можете скористатися пошуком нижче.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'uk-UA';
      recognition.maxAlternatives = 1;

      setInterimText('');
      setErrorMessage('');
      setSpeechState('listening');

      recognition.onstart = () => {
        setSpeechState('listening');
      };

      recognition.onaudiostart = () => {
        setSpeechState('listening');
      };

      recognition.onsoundstart = () => {
        setSpeechState('listening');
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (!event.results || event.results.length === 0) return;
        const currentResult = event.results[0];
        if (currentResult && currentResult[0]) {
          const transcript = currentResult[0].transcript;
          setInterimText(transcript);

          if (finishTimeoutRef.current) {
            clearTimeout(finishTimeoutRef.current);
          }
          finishTimeoutRef.current = setTimeout(() => {
            if (transcript.trim().length > 0) {
              setSpeechState('processing');
              setTimeout(() => {
                handleEmitResult(transcript);
              }, 400);
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          // In iOS Safari, 'not-allowed' happens if Dictation is disabled in iOS Settings
          // or user did not grant browser permission.
          setSpeechState('permission_denied');
          setErrorMessage('Доступ заблоковано в налаштуваннях Safari або iOS.');
        } else if (event.error === 'service-not-allowed') {
          setSpeechState('permission_denied');
          setErrorMessage('Розпізнавання голосу заблоковано системою iOS. Перевірте Siri та Диктовку.');
        } else if (event.error === 'no-speech') {
          setSpeechState('idle');
          setErrorMessage('Нічого не почуто. Натисніть на мікрофон і скажіть ще раз.');
        } else if (event.error === 'aborted') {
          setSpeechState('idle');
        } else {
          setSpeechState('error');
          setErrorMessage('Не вдалося розпізнати. Спробуйте ще раз або введіть слово.');
        }
      };

      recognition.onend = () => {
        if (finishTimeoutRef.current) {
          clearTimeout(finishTimeoutRef.current);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition exception:', err);
      if (err.name === 'NotAllowedError') {
        setSpeechState('permission_denied');
      } else {
        setSpeechState('error');
        setErrorMessage('Не вдалося запустити мікрофон.');
      }
    }
  }, [handleEmitResult]);

  /**
   * Safe User-Triggered Start:
   * First requests getUserMedia to satisfy mobile permission if not cached,
   * then launches SpeechRecognition.
   */
  const handleUserTriggeredStart = useCallback(async () => {
    setErrorMessage('');
    setShowHowToUnlock(false);

    // On iOS Safari, we must also check navigator.mediaDevices
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamRef.current = stream;
        // Keep stream briefly active so iOS does not immediately revoke permission
        setTimeout(() => {
          stopActiveStream();
        }, 1000);
      } catch (err: any) {
        console.warn('getUserMedia error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setSpeechState('permission_denied');
          setErrorMessage('У дозволі на мікрофон відмовлено в iOS налаштуваннях.');
          return;
        }
      }
    }

    startListeningWithRecognition();
  }, [startListeningWithRecognition, stopActiveStream]);

  // When modal opens, launch initial start
  useEffect(() => {
    if (isOpen) {
      setInterimText('');
      setManualText('');
      setErrorMessage('');
      setShowHowToUnlock(false);
      // Initiate start
      handleUserTriggeredStart();
    } else {
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
      stopActiveStream();
      setSpeechState('idle');
      setInterimText('');
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
      stopActiveStream();
    };
  }, [handleUserTriggeredStart, isOpen, stopActiveStream]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter') {
        if (interimText.trim()) {
          handleEmitResult(interimText);
        } else if (manualText.trim()) {
          handleEmitResult(manualText);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEmitResult, isOpen, interimText, manualText, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Голосовий пошук товарів"
      >
        {/* Subtle Decorative Background Glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Compact Header */}
        <div className="relative shrink-0 pt-4 px-5 pb-2 flex items-center justify-between border-b border-slate-100/80 bg-white/80 backdrop-blur-sm z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            <span>Голосовий пошук ISKRA</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col items-center text-center">
          {/* Animated Microphone Circle Button */}
          <div className="my-2 sm:my-3 relative flex items-center justify-center shrink-0">
            {/* Ripple rings while listening */}
            {speechState === 'listening' && (
              <>
                <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-400/25 animate-ping opacity-75" />
                <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-emerald-400/15 animate-pulse" />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (speechState === 'listening') {
                  if (interimText.trim()) {
                    handleEmitResult(interimText);
                  } else {
                    handleUserTriggeredStart();
                  }
                } else {
                  handleUserTriggeredStart();
                }
              }}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 relative z-10 cursor-pointer shadow-lg active:scale-95 ${
                speechState === 'listening'
                  ? 'border-emerald-100 bg-white shadow-emerald-500/25 ring-4 ring-emerald-500/20'
                  : speechState === 'processing'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-500/25 scale-105'
                  : speechState === 'permission_denied'
                  ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 shadow-amber-500/20'
                  : speechState === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-500'
                  : 'border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100'
              }`}
              title="Торкніться для запуску або повтору"
            >
              {speechState === 'permission_denied' ? (
                <MicOff className="w-10 h-10 sm:w-11 sm:h-11 text-amber-600" strokeWidth={2.2} />
              ) : (
                <Mic
                  className={`w-10 h-10 sm:w-11 sm:h-11 transition-all duration-300 ${
                    speechState === 'listening'
                      ? 'text-emerald-500 scale-105'
                      : speechState === 'processing'
                      ? 'text-emerald-600 animate-bounce'
                      : speechState === 'error'
                      ? 'text-rose-500'
                      : 'text-emerald-600'
                  }`}
                  strokeWidth={2.2}
                />
              )}
            </button>
          </div>

          {/* Status & Title Text */}
          <div className="w-full flex flex-col items-center justify-center mb-3">
            {speechState === 'listening' && (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    Говоріть, ми слухаємо...
                  </span>
                </div>

                {interimText ? (
                  <p className="text-base sm:text-lg font-bold text-emerald-600 break-words px-3 py-1 bg-emerald-50/80 rounded-xl border border-emerald-200/50 mt-1">
                    «{interimText}»
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Назвіть товар (наприклад, «кабель», «змішувач», «реле»)
                  </p>
                )}
              </div>
            )}

            {speechState === 'processing' && (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-sm sm:text-base">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Шукаємо «{interimText}»...</span>
                </div>
              </div>
            )}

            {speechState === 'idle' && (
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Торкніться мікрофона
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  {errorMessage || 'Натисніть на зелену іконку та назвіть товар'}
                </p>
                <button
                  type="button"
                  onClick={handleUserTriggeredStart}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Натиснути й говорити</span>
                </button>
              </div>
            )}

            {speechState === 'permission_denied' && (
              <div className="w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold mb-1">
                  <Lock className="w-3 h-3" />
                  <span>Safari / iOS блокує звук</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Чому iPhone показує «Заблоковано»?
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 max-w-xs leading-relaxed">
                  В iOS розпізнавання мови потребує увімкненої «Диктовки» в системних налаштуваннях iPhone.
                </p>

                {/* Compact Action buttons */}
                <div className="mt-2.5 flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleUserTriggeredStart}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Натиснути повторно</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHowToUnlock(!showHowToUnlock)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Як увімкнути на iPhone?</span>
                    {showHowToUnlock ? (
                      <ChevronUp className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Step by step unlock instruction tailored for iOS iPhone / Safari */}
                {showHowToUnlock && (
                  <div className="mt-2.5 w-full bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-left text-xs text-slate-700 animate-in fade-in duration-200">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <Settings className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Налаштування iPhone (Safari):</span>
                    </div>
                    <ol className="space-y-1.5 text-[11px] list-decimal list-inside text-slate-600 leading-snug">
                      <li>
                        <strong>Параметри iPhone</strong> → <strong>Safari</strong> → <strong>Мікрофон</strong> → виберіть <strong>«Дозволити»</strong>.
                      </li>
                      <li>
                        <strong>Параметри iPhone</strong> → <strong>Загальні</strong> → <strong>Клавіатура</strong> → увімкніть тумблер <strong>«Диктовка»</strong> (Siri & Dictation).
                      </li>
                      <li>
                        Поверніться у браузер, оновіть сторінку і натисніть кнопку вище!
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {speechState === 'error' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-rose-600 font-semibold mb-0.5 text-xs sm:text-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Помилка розпізнавання</span>
                </div>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  {errorMessage || 'Не вдалося розпізнати. Спробуйте ще раз.'}
                </p>
                <button
                  type="button"
                  onClick={handleUserTriggeredStart}
                  className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Спробувати ще раз</span>
                </button>
              </div>
            )}

            {speechState === 'unsupported' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-0.5 text-xs sm:text-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Голосовий пошук обмежено</span>
                </div>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Quick Fallback Text Input inside modal if user prefers typing */}
          {(speechState === 'permission_denied' || speechState === 'error' || speechState === 'unsupported') && (
            <div className="w-full mb-3 bg-slate-50 rounded-2xl p-2.5 border border-slate-200 text-left animate-in fade-in">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Або введіть товар вручну прямо тут:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Наприклад: кабель, розетка..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleEmitResult(manualText)}
                  disabled={!manualText.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Знайти
                </button>
              </div>
            </div>
          )}

          {/* Instant Matches Preview */}
          {matchedProducts.length > 0 && (
            <div className="w-full mb-3 text-left bg-slate-50 rounded-2xl p-2.5 border border-slate-100 animate-in fade-in">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1 tracking-wider">
                Знайдено в каталозі:
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
          {interimText && (
            <button
              type="button"
              onClick={() => handleEmitResult(interimText)}
              className="mb-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Знайти «{interimText}»</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          {/* Popular Hints / Examples at bottom */}
          <div className="mt-auto pt-3 border-t border-slate-100 w-full text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Швидкий вибір товару:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto pr-0.5">
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
    </div>
  );
};
