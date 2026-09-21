/** Web Audio 合成コア。
 *
 *  1モーラ = 「ノイズ層」+「音程層」の混合。混合比はトレイトの noisy が決める。
 *  声ではないので、出てくる音は文字に書き起こせない。
 */
import { noise } from './fx.js';
import { fBright, fWeight, attackSec, durSec, clamp } from './traits.js';

let ctx = null, master = null, analyser = null, compressor = null;
let stopAt = 0;

/** AudioContext はユーザー操作の中で生成する（iOS の制約） */
export function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -10;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  master.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(ctx.destination);
  return ctx;
}
export const getMaster = () => master;
export const getAnalyser = () => analyser;

export function resume() {
  const c = audio();
  if (c.state === 'suspended') c.resume();
  return c;
}

/** 進行中の音を止める。master を一瞬絞って作り直す。 */
export function stopAll() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 0.02);
  master.gain.setValueAtTime(0, t + 0.03);
  master.gain.linearRampToValueAtTime(0.9, t + 0.05);
  stopAt = 0;
}

/**
 * 1モーラ分の音を鳴らす。スタイルが each を渡さない場合の既定の音。
 * @returns 実際の長さ（秒）
 */
export function grain(ctx, dest, t, tr, o = {}) {
  const dur = o.dur || durSec(tr, o.base);
  const g0 = (o.gain == null ? 0.5 : o.gain) * (1 + tr.accent * 0.6);
  const atk = Math.min(o.atk == null ? attackSec(tr) : o.atk, dur * 0.5);
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(dest);

  // ノイズ層
  if (tr.noisy > 0.02) {
    const n = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const f = fBright(tr) * (o.noiseScale || 1);
    bp.frequency.setValueAtTime(f, t);
    bp.Q.value = o.noiseQ == null ? 2.2 : o.noiseQ;
    if (tr.sweep) {
      bp.frequency.exponentialRampToValueAtTime(
        clamp(f * Math.pow(2, tr.sweep * 1.6), 40, 16000), t + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(g0 * tr.noisy, t + atk);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-5, g0 * tr.noisy * 0.001), t + dur);
    n.connect(bp); bp.connect(g); g.connect(bus);
    n.start(t); n.stop(t + dur + 0.05);
  }

  // 音程層
  if (tr.noisy < 0.98) {
    const f = (o.fixedFreq || fWeight(tr)) * (o.pitchScale || 1);
    const partials = o.partials || [1, 2, 3];
    partials.forEach((r, i) => {
      const osc = ctx.createOscillator();
      osc.type = o.wave || (tr.voiced ? 'sawtooth' : 'triangle');
      osc.frequency.setValueAtTime(f * r, t);
      if (tr.sweep) {
        osc.frequency.exponentialRampToValueAtTime(
          clamp(f * r * Math.pow(2, tr.sweep * 1.2), 25, 16000), t + dur);
      }
      if (o.detune) osc.detune.value = o.detune * (i % 2 ? -1 : 1);
      const a = g0 * (1 - tr.noisy) * Math.pow(o.rolloff || 0.5, i);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + atk);
      g.gain.setValueAtTime(a, t + dur * (o.sustain == null ? 0.45 : o.sustain));
      g.gain.exponentialRampToValueAtTime(Math.max(1e-5, a * 0.001), t + dur);
      osc.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
  }
  return dur;
}

/**
 * トレイト列を時間軸に並べる。
 * @param o.each (ctx,dest,t,tr,o,i) => duration   スタイル固有の音を差し込む
 * @returns 終了時刻
 */
export function render(ctx, dest, trs, o = {}) {
  let t = o.t0 == null ? ctx.currentTime + 0.05 : o.t0;
  const each = o.each || grain;
  trs.forEach((tr, i) => {
    t += tr.gap * (o.gapScale == null ? 0.16 : o.gapScale);
    const d = each(ctx, dest, t, tr, o, i);
    t += (d == null ? durSec(tr, o.base) : d) * (o.overlap == null ? 0.92 : o.overlap)
       + (o.pad || 0.01);
  });
  return t;
}

/** スタイルを再生する。戻り値は概算の長さ（秒）。 */
export function play(style, variant, trs, rnd) {
  const c = resume();
  const t0 = c.currentTime + 0.05;
  const end = variant.run(c, master, trs, rnd, t0);
  stopAt = Math.max(stopAt, end || t0 + 2);
  return Math.max(0.3, (end || t0 + 2) - c.currentTime);
}

/** OfflineAudioContext でレンダリングする。スモークテスト用。 */
export async function renderOffline(variant, trs, rnd, seconds = 6) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(1, Math.ceil(44100 * seconds), 44100);
  const out = oc.createGain();
  out.gain.value = 0.9;
  const comp = oc.createDynamicsCompressor();
  out.connect(comp);
  comp.connect(oc.destination);
  variant.run(oc, out, trs, rnd, 0.02);
  return oc.startRendering();
}
