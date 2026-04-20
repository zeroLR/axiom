// ── Ambient music system (Web Audio API synthesis) ───────────────────────────
// Generates minimal procedural ambient soundscapes per stage. No external audio
// files needed — purely synthesized using oscillators and gain envelopes.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeNodes: AudioNode[] = [];
let currentStage = -1;
let musicVolume = 0.5;
let masterVolMul = 1;
let playing = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = musicVolume * masterVolMul;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

/** Set music volume (0..1). */
export function setMusicVolume(vol: number, master: number): void {
  musicVolume = Math.max(0, Math.min(1, vol));
  masterVolMul = Math.max(0, Math.min(1, master));
  if (masterGain) {
    masterGain.gain.setTargetAtTime(musicVolume * masterVolMul, ctx!.currentTime, 0.1);
  }
}

/** Start ambient music for a given stage index (0-based). */
export function playMusic(stageIdx: number): void {
  if (stageIdx === currentStage && playing) return;
  stopMusic();
  currentStage = stageIdx;
  playing = true;

  const audioCtx = getCtx();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => { /* user gesture required — no-op */ });
  }

  const dest = getMaster();

  switch (stageIdx) {
    case 0:
      buildStage0(audioCtx, dest);
      break;
    case 1:
      buildStage1(audioCtx, dest);
      break;
    case 2:
      buildStage2(audioCtx, dest);
      break;
    default:
      buildStage0(audioCtx, dest);
  }
}

/** Stop all ambient music. */
export function stopMusic(): void {
  for (const n of activeNodes) {
    try {
      if (n instanceof OscillatorNode) n.stop();
      n.disconnect();
    } catch { /* already stopped */ }
  }
  activeNodes = [];
  playing = false;
  currentStage = -1;
}

/** Whether music is currently playing. */
export function isMusicPlaying(): boolean {
  return playing;
}

// ── Stage 0 (White Grid / AXIS): Minimal click pulse ─────────────────────────
function buildStage0(ctx: AudioContext, dest: AudioNode): void {
  // Sub-bass drone at very low volume
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 55; // A1
  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(dest);
  osc.start();
  activeNodes.push(osc, gain);

  // Periodic soft click (using short noise burst via oscillator)
  const lfo = ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = 0.5; // one click per 2 seconds
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(dest);
  lfo.start();
  activeNodes.push(lfo, lfoGain);
}

// ── Stage 1 (Deep Blue / WING): Low drone + high ping ────────────────────────
function buildStage1(ctx: AudioContext, dest: AudioNode): void {
  // Deep drone (triangle wave)
  const drone = ctx.createOscillator();
  drone.type = "triangle";
  drone.frequency.value = 73.42; // D2
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.08;
  drone.connect(droneGain);
  droneGain.connect(dest);
  drone.start();
  activeNodes.push(drone, droneGain);

  // Subtle fifth harmony
  const harm = ctx.createOscillator();
  harm.type = "sine";
  harm.frequency.value = 110; // A2
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.04;
  harm.connect(harmGain);
  harmGain.connect(dest);
  harm.start();
  activeNodes.push(harm, harmGain);

  // High ping: periodic sine blip
  const ping = ctx.createOscillator();
  ping.type = "sine";
  ping.frequency.value = 880; // A5
  const pingGain = ctx.createGain();
  pingGain.gain.value = 0;
  ping.connect(pingGain);
  pingGain.connect(dest);
  ping.start();
  activeNodes.push(ping, pingGain);

  // LFO to pulse the ping
  const pingLfo = ctx.createOscillator();
  pingLfo.type = "sine";
  pingLfo.frequency.value = 0.25; // one pulse every 4 seconds
  const pingLfoGain = ctx.createGain();
  pingLfoGain.gain.value = 0.025;
  pingLfo.connect(pingLfoGain);
  pingLfoGain.connect(pingGain.gain);
  pingLfo.start();
  activeNodes.push(pingLfo, pingLfoGain);
}

// ── Stage 2 (Dark Core / MIRROR): Denser pulse + bass ────────────────────────
function buildStage2(ctx: AudioContext, dest: AudioNode): void {
  // Heavier bass drone
  const bass = ctx.createOscillator();
  bass.type = "sawtooth";
  bass.frequency.value = 49; // G1
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.07;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 120;
  bass.connect(filter);
  filter.connect(bassGain);
  bassGain.connect(dest);
  bass.start();
  activeNodes.push(bass, filter, bassGain);

  // Pulse rhythm (square wave LFO modulating gain)
  const pulse = ctx.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 1.5; // ~90 BPM feel
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.04;
  pulse.connect(pulseGain);
  pulseGain.connect(dest);
  pulse.start();
  activeNodes.push(pulse, pulseGain);

  // Mid-frequency tension tone
  const mid = ctx.createOscillator();
  mid.type = "triangle";
  mid.frequency.value = 146.83; // D3
  const midGain = ctx.createGain();
  midGain.gain.value = 0.035;
  mid.connect(midGain);
  midGain.connect(dest);
  mid.start();
  activeNodes.push(mid, midGain);
}
