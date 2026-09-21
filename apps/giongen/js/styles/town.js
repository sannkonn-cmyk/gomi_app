/** 🏪 まちの音。既存楽曲はメロディを再現せず、音色と質感だけを使う。
 *  音高は入力文字列から生成する。 */
import { reverb, noise } from '../fx.js';
import { chime, tone, metal, kick } from '../instruments.js';
import { rs } from '../traits.js';

const SC = [0, 2, 4, 5, 7, 9, 11];

export default [
{
  id: 'shopchime', emoji: '🏪', label: '入店音', category: 'town', color: '#2E7D74',
  note: '実測のチャイム型倍音（3倍・5倍が強く2倍・4倍が弱い）。旋律は入力由来',
  variants: [
    { id: 'enter', label: 'いらっしゃいませ', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.8, 2.6), rg = c.createGain();
        rg.gain.value = 0.32; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach(x => {
          const f = 311 * Math.pow(2, SC[Math.floor(x.bright * (SC.length - 1))] / 12);
          chime(c, rv, t, f, 1.5, 0.15);
          chime(c, rv, t, f * Math.pow(2, 4 / 12), 1.5, 0.09);   // 実測の長3度
          t += 0.34 + x.gap * 0.2;
        });
        return t + 1.8;
      } },
    { id: 'fourth', label: 'かんぜん4ど', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.8, 2.6), rg = c.createGain();
        rg.gain.value = 0.32; rv.connect(rg); rg.connect(out);
        let t = t0;
        trs.forEach(x => {
          const f = 262 * Math.pow(2, SC[Math.floor(x.bright * (SC.length - 1))] / 12);
          chime(c, rv, t, f, 1.5, 0.15);
          chime(c, rv, t, f * Math.pow(2, 5 / 12), 1.5, 0.09);   // 実測の完全4度
          t += 0.34;
        });
        return t + 1.8;
      } },
  ],
},
{
  id: 'pay', emoji: '📱', label: '決済音', category: 'town', color: '#2E7D74',
  note: '実測 2音・間隔293ms・2音目はアタック8ms/減衰199ms・重心4219Hz',
  variants: [
    { id: 'paid', label: 'しはらい', run(c, out, trs, rnd, t0) {
        const hs = c.createBiquadFilter();
        hs.type = 'highshelf'; hs.frequency.value = 2000; hs.gain.value = 6;
        hs.connect(out);
        const avg = trs.reduce((s, x) => s + x.bright, 0) / Math.max(1, trs.length);
        const f1 = rs(380, 620, avg), f2 = f1 * Math.pow(2, -1 / 12);
        [[f1, 0], [f2, 0.293]].forEach(([f, d], i) => {
          // 実測どおり1音目はデチューンで厚く、2音目はクリーンで鋭い
          (i === 0 ? [0, 40, 70] : [0]).forEach(dt =>
            tone(c, hs, t0 + d, f, i ? 0.22 : 0.26, i ? 0.16 : 0.09,
                 'triangle', dt));
        });
        return t0 + 0.9;
      } },
  ],
},
{
  id: 'crossing', emoji: '🚦', label: 'ふみきり', category: 'town', color: '#2E7D74',
  note: '2音の交互＋金属的な打撃。文字数で長さが決まる',
  variants: [
    { id: 'kankan', label: 'カンカン', run(c, out, trs, rnd, t0) {
        const n = Math.max(6, Math.min(trs.length * 2, 16));
        const avg = trs.reduce((s, x) => s + x.bright, 0) / Math.max(1, trs.length);
        const base = rs(620, 900, avg);
        for (let i = 0; i < n; i++) {
          const t = t0 + i * 0.28;
          metal(c, out, t, i % 2 ? base : base * Math.pow(2, 3 / 12),
                [1, 2.76, 5.4, 8.9], 0.26, 0.18);
        }
        return t0 + n * 0.28 + 0.4;
      } },
  ],
},
{
  id: 'chaime', emoji: '🔔', label: '時報チャイム', category: 'town', color: '#2E7D74',
  note: 'キーンコーンカーンコーン。入力の明るさで調が変わる',
  variants: [
    { id: 'school', label: 'キンコンカンコン', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.6, 2.2), rg = c.createGain();
        rg.gain.value = 0.4; rv.connect(rg); rg.connect(out);
        const avg = trs.reduce((s, x) => s + x.bright, 0) / Math.max(1, trs.length);
        const root = rs(392, 523, avg);
        [[7, 0], [4, 0.62], [0, 1.24], [4, 1.86]].forEach(([st, d]) => {
          chime(c, rv, t0 + d, root * Math.pow(2, st / 12), 2.4, 0.16);
        });
        return t0 + 4.4;
      } },
  ],
},
{
  id: 'eew', emoji: '🚨', label: 'きんきゅうほうそう風', category: 'town', color: '#C0392B',
  note: '実測 半音クラスター＋アタック100ms／減衰163ms。※公共の場では使わないこと',
  hidden: true,            // 一覧ではデフォルト非表示
  excludeFromAuto: true,   // おまかせ判定の候補から完全に除外
  warn: '本物と間違えられる可能性があります。公共の場や乗り物の中では鳴らさないでください。',
  volumeScale: 0.45,       // 他スタイルより明確に音量を下げる
  variants: [
    { id: 'cluster', label: 'はんおんクラスター', run(c, out, trs, rnd, t0) {
        // 旋律は本物を再現せず、入力文字から生成する
        const avg = trs.reduce((s, x) => s + x.bright, 0) / Math.max(1, trs.length);
        const base = rs(880, 1320, avg);
        const n = Math.max(2, Math.min(trs.length, 5));
        for (let i = 0; i < n; i++) {
          const t = t0 + i * 0.62;
          [1, 1.06].forEach((m, k) => {   // 実測の半音差クラスター
            const o = c.createOscillator(); o.type = 'triangle';
            o.frequency.value = base * m * (i % 2 ? Math.pow(2, -2 / 12) : 1);
            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.10 * (k ? 0.8 : 1), t + 0.10);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 0.163 + 0.25);
            o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
          });
        }
        return t0 + n * 0.62 + 0.4;
      } },
  ],
},
];
