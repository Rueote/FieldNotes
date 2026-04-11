import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'fieldnotes-usage-seconds';

function loadSeconds(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
  } catch { return 0; }
}

function saveSeconds(s: number) {
  try { localStorage.setItem(STORAGE_KEY, String(s)); } catch {}
}

export function formatUsageTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useUsageTime() {
  const [totalSeconds, setTotalSeconds] = useState<number>(loadSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accRef = useRef<number>(loadSeconds());

  useEffect(() => {
    let ticks = 0;
    intervalRef.current = setInterval(() => {
      accRef.current += 1;
      ticks++;
      setTotalSeconds(accRef.current);
      if (ticks % 10 === 0) saveSeconds(accRef.current);
    }, 1000);

    const onUnload = () => saveSeconds(accRef.current);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', onUnload);
      saveSeconds(accRef.current);
    };
  }, []);

  const reset = () => {
    accRef.current = 0;
    setTotalSeconds(0);
    saveSeconds(0);
  };

  return { totalSeconds, reset };
}
