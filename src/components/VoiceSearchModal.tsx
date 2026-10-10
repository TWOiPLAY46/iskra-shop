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
  const [isHolding, setIsHolding] = useState(false);
  const [isSoundActive, setIsSoundActive] = useState(false);

  const isHoldingRef = useRef(false);
  const pressStartTimeRef = useRef<number>(0);
  const isAwaitingFinalRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const releaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTapModeActiveRef = useRef(false);

  // Popular Ukrainian store hint chips
  const popularHints = useMemo(
    () => [
      'Кабель ВВГнг',
      'Реле напруги ZUBR',
      'Вимикач Schneider',
      'Розетка з заземленням',
      'Автомат 16А',
      'LED лампа E27',
      'Змішувач для кухні',
      'Болгарка DeWalt',
      'Клема WAGO',
    ],
    []
  );

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

  // Submit recognized or selected query
  const handleEmitResult = useCallback(
    (query: string) => {
      const cleanText = query.replace(/[.,!?]+$/, '').trim();
      if (!cleanText) return;

      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }
      isHoldingRef.current = false;
      isTapModeActiveRef.current = false;
      isAwaitingFinalRef.current = false;
      setIsHolding(false);
      setIsSoundActive(false);

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
    },
    [onClose, onSearch, onTranscript]
  );

  /**
   * Internal starter for Speech Recognition
   */
  const startRecognitionEngine = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      isHoldingRef.current = false;
      isTapModeActiveRef.current = false;
      setIsHolding(false);
      setSpeechState('unsupported');
      setErrorMessage(
        'Ваш браузер не підтримує розпізнавання голосу. Скористайтеся полем нижче.'
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
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'uk-UA';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setSpeechState('listening');
        setErrorMessage('');
      };

      recognition.onaudiostart = () => {
        setIsSoundActive(true);
      };

      recognition.onsoundstart = () => {
        setIsSoundActive(true);
      };

      recognition.onspeechstart = () => {
        setIsSoundActive(true);
      };

      recognition.onspeechend = () => {
        setIsSoundActive(false);
      };

      recognition.onsoundend = () => {
        setIsSoundActive(false);
      };

      recognition.onaudioend = () => {
        setIsSoundActive(false);
      };

      recognition.onresult = (event: any) => {
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

          // If the user had released button and was awaiting final transcript
          if (isAwaitingFinalRef.current) {
            handleEmitResult(trimmed);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsSoundActive(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isHoldingRef.current = false;
          isTapModeActiveRef.current = false;
          setIsHolding(false);
          setSpeechState('permission_denied');
          setErrorMessage('Доступ до мікрофона заблоковано або очікує дозволу. Натисніть «Разрешить» у вікні.');
        } else if (event.error === 'no-speech') {
          // Keep waiting
        } else if (event.error === 'aborted') {
          // Normal abort
        } else {
          setErrorMessage(`Помилка розпізнавання: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsSoundActive(false);
        // If user is still holding or in continuous tap mode, keep listening
        if (isHoldingRef.current || isTapModeActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        } else if (isAwaitingFinalRef.current) {
          const candidate = (latestTranscriptRef.current || interimText).trim();
          if (candidate) {
            handleEmitResult(candidate);
          } else {
            setSpeechState('idle');
            setErrorMessage('Нічого не почуто. Затисніть кнопку, чітко скажіть (наприклад «кабель») і відпустіть.');
          }
          isAwaitingFinalRef.current = false;
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      isHoldingRef.current = false;
      isTapModeActiveRef.current = false;
      setIsHolding(false);
      setIsSoundActive(false);
      if (err.name === 'NotAllowedError') {
        setSpeechState('permission_denied');
      } else {
        setSpeechState('error');
        setErrorMessage('Не вдалося запустити мікрофон. Надайте дозвіл або введіть запит нижче.');
      }
    }
  }, [handleEmitResult, interimText]);

  /**
   * PUSH-TO-TALK / TOUCH START
   */
  const handlePressStart = useCallback(() => {
    if (releaseTimeoutRef.current) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }

    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = true;
    isAwaitingFinalRef.current = false;
    setIsHolding(true);
    setSpeechState('listening');
    latestTranscriptRef.current = '';
    setInterimText('');
    setErrorMessage('');

    startRecognitionEngine();
  }, [startRecognitionEngine]);

  /**
   * PUSH-TO-TALK / TOUCH END
   */
  const handlePressEnd = useCallback(() => {
    const pressDuration = Date.now() - pressStartTimeRef.current;

    // Check if user did a quick tap (< 250ms) instead of holding
    if (pressDuration < 250 && !isTapModeActiveRef.current && speechState === 'listening') {
      // Toggle into Tap-to-Talk mode so user doesn't lose speech on quick tap
      isTapModeActiveRef.current = true;
      setIsHolding(false);
      isHoldingRef.current = false;
      return;
    }

    // If it was already in Tap-to-Talk mode and tapped again: stop and submit
    if (isTapModeActiveRef.current) {
      isTapModeActiveRef.current = false;
    }

    if (!isHoldingRef.current && !isTapModeActiveRef.current) return;

    isHoldingRef.current = false;
    setIsHolding(false);
    setIsSoundActive(false);

    const currentText = (latestTranscriptRef.current || interimText).trim();

    // Signal engine to stop capturing more speech
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    if (currentText) {
      setSpeechState('processing');
      releaseTimeoutRef.current = setTimeout(() => {
        handleEmitResult(currentText);
      }, 250);
    } else {
      // Give engine a moment (600ms) to deliver speech buffered right before release
      setSpeechState('processing');
      isAwaitingFinalRef.current = true;

      releaseTimeoutRef.current = setTimeout(() => {
        if (isAwaitingFinalRef.current) {
          isAwaitingFinalRef.current = false;
          const candidate = (latestTranscriptRef.current || interimText).trim();
          if (candidate) {
            handleEmitResult(candidate);
          } else {
            setSpeechState('idle');
            setErrorMessage('Нічого не почуто. Затисніть кнопку, скажіть товар (наприклад «кабель») і відпустіть.');
          }
        }
      }, 650);
    }
  }, [handleEmitResult, interimText, speechState]);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen) {
      isHoldingRef.current = false;
      isTapModeActiveRef.current = false;
      isAwaitingFinalRef.current = false;
      setIsHolding(false);
      setIsSoundActive(false);
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      setSpeechState('idle');
      setInterimText('');
      setManualText('');
      setErrorMessage('');
    }
    return () => {
      isHoldingRef.current = false;
      isTapModeActiveRef.current = false;
      isAwaitingFinalRef.current = false;
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isOpen]);

  // Global safety release
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isHoldingRef.current) {
        handlePressEnd();
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, [handlePressEnd]);

  // Spacebar push-to-talk on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Enter') {
        if (interimText.trim()) {
          handleEmitResult(interimText);
        } else if (manualText.trim()) {
          handleEmitResult(manualText);
        }
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isInputActive) {
        e.preventDefault();
        handlePressStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.code === 'Space' && !isInputActive) {
        e.preventDefault();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleEmitResult, handlePressEnd, handlePressStart, interimText, isOpen, manualText, onClose]);

  if (!isOpen) return null;

  const isRecording = isHolding || isTapModeActiveRef.current || speechState === 'listening';

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
          
          {/* Main Push-to-Talk Instruction Badge */}
          <div
            className={`mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isRecording
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span>
              {isRecording
                ? '🔴 Запис іде! Говоріть... (відпустіть для пошуку)'
                : 'Затисніть кнопку, скажіть товар і відпустіть'}
            </span>
          </div>

          {/* Large Push-to-Talk Button */}
          <div className="my-2 sm:my-3 relative flex items-center justify-center shrink-0">
            {/* Animated Radar Pulse Rings while recording */}
            {isRecording && (
              <>
                <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-rose-400/20 animate-ping opacity-75 pointer-events-none" />
                <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-rose-500/10 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                } catch (err) {
                  // ignore
                }
                handlePressStart();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch (err) {
                  // ignore
                }
                handlePressEnd();
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch (err) {
                  // ignore
                }
                handlePressEnd();
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 relative z-10 cursor-pointer shadow-xl select-none touch-none ${
                isRecording
                  ? 'border-rose-400 bg-rose-600 text-white scale-110 shadow-rose-500/40 ring-8 ring-rose-500/20 active:scale-105'
                  : speechState === 'processing'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-500/25 scale-105'
                  : speechState === 'permission_denied'
                  ? 'border-amber-300 bg-amber-50 text-amber-600 shadow-amber-500/20'
                  : 'border-emerald-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-600/30 hover:scale-105'
              }`}
              title="Затисніть для запису, відпустіть для пошуку"
            >
              {isRecording ? (
                <>
                  <Mic className="w-10 h-10 sm:w-11 sm:h-11 animate-pulse" strokeWidth={2.4} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-white">
                    Запис...
                  </span>
                </>
              ) : speechState === 'processing' ? (
                <>
                  <Sparkles className="w-9 h-9 sm:w-10 sm:h-10 animate-spin text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 mt-0.5">Шукаємо...</span>
                </>
              ) : speechState === 'permission_denied' ? (
                <>
                  <MicOff className="w-9 h-9 sm:w-10 sm:h-10 text-amber-600" />
                  <span className="text-[9px] font-bold text-amber-700 mt-0.5">Дозвіл</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 sm:w-11 sm:h-11" strokeWidth={2.4} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-emerald-50">
                    Затисніть
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sound Waves equalizer visualization while recording */}
          {isRecording && (
            <div className="flex items-center gap-1 mb-2 px-3 py-1 bg-rose-50 rounded-full border border-rose-200 animate-in fade-in">
              <span className="text-[10px] font-bold text-rose-700 mr-1">Мікрофон активний:</span>
              <div className="flex items-center gap-0.5 h-3">
                <span className={`w-1 bg-rose-500 rounded-full animate-bounce ${isSoundActive ? 'h-3' : 'h-1.5'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-1 bg-rose-500 rounded-full animate-bounce ${isSoundActive ? 'h-4' : 'h-2'}`} style={{ animationDelay: '150ms' }} />
                <span className={`w-1 bg-rose-500 rounded-full animate-bounce ${isSoundActive ? 'h-2.5' : 'h-1.5'}`} style={{ animationDelay: '75ms' }} />
                <span className={`w-1 bg-rose-500 rounded-full animate-bounce ${isSoundActive ? 'h-3.5' : 'h-2'}`} style={{ animationDelay: '200ms' }} />
                <span className={`w-1 bg-rose-500 rounded-full animate-bounce ${isSoundActive ? 'h-2' : 'h-1'}`} style={{ animationDelay: '100ms' }} />
              </div>
            </div>
          )}

          {/* Status & Spoken Text */}
          <div className="w-full flex flex-col items-center justify-center mb-3">
            {isRecording ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    Слухаємо! Говоріть...
                  </span>
                </div>
                {interimText ? (
                  <p className="text-base sm:text-lg font-bold text-emerald-700 break-words px-3 py-1.5 bg-emerald-50/90 rounded-xl border border-emerald-300 mt-1 shadow-sm animate-in zoom-in-95">
                    «{interimText}»
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">
                    (наприклад, скажіть «кабель» або «реле напруги»)
                  </p>
                )}
              </div>
            ) : speechState === 'processing' ? (
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Шукаємо «{interimText || latestTranscriptRef.current}»...</span>
              </div>
            ) : speechState === 'permission_denied' ? (
              <div className="w-full flex flex-col items-center p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="inline-flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Потрібен дозвіл на мікрофон</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed mb-2">
                  Натисніть <b>«Разрешить»</b> у спливаючому вікні Safari/iOS, а потім затисніть кнопку мікрофона знову.
                </p>
                <button
                  type="button"
                  onClick={handlePressStart}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                  Спробувати ще раз
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {interimText ? `Останній запит: «${interimText}»` : 'Затисніть кнопку і говоріть'}
                </h3>
                <p className="text-xs text-slate-500">
                  {errorMessage || 'Коли закінчите фразу — просто відпустіть палець чи мишку'}
                </p>
              </div>
            )}
          </div>

          {/* Spacebar Tip for PC */}
          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 mb-2 font-medium">
            <Keyboard className="w-3 h-3 text-slate-400" />
            <span>На ПК: можна затиснути <b>Пробіл (Space)</b></span>
          </div>

          {/* Quick Fallback Text Input inside modal */}
          <div className="w-full mb-3 bg-slate-50 rounded-2xl p-2.5 border border-slate-200 text-left">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Або введіть товар вручну:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
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

          {/* Action Button: Search Recognized Text Now if still idle */}
          {interimText && !isRecording && speechState !== 'processing' && (
            <button
              type="button"
              onClick={() => handleEmitResult(interimText)}
              className="mb-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Шукати «{interimText}»</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          {/* Popular Hints / Examples at bottom */}
          <div className="mt-auto pt-3 border-t border-slate-100 w-full text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Швидкий вибір товару в один клік:</span>
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
