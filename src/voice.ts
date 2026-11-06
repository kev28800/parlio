import { useEffect, useRef, useState } from "react";
import { wordLengthAt, type SpeechCue } from "./pipSpeech";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const microphoneError = (code: string) =>
  ({
    "not-allowed":
      "L’accès au micro a été refusé. Vous pouvez modifier l’autorisation dans votre navigateur ou utiliser le clavier.",
    "service-not-allowed":
      "Le service de dictée n’est pas autorisé dans ce navigateur. Utilisez le clavier.",
    "audio-capture":
      "Aucun micro utilisable n’a été trouvé. Vérifiez votre appareil ou utilisez le clavier.",
    "no-speech":
      "Aucune parole n’a été transcrite. Réessayez ou utilisez le clavier.",
    network:
      "Le service vocal du navigateur est indisponible. Vérifiez la connexion ou utilisez le clavier.",
    "language-not-supported":
      "La dictée dans cette langue n’est pas disponible. Vous pouvez utiliser le clavier.",
  })[code] ??
  "La dictée s’est interrompue. Vous pouvez réessayer ou utiliser le clavier.";

export function useBrowserVoice(
  locale: string,
  sound: boolean,
  onTranscript: (text: string) => void,
) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [canDictate, setCanDictate] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speech = useRef<SpeechCue | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;
  function abortRecognition() {
    const current = recognition.current;
    recognition.current = null;
    if (timer.current) clearTimeout(timer.current);
    if (current) {
      current.onstart =
        current.onresult =
        current.onerror =
        current.onend =
          null;
      try {
        current.abort();
      } catch {
        /* Session déjà arrêtée. */
      }
    }
  }
  function stopAudio() {
    if (utterance.current) {
      utterance.current.onstart =
        utterance.current.onend =
        utterance.current.onerror =
        utterance.current.onboundary =
        utterance.current.onpause =
        utterance.current.onresume =
          null;
    }
    speech.current = null;
    utterance.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  function stop() {
    abortRecognition();
    stopAudio();
    setRecording(false);
    setRequesting(false);
    setSpeaking(false);
    setInterim("");
  }
  useEffect(() => {
    const browser = window as SpeechWindow;
    setCanDictate(
      Boolean(
        window.isSecureContext &&
          (browser.SpeechRecognition || browser.webkitSpeechRecognition),
      ),
    );
    const updateVoices = () =>
      setVoices(
        "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [],
      );
    updateVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", updateVoices);
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => {
      abortRecognition();
      stopAudio();
      window.speechSynthesis?.removeEventListener(
        "voiceschanged",
        updateVoices,
      );
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stop);
    };
  }, [locale]);
  useEffect(() => {
    if (!sound) {
      stopAudio();
      setSpeaking(false);
    }
  }, [sound]);
  const language = locale.split("-")[0];
  const voice =
    voices.find((entry) => entry.lang.toLowerCase() === locale.toLowerCase()) ??
    voices.find((entry) => entry.lang.toLowerCase().startsWith(language));
  const canSpeak = Boolean(sound && voice);
  function speak(text: string) {
    stop();
    setError("");
    if (!sound) {
      setError(
        "L’audio est désactivé dans votre profil. Le texte reste disponible.",
      );
      return;
    }
    if (!voice || !("speechSynthesis" in window)) {
      setError(
        "Aucune voix adaptée n’est disponible sur cet appareil. Vous pouvez lire la phrase.",
      );
      return;
    }
    const current = new SpeechSynthesisUtterance(text.slice(0, 1800));
    utterance.current = current;
    current.lang = locale;
    current.voice = voice;
    current.rate = 0.85;
    current.onstart = () => {
      if (utterance.current !== current) return;
      const now = performance.now();
      speech.current = {
        text: current.text,
        startedAt: now,
        boundaryAt: now,
        charIndex: 0,
        wordLength: current.text.length,
        hasBoundaries: false,
        paused: false,
      };
      setSpeaking(true);
    };
    current.onboundary = (event) => {
      if (
        utterance.current !== current ||
        !speech.current ||
        event.name !== "word" ||
        !Number.isFinite(event.charIndex)
      )
        return;
      const index = Math.max(
        0,
        Math.min(current.text.length - 1, event.charIndex),
      );
      speech.current.charIndex = index;
      speech.current.hasBoundaries = true;
      speech.current.wordLength = wordLengthAt(current.text, index);
      speech.current.boundaryAt = performance.now();
    };
    current.onpause = () => {
      if (utterance.current === current && speech.current) {
        speech.current.paused = true;
        setSpeaking(false);
      }
    };
    current.onresume = () => {
      if (utterance.current === current && speech.current) {
        speech.current.paused = false;
        speech.current.boundaryAt = performance.now();
        setSpeaking(true);
      }
    };
    current.onend = () => {
      if (utterance.current === current) {
        speech.current = null;
        setSpeaking(false);
        utterance.current = null;
      }
    };
    current.onerror = () => {
      if (utterance.current === current) {
        speech.current = null;
        setSpeaking(false);
        utterance.current = null;
        setError("La lecture a échoué. Le texte vous permet de continuer.");
      }
    };
    try {
      window.speechSynthesis.speak(current);
    } catch {
      speech.current = null;
      utterance.current = null;
      setSpeaking(false);
      setError("La lecture a échoué. Le texte vous permet de continuer.");
    }
  }
  function startDictation() {
    if (!canDictate || recognition.current) return;
    stopAudio();
    setSpeaking(false);
    setError("");
    setInterim("");
    const browser = window as SpeechWindow;
    const Constructor =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) return;
    const current = new Constructor();
    recognition.current = current;
    current.lang = locale;
    current.continuous = false;
    current.interimResults = true;
    current.maxAlternatives = 1;
    let finalText = "";
    let failed = false;
    const active = () => recognition.current === current;
    current.onstart = () => {
      if (active()) {
        setRequesting(false);
        setRecording(true);
      }
    };
    current.onresult = (event) => {
      if (!active()) return;
      const results = Array.from(event.results);
      finalText = results
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim()
        .slice(0, 1200);
      setInterim(
        results
          .filter((r) => !r.isFinal)
          .map((r) => r[0].transcript)
          .join(" ")
          .slice(0, 1200),
      );
      if (finalText) transcriptCallback.current(finalText);
    };
    current.onerror = (event) => {
      if (active()) {
        failed = true;
        abortRecognition();
        setError(microphoneError(event.error));
        setRecording(false);
        setRequesting(false);
        setInterim("");
      }
    };
    current.onend = () => {
      if (!active()) return;
      recognition.current = null;
      if (timer.current) clearTimeout(timer.current);
      setRecording(false);
      setRequesting(false);
      setInterim("");
      if (!finalText && !failed)
        setError(
          "Aucune parole n’a été transcrite. Réessayez ou utilisez le clavier.",
        );
    };
    setRequesting(true);
    try {
      current.start();
      timer.current = setTimeout(() => {
        if (active()) {
          stop();
          setError(
            "La dictée est limitée à 20 secondes. Relisez votre texte ou recommencez.",
          );
        }
      }, 20000);
    } catch {
      recognition.current = null;
      setRequesting(false);
      setError(
        "Le micro n’a pas pu démarrer. Vous pouvez utiliser le clavier.",
      );
    }
  }
  function finishDictation() {
    try {
      recognition.current?.stop();
    } catch {
      stop();
    }
  }
  return {
    canSpeak,
    canDictate,
    speaking,
    speech,
    recording,
    requesting,
    interim,
    error,
    stop,
    speak,
    startDictation,
    finishDictation,
  };
}
