export class CallSounds {
  private ctx: AudioContext | null = null;
  private ringbackInterval: any = null;
  private ringtoneInterval: any = null;
  private activeNodes: AudioScheduledSourceNode[] = [];

  initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play outgoing ringing sound (ring-ring)
  playRingback() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const playTone = () => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime + 1.8);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 2.0);
      osc2.stop(this.ctx.currentTime + 2.0);
      this.activeNodes.push(osc1, osc2);
    };

    playTone();
    this.ringbackInterval = setInterval(playTone, 4000);
  }

  // Play incoming ringtone (melodic alert)
  playRingtone() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const playTone = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const playBeep = (time: number, freq: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.45, time + 0.05);
        gain.gain.setValueAtTime(0.45, time + 0.25);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
        this.activeNodes.push(osc);
      };

      playBeep(now, 850);
      playBeep(now + 0.35, 950);
    };

    playTone();
    this.ringtoneInterval = setInterval(playTone, 1800);
  }

  // Play hang-up descending beep
  playEndCall() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.35);
    this.activeNodes.push(osc);
  }

  stop() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    // Stop all scheduled oscillators immediately instead of waiting for their timed stop
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch {}
    });
    this.activeNodes = [];
  }

  // Call on component unmount to release the AudioContext resource
  destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
