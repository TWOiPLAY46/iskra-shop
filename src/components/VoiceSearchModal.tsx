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

  const selectedLangRef = useRef(selectedLang);
  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

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
      recognition.lang = selectedLangRef.current;
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

        // If modal is still open, restart listening automatically without flickering
        try {
          recognition.start();
        } catch (e) {
          // ignore
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      setSpeechState('error');
      setErrorMessage('Не вдалося запустити мікрофон. Спробуйте ще раз.');
    }
  }, [cleanupRecognition, handleEmitResult, interimText, scheduleAutoSearch]);

  // Automatically start listening when modal opens
  useEffect(() => {
    if (isOpen) {
      setInterimText('');
      setManualText('');
      setErrorMessage('');
      latestTranscriptRef.current = '';
      setSpeechState('listening');

      const t = setTimeout(() => {
        startRecognitionEngine();
      }, 150);

      return () => {
        clearTimeout(t);
        cleanupRecognition();
      };
    } else {
      cleanupRecognition();
      setSpeechState('idle');
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
                selectedLangRef.current = 'uk-UA';
                cleanupRecognition();
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
                selectedLangRef.current = 'ru-RU';
                cleanupRecognition();
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
              speechState === 'permission_denied'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : speechState === 'error'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isListening
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isListening
                  ? 'bg-emerald-500 animate-pulse'
                  : speechState === 'permission_denied'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {speechState === 'permission_denied'
                ? 'Доступ заблоковано'
                : isListening
                ? 'Слухаю... Говоріть назву товару'
                : 'Мікрофон на паузі'}
            </span>
          </div>

          {/* Animated Microphone Icon Pulsing Button */}
          <div className="relative my-3">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping scale-125" />
                <div className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-pulse" />
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
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                isListening
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 ring-4 ring-emerald-100'
                  : 'bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-slate-900/20 hover:from-emerald-600 hover:to-teal-500'
              }`}
              title={isListening ? 'Натисніть, щоб зупинити' : 'Увімкнути мікрофон'}
            >
              {isListening ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : (
                <MicOff className="w-9 h-9 opacity-75" />
              )}
            </button>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="w-full mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium leading-relaxed text-left flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Live Recognized Speech Box */}
          <div className="w-full mb-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left flex items-center justify-between">
              <span>Розпізнаний текст:</span>
              {effectiveText && (
                <button
                  type="button"
                  onClick={() => {
                    setInterimText('');
                    setManualText('');
                    latestTranscriptRef.current = '';
                  }}
                  className="text-slate-400 hover:text-slate-700 text-[10px] lowercase flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> очистити
                </button>
              )}
            </div>

            <div className="min-h-[52px] max-h-24 overflow-y-auto w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium flex items-center justify-center text-center shadow-inner">
              {effectiveText ? (
                <span className="text-emerald-700 font-semibold animate-in fade-in duration-150">
                  {effectiveText}
                </span>
              ) : (
                <span className="text-slate-400 italic text-xs">
                  «Наприклад: Кабель ВВГнг або Автомат 16А»
                </span>
              )}
            </div>
          </div>

          {/* Instant Matched Products Preview */}
          {matchedProducts.length > 0 && (
            <div className="w-full mb-3 text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Знайдено в каталозі (натисніть для вибору):</span>
              </div>
              <div className="space-y-1.5">
                {matchedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleEmitResult(p.name)}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/60 text-slate-800 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <span className="truncate pr-2 font-semibold text-emerald-900">
                      {p.name}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                      {p.price} ₴ <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Button if query exists */}
          {effectiveText && (
            <button
              type="button"
              onClick={() => handleEmitResult(effectiveText)}
              className="w-full mb-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Шукати «{effectiveText}»</span>
            </button>
          )}

          {/* Manual Text Input Fallback */}
          <div className="w-full mb-3">
            <div className="relative">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Або введіть назву товару вручну..."
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Keyboard className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              {manualText && (
                <button
                  type="button"
                  onClick={() => {
                    if (manualText.trim()) handleEmitResult(manualText);
                  }}
                  className="absolute right-2.5 top-2 p-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  title="Знайти"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Popular Search Suggestions (Chips) */}
          <div className="w-full text-left">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span>Швидкі підказки:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularHints.slice(0, 6).map((hint, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmitResult(hint)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent text-slate-600 text-[11px] font-medium transition-all cursor-pointer"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="shrink-0 px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Голосовий движок активний
          </span>
          <button
            type="button"
            onClick={startRecognitionEngine}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Увімкнути мікрофон знову
          </button>
        </div>

      </div>
    </div>
  );
};
