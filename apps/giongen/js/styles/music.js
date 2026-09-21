/** 🎵 音楽・歌。文字がリズムと音程を駆動する。 */
import { reverb, delay, ringMod, distortion, noise } from '../fx.js';
import { kick, snare, hat, shaker, tone, chime, riser } from '../instruments.js';
import { rs } from '../traits.js';

const SC = [0, 2, 4, 7, 9];
const ENKA = [0, 2, 3, 7, 8];

export default [
{
  id: 'beatbox', emoji: '🥁', label: 'ビートボックス', category: 'music', color: '#B4711C',
  note: 'アタック→キック/スネア、ノイズ→ハット、重さ→ベース、「っ」→休符',
  variants: [
    { id: 'basic', label: 'きほん', run: beatbox(0.155) },
    { id: 'fast',  label: 'はやい', run: beatbox(0.105) },
  ],
},
{
  id: 'rap', emoji: '🎙', label: 'ラップ', category: 'music', color: '#B4711C',
  note: '16分グリッドに詰める＋トークボックス風のリングモッド',
  variants: [
    { id: 'flow', label: 'フロー', run(c, out, trs, rnd, t0) {
        const bpm = 90, six = 60 / bpm / 4;
        const bars = Math.ceil(trs.length / 16) + 1;
        for (let i = 0; i < bars * 8; i++) {
          const t = t0 + i * six * 2;
          if (i % 4 === 0) kick(c, out, t, 0.85, 150, 45);
          if (i % 4 === 2) snare(c, out, t, 0.22);
          hat(c, out, t + six, 0.09, 0.04);
        }
        const rm = ringMod(c, 62);
        rm.node.connect(out);
        trs.forEach((x, i) => {
          const t = t0 + i * six;
          tone(c, rm.node, t, rs(120, 420, x.bright), six * 0.85, 0.3,
               x.voiced ? 'sawtooth' : 'square');
        });
        return t0 + Math.max(bars * 8 * six * 2, trs.length * six) + 0.5;
      } },
  ],
},
{
  id: 'edm', emoji: '🔊', label: 'EDMドロップ', category: 'music', color: '#B4711C',
  note: 'ライザーで煽り → 無音の「間」→ サイドチェインの効いたドロップ',
  variants: [
    { id: 'drop', label: 'ドロップ', run(c, out, trs, rnd, t0) {
        const build = 1.4;
        riser(c, out, t0, build, 0.22);
        for (let i = 0; i < 8; i++) hat(c, out, t0 + i * build / 8, 0.06 + i * 0.015, 0.04);
        const t = t0 + build + 0.25;       // 間
        const beat = 60 / 128;
        const duck = c.createGain(); duck.gain.value = 1; duck.connect(out);
        const n = Math.max(8, trs.length);
        for (let i = 0; i < n; i++) {
          const tt = t + i * beat;
          kick(c, out, tt, 1.0, 160, 42);
          duck.gain.setValueAtTime(0.15, tt);
          duck.gain.linearRampToValueAtTime(1, tt + beat * 0.75);
        }
        trs.forEach((x, i) => {
          const tt = t + i * beat;
          [0, -12].forEach(dt =>
            tone(c, duck, tt, 220 * Math.pow(2, SC[Math.floor(x.bright * 4)] / 12), beat * 0.9,
                 0.13, 'sawtooth', dt));
        });
        return t + n * beat + 0.4;
      } },
  ],
},
{
  id: 'enka', emoji: '🎌', label: '演歌こぶし', category: 'music', color: '#B4711C',
  note: 'ピッチを細かく揺らす「こぶし」＋長音で大きくしゃくり上げる',
  variants: [
    { id: 'kobushi', label: 'こぶし', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.0, 2.2), rg = c.createGain();
        rg.gain.value = 0.32; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach(x => {
          const dur = 0.42 * (1 + x.hold * 1.2);
          const f = 196 * Math.pow(2, ENKA[Math.floor(x.bright * 4)] / 12);
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.92, t);
          const wobbles = 4 + Math.round(x.hold * 3);
          for (let k = 1; k <= wobbles; k++) {
            const p = k / wobbles;
            o.frequency.linearRampToValueAtTime(f * (k % 2 ? 1.055 : 0.965), t + dur * p * 0.85);
          }
          o.frequency.linearRampToValueAtTime(f, t + dur);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.16, t + 0.06);
          g.gain.setValueAtTime(0.16, t + dur * 0.75);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
          o.connect(lp); lp.connect(g); g.connect(out); g.connect(rv);
          o.start(t); o.stop(t + dur + 0.05);
          // 三味線風の撥弦
          if (x.attack < 0.1) {
            [1, 2.1, 3.4].forEach((m, k) => {
              const s = c.createOscillator(); s.type = 'triangle';
              s.frequency.value = f * 2 * m;
              const sg = c.createGain();
              const a = 0.07 * Math.pow(0.5, k);
              sg.gain.setValueAtTime(a, t); sg.gain.exponentialRampToValueAtTime(a * 0.001, t + 0.45);
              s.connect(sg); sg.connect(out); s.start(t); s.stop(t + 0.5);
            });
          }
          t += dur * 0.9;
        });
        return t + 1.0;
      } },
  ],
},
{
  id: 'opera', emoji: '🎭', label: 'オペラ', category: 'music', color: '#B4711C',
  note: '強いビブラート＋倍音リッチ＋大ホールリバーブ',
  variants: [
    { id: 'aria', label: 'アリア', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 3.6, 1.8), rg = c.createGain();
        rg.gain.value = 0.6; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach((x, i) => {
          const last = i === trs.length - 1;
          const dur = (last ? 1.8 : 0.5) * (1 + x.hold * 0.6);
          const f = 261.6 * Math.pow(2, SC[Math.floor(x.bright * 4)] / 12) * (last ? 2 : 1);
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f, t);
          const vib = Math.round(dur / 0.14);
          for (let k = 1; k <= vib; k++) {
            o.frequency.linearRampToValueAtTime(f * (k % 2 ? 1.035 : 0.965), t + dur * k / vib);
          }
          const amp = c.createGain();
          amp.gain.setValueAtTime(0, t);
          amp.gain.linearRampToValueAtTime(0.2, t + 0.1);
          amp.gain.setValueAtTime(0.2, t + dur * 0.8);
          amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
          [[700, 1], [1200, 0.9], [2800, 0.5], [3500, 0.3]].forEach(([ff, gg]) => {
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 6;
            const g = c.createGain(); g.gain.value = gg;
            o.connect(bp); bp.connect(g); g.connect(amp);
          });
          amp.connect(out); amp.connect(rv);
          o.start(t); o.stop(t + dur + 0.05);
          t += dur * 0.92;
        });
        return t + 2.5;
      } },
  ],
},
];

function beatbox(step) {
  return function (c, out, trs, rnd, t0) {
    trs.forEach((x, i) => {
      const t = t0 + i * step + x.gap * 0.1;
      if (x.attack < 0.1) (x.bright > 0.6 ? snare : kick)(c, out, t, 0.8, 160, 45);
      else if (x.noisy > 0.6) hat(c, out, t, 0.3, 0.05 + x.ring * 0.06);
      else if (x.weight > 0.6) tone(c, out, t, rs(58, 95, 1 - x.weight), 0.2, 0.32, 'sine');
      else shaker(c, out, t, 0.24);
    });
    return t0 + trs.length * step + 0.5;
  };
}
