// Ambient bed: a slow drone chord, a faint hiss of "space noise", and far-off radio pings.
// Each stop has its own mood. Everything is generated here; there are no audio files.
const MOODS = {
  earth: { freqs: [110, 164.81, 220, 277.18], cutoff: 900, noise: 0.028, ping: [1318.5, 1760], every: [9, 18] },
  moon: { freqs: [98, 146.83, 196, 293.66], cutoff: 520, noise: 0.016, ping: [1174.7, 1567.98], every: [12, 22] },
  mars: { freqs: [87.31, 130.81, 155.56, 207.65], cutoff: 420, noise: 0.04, ping: [932.3, 1244.5], every: [10, 20] },
  space: { freqs: [55, 82.41, 110, 164.81], cutoff: 300, noise: 0.012, ping: [1760, 2349.3], every: [6, 13] }
};
const AMBIENT_LEVEL = 0.5;

export function createAudio() {
  let context = null;
  let enabled = true;
  let ambient = null; // { master, oscillators, filter, noiseGain, pingTimer }
  let mood = "earth";

  function getContext() {
    if (!enabled) return null;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === "suspended") context.resume();
    return context;
  }

  function tone({ from, to = from, duration, gain, type = "sine", delay = 0 }) {
    const ctx = getContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function noiseBuffer(ctx) {
    // Brown noise: integrated white noise, a soft low rumble rather than a hiss.
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  let whiteNoise = null;
  function whoosh({ duration = 2.6, peak = 0.14 } = {}) {
    const ctx = getContext();
    if (!ctx) return;
    if (!whiteNoise || whiteNoise.sampleRate !== ctx.sampleRate) {
      whiteNoise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = whiteNoise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = whiteNoise;
    source.loop = true;
    // Band-pass sweeps up as the train accelerates and falls as it passes.
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.3;
    band.frequency.setValueAtTime(250, t);
    band.frequency.exponentialRampToValueAtTime(2800, t + duration * 0.4);
    band.frequency.exponentialRampToValueAtTime(380, t + duration);
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.exponentialRampToValueAtTime(peak, t + duration * 0.38);
    volume.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    let chain = source.connect(band).connect(volume);
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.8, t);
      pan.pan.linearRampToValueAtTime(0.8, t + duration);
      chain = chain.connect(pan);
    }
    chain.connect(ctx.destination);
    source.start(t);
    source.stop(t + duration + 0.05);
    // Low engine swell underneath for weight.
    tone({ from: 70, to: 180, duration: duration * 0.45, gain: 0.05, type: "sawtooth" });
    tone({ from: 180, to: 60, duration: duration * 0.55, gain: 0.04, type: "sawtooth", delay: duration * 0.45 });
  }

  function lfo(ctx, rate, depth, target) {
    const osc = ctx.createOscillator();
    const amount = ctx.createGain();
    osc.frequency.value = rate;
    amount.gain.value = depth;
    osc.connect(amount).connect(target);
    osc.start();
  }

  function schedulePing() {
    if (!ambient) return;
    const { every, ping } = MOODS[mood];
    const wait = (every[0] + Math.random() * (every[1] - every[0])) * 1000;
    ambient.pingTimer = window.setTimeout(() => {
      if (ambient && enabled && context?.state === "running" && !document.hidden) {
        const freq = ping[Math.floor(Math.random() * ping.length)];
        const ctx = context;
        const at = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.012, at + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
        osc.connect(gain).connect(ambient.master);
        osc.start(at);
        osc.stop(at + 2.7);
      }
      schedulePing();
    }, wait);
  }

  function applyMood(ctx, fade) {
    if (!ambient) return;
    const m = MOODS[mood];
    const now = ctx.currentTime;
    ambient.oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(m.freqs[i], now, fade));
    ambient.filter.frequency.setTargetAtTime(m.cutoff, now, fade);
    ambient.noiseGain.gain.setTargetAtTime(m.noise, now, fade);
  }

  function startAmbient() {
    const ctx = getContext();
    if (!ctx) return;
    if (ambient) {
      ambient.master.gain.setTargetAtTime(AMBIENT_LEVEL, ctx.currentTime, 1.2);
      return;
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.setTargetAtTime(AMBIENT_LEVEL, ctx.currentTime, 2);
    master.connect(ctx.destination);

    // Drone: four detuned sines through a slowly breathing low-pass.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    filter.connect(padGain).connect(master);
    const oscillators = MOODS[mood].freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 5;
      osc.connect(filter);
      osc.start();
      return osc;
    });
    lfo(ctx, 0.05, 220, filter.frequency);
    lfo(ctx, 0.07, 0.012, padGain.gain);

    // Space noise: looped brown noise, band-limited, slowly swelling.
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    source.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = MOODS[mood].noise;
    source.connect(noiseFilter).connect(noiseGain).connect(master);
    source.start();
    lfo(ctx, 0.04, 0.008, noiseGain.gain);

    ambient = { master, oscillators, filter, noiseGain, pingTimer: 0 };
    applyMood(ctx, 0.01);
    schedulePing();
  }

  function stopAmbient() {
    if (!ambient || !context) return;
    ambient.master.gain.setTargetAtTime(0.0001, context.currentTime, 0.4);
  }

  // Browsers only allow audio after a gesture: begin on the first key press or click.
  function armAutoStart() {
    const begin = () => {
      window.removeEventListener("pointerdown", begin, true);
      window.removeEventListener("keydown", begin, true);
      if (enabled) startAmbient();
    };
    window.addEventListener("pointerdown", begin, true);
    window.addEventListener("keydown", begin, true);
  }
  armAutoStart();

  document.addEventListener("visibilitychange", () => {
    if (!context || !ambient) return;
    if (document.hidden) context.suspend();
    else if (enabled) context.resume();
  });

  return {
    unlock() {
      getContext();
    },
    ambient: {
      mood(name) {
        if (!MOODS[name] || name === mood) return;
        mood = name;
        if (context) applyMood(context, 2.5);
      }
    },
    chime() {
      tone({ from: 784, duration: 0.5, gain: 0.035, type: "triangle" });
      tone({ from: 622.25, duration: 0.7, gain: 0.035, type: "triangle", delay: 0.32 });
    },
    reveal() {
      tone({ from: 880, to: 1175, duration: 0.12, gain: 0.03 });
    },
    lock() {
      tone({ from: 440, to: 660, duration: 0.18, gain: 0.025, type: "triangle" });
      tone({ from: 880, duration: 0.3, gain: 0.02, type: "triangle", delay: 0.12 });
    },
    stamp() {
      tone({ from: 180, to: 70, duration: 0.18, gain: 0.08, type: "triangle" });
      tone({ from: 990, duration: 0.22, gain: 0.03, type: "triangle", delay: 0.08 });
    },
    wrong() {
      tone({ from: 220, to: 160, duration: 0.25, gain: 0.04, type: "sawtooth" });
    },
    travel() {
      whoosh();
    },
    whoosh,
    send() {
      [659.25, 880, 1318.5].forEach((frequency, index) => {
        tone({ from: frequency, duration: 0.3, gain: 0.03, delay: index * 0.09 });
      });
    },
    complete() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        tone({ from: frequency, duration: 0.45, gain: 0.035, type: "triangle", delay: index * 0.12 });
      });
    },
    toggle() {
      enabled = !enabled;
      if (enabled) startAmbient();
      else stopAmbient();
      return enabled;
    },
    get enabled() {
      return enabled;
    }
  };
}
