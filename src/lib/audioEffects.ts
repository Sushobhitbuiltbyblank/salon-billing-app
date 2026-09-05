/**
 * Belezia Salon - Spin-the-Wheel Audio Effects Manager
 * Utilizes Web Audio API with fallback to HTML5 Audio.
 * Ensures 100% latency-free, offline audio on iPads, mobile devices, and desktop browsers.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Initialize or resume AudioContext on user interaction
export function initAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked:", e);
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean): void {
  isMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("belezia_spin_muted", muted ? "true" : "false");
  }
}

export function getSoundMuted(): boolean {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("belezia_spin_muted");
    if (saved !== null) {
      isMuted = saved === "true";
    }
  }
  return isMuted;
}

/**
 * Play subtle mechanical peg/flapper tick as wheel rotates
 */
export function playTickSound(pitchMultiplier: number = 1.0): void {
  if (isMuted) return;
  const ctx = initAudioContext();

  if (ctx) {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Mechanical wooden / plastic peg click
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
      return;
    } catch {
      // Fallback below
    }
  }

  // HTML5 audio fallback
  try {
    const audio = new Audio("/sounds/tick.wav");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {
    // Silent fail
  }
}

/**
 * Play victorious celebration fanfare and winning chime chords
 */
export function playWinFanfare(): void {
  if (isMuted) return;
  const ctx = initAudioContext();

  if (ctx) {
    try {
      const now = ctx.currentTime;

      // Celebratory chord progression: C5 -> E5 -> G5 -> C6 with sparkles
      const chords = [
        { time: 0.0, freq: 523.25, type: "sine" },   // C5
        { time: 0.12, freq: 659.25, type: "sine" },  // E5
        { time: 0.24, freq: 783.99, type: "sine" },  // G5
        { time: 0.38, freq: 1046.5, type: "triangle" }, // C6
        { time: 0.42, freq: 1318.51, type: "sine" }, // E6
        { time: 0.60, freq: 1567.98, type: "sine" }, // G6 sparkle
      ];

      chords.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = n.type as OscillatorType;
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        const startTime = now + n.time;
        gain.gain.setValueAtTime(0.0, startTime);
        gain.gain.linearRampToValueAtTime(0.28, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });

      return;
    } catch {
      // Fallback below
    }
  }

  // HTML5 audio fallback
  try {
    const audio = new Audio("/sounds/win.wav");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Silent fail
  }
}

/**
 * Play sleek unlock click when verification is completed
 */
export function playUnlockSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (ctx) {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }
}
