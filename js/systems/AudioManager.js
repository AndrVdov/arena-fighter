/**
 * АУДИОСИСТЕМА
 * ------------
 * Процедурные фоновые сцены и короткие эффекты на Web Audio API.
 * Не требует внешних аудиофайлов; настройки хранятся отдельно от сейвов.
 */
class AudioManager {

  static STORAGE_KEY = 'arenaFighter.audio.v1';
  static DEFAULTS = BALANCE.audio.defaultVolumes;

  constructor() {
    this.settings = this.loadSettings();
    this.context = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.effectsGain = null;
    this.desiredScene = 'menu';
    this.currentSceneId = null;
    this.scene = null;
    this.actionTimer = null;
    this.activeAction = null;
    this.noiseBuffers = {};
    this.onSettingsChanged = null;

    const unlock = () => this.unlock();
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
    document.addEventListener('click', event => {
      if (event.target.closest('button')) this.play('ui');
    });
  }

  get supported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(AudioManager.STORAGE_KEY) ?? '{}');
      return {
        enabled: saved.enabled !== false,
        master: this.normalizeVolume(saved.master, AudioManager.DEFAULTS.master),
        ambience: this.normalizeVolume(saved.ambience, AudioManager.DEFAULTS.ambience),
        effects: this.normalizeVolume(saved.effects, AudioManager.DEFAULTS.effects),
      };
    } catch {
      return { ...AudioManager.DEFAULTS };
    }
  }

  normalizeVolume(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
  }

  saveSettings() {
    try {
      localStorage.setItem(AudioManager.STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
    this.onSettingsChanged?.(this.settings);
  }

  async unlock() {
    if (!this.supported) return false;
    if (!this.context) this.createContext();
    if (this.context.state === 'suspended') await this.context.resume();
    this.applyVolumes();
    this.switchScene(this.desiredScene);
    return true;
  }

  createContext() {
    const Context = window.AudioContext || window.webkitAudioContext;
    this.context = new Context();
    this.masterGain = this.context.createGain();
    this.ambienceGain = this.context.createGain();
    this.effectsGain = this.context.createGain();
    this.ambienceGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.applyVolumes(false);
  }

  applyVolumes(smooth = true) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const duration = smooth ? 0.08 : 0;
    this.setGain(this.masterGain.gain, this.settings.enabled ? this.settings.master : 0, now, duration);
    this.setGain(this.ambienceGain.gain, this.settings.ambience, now, duration);
    this.setGain(this.effectsGain.gain, this.settings.effects, now, duration);
  }

  setGain(parameter, value, now, duration = 0) {
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.linearRampToValueAtTime(value, now + duration);
  }

  setEnabled(enabled) {
    this.settings.enabled = Boolean(enabled);
    this.saveSettings();
    if (this.settings.enabled) this.unlock();
    else this.applyVolumes();
  }

  setVolume(channel, value) {
    if (!['master', 'ambience', 'effects'].includes(channel)) return;
    this.settings[channel] = this.normalizeVolume(value, this.settings[channel]);
    this.saveSettings();
    this.applyVolumes();
  }

  setScene(sceneId) {
    this.desiredScene = sceneId;
    if (this.context && this.settings.enabled) this.switchScene(sceneId);
  }

  switchScene(sceneId) {
    if (!this.context || this.currentSceneId === sceneId) return;
    this.stopScene();
    this.currentSceneId = sceneId;
    this.scene = this.createScene(sceneId);
  }

  createScene(sceneId) {
    const scene = {
      id: sceneId,
      bus: this.context.createGain(),
      sources: [],
      timers: new Set(),
    };
    const now = this.context.currentTime;
    scene.bus.gain.setValueAtTime(0, now);
    scene.bus.gain.linearRampToValueAtTime(1, now + BALANCE.audio.sceneFadeSeconds);
    scene.bus.connect(this.ambienceGain);

    const builders = {
      menu: () => this.buildHall(scene),
      home: () => this.buildHome(scene),
      river: () => this.buildRiver(scene),
      mine: () => this.buildMine(scene),
      shop: () => this.buildShop(scene),
      arena: () => this.buildArena(scene, false),
      battle: () => this.buildArena(scene, true),
    };
    (builders[sceneId] ?? builders.menu)();
    return scene;
  }

  stopScene() {
    const scene = this.scene;
    if (!scene || !this.context) return;
    const now = this.context.currentTime;
    scene.bus.gain.cancelScheduledValues(now);
    scene.bus.gain.setValueAtTime(scene.bus.gain.value, now);
    scene.bus.gain.linearRampToValueAtTime(0, now + 0.8);
    scene.timers.forEach(timer => clearTimeout(timer));
    setTimeout(() => {
      scene.sources.forEach(source => {
        try { source.stop(); } catch {}
        try { source.disconnect(); } catch {}
      });
      try { scene.bus.disconnect(); } catch {}
    }, 850);
    this.scene = null;
  }

  buildHall(scene) {
    this.loopNoise(scene, 'brown', { gain: 0.08, filter: 'bandpass', frequency: 260, q: 0.45 });
    this.drone(scene, 58, 0.018);
    this.recurring(scene, 2200, 4800, () => this.crackle(scene.bus, 0.10));
    this.recurring(scene, 5000, 9000, () => this.distantImpact(scene.bus, 0.07));
  }

  buildHome(scene) {
    this.loopNoise(scene, 'brown', { gain: 0.11, filter: 'lowpass', frequency: 620 });
    this.drone(scene, 72, 0.012);
    this.recurring(scene, 700, 2100, () => this.crackle(scene.bus, 0.16));
  }

  buildRiver(scene) {
    this.loopNoise(scene, 'white', { gain: 0.16, filter: 'bandpass', frequency: 1100, q: 0.55 });
    this.loopNoise(scene, 'brown', { gain: 0.13, filter: 'lowpass', frequency: 520 });
    this.recurring(scene, 5000, 11000, () => this.bird(scene.bus));
  }

  buildMine(scene) {
    this.loopNoise(scene, 'brown', { gain: 0.13, filter: 'lowpass', frequency: 230 });
    this.drone(scene, 48, 0.025);
    this.recurring(scene, 2600, 6200, () => this.drip(scene.bus));
    this.recurring(scene, 5500, 10500, () => this.distantImpact(scene.bus, 0.06));
  }

  buildShop(scene) {
    this.loopNoise(scene, 'brown', { gain: 0.065, filter: 'lowpass', frequency: 550 });
    this.recurring(scene, 900, 2600, () => this.crackle(scene.bus, 0.09));
    this.recurring(scene, 4200, 9000, () => this.clink(scene.bus, 0.08));
  }

  buildArena(scene, battle) {
    this.loopNoise(scene, 'brown', {
      gain: battle ? 0.18 : 0.13,
      filter: 'bandpass',
      frequency: battle ? 430 : 340,
      q: 0.5,
    });
    this.loopNoise(scene, 'white', { gain: battle ? 0.035 : 0.02, filter: 'lowpass', frequency: 950 });
    this.drone(scene, 64, battle ? 0.018 : 0.012);
    this.recurring(scene, battle ? 2200 : 4300, battle ? 4600 : 8500,
      () => this.distantImpact(scene.bus, battle ? 0.10 : 0.065));
  }

  loopNoise(scene, type, { gain, filter, frequency, q = 0.7 }) {
    const source = this.context.createBufferSource();
    const filterNode = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    source.buffer = this.noiseBuffer(type);
    source.loop = true;
    filterNode.type = filter;
    filterNode.frequency.value = frequency;
    filterNode.Q.value = q;
    gainNode.gain.value = gain;
    source.connect(filterNode).connect(gainNode).connect(scene.bus);
    source.start();
    scene.sources.push(source);
  }

  drone(scene, frequency, gain) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    gainNode.gain.value = gain;
    oscillator.connect(filter).connect(gainNode).connect(scene.bus);
    oscillator.start();
    scene.sources.push(oscillator);
  }

  noiseBuffer(type) {
    if (this.noiseBuffers[type]) return this.noiseBuffers[type];
    const length = this.context.sampleRate * 4;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        previous = (previous + 0.02 * white) / 1.02;
        data[index] = previous * 3.4;
      } else {
        data[index] = white;
      }
    }
    this.noiseBuffers[type] = buffer;
    return buffer;
  }

  recurring(scene, minimumMs, maximumMs, callback) {
    const schedule = () => {
      if (this.scene !== scene) return;
      const delay = minimumMs + Math.random() * (maximumMs - minimumMs);
      const timer = setTimeout(() => {
        scene.timers.delete(timer);
        if (this.scene === scene && this.settings.enabled) callback();
        schedule();
      }, delay);
      scene.timers.add(timer);
    };
    schedule();
  }

  setAction(action) {
    this.activeAction = action;
    clearTimeout(this.actionTimer);
    this.actionTimer = null;
    if (action === 'mine') this.schedulePick();
    if (action === 'sleep') this.play('sleep');
  }

  schedulePick() {
    if (this.activeAction !== 'mine') return;
    this.play('pick');
    const [minimum, maximum] = BALANCE.audio.miningPickIntervalMs;
    this.actionTimer = setTimeout(
      () => this.schedulePick(),
      minimum + Math.random() * (maximum - minimum)
    );
  }

  playCombatEvent(event) {
    if (['hit', 'crit', 'dodge', 'block'].includes(event?.type)) this.play(event.type);
    if (event?.type === 'item') this.play('potion');
  }

  playConsumable(item) {
    if (item?.effect?.thirst) this.play('drink');
    else if (item?.effect?.hunger || item?.effect?.sleep) this.play('eat');
    else if (item?.effect?.hp || item?.effect?.buff) this.play('potion');
  }

  play(name) {
    if (!this.context || !this.settings.enabled || this.context.state !== 'running') return;
    const effects = {
      ui: () => this.tone(540, 720, 0.045, 0.025, 'sine'),
      hit: () => this.hit(false),
      crit: () => this.hit(true),
      dodge: () => this.whoosh(),
      block: () => this.block(),
      victory: () => this.chord([392, 523, 659], 0.12),
      defeat: () => this.chord([220, 185, 147], 0.13),
      coin: () => this.chord([880, 1175, 1568], 0.055),
      drink: () => this.waterSip(),
      eat: () => this.eat(),
      potion: () => this.potion(),
      travel: () => this.whoosh(0.08),
      pick: () => this.pick(),
      sleep: () => this.chord([392, 494, 587], 0.045),
    };
    effects[name]?.();
  }

  tone(startFrequency, endFrequency, duration, gain = 0.08, type = 'triangle', destination = this.effectsGain) {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gainNode).connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noiseBurst(destination, { duration = 0.1, gain = 0.1, frequency = 500, filter = 'bandpass', q = 0.8 } = {}) {
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filterNode = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    source.buffer = this.noiseBuffer('white');
    filterNode.type = filter;
    filterNode.frequency.value = frequency;
    filterNode.Q.value = q;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filterNode).connect(gainNode).connect(destination);
    source.start(now, Math.random() * 2);
    source.stop(now + duration + 0.02);
  }

  hit(critical) {
    this.noiseBurst(this.effectsGain, {
      duration: critical ? 0.18 : 0.11,
      gain: critical ? 0.28 : 0.17,
      frequency: critical ? 150 : 240,
      q: 0.6,
    });
    this.tone(critical ? 105 : 145, 48, critical ? 0.22 : 0.12, critical ? 0.18 : 0.10, 'triangle');
    if (critical) this.tone(720, 180, 0.16, 0.07, 'sawtooth');
  }

  whoosh(gain = 0.12) {
    this.noiseBurst(this.effectsGain, { duration: 0.22, gain, frequency: 1250, filter: 'highpass', q: 0.4 });
  }

  block() {
    this.noiseBurst(this.effectsGain, { duration: 0.12, gain: 0.13, frequency: 1700, q: 1.4 });
    this.tone(420, 260, 0.24, 0.15, 'square');
    this.tone(680, 350, 0.18, 0.07, 'triangle');
  }

  pick() {
    this.noiseBurst(this.effectsGain, { duration: 0.07, gain: 0.12, frequency: 2100, q: 1.6 });
    this.tone(520 + Math.random() * 120, 190, 0.16, 0.10, 'triangle');
  }

  chord(frequencies, gain) {
    frequencies.forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, frequency * 0.98, 0.28, gain, 'triangle'), index * 95);
    });
  }

  waterSip() {
    this.noiseBurst(this.effectsGain, { duration: 0.35, gain: 0.08, frequency: 900, q: 0.5 });
    this.tone(620, 280, 0.3, 0.035, 'sine');
  }

  eat() {
    this.noiseBurst(this.effectsGain, { duration: 0.065, gain: 0.10, frequency: 1250, q: 0.8 });
    setTimeout(() => this.noiseBurst(this.effectsGain,
      { duration: 0.055, gain: 0.075, frequency: 980, q: 0.7 }), 85);
  }

  potion() {
    this.tone(360, 720, 0.16, 0.045, 'sine');
    setTimeout(() => this.tone(520, 1040, 0.13, 0.035, 'sine'), 75);
  }

  crackle(destination, gain) {
    this.noiseBurst(destination, { duration: 0.035 + Math.random() * 0.045, gain, frequency: 1500, q: 0.55 });
  }

  distantImpact(destination, gain) {
    this.noiseBurst(destination, { duration: 0.11, gain, frequency: 260, q: 0.7 });
    this.tone(130, 65, 0.15, gain * 0.5, 'triangle', destination);
  }

  drip(destination) {
    this.tone(1250, 380, 0.22, 0.055, 'sine', destination);
  }

  bird(destination) {
    this.tone(1650, 2450, 0.12, 0.025, 'sine', destination);
    setTimeout(() => this.tone(1850, 2750, 0.10, 0.02, 'sine', destination), 140);
  }

  clink(destination, gain) {
    this.tone(1100, 850, 0.18, gain, 'sine', destination);
    this.tone(1480, 1020, 0.14, gain * 0.65, 'sine', destination);
  }
}
