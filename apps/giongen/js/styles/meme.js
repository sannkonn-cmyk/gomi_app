/** 🤪 ミーム・ネタ。
 *  高ピッチMADだけは「声の質感」を意図的に残す（実測 f0 408Hz）。
 *  ただし言語としては成立しない音。元ネタのフレーズはどこにも書かない。 */
import { distortion, clipper, delay, noise, reverb } from '../fx.js';
import { kick, snare, hat, tone, chime, metal, riser } from '../instruments.js';
import { rs, fBright } from '../traits.js';
import { render } from '../engine.js';

export default [
{
  id: 'mad', emoji: '🔥', label: '高ピッチMAD', category: 'meme', color: '#C2306B',
  note: '実測 f0 408Hz・語尾1オクターブ跳躍・ジッタ12%・サブハーモニクス0.3',
  variants: [
    { id: 'jump', label: 'ごびあがり', run(c, out, trs, rnd, t0) {
        const d = delay(c, 0.13, 0.34, 0.3, out);
        const dist = distortion(c, 2.4);
        dist.connect(out); dist.connect(d.input);
        const last = trs.length - 1;
        return render(c, dist, trs, { t0, overlap: 1, pad: 0.02,
          each: (cc, dest, t, x, o, i) => voiceGrain(cc, dest, t, x, rnd, i === last, 408) });
      } },
    { id: 'chop', label: 'ブツぎり', run(c, out, trs, rnd, t0) {
        const d = delay(c, 0.09, 0.42, 0.34, out);
        const dist = distortion(c, 3.2);
        dist.connect(out); dist.connect(d.input);
        let t = t0;
        trs.forEach((x, i) => {
          const reps = 1 + (rnd() < 0.35 ? 2 : 0);
          for (let k = 0; k < reps; k++) {
            voiceGrain(c, dist, t, x, rnd, false, 408 * (1 + k * 0.08));
            t += 0.10;
          }
          t += 0.03;
        });
        return t + 0.8;
      } },
    { id: 'growl', label: 'がなり', run(c, out, trs, rnd, t0) {
        const dist = distortion(c, 4.5); dist.connect(out);
        return render(c, dist, trs, { t0, overlap: 1, pad: 0.02,
          each: (cc, dest, t, x) => voiceGrain(cc, dest, t, x, rnd, false, 262, 0.22, 0.5) });
      } },
  ],
},
{
  id: 'bakuon', emoji: '💥', label: '音割れ爆音', category: 'meme', color: '#C2306B',
  note: '矩形クリップに突っ込んで低域を潰す。実装は数行、破壊力は最大',
  variants: [
    { id: 'clip', label: 'おとわれ', run(c, out, trs, rnd, t0) {
        const cl = clipper(c, 26);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
        const trim = c.createGain(); trim.gain.value = 0.30;
        cl.connect(lp); lp.connect(trim); trim.connect(out);
        return render(c, cl, trs, { t0, gain: 1.0, base: 0.17 });
      } },
    { id: 'destroy', label: 'はかい', run(c, out, trs, rnd, t0) {
        const cl = clipper(c, 60);
        const trim = c.createGain(); trim.gain.value = 0.22;
        cl.connect(trim); trim.connect(out);
        let t = t0;
        trs.forEach(x => {
          kick(c, cl, t, 1.4, 240, 30);
          t += render(c, cl, [x], { t0: t, gain: 1.4, base: 0.2 }) - t;
        });
        return t + 0.5;
      } },
  ],
},
{
  id: 'fart', emoji: '💨', label: 'おなら', category: 'meme', color: '#C2306B',
  note: '重さ → 基本周波数。濁音・お段が多いほど低くブリブリに',
  variants: [
    { id: 'normal', label: 'ふつう', run: fart(1) },
    { id: 'long',   label: 'ながい', run: fart(2.1) },
    { id: 'squeak', label: 'すかしっぺ', run: fart(0.55, true) },
  ],
},
{
  id: 'stinger', emoji: '🎬', label: '絶望スティンガー', category: 'meme', color: '#C2306B',
  note: '3種の実測。基音 31Hz/70Hz/86Hz、アタック 40/318/204ms と全部別物',
  variants: [
    { id: 'sharp', label: 'するどい打撃', run(c, out, trs, rnd, t0) {
        // 進撃: 基音31Hz(B0)・アタック40ms・F/A→Cdim→Bmaj→G
        const rv = reverb(c, 2.0, 2.0), rg = c.createGain();
        rg.gain.value = 0.4; rv.connect(rg); rg.connect(out);
        const prog = [[0, 4, 9], [0, 3, 6], [11, 3, 6], [7, 11, 2]];
        prog.forEach((ch, i) => {
          const t = t0 + i * 0.16;
          ch.forEach(st => {
            [31, 62, 155].forEach((base, k) => {
              const o = c.createOscillator(); o.type = k ? 'sawtooth' : 'sine';
              o.frequency.value = base * Math.pow(2, st / 12);
              const g = c.createGain();
              const a = 0.14 * Math.pow(0.55, k);
              g.gain.setValueAtTime(0, t);
              g.gain.linearRampToValueAtTime(a, t + 0.04);
              g.gain.exponentialRampToValueAtTime(a * 0.001, t + 1.1);
              o.connect(g); g.connect(out); g.connect(rv);
              o.start(t); o.stop(t + 1.2);
            });
          });
        });
        return t0 + 2.0;
      } },
    { id: 'swell', label: 'ふくらむ', run(c, out, trs, rnd, t0) {
        // DB: 基音70Hz(C#2)・アタック318ms・第5倍音が最強
        const rv = reverb(c, 2.6, 1.8), rg = c.createGain();
        rg.gain.value = 0.45; rv.connect(rg); rg.connect(out);
        [1, 2, 5, 6, 8.9].forEach((m, i) => {
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.value = 70.3 * m;
          const a = (m === 5 ? 0.13 : 0.06) * Math.pow(0.9, i);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.318);
          g.gain.setValueAtTime(a, t0 + 1.4);
          g.gain.exponentialRampToValueAtTime(a * 0.001, t0 + 3.4);
          o.connect(g); g.connect(out); g.connect(rv);
          o.start(t0); o.stop(t0 + 3.5);
        });
        return t0 + 3.6;
      } },
    { id: 'chord', label: 'Fメジャー', run(c, out, trs, rnd, t0) {
        // ガキ使: 基音86Hz(F2)・アタック204ms・F3+F4+C3+A3 = Fメジャー
        const rv = reverb(c, 2.2, 2.0), rg = c.createGain();
        rg.gain.value = 0.4; rv.connect(rg); rg.connect(out);
        [[86.1, 0.10], [130.8, 0.09], [175.6, 0.13], [219, 0.08], [350, 0.10]].forEach(([f, a]) => {
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.204);
          g.gain.setValueAtTime(a, t0 + 1.2);
          g.gain.exponentialRampToValueAtTime(a * 0.001, t0 + 2.9);
          o.connect(g); g.connect(out); g.connect(rv);
          o.start(t0); o.stop(t0 + 3.0);
        });
        return t0 + 3.1;
      } },
  ],
},
{
  id: 'variety', emoji: '🔔', label: 'バラエティ', category: 'meme', color: '#C2306B',
  note: 'ピンポン♪ / ブブー✗ / ドラムロール。文字数で出し分け',
  variants: [
    { id: 'correct', label: 'ピンポン', run(c, out, trs, rnd, t0) {
        chime(c, out, t0, 880, 1.0, 0.18);
        chime(c, out, t0 + 0.18, 1174, 1.4, 0.18);
        return t0 + 1.7;
      } },
    { id: 'wrong', label: 'ブブー', run(c, out, trs, rnd, t0) {
        [0, 0.26].forEach(d => {
          [155, 233].forEach(f => {
            const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
            const g = c.createGain();
            g.gain.setValueAtTime(0, t0 + d);
            g.gain.linearRampToValueAtTime(0.14, t0 + d + 0.01);
            g.gain.setValueAtTime(0.14, t0 + d + 0.18);
            g.gain.linearRampToValueAtTime(0, t0 + d + 0.21);
            o.connect(g); g.connect(out); o.start(t0 + d); o.stop(t0 + d + 0.25);
          });
        });
        return t0 + 0.8;
      } },
    { id: 'zukoh', label: 'ズコー', run(c, out, trs, rnd, t0) {
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(1400, t0);
        o.frequency.exponentialRampToValueAtTime(180, t0 + 0.55);
        const g = c.createGain();
        g.gain.setValueAtTime(0.2, t0);
        g.gain.exponentialRampToValueAtTime(0.002, t0 + 0.6);
        o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.65);
        const s = noise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
        const cg = c.createGain();
        cg.gain.setValueAtTime(0.3, t0 + 0.55);
        cg.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.6);
        s.connect(hp); hp.connect(cg); cg.connect(out);
        s.start(t0 + 0.55); s.stop(t0 + 1.7);
        return t0 + 1.8;
      } },
  ],
},
];

/* ---- ヘルパ ---- */

/** 声の質感を持つ粒。フォルマントを共鳴として使うが言語ではない。 */
function voiceGrain(c, dest, t, x, rnd, jump, baseF0, gain = 0.4, noiseAmt = 0.12) {
  const dur = 0.20 * (1 + x.hold * 0.8);
  const f = baseF0 * rs(0.7, 1.5, x.bright);
  const amp = c.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.02);
  amp.gain.setValueAtTime(gain, t + dur * 0.7);
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
  amp.connect(dest);
  // f0 と f0/2（サブハーモニクス = 二重声の正体）
  [[1, 1], [0.5, 0.3]].forEach(([m, g]) => {
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * m, t);
    const steps = 8;
    for (let k = 1; k <= steps; k++) {
      const p = k / steps;
      const base = jump && p > 0.6 ? f * m * rs(1, 2, (p - 0.6) / 0.4) : f * m;
      o.frequency.linearRampToValueAtTime(base * (1 + (rnd() - 0.5) * 0.12), t + dur * p);
    }
    const gg = c.createGain(); gg.gain.value = g;
    [[850, 1], [1420, 1.1], [2700, 0.35]].forEach(([ff, q]) => {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff * rs(0.8, 1.25, x.bright);
      bp.Q.value = 9;
      const g3 = c.createGain(); g3.gain.value = q;
      o.connect(bp); bp.connect(g3); g3.connect(gg);
    });
    gg.connect(amp); o.start(t); o.stop(t + dur + 0.05);
  });
  if (x.noisy > 0.3) {
    const n = noise(c);
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = fBright(x); nf.Q.value = 2;
    const ng = c.createGain();
    ng.gain.setValueAtTime(noiseAmt * x.noisy, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    n.connect(nf); nf.connect(ng); ng.connect(amp);
    n.start(t); n.stop(t + dur);
  }
  return dur;
}

function fart(scale, squeak = false) {
  return function (c, out, trs, rnd, t0) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = squeak ? 1600 : 680; lp.Q.value = 5;
    const d = distortion(c, 3.2);
    lp.connect(d); d.connect(out);
    let t = t0;
    trs.slice(0, 7).forEach(x => {
      const len = (0.18 + x.ring * 0.3 + x.hold * 0.15) * scale;
      const f = squeak ? rs(320, 140, x.weight) : rs(120, 44, x.weight);
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      for (let k = 1; k <= 6; k++) {
        o.frequency.linearRampToValueAtTime(f * (0.7 + rnd() * 0.75), t + len * k / 6);
      }
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.42, t + 0.02);
      g.gain.setValueAtTime(0.42, t + len * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + len + 0.03);
      t += len + 0.05;
    });
    // 最後は必ずしぼむ
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(squeak ? 260 : 95, t);
    o.frequency.exponentialRampToValueAtTime(squeak ? 120 : 38, t + 0.85);
    const g = c.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.95);
    return t + 1.0;
  };
}
