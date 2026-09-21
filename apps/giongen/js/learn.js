/** かんたん学習。サーバーもMLライブラリも使わない。
 *
 *  ⭐保存 → その入力でそのスタイルが正解だった（強い証拠）
 *  おまかせ直後の手動変更 → 判定が外れた（訂正）
 *
 *  重みは ±5 でクリップして暴走を防ぐ。
 */
import { loadLearn, saveLearn, clearLearn } from './storage.js';

const CLIP = 5;

/** 音韻シグネチャ。未知語にも効かせるため、入力そのものより粗い特徴で引く。 */
export function signature(sum) {
  if (!sum) return '';
  const b = x => x < 0.34 ? 'lo' : x < 0.67 ? 'mid' : 'hi';
  const moraBucket = sum.count <= 2 ? 's' : sum.count <= 5 ? 'm' : 'l';
  return [
    `b:${b(sum.bright)}`, `w:${b(sum.weight)}`, `n:${b(sum.noisy)}`,
    `v:${sum.voicedRatio > 0.4 ? 1 : 0}`,
    `a:${sum.accentRatio > 0 ? 1 : 0}`,
    `h:${sum.holdRatio > 0 ? 1 : 0}`,
    `r:${sum.repetition > 0.4 ? 1 : 0}`,
    `m:${moraBucket}`,
  ].join('|');
}

const clip = v => Math.max(-CLIP, Math.min(CLIP, v));

function bump(table, key, styleId, delta) {
  if (!key) return;
  table[key] = table[key] || {};
  table[key][styleId] = clip((table[key][styleId] || 0) + delta);
  if (table[key][styleId] === 0) delete table[key][styleId];
  if (!Object.keys(table[key]).length) delete table[key];
}

/** ⭐保存されたときに呼ぶ。強い正解として学習する。 */
export function learnFromSave(text, sum, styleId) {
  const d = loadLearn();
  bump(d.exact, text, styleId, 2);
  bump(d.sig, signature(sum), styleId, 2);
  d.count = (d.count || 0) + 1;
  saveLearn(d);
  return d;
}

/** おまかせの直後に手動で別スタイルを選んだときに呼ぶ。訂正として学習する。 */
export function learnFromCorrection(text, sum, wrongId, rightId) {
  if (!wrongId || wrongId === rightId) return loadLearn();
  const d = loadLearn();
  bump(d.exact, text, wrongId, -1);
  bump(d.exact, text, rightId, 1);
  const sg = signature(sum);
  bump(d.sig, sg, wrongId, -1);
  bump(d.sig, sg, rightId, 1);
  d.count = (d.count || 0) + 1;
  saveLearn(d);
  return d;
}

/** 判定スコアに足す学習重みを返す。完全一致を強く効かせる。 */
export function learnedScores(text, sum) {
  const d = loadLearn();
  const out = {};
  const add = (tbl, key, k) => {
    const row = tbl[key];
    if (!row) return;
    for (const [id, w] of Object.entries(row)) out[id] = (out[id] || 0) + w * k;
  };
  add(d.exact, text, 2.2);
  add(d.sig, signature(sum), 1.0);
  return out;
}

export const learnCount = () => loadLearn().count || 0;
export const forget = () => clearLearn();
