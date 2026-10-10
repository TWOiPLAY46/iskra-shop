import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Search,
  ArrowRight,
  Zap,
  Lock,
  Keyboard,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
  onTranscript?: (transcript: string) => void;
}

type SpeechState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'permission_denied'
  | 'unsupported'
  | 'error';

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onTranscript,
}) => {
  const { products } = useStore();

  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [interimText, setInterimText] = useState('');
  const [manualText, setManualText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSoundActive, setIsSoundActive] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'uk-UA' | 'ru-RU'>('uk-UA');

  const latestTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const autoSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Popular store search suggestions
  const popularHints = useMemo(
    () => [
      'Кабель ВВГнг',
      'Реле напруги ZUBR',
      'Вимикач Schneider',
      'Розетка з заземленням',
      'Автомат 16А',
      'LED лампа E27',
      'Змішувач для кухні',
      'Клема WAGO',
      'Тепла підлога',
    ],
    []
  );

  // Clean recognized text from trailing punctuation
  const sanitizeQuery = (text: string) => {
    return text.replace(/[.,/#!$%^&*;:{}=\-_`~()?]+$/, '').trim();
  };

  // Instant catalog search preview based on current spoken/entered text
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

  // Cleanly stop any active recognition instance and timers
  const cleanupRecognition = useCallback(() => {
    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        r.onstart = null;
        r.onaudiostart = null;
        r.onsoundstart = null;
        r.onspeechstart = null;
        r.onspeechend = null;
        r.onsoundend = null;
        r.onaudioend = null;
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.abort();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Submit recognized or selected query
  const handleEmitResult = useCallback(
    (query: string) => {
      const cleanText = sanitizeQuery(query);
      if (!cleanText) return;

      cleanupRecognition();
      latestTranscriptRef.current = '';
      setIsSoundActive(false);
      setSpeechState('idle');

      if (onTranscript) {
        onTranscript(cleanText);
      }
      if (onSearch) {
        onSearch(cleanText);
      }
      onClose();
    },
    [cleanupRecognition, onClose, onSearch, onTranscript]
  );

  // Trigger auto-search after a short pause once words are recognized
  const scheduleAutoSearch = useCallback(
    (detectedQuery: string) => {
      const clean = sanitizeQuery(detectedQuery);
      if (!clean) return;

      if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);

      autoSearchTimerRef.current = setTimeout(() => {
        handleEmitResult(clean);
      }, 1400);
    },
    [handleEmitResult]
  );

  /**
   * Start Speech Recognition Engine
   */
  const startRecognitionEngine = useCallback(() => {
    cleanupRecognition();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechState('unsupported');
      setErrorMessage(
        'Ваш браузер не підтримує розпізнавання голосу. Скористайтеся рядком введення нижче.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        if (recognitionRef.current === recognition) {
          setSpeechState('listening');
          setErrorMessage('');
        }
      };

      recognition.onaudiostart = () => {
        if (recognitionRef.current === recognition) setIsSoundActive(true);
      };
      recognition.onsoundstart = () => {
        if (recognitionRef.current === recognition) setIsSoundActive(true);
      };
      recognition.onspeechstart = () => {
        if (recognitionRef.current === recognition) setIsSoundActive(true);
      };
      recognition.onspeechend = () => {
        if (recognitionRef.current === recognition) {
          setIsSoundActive(false);
          const current = (latestTranscriptRef.current || interimText).trim();
          if (current) {
            scheduleAutoSearch(current);
          }
        }
      };
      recognition.onsoundend = () => {
        if (recognitionRef.current === recognition) setIsSoundActive(false);
      };
      recognition.onaudioend = () => {
        if (recognitionRef.current === recognition) setIsSoundActive(false);
      };

      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        if (!event.results) return;

        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript + ' ';
          }
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          latestTranscriptRef.current = trimmed;
          setInterimText(trimmed);
          scheduleAutoSearch(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        console.warn('SpeechRecognition error:', event.error);
        setIsSoundActive(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechState('permission_denied');
          setErrorMessage(
            'Доступ до мікрофона заблоковано. Натисніть «Разрешить» у спливаючому вікні браузера.'
          );
        } else if (event.error === 'no-speech') {
          // Ignore no-speech, keep listening
        } else if (event.error === 'aborted') {
          // Normal abort
        } else {
          setErrorMessage(`Помилка розпізнавання: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        setIsSoundActive(false);

        const candidate = (latestTranscriptRef.current || interimText).trim();
        if (candidate) {
          handleEmitResult(candidate);
          return;
        }

        // If modal is still open and not manually closed, restart listening automatically
        if (speechState === 'listening') {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      setSpeechState('error');
      setErrorMessage('Не вдалося запустити мікрофон. Спробуйте ще раз.');
    }
  }, [cleanupRecognition, handleEmitResult, interimText, scheduleAutoSearch, selectedLang, speechState]);

  // Automatically start listening when modal opens
  useEffect(() => {
    if (isOpen) {
      setInterimText('');
      setManualText('');
      setErrorMessage('');
      latestTranscriptRef.current = '';
      setSpeechState('listening');

      // Small delay to let modal render smoothly before starting mic
      const t = setTimeout(() => {
        startRecognitionEngine();
      }, 200);

      return () => {
        clearTimeout(t);
        cleanupRecognition();
      };
    }
  }, [isOpen, startRecognitionEngine, cleanupRecognition]);

  // Keyboard listeners (Escape to close, Enter to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Enter') {
        const query = (interimText || manualText).trim();
        if (query) {
          handleEmitResult(query);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEmitResult, interimText, isOpen, manualText, onClose]);

  if (!isOpen) return null;

  const effectiveText = (interimText || manualText).trim();
  const isListening = speechState === 'listening';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 select-none"
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
        <div className="relative shrink-0 pt-3.5 px-4 sm:px-5 pb-2.5 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-sm z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            <span>Голосовий пошук ISKRA</span>
          </div>

          {/* Language selector toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full text-[10px] font-bold">
            <button
              type="button"
              onClick={() => {
                setSelectedLang('uk-UA');
                setTimeout(startRecognitionEngine, 100);
              }}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                selectedLang === 'uk-UA'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇺🇦 UA
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedLang('ru-RU');
                setTimeout(startRecognitionEngine, 100);
              }}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                selectedLang === 'ru-RU'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🌐 RU
            </button>
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col items-center text-center">
          
          {/* Main Status Instruction Badge */}
          <div
            className={`mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isListening
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs animate-pulse'
                : effectiveText
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isListening ? 'bg-rose-500 animate-ping' : effectiveText ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span>
              {isListening
                ? '🔴 Мікрофон слухає... Говоріть чітко'
                : effectiveText
                ? `Знайдено: «${effectiveText}»`
                : 'Натисніть мікрофон, щоб почати'}
            </span>
          </div>

          {/* Large Interactive Microphone Button */}
          <div className="my-2 relative flex items-center justify-center shrink-0">
            {isListening && (
              <>
                <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-rose-400/25 animate-ping opacity-75 pointer-events-none" />
                <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-rose-500/15 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  cleanupRecognition();
                  setSpeechState('idle');
                } else {
                  startRecognitionEngine();
                }
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 relative z-10 cursor-pointer shadow-xl select-none ${
                isListening
                  ? 'border-rose-400 bg-rose-600 text-white scale-105 shadow-rose-500/40 ring-6 ring-rose-500/20 active:scale-95'
                  : speechState === 'permission_denied'
                  ? 'border-amber-300 bg-amber-50 text-amber-600 shadow-amber-500/20'
                  : 'border-emerald-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
              }`}
              title="Натисніть щоб увімкнути/вимкнути мікрофон"
            >
              {isListening ? (
                <>
                  <Mic className="w-9 h-9 sm:w-10 sm:h-10 animate-pulse" strokeWidth={2.4} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-white">
                    Слухаю...
                  </span>
                </>
              ) : speechState === 'permission_denied' ? (
                <>
                  <MicOff className="w-8 h-8 sm:w-9 sm:h-9 text-amber-600" />
                  <span className="text-[9px] font-bold text-amber-700 mt-0.5">Дозвіл</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={2.4} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-emerald-50">
                    Увімкнути
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sound Waves equalizer visualization while listening */}
          {isListening && (
            <div className="flex items-center gap-1.5 mb-2 px-3 py-1 bg-rose-50 rounded-full border border-rose-200 animate-in fade-in">
              <span className="text-[10px] font-bold text-rose-700">Запис активний:</span>
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-rose-600 rounded-full animate-bounce" />
                <span className="w-1 h-2 bg-rose-400 rounded-full animate-pulse" />
                <span className="w-1 h-3.5 bg-rose-600 rounded-full animate-bounce" />
                <span className="w-1 h-2 bg-rose-500 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Live Recognized Spoken Text Bubble */}
          <div className="w-full flex flex-col items-center justify-center mb-2.5 min-h-[46px]">
            {effectiveText ? (
              <div className="w-full space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Розпізнано:</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-300 shadow-xs">
                  <p className="text-base sm:text-lg font-black text-emerald-900 break-words">
                    «{effectiveText}»
                  </p>
                </div>

                {/* Instant Search Button for recognized text */}
                <button
                  type="button"
                  onClick={() => handleEmitResult(effectiveText)}
                  className="w-full mt-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 animate-in zoom-in-95"
                >
                  <Search className="w-4 h-4" />
                  <span>Шукати «{effectiveText}» зараз</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            ) : isListening ? (
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Говоріть назву товару...
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  наприклад: «кабель ВВГ» або «автомат 16 ампер»
                </p>
              </div>
            ) : speechState === 'permission_denied' ? (
              <div className="w-full flex flex-col items-center p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-left">
                <div className="inline-flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Потрібен дозвіл на мікрофон</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed mb-2">
                  У спливаючому вікні Safari чи Chrome натисніть <b>«Разрешить» (Дозволити)</b>.
                </p>
                <button
                  type="button"
                  onClick={startRecognitionEngine}
                  className="self-center px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Спробувати знову
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {errorMessage && (
                  <p className="text-xs text-rose-600 font-medium mb-1">{errorMessage}</p>
                )}
                <button
                  type="button"
                  onClick={startRecognitionEngine}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Увімкнути мікрофон знову</span>
                </button>
              </div>
            )}
          </div>

          {/* Instant Matches Preview from Store Catalog */}
          {matchedProducts.length > 0 && (
            <div className="w-full mb-2.5 text-left bg-slate-50 rounded-2xl p-2.5 border border-slate-100 animate-in fade-in">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1 tracking-wider">
                Знайдено в каталозі ISKRA:
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

          {/* Quick Fallback Text Input inside modal */}
          <div className="w-full mb-2.5 bg-slate-50 rounded-2xl p-2.5 border border-slate-200 text-left">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Або введіть товар вручну:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualText.trim()) {
                    handleEmitResult(manualText);
                  }
                }}
                placeholder="Наприклад: кабель ВВГ, вимикач..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleEmitResult(manualText)}
                disabled={!manualText.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
              >
                Знайти
              </button>
            </div>
          </div>

          {/* Popular Hints / Quick 1-click examples at bottom */}
          <div className="mt-auto pt-2.5 border-t border-slate-100 w-full text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Швидкий пошук в 1 клік:</span>
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
