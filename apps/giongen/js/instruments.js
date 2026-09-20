/** 装飾レイヤーの部品。すべて合成、サンプル不使用。 */
import { noise } from './fx.js';

/** ジャグラーのガコッ実測比。非調和成分を含む金属共鳴。 */
export const GAKO_RATIOS = [1, 1.23, 1.51, 2.24, 6.31, 6.38, 12.05];
/** 先バレ（大都）実測比。1.19x は長3度。 */
export const SAKIBARE_RATIOS = [1, 1.19, 1.64, 1.85];

/**
 * 金属共鳴。減衰サインを共鳴モードごとに直接鳴らす（モーダル合成）。
 * ノイズ→高Qバンドパスだと通過帯域が f/Q しかなく、ほぼ無音になる。
 * 高次モードほど速く減衰させるのが金属体の実挙動。
 */
export function metal(ctx, dest, t, f0, ratios = GAKO_RATIOS, decay = 0.28, gain = 0.3) {
  // 打撃のクリック
  const src = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 1100;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0, t);
  cg.gain.linearRampToValueAtTime(gain * 1.1, t + 0.0015);
  cg.gain.exponentialRampToValueAtTime(gain * 0.002, t + 0.022);
  src.connect(hp); hp.connect(cg); cg.connect(dest);
  src.start(t); src.stop(t + 0.06);
  // 共鳴モード
  ratios.forEach((r, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f0 * r;
    const a = gain * Math.pow(0.66, i) * 1.6;
    const d = Math.max(0.05, decay * Math.pow(0.74, i));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.0025);
    g.gain.exponentialRampToValueAtTime(a * 0.0006, t + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.05);
  });
}

/** チャイム。ファミマ入店音の実測（3倍・5倍が強く2倍・4倍が弱い）に基づく。 */
export function chime(ctx, dest, t, f, dur = 1.6, gain = 0.1) {
  [[1, 1], [3, 0.42], [5, 0.20], [2, 0.08]].forEach(([m, a]) => {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f * m;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * a, t + 0.008);
    g.gain.exponentialRampToValueAtTime(gain * a * 0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

/** 単音。ポケセン実測の「奇数倍音が支配的」= square が素直に当てはまる。 */
export function tone(ctx, dest, t, f, dur, gain, type = 'square', detune = 0) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = f;
  if (detune) o.detune.value = detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.setValueAtTime(gain, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-5, gain * 0.001), t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.03);
  return o;
}

/** ピッチが落ちるサイン = キック */
export function kick(ctx, dest, t, gain = 0.9, from = 160, to = 45) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.4);
}

export function hat(ctx, dest, t, gain = 0.25, dur = 0.05) {
  const s = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(hp); hp.connect(g); g.connect(dest);
  s.start(t); s.stop(t + dur + 0.07);
}

export function snare(ctx, dest, t, gain = 0.22) {
  const s = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  s.connect(bp); bp.connect(g); g.connect(dest);
  s.start(t); s.stop(t + 0.22);
}

export function shaker(ctx, dest, t, gain = 0.1) {
  const s = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 9500; bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  s.connect(bp); bp.connect(g); g.connect(dest);
  s.start(t); s.stop(t + 0.12);
}

/** 上昇ノイズ。煽り・溜め用。 */
export function riser(ctx, dest, t, dur = 1.2, gain = 0.2) {
  const s = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * 0.9);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.1);
  s.connect(bp); bp.connect(g); g.connect(dest);
  s.start(t); s.stop(t + dur + 0.15);
}

/** 猫の鳴き声。実測 F1 1299 / F2 1767（人の あ の ×1.62 / ×1.36）を共鳴体に使う。
 *  発音ではなく、鳴き声の共鳴特性としてのフォルマント。 */
export function meow(ctx, dest, t, tr, o = {}) {
  const dur = (o.dur || 0.26) * (1 + tr.hold * 0.8);
  const f = (170 + 810 * tr.bright) * (o.pitchScale || 1);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f * 0.62, t);
  osc.frequency.linearRampToValueAtTime(f * 1.25, t + dur * 0.30);
  osc.frequency.linearRampToValueAtTime(f * 0.95, t + dur * 0.65);
  osc.frequency.linearRampToValueAtTime(f * (1.15 + tr.sweep * 0.5), t + dur);
  const amp = ctx.createGain();
  const g0 = (o.gain == null ? 0.34 : o.gain) * (1 + tr.accent * 0.5);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(g0, t + 0.02 + tr.attack * 0.05);
  amp.gain.setValueAtTime(g0, t + dur * 0.6);
  amp.gain.exponentialRampToValueAtTime(Math.max(1e-5, g0 * 0.002), t + dur);
  [[1299, 1], [1767, 0.85], [3100, 0.3]].forEach(([ff, gg]) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(ff * (0.75 + 0.55 * tr.bright), t);
    bp.Q.value = 9;
    const g = ctx.createGain(); g.gain.value = gg;
    osc.connect(bp); bp.connect(g); g.connect(amp);
  });
  if (tr.noisy > 0.5) {
    const n = noise(ctx);
    const nb = ctx.createBiquadFilter();
    nb.type = 'bandpass'; nb.frequency.value = f * 3; nb.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(g0 * tr.noisy * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + dur * 0.4);
    n.connect(nb); nb.connect(ng); ng.connect(amp);
    n.start(t); n.stop(t + dur);
  }
  amp.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
  return dur;
}
