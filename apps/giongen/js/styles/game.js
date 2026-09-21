/** 🎮 ゲーム・電子。ポケセンの実測「奇数倍音が支配的」= square が素直に当てはまる。 */
import { tone, chime, kick, snare, hat, riser, metal } from '../instruments.js';
import { noise, reverb, bitcrush } from '../fx.js';
import { rs } from '../traits.js';

const SC = [0, 2, 4, 7, 9];
const pick = (x, root = 330) => root * Math.pow(2, SC[Math.floor(x.bright * (SC.length - 1))] / 12);

export default [
{
  id: 'pokecen', emoji: '💊', label: '回復音', category: 'game', color: '#2E7D74',
  note: '実測 325Hz(E4)・奇数倍音 3x/9x/15x 支配 = 矩形波。2音目は長3度',
  variants: [
    { id: 'heal', label: 'かいふく', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.2, 2.4), rg = c.createGain();
        rg.gain.value = 0.22; rv.connect(rg); rg.connect(out);
        const n = Math.max(2, Math.min(trs.length, 6));
        for (let i = 0; i < n; i++) {
          const x = trs[i % trs.length], t = t0 + i * 0.904 / 2;
          const f = pick(x, 325);
          tone(c, out, t, f, 0.5, 0.12, 'square');
          tone(c, rv, t, f * Math.pow(2, 4 / 12), 0.5, 0.09, 'square', 6);
        }
        return t0 + n * 0.452 + 0.8;
      } },
  ],
},
{
  id: 'famicom', emoji: '🎮', label: 'ファミコン', category: 'game', color: '#2E7D74',
  note: '三角波＋矩形波。子音の鋭さでジャンプ／コイン／やられを出し分け',
  variants: [
    { id: 'se', label: 'こうかおん', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach(x => {
          const f = pick(x, 440);
          if (x.attack < 0.1) {            // 破裂音 → ジャンプ
            const o = c.createOscillator(); o.type = 'square';
            o.frequency.setValueAtTime(f * 0.6, t);
            o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.12);
            const g = c.createGain();
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
          } else if (x.noisy > 0.6) {      // 摩擦音 → やられ
            const s = noise(c);
            const bp = c.createBiquadFilter(); bp.type = 'bandpass';
            bp.frequency.setValueAtTime(3000, t);
            bp.frequency.exponentialRampToValueAtTime(400, t + 0.2);
            const g = c.createGain();
            g.gain.setValueAtTime(0.22, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
            s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + 0.3);
          } else {                          // それ以外 → コイン
            tone(c, out, t, f * 2, 0.06, 0.13, 'square');
            tone(c, out, t + 0.06, f * 3, 0.18, 0.13, 'square');
          }
          t += 0.2 + x.gap * 0.12;
        });
        return t + 0.4;
      } },
    { id: 'levelup', label: 'レベルアップ', run(c, out, trs, rnd, t0) {
        const steps = [0, 4, 7, 12, 16, 19];
        const n = Math.max(3, Math.min(trs.length + 2, 6));
        for (let i = 0; i < n; i++) {
          tone(c, out, t0 + i * 0.09, 392 * Math.pow(2, steps[i] / 12), 0.28, 0.13, 'square');
        }
        return t0 + n * 0.09 + 0.5;
      } },
  ],
},
{
  id: 'rpgmsg', emoji: '📜', label: 'メッセージ送り', category: 'game', color: '#2E7D74',
  note: '1文字 = 1ピコ音。入力文字数に完全依存する',
  variants: [
    { id: 'text', label: 'テキスト', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach(x => {
          tone(c, out, t, rs(700, 1500, x.bright), 0.035, 0.10, 'square');
          t += 0.075;
        });
        // 終わりのピロリロリン
        [0, 4, 7, 12].forEach((st, i) =>
          tone(c, out, t + 0.12 + i * 0.07, 523 * Math.pow(2, st / 12), 0.22, 0.11, 'square'));
        return t + 0.6;
      } },
  ],
},
{
  id: 'fight', emoji: '👊', label: '格ゲー必殺技', category: 'game', color: '#2E7D74',
  note: '促音でヒットストップ（無音）→ 爆発＋低域ドン',
  variants: [
    { id: 'super', label: 'ひっさつ', run(c, out, trs, rnd, t0) {
        let t = t0;
        trs.forEach(x => {
          if (x.accent) t += 0.09;               // ヒットストップ
          const f = rs(180, 700, x.bright);
          const o = c.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 1.6, t);
          o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.13);
          const g = c.createGain();
          g.gain.setValueAtTime(0.16 * (1 + x.accent), t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
          if (x.accent) kick(c, out, t, 1.0, 220, 40);
          t += 0.15;
        });
        // 締めの爆発
        const s = noise(c);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.8);
        const g = c.createGain();
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        s.connect(lp); lp.connect(g); g.connect(out); s.start(t); s.stop(t + 1.0);
        kick(c, out, t, 1.2, 260, 32);
        return t + 1.2;
      } },
  ],
},
{
  id: 'gameover', emoji: '💀', label: 'ゲームオーバー', category: 'game', color: '#2E7D74',
  note: '下降する半音階。最後はテープストップ風に止まる',
  variants: [
    { id: 'down', label: 'おわり', run(c, out, trs, rnd, t0) {
        const n = Math.max(4, Math.min(trs.length + 2, 8));
        for (let i = 0; i < n; i++) {
          tone(c, out, t0 + i * 0.14, 392 * Math.pow(2, -i * 1.5 / 12), 0.3, 0.13, 'square');
        }
        const t = t0 + n * 0.14;
        const o = c.createOscillator(); o.type = 'square';
        o.frequency.setValueAtTime(392 * Math.pow(2, -n * 1.5 / 12), t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.9);
        const g = c.createGain();
        g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.1);
        return t + 1.3;
      } },
  ],
},
{
  id: 'gacha', emoji: '🎲', label: 'ガチャ演出', category: 'game', color: '#2E7D74',
  note: '文字数が多いほど溜めが長い。虹 or 銀 で分岐',
  variants: [
    { id: 'rainbow', label: 'にじ', run: gacha(true) },
    { id: 'silver',  label: 'ぎん', run: gacha(false) },
  ],
},
];

function gacha(win) {
  return function (c, out, trs, rnd, t0) {
    const build = 0.7 + Math.min(trs.length, 10) * 0.12;
    riser(c, out, t0, build, 0.18);
    const n = Math.round(build / 0.07);
    for (let i = 0; i < n; i++) hat(c, out, t0 + i * 0.07, 0.06 + (i / n) * 0.12, 0.04);
    const t = t0 + build + 0.12;
    if (win) {
      [0, 4, 7, 12, 16].forEach((st, i) => {
        tone(c, out, t + i * 0.06, 523 * Math.pow(2, st / 12), 1.5, 0.11, 'square', i % 2 ? 8 : -8);
        chime(c, out, t + i * 0.06, 1046 * Math.pow(2, st / 12), 1.8, 0.05);
      });
      return t + 2.2;
    }
    [0, 3, 7].forEach((st, i) => tone(c, out, t + i * 0.07, 392 * Math.pow(2, st / 12), 0.7, 0.1, 'triangle'));
    return t + 1.2;
  };
}
