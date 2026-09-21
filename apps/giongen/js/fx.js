/** エフェクト。すべてプログラム生成、外部ファイル不要。 */

let noiseBuf = null;
export function noise(ctx) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    const n = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

/** ノイズを指数減衰させたインパルス応答。IRファイル不要。 */
export function reverb(ctx, seconds = 2, decay = 2.2) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  const cv = ctx.createConvolver();
  cv.buffer = b;
  return cv;
}

export function distortion(ctx, amount = 2) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  const w = ctx.createWaveShaper();
  w.curve = c; w.oversample = '4x';
  return w;
}

/** 極端クリッピング。音割れ用。 */
export function clipper(ctx, drive = 20) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = Math.max(-1, Math.min(1, x * drive));
  }
  const w = ctx.createWaveShaper();
  w.curve = c; w.oversample = '4x';
  return w;
}

/** 階段カーブで量子化を近似。ScriptProcessor は非推奨なので使わない。 */
export function bitcrush(ctx, bits = 5) {
  const n = 1024, c = new Float32Array(n), levels = Math.pow(2, bits);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = Math.round(x * levels) / levels;
  }
  const w = ctx.createWaveShaper();
  w.curve = c;
  return w;
}

/** gain.value=0 にしたGainのgainへLFOを挿す = リングモジュレーション */
export function ringMod(ctx, freq = 50) {
  const g = ctx.createGain();
  g.gain.value = 0;
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = freq;
  o.connect(g.gain);
  o.start();
  return { node: g, osc: o };
}

export function delay(ctx, time = 0.13, feedback = 0.34, mix = 0.3, dest) {
  const d = ctx.createDelay(2);
  d.delayTime.value = time;
  const fb = ctx.createGain(); fb.gain.value = feedback;
  const wet = ctx.createGain(); wet.gain.value = mix;
  d.connect(fb); fb.connect(d); d.connect(wet);
  if (dest) wet.connect(dest);
  return { input: d, wet };
}

/** 遊技機系の共通後段。>2kHz をブーストし低域を削る（実測の主要因） */
export function pachiChain(ctx, dest, shelfDb = 7, cutHz = 180) {
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = cutHz; hp.Q.value = 0.7;
  const hs = ctx.createBiquadFilter();
  hs.type = 'highshelf'; hs.frequency.value = 2000; hs.gain.value = shelfDb;
  hp.connect(hs); hs.connect(dest);
  return hp;
}

/**
 * 完全無音の「タメ」。実測では2段階で急速に落としてから −240dB へ落ちていた。
 * いきなり切るのではなくこの形にすることで「止まった」感じが出る。
 * @returns 復帰する時刻
 */
export function silenceGate(ctx, gainNode, at, lengthSec = 0.5) {
  const g = gainNode.gain;
  g.setTargetAtTime(0.22, at, 0.055);
  g.setTargetAtTime(0.02, at + 0.25, 0.05);
  g.setValueAtTime(0, at + 0.5);
  g.setValueAtTime(0, at + 0.5 + lengthSec);
  g.linearRampToValueAtTime(1, at + 0.5 + lengthSec + 0.01);
  return at + 0.5 + lengthSec + 0.01;
}
