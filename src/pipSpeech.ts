/** The browser exposes word boundaries, not audio samples or phonemes. */
export interface SpeechCue {
  text: string;
  startedAt: number;
  boundaryAt: number;
  charIndex: number;
  wordLength: number;
  hasBoundaries: boolean;
  paused: boolean;
}
export function mouthPose(cue: SpeechCue | null, now: number) {
  if (!cue || cue.paused) return { open: 0, round: 0 };
  const elapsed = Math.max(0, now - cue.boundaryAt);
  const estimated = Math.floor(elapsed / 95);
  // Some voices never emit word events: keep a talking cadence until end/cancel.
  const offset = cue.hasBoundaries
    ? estimated
    : estimated % Math.max(1, cue.wordLength);
  if (offset >= cue.wordLength) return { open: 0, round: 0 };
  // With boundary events, stay in the current word until the next event arrives.
  const index =
    cue.charIndex + Math.min(offset, Math.max(0, cue.wordLength - 1));
  const letter = cue.text[index]?.toLowerCase() ?? "";
  if (!letter || /[\s.,!?;:…mbp]/u.test(letter)) return { open: 0, round: 0 };
  const vowel = /[aàáâäeèéêëiíîïoóôöuúûüy]/u.test(letter);
  const rounded = /[oóôöuúûüw]/u.test(letter);
  const pulse = 0.65 + 0.35 * Math.sin(((elapsed % 95) / 95) * Math.PI);
  return { open: (vowel ? 0.9 : 0.34) * pulse, round: rounded ? 0.8 : 0 };
}
export function wordLengthAt(text: string, index: number) {
  return text.slice(index).match(/^\S+/u)?.[0].length ?? 1;
}
