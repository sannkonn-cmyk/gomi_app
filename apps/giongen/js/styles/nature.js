/** 🌍 いきもの・せかい。 */
import { reverb, noise, distortion } from '../fx.js';
import { kick, tone, chime, riser, metal, hat } from '../instruments.js';
import { rs, fBright } from '../traits.js';
import { render } from '../engine.js';

export default [
{
  id: 'dino', emoji: '🦖', label: 'きょうりゅう', category: 'nature', color: '#4A7C3F',
  note: '超低域ノコギリ＋フォルマントを引き伸ばし＋歪み',
  variants: [
    { id: 'roar', label: 'ほうこう', run(c, out, trs, rnd, t0) {
        const d = distortion(c, 3);
        const rv = reverb(c, 2.4, 1.8), rg = c.createGain();
        rg.gain.value = 0.35; rv.connect(rg); rg.connect(out);
        d.connect(out); d.connect(rv);
        let t = t0;
        trs.forEach(x => {
          const dur = 0.5 + x.hold * 0.4 + x.ring * 0.3;
          const f = rs(75, 160, 1 - x.weight);
          const osc = c.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f * 1.25, t);
          osc.frequency.linearRampToValueAtTime(f * 0.85, t + dur);
          const amp = c.createGain();
          amp.gain.setValueAtTime(0, t);
          amp.gain.linearRampToValueAtTime(0.4, t + 0.09);
          amp.gain.setValueAtTime(0.4, t + dur * 0.6);
          amp.gain.exponentialRampToValueAtTime(0.002, t + dur);
          [[420, 1], [760, 0.8], [1500, 0.3]].forEach(([ff, gg]) => {
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = ff * rs(0.7, 1.3, x.bright); bp.Q.value = 5;
            const g = c.createGain(); g.gain.value = gg;
            osc.connect(bp); bp.connect(g); g.connect(amp);
          });
          amp.connect(d); osc.start(t); osc.stop(t + dur + 0.05);
          t += dur * 0.8;
        });
        kick(c, out, t, 1.0, 70, 26);   // 地響き
        return t + 1.2;
      } },
  ],
},
{
  id: 'animal', emoji: '🐶', label: 'どうぶつ', category: 'nature', color: '#4A7C3F',
  note: '文字ごとに犬／鳥／牛／豚のパラメータを抽選（seedで再現）',
  variants: [
    { id: 'mixed', label: 'いろいろ', run(c, out, trs, rnd, t0) {
        const KIND = [
          { f: 260, dur: 0.16, fm: [700, 1400], sweep: -0.3 },   // 犬
          { f: 1500, dur: 0.12, fm: [2600, 4200], sweep: 0.6 },  // 鳥
          { f: 105, dur: 0.7, fm: [500, 900], sweep: -0.5 },     // 牛
          { f: 320, dur: 0.14, fm: [900, 1900], sweep: 0.2 },    // 豚
        ];
        let t = t0;
        trs.forEach(x => {
          const k = KIND[Math.floor(rnd() * KIND.length)];
          const dur = k.dur * (1 + x.hold * 0.8);
          const osc = c.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(k.f * rs(0.85, 1.25, x.bright), t);
          osc.frequency.linearRampToValueAtTime(k.f * (1 + k.sweep), t + dur);
          const amp = c.createGain();
          amp.gain.setValueAtTime(0, t);
          amp.gain.linearRampToValueAtTime(0.34, t + 0.02);
          amp.gain.exponentialRampToValueAtTime(0.002, t + dur);
          k.fm.forEach((ff, i) => {
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 7;
            const g = c.createGain(); g.gain.value = i ? 0.7 : 1;
            osc.connect(bp); bp.connect(g); g.connect(amp);
          });
          amp.connect(out); osc.start(t); osc.stop(t + dur + 0.05);
          t += dur + 0.06;
        });
        return t + 0.4;
      } },
  ],
},
{
  id: 'insect', emoji: '🦗', label: 'むしのこえ', category: 'nature', color: '#4A7C3F',
  note: '高域の短いパルス列をリズムで刻む＋夏の夜のノイズ床',
  variants: [
    { id: 'night', label: 'なつのよる', run(c, out, trs, rnd, t0) {
        const total = 1.0 + trs.length * 0.35;
        // ノイズ床
        const s = noise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 6000; bp.Q.value = 0.6;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + 0.5);
        g.gain.setValueAtTime(0.025, t0 + total - 0.5);
        g.gain.linearRampToValueAtTime(0, t0 + total);
        s.connect(bp); bp.connect(g); g.connect(out); s.start(t0); s.stop(t0 + total + 0.1);
        let t = t0 + 0.2;
        trs.forEach(x => {
          const f = rs(3200, 6500, x.bright);
          const n = 4 + Math.round(x.noisy * 8);
          for (let i = 0; i < n; i++) {
            const tt = t + i * 0.035;
            const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
            const gg = c.createGain();
            gg.gain.setValueAtTime(0, tt);
            gg.gain.linearRampToValueAtTime(0.09, tt + 0.004);
            gg.gain.exponentialRampToValueAtTime(0.0005, tt + 0.024);
            o.connect(gg); gg.connect(out); o.start(tt); o.stop(tt + 0.03);
          }
          t += n * 0.035 + 0.14;
        });
        return t0 + total + 0.2;
      } },
  ],
},
{
  id: 'thunder', emoji: '⛈', label: 'かみなり', category: 'nature', color: '#4A7C3F',
  note: 'ノイズ量→炸裂、重さ→低域ランブル。濁音が多いほど落雷が増える',
  variants: [
    { id: 'storm', label: 'らくらい', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 2.6, 1.6), rg = c.createGain();
        rg.gain.value = 0.55; rv.connect(rg); rg.connect(out);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        lp.connect(out); lp.connect(rv);
        return render(c, lp, trs, { t0, overlap: 1, pad: 0.04,
          each: (cc, d, t, x) => {
            const dur = 0.35 + x.weight * 0.7;
            const n = noise(cc);
            const f = cc.createBiquadFilter(); f.type = 'lowpass';
            f.frequency.setValueAtTime(rs(400, 4200, x.bright), t);
            f.frequency.exponentialRampToValueAtTime(rs(70, 300, x.bright), t + dur);
            const g = cc.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.5 * (0.4 + x.noisy), t + 0.004 + x.attack * 0.05);
            g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            n.connect(f); f.connect(g); g.connect(d); n.start(t); n.stop(t + dur + 0.05);
            if (x.weight > 0.5) kick(cc, d, t, 0.55 * x.weight, 90, 28);
            return dur * 0.55;
          } });
      } },
  ],
},
{
  id: 'water', emoji: '🫧', label: 'みず・あわ', category: 'nature', color: '#4A7C3F',
  note: '明るさ→泡の大きさ（高いほど小さい）。上昇ピッチの粒を散らす',
  variants: [
    { id: 'bubble', label: 'ポコポコ', run(c, out, trs, rnd, t0) {
        const rv = reverb(c, 1.4, 3), rg = c.createGain();
        rg.gain.value = 0.3; rv.connect(rg); rg.connect(out);
        const dry = c.createGain(); dry.gain.value = 0.9;
        dry.connect(out); dry.connect(rv);
        return render(c, dry, trs, { t0, overlap: 1, pad: 0.03,
          each: (cc, d, t, x) => {
            const dur = 0.07 + x.ring * 0.1, f = rs(280, 1500, x.bright);
            const o = cc.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(f * 0.55, t);
            o.frequency.exponentialRampToValueAtTime(f * 1.9, t + dur);
            const g = cc.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.45, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.03);
            if (x.noisy > 0.5) {
              const n = noise(cc);
              const bp = cc.createBiquadFilter();
              bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 1.2;
              const ng = cc.createGain();
              ng.gain.setValueAtTime(0.09 * x.noisy, t);
              ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
              n.connect(bp); bp.connect(ng); ng.connect(d); n.start(t); n.stop(t + 0.12);
            }
            return dur + 0.05;
          } });
      } },
  ],
},
{
  id: 'hero', emoji: '🦸', label: 'ヒーロー変身', category: 'nature', color: '#4A7C3F',
  note: '上昇スイープで溜め → 閃光 → 決めポーズの和音',
  variants: [
    { id: 'henshin', label: 'へんしん', run(c, out, trs, rnd, t0) {
        const build = 0.7 + Math.min(trs.length, 8) * 0.11;
        riser(c, out, t0, build, 0.2);
        trs.forEach((x, i) => {
          tone(c, out, t0 + i * (build / Math.max(1, trs.length)),
               rs(300, 1200, x.bright), 0.1, 0.09, 'square');
        });
        const t = t0 + build;
        // 閃光
        const s = noise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
        const g = c.createGain();
        g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
        s.connect(hp); hp.connect(g); g.connect(out); s.start(t); s.stop(t + 0.8);
        // 決め和音
        [0, 4, 7, 12].forEach((st, i) =>
          tone(c, out, t + 0.05, 349.2 * Math.pow(2, st / 12), 1.6, 0.11, 'sawtooth', i % 2 ? 7 : -7));
        kick(c, out, t, 1.0, 200, 45);
        return t + 2.0;
      } },
  ],
},
];
