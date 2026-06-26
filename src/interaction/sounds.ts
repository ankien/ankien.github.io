/**
 * Lightweight procedural tap sounds via the Web Audio API.
 *
 * We synthesize short percussive "taps" instead of shipping audio files so the
 * bundle stays tiny and works offline on GitHub Pages. Each material has a
 * distinct timbre (frequency + decay + noise mix) so glass, wood, metal and
 * plastic feel different when tapped.
 */

export type Material =
  | "glass"
  | "wood"
  | "metal"
  | "plastic"
  | "water"
  | "plush"
  | "key"
  | "leaves";

let ctx: AudioContext | null = null;

// Global mixing controls, driven from the UI.
let muted = false;
let masterVolume = 0.55; // overall SFX level (0..1); intentionally subdued

export function setMuted(v: boolean): void {
  muted = v;
}

export function setVolume(v: number): void {
  masterVolume = Math.min(1, Math.max(0, v));
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture occurs.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface MaterialProfile {
  /** Base frequencies (Hz) layered together for the "ping". */
  partials: number[];
  /** How quickly the tone decays, in seconds. */
  decay: number;
  /** 0..1 amount of filtered noise mixed in (gives wood/plastic their thunk). */
  noise: number;
  /** Master gain for this material. */
  gain: number;
  /** Optional filter for the noise layer (default: resonant bandpass). */
  noiseFilter?: BiquadFilterType;
  /** Filter cutoff/center for the noise (Hz). Defaults to the first partial. */
  noiseFreq?: number;
  /** Filter Q for the noise (default 0.7). Low Q = airy, high Q = resonant. */
  noiseQ?: number;
  /** Noise attack time in seconds (default 0.001). Larger = softer, less click. */
  noiseAttack?: number;
}

const PROFILES: Record<Material, MaterialProfile> = {
  // A short, lower "tock" like tapping a glass with a fingertip rather than a
  // bright high-pitched flick: lowered partials, a much shorter ring, and a
  // touch of soft contact noise for the percussive knock.
  glass: {
    partials: [560, 990, 1500],
    decay: 0.32,
    noise: 0.14,
    gain: 0.5,
    noiseFilter: "bandpass",
    noiseFreq: 2200,
    noiseQ: 0.8,
    noiseAttack: 0.002,
  },
  metal: { partials: [620, 1240, 1860, 2790], decay: 1.2, noise: 0.05, gain: 0.45 },
  // Low, soft, percussive wood knock — short decay, mostly damped noise.
  wood: { partials: [150, 230], decay: 0.12, noise: 0.45, gain: 0.4 },
  // Low, dull plastic contact: lowered partials and a soft, damped lowpass
  // noise thunk so it sounds like touching/pressing plastic rather than a
  // bright tap. The slight noise attack removes the percussive click.
  plastic: {
    partials: [200, 300],
    decay: 0.1,
    noise: 0.6,
    gain: 0.5,
    noiseFilter: "lowpass",
    noiseFreq: 1400,
    noiseQ: 0.5,
    noiseAttack: 0.006,
  },
  water: { partials: [180, 90], decay: 0.25, noise: 0.6, gain: 0.45 },
  // Dry, airy leaf rustle: NO tonal partials (those sounded metallic) — just
  // soft broadband noise gently shaped by a wide highpass, with a slow attack
  // so there's no percussive click. Kept quiet and not too bright.
  leaves: {
    partials: [],
    decay: 0.3,
    noise: 1.0,
    gain: 0.16,
    noiseFilter: "highpass",
    noiseFreq: 1000,
    noiseQ: 0.25,
    noiseAttack: 0.04,
  },
  // Soft fabric thud for the stuffed bear — mostly damped noise, little tone.
  plush: { partials: [130, 190], decay: 0.13, noise: 0.55, gain: 0.5 },
  // Deep "thocky" mechanical-keyboard clack: low thumpy tone, short decay,
  // plenty of damped noise for the muted-board feel.
  key: { partials: [320, 480, 200], decay: 0.04, noise: 0.6, gain: 0.5 },
};

function makeNoiseBuffer(audio: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

/**
 * Play a tap for the given material. `velocity` (0..1) scales loudness so
 * harder drags/clicks sound louder.
 */
export function playTap(material: Material, velocity = 1): void {
  if (muted || masterVolume <= 0) return;
  const audio = getCtx();
  if (!audio) return;

  const profile = PROFILES[material];
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value =
    profile.gain * masterVolume * Math.min(1, Math.max(0.15, velocity));
  master.connect(audio.destination);

  // Tonal partials.
  profile.partials.forEach((freq, idx) => {
    const osc = audio.createOscillator();
    osc.type = material === "wood" || material === "plastic" ? "triangle" : "sine";
    osc.frequency.value = freq * (0.99 + Math.random() * 0.02);

    const env = audio.createGain();
    const peak = (idx === 0 ? 1 : 0.5 / idx) * (1 - profile.noise);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay);

    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + profile.decay + 0.05);
  });

  // Noise transient for the "contact" thunk.
  if (profile.noise > 0) {
    const noiseSrc = audio.createBufferSource();
    noiseSrc.buffer = makeNoiseBuffer(audio, profile.decay);
    const bp = audio.createBiquadFilter();
    bp.type = profile.noiseFilter ?? "bandpass";
    bp.frequency.value = profile.noiseFreq ?? profile.partials[0] ?? 1000;
    bp.Q.value = profile.noiseQ ?? 0.7;

    const attack = profile.noiseAttack ?? 0.001;
    const env = audio.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(profile.noise, now + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay * 0.6);

    noiseSrc.connect(bp);
    bp.connect(env);
    env.connect(master);
    noiseSrc.start(now);
    noiseSrc.stop(now + profile.decay);
  }
}

// Rate-limit collision taps so a pile of contacts in one frame can't machine-gun
// the speakers. A short global gap caps the overall rate regardless of count.
let lastImpactAt = 0;
const IMPACT_MIN_GAP_MS = 55;

/**
 * Play a collision tap, globally throttled. `velocity` (0..1) scales loudness so
 * gentle settling is quiet and hard knocks are louder.
 */
export function playImpact(material: Material, velocity = 0.5): void {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastImpactAt < IMPACT_MIN_GAP_MS) return;
  lastImpactAt = now;
  playTap(material, velocity);
}

/** A Rapier linear-velocity vector. */
export interface ImpactVelocity {
  x: number;
  y: number;
  z: number;
}

/** Minimal shape of a Rapier collision-enter payload (the `other` body). */
export interface CollisionPayload {
  other: {
    rigidBody?: {
      linvel: () => ImpactVelocity;
      mass?: () => number;
    } | null;
  };
}

/**
 * Play a collision tap whose loudness scales with the given velocity, ignoring
 * tiny resting jitter. Shared by every physics prop so the threshold + scaling
 * live in one place. `minSpeed` filters out settling noise and `maxVolume` caps
 * the loudness of a hard knock.
 */
export function playVelocityImpact(
  material: Material,
  v: ImpactVelocity | null | undefined,
  { minSpeed = 0.5, maxVolume = 0.6 }: { minSpeed?: number; maxVolume?: number } = {}
): void {
  if (!v) return;
  const speed = Math.hypot(v.x, v.y, v.z);
  if (speed < minSpeed) return;
  playImpact(material, Math.min(1, speed / 4) * maxVolume);
}
