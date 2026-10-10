/**
 * Belezia Salon - Spin-the-Wheel Audio Effects Manager
 * High-performance Web Audio API with auto-unlocking for mobile browsers (Chrome / Safari / Firefox on Android & iOS).
 * Ensures crisp, audible sound on phone micro-speakers, tablets, and desktop.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

// HTML5 Audio pool for rock-solid fallback on devices that restrict Web Audio
const TICK_AUDIO_COUNT = 4;
let tickAudioPool: HTMLAudioElement[] = [];
let tickAudioIdx = 0;
let winAudioFallback: HTMLAudioElement | null = null;

function initHtml5Audio() {
  if (typeof window === "undefined") return;
  if (tickAudioPool.length === 0) {
    for (let i = 0; i < TICK_AUDIO_COUNT; i++) {
      try {
        const a = new Audio("/sounds/tick.wav");
        a.volume = 0.9;
        tickAudioPool.push(a);
      } catch {
        // ignore
      }
    }
  }
  if (!winAudioFallback) {
    try {
      winAudioFallback = new Audio("/sounds/win.wav");
      winAudioFallback.volume = 0.95;
    } catch {
      // ignore
    }
  }
}

// Initialize or resume AudioContext
export function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  } catch (e) {
    console.warn("Web Audio API not supported:", e);
  }
  return audioCtx;
}

/**
 * Synchronously unlock Web Audio engine and HTML5 audio on any touch / pointer gesture.
 * Mobile Chrome & iOS Safari require resume() + silent buffer during a direct user activation.
 */
export function unlockAudio(): AudioContext | null {
  initHtml5Audio();
  const ctx = getOrCreateAudioContext();
  if (!ctx) return null;

  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Play a tiny silent 1-sample buffer synchronously to activate phone speaker hardware
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (err) {
    console.warn("Audio unlock warning:", err);
  }
  return ctx;
}

export function initAudioContext(): AudioContext | null {
  return unlockAudio();
}

// Auto-register touch/click unlock listeners on page load
if (typeof window !== "undefined") {
  const unlockEvents = [
    "touchstart",
    "touchend",
    "pointerdown",
    "mousedown",
    "click",
    "keydown",
  ];
  const handleUserInteraction = () => {
    unlockAudio();
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleUserInteraction, {
      passive: true,
      once: true,
    })
  );
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
 * Play punchy mechanical peg/flapper tick as wheel rotates.
 * Tuned with high harmonics & dual oscillators to be clearly audible on mobile phone speakers.
 */
export function playTickSound(pitchMultiplier: number = 1.0): void {
  if (isMuted) return;
  const ctx = getOrCreateAudioContext();

  if (ctx && ctx.state !== "closed") {
    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // 1. Primary mechanical flapper body (audible mid-frequency punch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(950 * pitchMultiplier, now);
      osc1.frequency.exponentialRampToValueAtTime(260, now + 0.045);

      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.045);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.05);

      // 2. High-frequency click transient (sharp, high-pitch pop that pierces mobile speakers)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = "square";
      osc2.frequency.setValueAtTime(2600 * pitchMultiplier, now);
      osc2.frequency.exponentialRampToValueAtTime(800, now + 0.02);

      gain2.gain.setValueAtTime(0.5, now);
      gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.02);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now);
      osc2.stop(now + 0.025);

      return;
    } catch {
      // Fallback to HTML5 audio below
    }
  }

  // HTML5 audio fallback
  try {
    if (tickAudioPool.length > 0) {
      const audio = tickAudioPool[tickAudioIdx % tickAudioPool.length];
      tickAudioIdx++;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch {
    // Silent fail
  }
}

/**
 * Play victorious celebration fanfare and winning chime chords.
 * Rich harmonics tuned for maximum clarity and excitement on mobile devices.
 */
export function playWinFanfare(): void {
  if (isMuted) return;
  const ctx = getOrCreateAudioContext();

  let webAudioSucceeded = false;
  if (ctx && ctx.state !== "closed") {
    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Celebratory chord progression: C5 -> E5 -> G5 -> C6 with sparkles
      const chords = [
        { time: 0.0, freq: 523.25, type: "triangle", gain: 0.7 },   // C5
        { time: 0.12, freq: 659.25, type: "sine", gain: 0.7 },      // E5
        { time: 0.24, freq: 783.99, type: "triangle", gain: 0.75 }, // G5
        { time: 0.38, freq: 1046.5, type: "sine", gain: 0.8 },      // C6
        { time: 0.42, freq: 1318.51, type: "sine", gain: 0.65 },    // E6
        { time: 0.60, freq: 1567.98, type: "triangle", gain: 0.7 },  // G6 sparkle
        { time: 0.75, freq: 2093.0, type: "sine", gain: 0.6 },      // C7 high chime
      ];

      chords.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = n.type as OscillatorType;
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        const startTime = now + n.time;
        gain.gain.setValueAtTime(0.0, startTime);
        gain.gain.linearRampToValueAtTime(n.gain, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.95);
      });

      webAudioSucceeded = true;
    } catch {
      webAudioSucceeded = false;
    }
  }

  // Backup / supplemental celebratory sound
  if (!webAudioSucceeded && winAudioFallback) {
    try {
      winAudioFallback.currentTime = 0;
      winAudioFallback.play().catch(() => {});
    } catch {
      // Silent fail
    }
  }
}

/**
 * Play sleek unlock click when verification is completed
 */
export function playUnlockSound(): void {
  if (isMuted) return;
  const ctx = getOrCreateAudioContext();
  if (ctx && ctx.state !== "closed") {
    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      gain.gain.setValueAtTime(0.5, now);
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
