/** 音象徴 → 音響パラメータ。このアプリの心臓部。
 *
 *  日本語の音韻はもともと音の性質を符号化している（濁音=重い、促音=瞬間、撥音=余韻…）。
 *  それを数値ベクトルに変換し、各スタイルはそのベクトルを自分の流儀で音にする。
 *  文字を「発音」するのではなく、文字から「文字に書けない音」を作るための層。
 */
import { toMoras } from './kana.js';

/** 調音位置 → 明るさ。唇(ぱ/ま/わ)が暗く、軟口蓋(か/が)が明るい */
const PLACE = {
  '': .45, k: .85, g: .85, t: .50, d: .50, p: .15, b: .15,
  s: .60, z: .60, sh: .70, j: .70, ts: .60, ch: .70,
  h: .35, f: .30, n: .45, m: .20, r: .50, y: .75, w: .20, v: .30,
};
/** 調音方法 → 立ち上がりのゆるさ a / ノイズ量 n */
const MANNER = {
  '':  { a: .30, n: .10 },
  k:  { a: .02, n: .45 }, g:  { a: .03, n: .25 },
  t:  { a: .02, n: .45 }, d:  { a: .03, n: .22 },
  p:  { a: .02, n: .40 }, b:  { a: .03, n: .20 },
  s:  { a: .45, n: .90 }, z:  { a: .35, n: .70 },
  sh: { a: .50, n: .92 }, j:  { a: .20, n: .55 },
  ts: { a: .12, n: .75 }, ch: { a: .12, n: .70 },
  h:  { a: .55, n: .80 }, f:  { a: .50, n: .82 },
  n:  { a: .35, n: .06 }, m:  { a: .38, n: .05 },
  r:  { a: .08, n: .25 }, y:  { a: .60, n: .08 },
  w:  { a: .60, n: .08 }, v:  { a: .30, n: .50 },
};
const VOWEL_BRIGHT = { i: 1.0, e: .75, a: .50, o: .28, u: .36, n: .20 };
const VOWEL_WEIGHT = { i: .10, e: .20, a: .45, o: .80, u: .60, n: .85 };
const VOICED = new Set(['g', 'z', 'd', 'b', 'j', 'v']);

export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** モーラ列 → トレイト列。促音は独立要素にせず、次のモーラの gap/accent になる */
export function traitsFromMoras(moras) {
  const out = [];
  let pendingGap = 0;
  for (const m of moras) {
    if (m.special === 'q') { pendingGap = 1; continue; }
    const raw = m.c || '';
    const palatal = raw.length > 1 && raw.endsWith('y');
    const c = palatal ? raw.slice(0, -1) : raw;
    const mn = MANNER[c] || MANNER[''];
    const pl = PLACE[c] == null ? .45 : PLACE[c];
    const v = m.v || 'a';
    const voiced = VOICED.has(c);
    out.push({
      kana: m.kana,
      bright: clamp(.42 * pl + .58 * (VOWEL_BRIGHT[v] ?? .5) + (palatal ? .12 : 0)),
      noisy:  clamp(mn.n),
      attack: clamp(mn.a),
      weight: clamp(.55 * (VOWEL_WEIGHT[v] ?? .5) + (voiced ? .35 : 0)
                    + (c === 'm' || c === 'n' ? .12 : 0) - (c === 'p' ? .10 : 0)),
      ring:   m.special === 'n' ? 1 : (m.hold ? .65 : .18),
      sweep:  palatal ? .85 : (m.special === 'n' ? -.45 : (m.hold ? .30 : 0)),
      accent: pendingGap ? 1 : 0,   // 促音の次は強打
      gap:    pendingGap ? .55 : 0,
      hold:   m.hold || 0,
      voiced, palatal,
    });
    pendingGap = 0;
  }
  return out;
}

export function traits(text) {
  return traitsFromMoras(toMoras(text));
}

/* ---- トレイトから導く基本量 ---- */
export const fBright = t => 170 * Math.pow(2, t.bright * 5.6);     // 170Hz .. 約8kHz
export const fWeight = t => 55 * Math.pow(2, (1 - t.weight) * 4.4); // 重いほど低い
export const attackSec = t => 0.0015 + t.attack * 0.085;
export const durSec = (t, base = 0.14) => base * (1 + t.hold * 0.85) + t.ring * 0.18;

/** トレイト値を任意のレンジへ写す */
export const rs = (lo, hi, x) => lo + (hi - lo) * x;

/** 列全体の要約。おまかせ判定が使う */
export function summarize(trs) {
  if (!trs.length) return null;
  const avg = k => trs.reduce((s, t) => s + t[k], 0) / trs.length;
  const kanas = trs.map(t => t.kana);
  const uniq = new Set(kanas).size;
  return {
    count: trs.length,
    bright: avg('bright'), weight: avg('weight'), noisy: avg('noisy'),
    attack: avg('attack'), ring: avg('ring'),
    voicedRatio: trs.filter(t => t.voiced).length / trs.length,
    accentRatio: trs.filter(t => t.accent).length / trs.length,
    holdRatio: trs.filter(t => t.hold).length / trs.length,
    repetition: 1 - uniq / trs.length,   // 同じ文字の反復度
    text: kanas.join(''),
  };
}
