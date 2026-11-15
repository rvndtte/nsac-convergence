export function createAudio() {
  let context = null;
  let enabled = true;

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

  return {
    unlock() {
      getContext();
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
      tone({ from: 90, to: 320, duration: 1.3, gain: 0.035 });
      tone({ from: 320, to: 110, duration: 1.2, gain: 0.03, delay: 1.3 });
    },
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
      return enabled;
    },
    get enabled() {
      return enabled;
    }
  };
}
