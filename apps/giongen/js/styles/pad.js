/** ✨ 雰囲気・演出。パッド・和音・リバーブ系。 */
import { reverb, noise, delay } from '../fx.js';
import { chime, tone, kick, metal, riser } from '../instruments.js';
import { rs } from '../traits.js';
import { render } from '../engine.js';

const MAJ = [0, 2, 4, 7, 9, 11];        // リディアン寄り
const MIYAKO = [0, 1, 5, 7, 8];         // 都節音階（和風）
const pickFrom = (sc, x) => sc[Math.floor(x.bright * (sc.length - 1))];

export default [
{
  id: 'mystic', emoji: '✨', label: '神秘', category: 'pad', color: '#7A5AA8',
  note: 'デチューン合唱＋長三和音パッド＋チャイム（1x/3x/5x）',
  variants: [
    { id: 'holy', label: 'こうごうしい', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 3.2, 2.2), rg = c.createGain();
        rg.gain.value = 0.55; rv.connect(rg); rg.connect(out);
        [0, 4, 7, 11, 14].forEach((st, i) => {
          const o = c.createOscillator(); o.type = 'triangle';
          o.frequency.value = 261.6 * Math.pow(2, st / 12);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0 + i * 0.32);
          g.gain.linearRampToValueAtTime(0.07, t0 + i * 0.32 + 0.7);
          g.gain.linearRampToValueAtTime(0, t0 + 4.6);
          o.connect(g); g.connect(rv); o.start(t0 + i * 0.32); o.stop(t0 + 4.7);
        });
        let t = t0 + 0.2;
        trs.forEach(x => {
          chime(c, rv, t, 523.25 * Math.pow(2, pickFrom(MAJ, x) / 12), 1.8, 0.10 + x.accent * 0.05);
          t += 0.30;
        });
        return Math.max(t, t0 + 4.8);
      } },
  ],
},
{
  id: 'fantasy', emoji: '🧚', label: 'ファンタジー', category: 'pad', color: '#7A5AA8',
  note: 'ハープ／チェレスタ風の上昇アルペジオ＋キラキラ粒',
  variants: [
    { id: 'magic', label: 'まほう', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.4, 2.6), rg = c.createGain();
        rg.gain.value = 0.45; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach((x, i) => {
          const f = 392 * Math.pow(2, (pickFrom(MAJ, x) + (i % 2) * 12) / 12);
          chime(c, rv, t, f, 1.2, 0.11);
          for (let k = 0; k < 3; k++) {
            chime(c, rv, t + rnd() * 0.18, 2000 + rnd() * 3000, 0.5, 0.025);
          }
          t += 0.14;
        });
        // 発動スイープ
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(4800, t + 0.6);
        const g = c.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.45);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
        o.connect(g); g.connect(rv); o.start(t); o.stop(t + 0.8);
        return t + 2.2;
      } },
  ],
},
{
  id: 'horror', emoji: '👻', label: 'ホラー', category: 'pad', color: '#7A5AA8',
  note: '低ピッチ＋長いリバーブ＋不協和な下降＋低域ドローン',
  variants: [
    { id: 'creep', label: 'ふおん', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 4.0, 1.6), rg = c.createGain();
        rg.gain.value = 0.6; rv.connect(rg); rg.connect(out);
        // ドローン
        [55, 58.3].forEach(f => {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 1.2);
          g.gain.linearRampToValueAtTime(0, t0 + 5.0);
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
          o.connect(lp); lp.connect(g); g.connect(out); g.connect(rv);
          o.start(t0); o.stop(t0 + 5.1);
        });
        let t = t0 + 0.3;
        trs.forEach(x => {
          const f = rs(70, 190, x.bright);
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 1.3, t);
          o.frequency.linearRampToValueAtTime(f * 0.8, t + 0.9);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.10, t + 0.5);   // 逆再生風の遅い立ち上がり
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
          o.connect(g); g.connect(rv); o.start(t); o.stop(t + 1.1);
          t += 0.38;
        });
        return Math.max(t + 1.5, t0 + 5.2);
      } },
  ],
},
{
  id: 'wafu', emoji: '🎎', label: '和風', category: 'pad', color: '#7A5AA8',
  note: '都節音階 [0,1,5,7,8]。琴風の撥弦＋尺八風＋太鼓',
  variants: [
    { id: 'koto', label: 'こと', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.8, 2.4), rg = c.createGain();
        rg.gain.value = 0.3; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach(x => {
          const f = 261.6 * Math.pow(2, pickFrom(MIYAKO, x) / 12);
          [1, 2, 3, 4.1, 5.3].forEach((m, i) => {
            const o = c.createOscillator(); o.type = 'triangle';
            o.frequency.value = f * m;
            const a = 0.10 * Math.pow(0.55, i);
            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(a, t + 0.004);
            g.gain.exponentialRampToValueAtTime(a * 0.001, t + 1.1 - i * 0.12);
            o.connect(g); g.connect(out); g.connect(rv);
            o.start(t); o.stop(t + 1.2);
          });
          if (x.weight > 0.6) kick(c, out, t, 0.6, 110, 55);   // 太鼓
          t += 0.24 + x.gap * 0.2;
        });
        // 締めの鈴
        chime(c, rv, t + 0.1, 2093, 2.4, 0.07);
        return t + 2.0;
      } },
  ],
},
{
  id: 'okyo', emoji: '🙏', label: 'お経', category: 'pad', color: '#7A5AA8',
  note: '低音モノトーン＋木魚の等間隔ポク＋終わりに鈴',
  variants: [
    { id: 'sutra', label: 'どっきょう', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.6, 2.0), rg = c.createGain();
        rg.gain.value = 0.3; rv.connect(rg); rg.connect(out);
        const step = 0.30;
        trs.forEach((x, i) => {
          const t = t0 + i * step;
          // ピッチはほぼ動かさない（モノトーン）
          const f = 98 * Math.pow(2, (x.bright > 0.6 ? 2 : 0) / 12);
          [1, 2, 3].forEach((m, k) => {
            const o = c.createOscillator(); o.type = 'sawtooth';
            o.frequency.value = f * m;
            const a = 0.13 * Math.pow(0.45, k);
            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(a, t + 0.05);
            g.gain.setValueAtTime(a, t + step * 0.75);
            g.gain.linearRampToValueAtTime(0, t + step * 0.95);
            const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
            o.connect(lp); lp.connect(g); g.connect(out); g.connect(rv);
            o.start(t); o.stop(t + step);
          });
          // 木魚
          metal(c, out, t, 320, [1, 1.9, 3.3], 0.10, 0.14);
        });
        const e = t0 + trs.length * step;
        chime(c, rv, e + 0.15, 2637, 3.0, 0.08);   // 鈴チーン
        return e + 2.6;
      } },
  ],
},
{
  id: 'emotional', emoji: '😭', label: '感動', category: 'pad', color: '#7A5AA8',
  note: 'ストリングス風パッドがゆっくり立ち上がり、ピアノ単音が乗る',
  variants: [
    { id: 'tears', label: 'なける', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 3.0, 2.2), rg = c.createGain();
        rg.gain.value = 0.5; rv.connect(rg); rg.connect(out);
        [0, 7, 12, 16].forEach((st, i) => {
          [-6, 6].forEach(dt => {
            const o = c.createOscillator(); o.type = 'sawtooth';
            o.frequency.value = 174.6 * Math.pow(2, st / 12);
            o.detune.value = dt;
            const g = c.createGain();
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(0.038, t0 + 1.4);
            g.gain.linearRampToValueAtTime(0, t0 + 5.2);
            const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
            o.connect(lp); lp.connect(g); g.connect(out); g.connect(rv);
            o.start(t0); o.stop(t0 + 5.3);
          });
        });
        let t = t0 + 0.5;
        trs.forEach(x => {
          const f = 349.2 * Math.pow(2, pickFrom([0, 2, 4, 5, 7, 9, 11], x) / 12);
          [1, 2, 3].forEach((m, k) => {
            const o = c.createOscillator(); o.type = 'triangle';
            o.frequency.value = f * m;
            const a = 0.085 * Math.pow(0.4, k);
            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(a, t + 0.01);
            g.gain.exponentialRampToValueAtTime(a * 0.001, t + 1.6);
            o.connect(g); g.connect(out); g.connect(rv);
            o.start(t); o.stop(t + 1.7);
          });
          t += 0.42;
        });
        return Math.max(t + 1.6, t0 + 5.4);
      } },
  ],
},
];
