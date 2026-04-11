import { useCallback, useRef } from 'react';

// All sounds generated via Web Audio API — no audio files required.

function createContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

// Short mechanical click for keystrokes
function playKeyClick(ctx: AudioContext, volume: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.value = volume * 0.35;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// Carriage return thunk — lower, slightly longer
function playReturn(ctx: AudioContext, volume: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.value = volume * 0.5;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// Backspace — slightly softer, higher
function playDelete(ctx: AudioContext, volume: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.035, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  filter.Q.value = 1.0;

  const gain = ctx.createGain();
  gain.gain.value = volume * 0.25;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const STORAGE_KEY = 'fieldnotes-typewriter-enabled';
const VOLUME_KEY  = 'fieldnotes-typewriter-volume';

export function useTypewriterSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const isEnabled = useCallback((): boolean => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }, []);

  const getVolume = useCallback((): number => {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.7');
    return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
  }, []);

  const onKeyPress = useCallback(() => {
    if (!isEnabled()) return;
    try { playKeyClick(getCtx(), getVolume()); } catch {}
  }, [getCtx, isEnabled, getVolume]);

  const onReturn = useCallback(() => {
    if (!isEnabled()) return;
    try { playReturn(getCtx(), getVolume()); } catch {}
  }, [getCtx, isEnabled, getVolume]);

  const onDelete = useCallback(() => {
    if (!isEnabled()) return;
    try { playDelete(getCtx(), getVolume()); } catch {}
  }, [getCtx, isEnabled, getVolume]);

  return { onKeyPress, onReturn, onDelete };
}

// Exported constants so SettingsPanel can use the same keys
export { STORAGE_KEY as TYPEWRITER_STORAGE_KEY, VOLUME_KEY as TYPEWRITER_VOLUME_KEY };
