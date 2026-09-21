/** 🎰 パチスロ・パチンコ。実測値の宝庫。
 *  共通して「>2kHzブースト + 低域カット」を通す（実測の主要因）。
 *  測定値は出発点。特徴を出すため 1.3〜1.8倍に誇張している。 */
import { pachiChain, silenceGate, noise } from '../fx.js';
import { metal, tone, kick, hat, snare, riser, chime,
         GAKO_RATIOS, SAKIBARE_RATIOS } from '../instruments.js';
import { rs } from '../traits.js';
import { render } from '../engine.js';

export default [
{
  id: 'gako', emoji: '🎰', label: 'ガコッ', category: 'pachi', color: '#C77A20',
  note: '実測比 1.00/1.23/1.51/2.24/6.31/6.38/12.05・減衰265ms',
  variants: [
    { id: 'single', label: 'ひとつ', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 5, 110);
        let t = t0;
        trs.slice(0, 10).forEach(x => {
          metal(c, ch, t, rs(105, 300, x.bright), GAKO_RATIOS,
                0.22 + x.ring * 0.22, 0.24 + x.accent * 0.14);
          t += 0.19 + x.gap * 0.12;
        });
        return t + 0.4;
      } },
    { id: 'roll', label: 'れんだ', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 6, 110);
        let t = t0;
        trs.slice(0, 8).forEach(x => {
          const n = 2 + Math.round(x.bright * 3);
          for (let i = 0; i < n; i++) {
            // 連打は重なるので1発あたりを絞る（重ねるとピークが1.0を超える）
            metal(c, ch, t + i * 0.055, rs(110, 320, x.bright) * (1 + i * 0.04),
                  GAKO_RATIOS, 0.16, 0.13 * Math.pow(0.92, i));
          }
          t += n * 0.055 + 0.12;
        });
        return t + 0.4;
      } },
    { id: 'lever', label: 'レバーオン', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 5, 100);
        metal(c, ch, t0, 92, GAKO_RATIOS, 0.5, 0.36);
        let t = t0 + 0.26;
        trs.slice(0, 8).forEach(x => {
          metal(c, ch, t, rs(140, 380, x.bright), GAKO_RATIOS, 0.2, 0.2);
          t += 0.17;
        });
        return t + 0.4;
      } },
  ],
},
{
  id: 'sakibare', emoji: '🎰', label: '先バレ', category: 'pachi', color: '#C77A20',
  note: '実測 f0 927Hz・比 1.00/1.19(長3度)/1.64/1.85・アタック33ms',
  variants: [
    { id: 'sustain', label: 'ロング', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 7, 200);
        const dur = 2.6;
        SAKIBARE_RATIOS.forEach((r, i) => [0, 6, -6].forEach((dt, k) => {
          const o = c.createOscillator();
          o.type = k ? 'triangle' : 'sawtooth';
          o.frequency.value = 927 * r; o.detune.value = dt;
          const a = 0.09 * Math.pow(0.68, i) * (k ? 0.45 : 1);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.033);
          g.gain.exponentialRampToValueAtTime(a * 0.0015, t0 + dur);
          o.connect(g); g.connect(ch); o.start(t0); o.stop(t0 + dur + 0.05);
        }));
        let t = t0 + 0.12;
        trs.slice(0, 10).forEach(x => {
          metal(c, ch, t, rs(330, 760, x.bright), SAKIBARE_RATIOS, 0.4, 0.13);
          t += 0.17;
        });
        return t0 + dur + 0.2;
      } },
    { id: 'short', label: 'ショート', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 7, 200);
        let t = t0;
        trs.slice(0, 10).forEach(x => {
          metal(c, ch, t, rs(400, 980, x.bright), SAKIBARE_RATIOS, 0.55, 0.2);
          t += 0.22 + x.gap * 0.15;
        });
        return t + 0.7;
      } },
  ],
},
{
  id: 'kyuin', emoji: '✨', label: 'キュイン', category: 'pachi', color: '#C77A20',
  note: '上昇スイープ 70〜90ms / 10〜16半音（実測）＋コーラス',
  variants: [
    { id: 'classic', label: 'キュイン', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 8, 220);
        let t = t0;
        trs.slice(0, 8).forEach(x => {
          const f = rs(320, 900, x.bright);
          [0, 12, -12].forEach(dt => {
            const o = c.createOscillator();
            o.type = dt ? 'square' : 'sawtooth';
            o.detune.value = dt;
            o.frequency.setValueAtTime(f * 0.45, t);
            o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.085);
            o.frequency.setValueAtTime(f * 2.2, t + 0.085);
            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(dt ? 0.06 : 0.14, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 0.34);
            o.connect(g); g.connect(ch); o.start(t); o.stop(t + 0.38);
          });
          t += 0.24 + x.gap * 0.2;
        });
        return t + 0.4;
      } },
    { id: 'chuin', label: 'チュイーン', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 6, 200);
        let t = t0;
        trs.slice(0, 6).forEach(x => {
          const f = rs(260, 700, x.bright);
          const o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.setValueAtTime(f * 0.6, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.26);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.18, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
          o.connect(g); g.connect(ch); o.start(t); o.stop(t + 0.55);
          t += 0.34;
        });
        return t + 0.5;
      } },
  ],
},
{
  id: 'gijiren', emoji: '🔁', label: '疑似連', category: 'pachi', color: '#C77A20',
  note: '文字数 = 繰り返し回数。1回ごとに +1半音',
  variants: [
    { id: 'up', label: 'はんおんあげ', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 6, 170);
        const n = Math.max(3, Math.min(trs.length, 7));
        for (let i = 0; i < n; i++) {
          const x = trs[i % trs.length], t = t0 + i * 0.44;
          const f = rs(210, 620, x.bright) * Math.pow(2, i / 12);
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.4, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.085);
          o.frequency.setValueAtTime(f * 1.8, t + 0.085);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.18, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0008, t + 0.38);
          o.connect(g); g.connect(ch); o.start(t); o.stop(t + 0.42);
          metal(c, ch, t, f * 1.5, [1, 1.23, 1.51, 2.24], 0.2, 0.13);
          hat(c, ch, t + 0.22, 0.09, 0.05);
        }
        return t0 + n * 0.44 + 0.5;
      } },
  ],
},
{
  id: 'freeze', emoji: '🧊', label: 'フリーズ', category: 'pachi', color: '#C77A20',
  note: '実測 −240dB の完全無音 0.5秒。入りは2段階で落とす',
  variants: [
    { id: 'standard', label: 'タメ0.5びょう', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 6, 180);
        const gate = c.createGain(); gate.gain.value = 1; gate.connect(ch);
        const end = render(c, gate, trs, { t0, gain: 0.42, base: 0.12,
          each: (cc, d, t, x) => {
            const f = rs(240, 900, x.bright);
            tone(cc, d, t, f, 0.13, 0.12, 'square', 0);
            tone(cc, d, t, f * 2, 0.10, 0.05, 'square', 9);
            if (x.noisy > 0.4) hat(cc, d, t, 0.10, 0.04);
            return 0.15;
          } });
        const back = silenceGate(c, gate, end + 0.08, 0.5);
        [1044, 1566, 2078].forEach((f, i) =>
          tone(c, ch, back + i * 0.05, f, 1.6, 0.12, 'square', i ? 7 : 0));
        kick(c, out, back, 0.95, 190, 48);
        metal(c, ch, back, 930, SAKIBARE_RATIOS, 1.1, 0.2);
        return back + 1.8;
      } },
    { id: 'long', label: 'ながいタメ', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 7, 180);
        const gate = c.createGain(); gate.gain.value = 1; gate.connect(ch);
        riser(c, gate, t0, 1.1, 0.16);
        const end = render(c, gate, trs, { t0, gain: 0.4, base: 0.11,
          each: (cc, d, t, x) => { tone(cc, d, t, rs(300, 1100, x.bright), 0.12, 0.11, 'square'); return 0.13; } });
        const back = silenceGate(c, gate, Math.max(end, t0 + 1.15), 1.1);
        [880, 1318, 1760, 2637].forEach((f, i) =>
          tone(c, ch, back + i * 0.04, f, 2.0, 0.11, 'square', i ? 8 : 0));
        kick(c, out, back, 1.0, 200, 44);
        metal(c, ch, back, 930, SAKIBARE_RATIOS, 1.4, 0.22);
        return back + 2.2;
      } },
  ],
},
{
  id: 'fanfare', emoji: '🎉', label: '確定ファンファーレ', category: 'pachi', color: '#C77A20',
  note: '長三和音の分散→全合奏＋ベル＋クラッシュ',
  variants: [
    { id: 'major', label: 'かくてい', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 6, 160);
        const root = rs(220, 350, trs.reduce((s, x) => s + x.bright, 0) / trs.length);
        const chord = [0, 4, 7, 12, 16];
        chord.forEach((st, i) => {
          const f = root * Math.pow(2, st / 12);
          tone(c, ch, t0 + i * 0.075, f, 1.5, 0.11, 'square', i % 2 ? 7 : -7);
          chime(c, ch, t0 + i * 0.075, f * 4, 1.6, 0.05);
        });
        trs.slice(0, 8).forEach((x, i) =>
          metal(c, ch, t0 + 0.4 + i * 0.13, rs(500, 1400, x.bright), SAKIBARE_RATIOS, 0.35, 0.1));
        const s = noise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
        const g = c.createGain();
        g.gain.setValueAtTime(0.28, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.4);
        s.connect(hp); hp.connect(g); g.connect(ch); s.start(t0); s.stop(t0 + 1.5);
        return t0 + 2.0;
      } },
  ],
},
{
  id: 'medal', emoji: '🪙', label: 'メダル払い出し', category: 'pachi', color: '#C77A20',
  note: '高周波ノイズバーストをランダム密度で散らす',
  variants: [
    { id: 'jara', label: 'ジャラジャラ', run(c, out, trs, rnd, t0) {
        const ch = pachiChain(c, out, 7, 400);
        const total = 1.0 + trs.length * 0.22;
        const n = Math.round(30 + trs.length * 14);
        for (let i = 0; i < n; i++) {
          const p = i / n;
          const t = t0 + p * total + rnd() * 0.03;
          metal(c, ch, t, 1400 + rnd() * 2600, [1, 1.41, 2.13], 0.07, 0.07 * (1 - p * 0.7));
        }
        return t0 + total + 0.4;
      } },
  ],
},
{
  id: 'drumroll', emoji: '🥁', label: '煽りドラムロール', category: 'pachi', color: '#C77A20',
  note: '低域タム連打＋クレッシェンド → 成功／失敗で分岐',
  variants: [
    { id: 'win', label: 'せいこう', run(c, out, trs, rnd, t0) {
        const dur = 1.0 + trs.length * 0.1;
        const n = Math.round(dur / 0.055);
        for (let i = 0; i < n; i++) {
          const p = i / n;
          kick(c, out, t0 + i * 0.055, 0.18 + p * 0.5, 190 - p * 50, 70);
        }
        const ch = pachiChain(c, out, 6, 160);
        const e = t0 + dur + 0.1;
        [0, 4, 7, 12].forEach((st, i) => tone(c, ch, e + i * 0.05, 262 * Math.pow(2, st / 12), 1.3, 0.12, 'square', 6));
        metal(c, ch, e, 930, SAKIBARE_RATIOS, 1.0, 0.2);
        return e + 1.6;
      } },
    { id: 'lose', label: 'しっぱい', run(c, out, trs, rnd, t0) {
        const dur = 0.9 + trs.length * 0.08;
        const n = Math.round(dur / 0.055);
        for (let i = 0; i < n; i++) kick(c, out, t0 + i * 0.055, 0.18 + (i / n) * 0.45, 190, 70);
        const e = t0 + dur + 0.1;
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, e);
        o.frequency.exponentialRampToValueAtTime(70, e + 0.9);
        const g = c.createGain();
        g.gain.setValueAtTime(0.2, e); g.gain.exponentialRampToValueAtTime(0.001, e + 0.95);
        o.connect(g); g.connect(out); o.start(e); o.stop(e + 1.0);
        return e + 1.2;
      } },
  ],
},
];
