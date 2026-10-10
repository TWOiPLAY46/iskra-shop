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
  Globe,
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
  const [selectedLang, setSelectedLang] = useState<'uk-UA' | 'ru-RU'>('uk-UA');
  const [autoSearchCountdown, setAutoSearchCountdown] = useState<number | null>(null);

  const isHoldingRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const isAwaitingFinalRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const releaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSearchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Popular Ukrainian electrical & plumbing store search suggestions
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
    if (releaseTimeoutRef.current) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoSearchCountdown(null);

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
      isHoldingRef.current = false;
      isAwaitingFinalRef.current = false;
      latestTranscriptRef.current = '';
      setIsHolding(false);
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

  // Trigger auto-search countdown when words are recognized
  const scheduleAutoSearch = useCallback(
    (detectedQuery: string) => {
      const clean = sanitizeQuery(detectedQuery);
      if (!clean) return;

      if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      setAutoSearchCountdown(1);

      autoSearchTimerRef.current = setTimeout(() => {
        handleEmitResult(clean);
      }, 1200);
    },
    [handleEmitResult]
  );

  /**
   * Internal starter for Speech Recognition
   */
  const startRecognitionEngine = useCallback(() => {
    cleanupRecognition();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      isHoldingRef.current = false;
      setIsHolding(false);
      setSpeechState('unsupported');
      setErrorMessage(
        'Ваш браузер не підтримує розпізнавання голосу. Скористайтеся рядком введення нижче.'
      );
      return;
    }

    try {
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // On iOS WebKit, continuous=false is significantly more reliable for search queries
      recognition.continuous = !isIOS;
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
          // If we already have recognized text and user stopped speaking, auto-search
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

          // If the user was holding and already released button
          if (isAwaitingFinalRef.current) {
            handleEmitResult(trimmed);
            return;
          }

          // In tap mode or while listening: schedule quick auto-search
          scheduleAutoSearch(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        console.warn('SpeechRecognition error:', event.error);
        setIsSoundActive(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isHoldingRef.current = false;
          setIsHolding(false);
          setSpeechState('permission_denied');
          setErrorMessage(
            'Доступ до мікрофона заблоковано або очікує дозволу. Натисніть «Разрешить» у спливаючому вікні Safari/Chrome.'
          );
        } else if (event.error === 'no-speech') {
          // Keep listening or idle
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

        // If user was awaiting final result after button release:
        if (isAwaitingFinalRef.current) {
          isAwaitingFinalRef.current = false;
          if (candidate) {
            handleEmitResult(candidate);
          } else {
            setSpeechState('idle');
            setErrorMessage('Нічого не почуто. Спробуйте ще раз або виберіть товар нижче.');
          }
          return;
        }

        // If we already have recognized speech, submit it!
        if (candidate) {
          handleEmitResult(candidate);
          return;
        }

        // If user is still holding push-to-talk button, keep listening
        if (isHoldingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        } else {
          setSpeechState('idle');
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      // Fast retry if browser was busy stopping prior instance
      setTimeout(() => {
        if (speechState === 'listening' || isHoldingRef.current) {
          try {
            const retryRec = new SpeechRecognition();
            recognitionRef.current = retryRec;
            retryRec.lang = selectedLang;
            retryRec.interimResults = true;
            retryRec.onstart = () => {
              if (recognitionRef.current === retryRec) setSpeechState('listening');
            };
            retryRec.onresult = (e: any) => {
              if (recognitionRef.current !== retryRec) return;
              let full = '';
              for (let i = 0; i < e.results.length; i++) {
                if (e.results[i] && e.results[i][0]) full += e.results[i][0].transcript + ' ';
              }
              const t = full.trim();
              if (t) {
                latestTranscriptRef.current = t;
                setInterimText(t);
                scheduleAutoSearch(t);
              }
            };
            retryRec.start();
          } catch (e2) {
            console.warn('Retry start failed:', e2);
          }
        }
      }, 150);
    }
  }, [cleanupRecognition, handleEmitResult, interimText, scheduleAutoSearch, selectedLang, speechState]);

  /**
   * PUSH-TO-TALK / TAP BUTTON DOWN
   */
  const handlePointerDown = useCallback(() => {
    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = true;
    isAwaitingFinalRef.current = false;
    latestTranscriptRef.current = '';
    setIsHolding(true);
    setSpeechState('listening');
    setInterimText('');
    setErrorMessage('');
    setAutoSearchCountdown(null);

    startRecognitionEngine();
  }, [startRecognitionEngine]);

  /**
   * PUSH-TO-TALK / TAP BUTTON UP
   */
  const handlePointerUp = useCallback(() => {
    const pressDuration = Date.now() - pressStartTimeRef.current;
    isHoldingRef.current = false;
    setIsHolding(false);
    setIsSoundActive(false);

    const currentText = (latestTranscriptRef.current || interimText).trim();

    // CASE 1: Quick Tap (< 300ms)
    // Keep recognition active so user can speak freely without holding!
    if (pressDuration < 300) {
      if (currentText) {
        // If words are already there, search immediately
        handleEmitResult(currentText);
      } else {
        // Stay in listening state! User just tapped to start voice dictation
        setSpeechState('listening');
      }
      return;
    }

    // CASE 2: Hold & Release (Push-to-talk >= 300ms)
    // Signal recognition engine to stop
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    if (currentText) {
      // User held, spoke, and released: SUBMIT IMMEDIATELY!
      setSpeechState('processing');
      handleEmitResult(currentText);
    } else {
      // Allow speech engine up to 1500ms to deliver final recognition
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
            setErrorMessage('Нічого не почуто. Спробуйте ще раз або натисніть товар зі списку.');
          }
        }
      }, 1500);
    }
  }, [handleEmitResult, interimText]);

  // Clean state whenever modal opens or closes
  useEffect(() => {
    cleanupRecognition();
    isHoldingRef.current = false;
    isAwaitingFinalRef.current = false;
    latestTranscriptRef.current = '';
    setIsHolding(false);
    setIsSoundActive(false);
    setSpeechState('idle');
    setInterimText('');
    setManualText('');
    setErrorMessage('');
    setAutoSearchCountdown(null);

    return () => {
      cleanupRecognition();
    };
  }, [isOpen, cleanupRecognition]);

  // Global safety release
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isHoldingRef.current) {
        handlePointerUp();
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
  }, [handlePointerUp]);

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
        const query = (interimText || manualText).trim();
        if (query) {
          handleEmitResult(query);
        }
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isInputActive) {
        e.preventDefault();
        handlePointerDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.code === 'Space' && !isInputActive) {
        e.preventDefault();
        handlePointerUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleEmitResult, handlePointerDown, handlePointerUp, interimText, isOpen, manualText, onClose]);

  if (!isOpen) return null;

  const isRecording = isHolding || speechState === 'listening';
  const effectiveText = (interimText || manualText).trim();

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
                if (isRecording) {
                  cleanupRecognition();
                  setTimeout(startRecognitionEngine, 100);
                }
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
                if (isRecording) {
                  cleanupRecognition();
                  setTimeout(startRecognitionEngine, 100);
                }
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
              isRecording
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs animate-pulse'
                : effectiveText
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-rose-500 animate-ping' : effectiveText ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span>
              {isRecording
                ? '🔴 Говоріть... (пошук почнеться автоматично)'
                : effectiveText
                ? `Знайдено: «${effectiveText}»`
                : 'Натисніть або затисніть кнопку'}
            </span>
          </div>

          {/* Large Push-to-Talk / Tap-to-Talk Button */}
          <div className="my-2 relative flex items-center justify-center shrink-0">
            {/* Animated Radar Pulse Rings while recording */}
            {isRecording && (
              <>
                <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-rose-400/25 animate-ping opacity-75 pointer-events-none" />
                <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-rose-500/15 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                } catch (err) {}
                handlePointerDown();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch (err) {}
                handlePointerUp();
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch (err) {}
                handlePointerUp();
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 relative z-10 cursor-pointer shadow-xl select-none touch-none ${
                isRecording
                  ? 'border-rose-400 bg-rose-600 text-white scale-105 shadow-rose-500/40 ring-6 ring-rose-500/20 active:scale-95'
                  : speechState === 'processing'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-500/25 scale-105'
                  : speechState === 'permission_denied'
                  ? 'border-amber-300 bg-amber-50 text-amber-600 shadow-amber-500/20'
                  : 'border-emerald-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
              }`}
              title="Натисніть або затисніть для пошуку"
            >
              {isRecording ? (
                <>
                  <Mic className="w-9 h-9 sm:w-10 sm:h-10 animate-pulse" strokeWidth={2.4} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-white">
                    Слухаю...
                  </span>
                </>
              ) : speechState === 'processing' ? (
                <>
                  <Sparkles className="w-8 h-8 sm:w-9 sm:h-9 animate-spin text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 mt-0.5">Шукаємо...</span>
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
                    Говорити
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sound Waves equalizer visualization while recording */}
          {isRecording && (
            <div className="flex items-center gap-1.5 mb-2 px-3 py-1 bg-rose-50 rounded-full border border-rose-200 animate-in fade-in">
              <span className="text-[10px] font-bold text-rose-700">Мікрофон слухає:</span>
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
            ) : isRecording ? (
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Говоріть у мікрофон:
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  наприклад: «кабель ВВГ» або «автомат 16 ампер»
                </p>
              </div>
            ) : speechState === 'permission_denied' ? (
              <div className="w-full flex flex-col items-center p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-left">
                <div className="inline-flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Потрібен доступ до мікрофона</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed mb-2">
                  У спливаючому вікні безпеки Safari чи Chrome натисніть <b>«Разрешить» (Дозволити)</b>.
                </p>
                <button
                  type="button"
                  onClick={handlePointerDown}
                  className="self-center px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Спробувати знову
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  {errorMessage ? (
                    <span className="text-rose-600">{errorMessage}</span>
                  ) : (
                    'Натисніть кнопку або затисніть для розмови'
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Працює як рація (затиснув-відпустив) або в один клік
                </p>
              </div>
            )}
          </div>

          {/* Spacebar Tip for PC */}
          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 mb-2 font-medium">
            <Keyboard className="w-3 h-3 text-slate-400" />
            <span>На ПК: можна також натиснути <b>Пробіл (Space)</b></span>
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
