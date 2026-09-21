/** 🤖 機械・SF。モールスとDTMFは実在の符号表を使う完全アルゴリズミック枠。 */
import { noise, ringMod, bitcrush, distortion, reverb } from '../fx.js';
import { tone, metal } from '../instruments.js';
import { rs, fBright } from '../traits.js';
import { render } from '../engine.js';

/** 和文モールス符号（・=短点 -=長点） */
const MORSE = {
  'あ':'--・--','い':'・-','う':'・・-','え':'-・---','お':'・-・・・',
  'か':'・-・・','き':'-・-・・','く':'・・・-','け':'-・--','こ':'----',
  'さ':'-・-・-','し':'--・-・','す':'---・-','せ':'・---・','そ':'---・',
  'た':'-・','ち':'・・-・','つ':'・--・','て':'・-・--','と':'・・-・・',
  'な':'・-・','に':'-・-・','ぬ':'・・・・','ね':'--・-','の':'・・--',
  'は':'-・・・','ひ':'--・・-','ふ':'--・・','へ':'・','ほ':'-・・',
  'ま':'-・・-','み':'・・-・-','む':'-','め':'-・・・-','も':'-・・-・',
  'や':'・--','ゆ':'-・・--','よ':'--',
  'ら':'・・・','り':'--・','る':'-・---','れ':'---','ろ':'・-・-',
  'わ':'-・-','ゐ':'・-・・-','ゑ':'・--・・','を':'・---',
  'ん':'・-・-・','ー':'・--・-','っ':'・--・',
};
/** DTMF（実在の周波数表） */
const DTMF_ROW = [697, 770, 852, 941], DTMF_COL = [1209, 1336, 1477, 1633];

export default [
{
  id: 'robot', emoji: '🤖', label: 'ロボット', category: 'scifi', color: '#2E7D74',
  note: 'リングモッド30〜80Hz＋ビットクラッシュ。ピッチ完全固定',
  variants: [
    { id: 'mono', label: 'きかいおん', run(c, out, trs, rnd, t0) {
        const rm = ringMod(c, 48);
        const bc = bitcrush(c, 4);
        rm.node.connect(bc); bc.connect(out);
        return render(c, rm.node, trs, { t0, gain: 0.42, base: 0.15,
          wave: 'square', partials: [1, 1.5, 2] });
      } },
    { id: 'alien', label: 'うちゅうじん', run(c, out, trs, rnd, t0) {
        const rm = ringMod(c, 33);
        const d = distortion(c, 2);
        rm.node.connect(d); d.connect(out);
        let t = t0;
        trs.forEach(x => {
          // 通信ノイズ
          const s = noise(c);
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
          bp.frequency.setValueAtTime(rs(600, 4000, x.bright), t);
          bp.frequency.exponentialRampToValueAtTime(rs(4000, 600, x.bright), t + 0.14);
          const g = c.createGain();
          g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          s.connect(bp); bp.connect(g); g.connect(rm.node); s.start(t); s.stop(t + 0.18);
          tone(c, rm.node, t, rs(120, 500, x.bright), 0.16, 0.14, 'square');
          t += 0.19;
        });
        return t + 0.4;
      } },
  ],
},
{
  id: 'morse', emoji: '📡', label: '和文モールス', category: 'scifi', color: '#2E7D74',
  note: '実在の和文モールス符号表。短点60ms / 長点180ms',
  variants: [
    { id: 'cw', label: 'つうしん', run(c, out, trs, rnd, t0) {
        const U = 0.06;
        let t = t0;
        trs.forEach(x => {
          const code = MORSE[x.kana] || MORSE[x.kana[0]] || '・-';
          for (const ch of code) {
            const d = ch === '-' ? U * 3 : U;
            tone(c, out, t, 700, d * 0.9, 0.2, 'sine');
            t += d + U;
          }
          t += U * 2;           // 文字間
        });
        return t + 0.3;
      } },
  ],
},
{
  id: 'dialup', emoji: '☎️', label: 'ダイヤルアップ', category: 'scifi', color: '#2E7D74',
  note: 'かなを実在のDTMF周波数ペアに符号化＋キャリアノイズ',
  variants: [
    { id: 'modem', label: 'ピーガガガ', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach((x, i) => {
          const r = DTMF_ROW[Math.floor(x.weight * 3.99)];
          const cl = DTMF_COL[Math.floor(x.bright * 3.99)];
          [r, cl].forEach(f => tone(c, out, t, f, 0.12, 0.09, 'sine'));
          t += 0.15;
        });
        // キャリアノイズ
        const s = noise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 1800; bp.Q.value = 1.4;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.1);
        g.gain.setValueAtTime(0.13, t + 0.9); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + 1.3);
        tone(c, out, t, 2100, 1.1, 0.06, 'sine');
        return t + 1.4;
      } },
  ],
},
{
  id: 'laser', emoji: '🔫', label: 'レーザー', category: 'scifi', color: '#2E7D74',
  note: '高速下降ピッチスイープ。1文字 = 1発',
  variants: [
    { id: 'pew', label: 'ビーム', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach(x => {
          const f = rs(900, 3200, x.bright);
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * 0.12, t + 0.16);
          const g = c.createGain();
          g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
          t += 0.14;
        });
        return t + 0.4;
      } },
  ],
},
{
  id: 'siren', emoji: '🚨', label: 'サイレン', category: 'scifi', color: '#2E7D74',
  note: '半音クラスターが不穏さの正体（緊急地震速報・エヴァで実測）',
  variants: [
    { id: 'alarm', label: 'けいほう', run(c, out, trs, rnd, t0) {
        const n = Math.max(3, Math.min(trs.length, 8));
        for (let i = 0; i < n; i++) {
          const x = trs[i % trs.length], t = t0 + i * 0.42;
          const f = rs(500, 1100, x.bright);
          [1, 1.06].forEach((m, k) => tone(c, out, t, f * m, 0.34, 0.11, 'square', k ? 4 : 0));
        }
        return t0 + n * 0.42 + 0.4;
      } },
    { id: 'wail', label: 'うなり', run(c, out, trs, rnd, t0) {
        const dur = 1.2 + trs.length * 0.12;
        const o = c.createOscillator(); o.type = 'sawtooth';
        const base = rs(300, 700, trs.reduce((s, x) => s + x.bright, 0) / trs.length);
        o.frequency.setValueAtTime(base, t0);
        const cycles = Math.max(2, Math.round(dur / 0.9));
        for (let i = 1; i <= cycles * 2; i++) {
          o.frequency.linearRampToValueAtTime(i % 2 ? base * 1.6 : base, t0 + (dur / (cycles * 2)) * i);
        }
        const g = c.createGain();
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.13, t0 + 0.15);
        g.gain.setValueAtTime(0.13, t0 + dur - 0.2);
        g.gain.linearRampToValueAtTime(0, t0 + dur);
        o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
        return t0 + dur + 0.2;
      } },
  ],
},
{
  id: 'typewriter', emoji: '⌨️', label: 'タイプライター', category: 'scifi', color: '#2E7D74',
  note: '1文字 = 1打鍵。行末でチン＋キャリッジリターン',
  variants: [
    { id: 'type', label: 'タイプ', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach((x, i) => {
          metal(c, out, t, rs(900, 2200, x.bright), [1, 1.7, 2.9, 5.1], 0.07, 0.2);
          t += 0.11 + rnd() * 0.03;
          if ((i + 1) % 8 === 0) {
            metal(c, out, t + 0.1, 2400, [1, 2.4, 4.1], 0.7, 0.16);  // チン
            t += 0.5;
          }
        });
        return t + 0.5;
      } },
  ],
},
];
