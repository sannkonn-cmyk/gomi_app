/** 🐱 猫ミーム。実測の鳴き声フォルマント（人の ×1.62 / ×1.36）を共鳴体に使う。
 *  発音はしない。4素材の実測BPM・帯域特性から作り分けている。 */
import { meow, kick, hat, snare, shaker, tone } from '../instruments.js';
import { reverb, noise } from '../fx.js';
import { rs } from '../traits.js';

export default [
{
  id: 'cat', emoji: '🐱', label: 'ねこ', category: 'cat', color: '#C2306B',
  note: '実測 F1 1299Hz / F2 1767Hz・f0中央値 848Hz・レンジ34.2半音',
  variants: [
    { id: 'meow', label: 'なきごえ', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.0, 2.6), rg = c.createGain();
        rg.gain.value = 0.15; rv.connect(rg); rg.connect(out);
        const dry = c.createGain(); dry.gain.value = 1;
        dry.connect(out); dry.connect(rv);
        let t = t0;
        trs.forEach(x => { t += x.gap * 0.18; t += meow(c, dry, t, x) + 0.03; });
        return t + 0.6;
      } },
    { id: 'dance', label: 'ダンス 137BPM', run(c, out, trs, rnd, t0) {
        const beat = 60 / 137, e = beat / 2;
        const bars = Math.max(2, Math.ceil(trs.length / 8) + 1);
        for (let i = 0; i < bars * 4; i++) {
          const t = t0 + i * beat;
          kick(c, out, t, 0.95, 150, 42);
          hat(c, out, t + e, 0.11, 0.04);
          if (i % 4 === 2) snare(c, out, t, 0.22);
        }
        trs.forEach((x, i) => meow(c, out, t0 + e + i * e, x, { dur: e * 0.9, gain: 0.28 }));
        return t0 + bars * 4 * beat + 0.3;
      } },
    { id: 'chipi', label: 'チピチャパ 149BPM', run(c, out, trs, rnd, t0) {
        const beat = 60 / 149, e = beat / 2;
        const br = c.createBiquadFilter();
        br.type = 'highshelf'; br.frequency.value = 4000; br.gain.value = 9;
        br.connect(out);
        const n = Math.max(8, trs.length + 4);
        for (let i = 0; i < n; i++) {
          const t = t0 + i * e;
          shaker(c, br, t, 0.10);
          if (i % 4 === 0) kick(c, out, t, 0.5, 120, 55);
          if (i % 4 === 2) snare(c, br, t, 0.14);
        }
        trs.forEach((x, i) => meow(c, br, t0 + e + i * e, x,
          { dur: e * 0.5, gain: 0.26, pitchScale: 1.25 }));
        return t0 + n * e + 0.3;
      } },
    { id: 'sad', label: 'かなしいねこ', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.2, 2.0), rg = c.createGain();
        rg.gain.value = 0.35; rv.connect(rg); rg.connect(out);
        const dry = c.createGain(); dry.gain.value = 0.8;
        dry.connect(out); dry.connect(rv);
        // 弱々しい下降パッド
        [0, 3, 7].forEach((st, i) => {
          const o = c.createOscillator(); o.type = 'triangle';
          o.frequency.setValueAtTime(196 * Math.pow(2, st / 12), t0);
          o.frequency.linearRampToValueAtTime(196 * Math.pow(2, (st - 2) / 12), t0 + 3);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.05, t0 + 0.8);
          g.gain.linearRampToValueAtTime(0, t0 + 3.2);
          o.connect(g); g.connect(rv); o.start(t0); o.stop(t0 + 3.3);
        });
        let t = t0 + 0.2;
        trs.forEach(x => {
          const d = meow(c, dry, t, { ...x, sweep: -0.6 }, { dur: 0.42, gain: 0.26, pitchScale: 0.72 });
          t += d + 0.08;
        });
        return t + 1.2;
      } },
    { id: 'huh', label: 'は？', run(c, out, trs, rnd, t0) {
        // 実測: f0 123→160Hz の谷→上昇、F1 510 / F2 915（≒「お」）
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(out);
        let t = t0;
        trs.slice(0, 4).forEach(x => {
          const dur = 0.30 * (1 + x.hold * 0.8);
          const f = rs(110, 175, x.bright);
          const osc = c.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.linearRampToValueAtTime(f * 0.92, t + dur * 0.35);
          osc.frequency.linearRampToValueAtTime(f * 1.24, t + dur);
          const amp = c.createGain();
          amp.gain.setValueAtTime(0, t);
          amp.gain.linearRampToValueAtTime(0.5, t + 0.05);
          amp.gain.setValueAtTime(0.5, t + dur * 0.7);
          amp.gain.exponentialRampToValueAtTime(0.002, t + dur);
          [[510, 1], [915, 1.1], [2400, 0.25]].forEach(([ff, gg]) => {
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 8;
            const g = c.createGain(); g.gain.value = gg;
            osc.connect(bp); bp.connect(g); g.connect(amp);
          });
          amp.connect(lp); osc.start(t); osc.stop(t + dur + 0.05);
          t += dur + 0.06;
        });
        return t + 0.4;
      } },
  ],
},
];
