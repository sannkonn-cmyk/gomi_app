/** おまかせ判定。必ず何かのスタイルを返す。
 *
 *  ① キーワード辞書  ② 音韻特徴からの推定  ③ 学習重み  を合算する。
 *  警報系（excludeFromAuto）は候補から完全に除外する。
 */
import { autoCandidates, STYLE_MAP } from './styles/index.js';
import { learnedScores } from './learn.js';
import { normalize } from './kana.js';

/** 擬音の定番から引く。部分一致。 */
const DICT = [
  [['にゃ', 'みゃ', 'にゃー', 'なー'], 'cat', 3.5],
  [['がこ', 'キュイン', 'きゅいん', 'じゃら', 'ちゃりん', 'ちゅい'], 'gako', 3.2],
  [['ぴこ', 'ぽこ', 'ぴろ'], 'famicom', 3.0],
  [['ぶり', 'ぶー', 'ぷす', 'すか'], 'fart', 3.4],
  [['きら', 'ぴか', 'しゃらら'], 'fantasy', 3.2],
  [['どど', 'ごご', 'ごろ'], 'thunder', 3.0],
  [['つー', 'とん', 'つつ'], 'morse', 2.6],
  [['がお', 'ぐお', 'ごあ'], 'dino', 3.4],
  [['ぽこ', 'ぷく', 'ぶくぶく'], 'water', 2.8],
  [['どん', 'ばん', 'ずどん'], 'stinger', 2.6],
  [['ちーん', 'ぽく'], 'okyo', 3.0],
  [['りーん', 'ちりん', 'こーん'], 'chaime', 2.6],
  [['ぴんぽん', 'ぶぶー'], 'variety', 3.6],
  [['じー', 'りりり', 'みーん'], 'insect', 3.2],
  [['かんかん'], 'crossing', 3.4],
  [['ちゃりーん', 'ぴこん'], 'pay', 2.8],
  [['うぃー', 'ぴゅん', 'びー'], 'laser', 2.6],
  [['ヴー', 'うー'], 'siren', 2.2],
];

/** 音韻特徴 → スタイルの相性。値は重み。 */
const FEATURE = {
  heavy:    { fart: 2.2, thunder: 2.0, bakuon: 1.8, dino: 2.2, okyo: 1.4, horror: 1.4 },
  bright:   { fantasy: 1.8, laser: 1.8, kyuin: 1.6, water: 1.4, insect: 1.6, mystic: 1.2 },
  noisy:    { thunder: 1.6, water: 1.4, insect: 1.4, bakuon: 1.2, medal: 1.6 },
  accent:   { fight: 2.0, beatbox: 1.8, gako: 1.8, typewriter: 1.2 },
  hold:     { mystic: 1.8, horror: 1.8, opera: 1.8, enka: 1.6, sakibare: 1.2 },
  repeat:   { beatbox: 2.0, edm: 1.6, gijiren: 2.0, medal: 1.4, crossing: 1.6 },
  long:     { rpgmsg: 2.0, rap: 1.8, okyo: 1.6, morse: 1.2 },
  short:    { variety: 1.4, pay: 1.4, stinger: 1.2, gameover: 0.8 },
  soft:     { mystic: 1.2, emotional: 1.4, shopchime: 1.2, water: 1.0 },
};

function featureScores(sum) {
  const out = {};
  const add = (bucket, k) => {
    const row = FEATURE[bucket];
    if (!row) return;
    for (const [id, w] of Object.entries(row)) out[id] = (out[id] || 0) + w * k;
  };
  add('heavy',  Math.max(0, sum.weight - 0.45) * 2.6);
  add('bright', Math.max(0, sum.bright - 0.45) * 2.6);
  add('noisy',  Math.max(0, sum.noisy - 0.40) * 2.4);
  add('soft',   Math.max(0, sum.attack - 0.30) * 2.0);
  add('accent', sum.accentRatio * 1.6);
  add('hold',   sum.holdRatio * 1.6);
  add('repeat', Math.max(0, sum.repetition - 0.25) * 2.4);
  add('long',   sum.count >= 6 ? 1 : 0);
  add('short',  sum.count <= 2 ? 1 : 0);
  return out;
}

function dictScores(text) {
  const t = normalize(text);
  const out = {};
  for (const [keys, id, w] of DICT) {
    if (keys.some(k => t.includes(normalize(k)))) out[id] = Math.max(out[id] || 0, w);
  }
  return out;
}

/**
 * @returns {{style, variant:null, score:number, reason:string, ranked:Array}}
 *   スタイルが1つも決まらないことはない。
 */
export function match(text, sum, rnd) {
  const cands = autoCandidates();
  const allowed = new Set(cands.map(s => s.id));
  const total = {};
  const bump = (src, tag) => {
    for (const [id, v] of Object.entries(src)) {
      if (!allowed.has(id)) continue;
      total[id] = total[id] || { score: 0, tags: [] };
      total[id].score += v;
      if (v > 0.3) total[id].tags.push(tag);
    }
  };
  bump(dictScores(text), 'ことば');
  bump(featureScores(sum), 'ひびき');
  bump(learnedScores(text, sum), 'まなび');

  // 何も引っかからなかった場合でも必ず候補を作る
  if (!Object.keys(total).length) {
    for (const s of cands) total[s.id] = { score: 0.001 + rnd() * 0.01, tags: ['てきとう'] };
  }
  // 同点はシードで決める（再現性のため）
  const ranked = Object.entries(total)
    .map(([id, v]) => ({ id, score: v.score + rnd() * 0.02, tags: v.tags }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const style = STYLE_MAP[top.id];
  const why = top.tags.includes('まなび') ? 'まえに ほぞんしたから'
            : top.tags.includes('ことば') ? 'この ことばっぽいから'
            : top.tags.includes('ひびき') ? ひびき(sum)
            : 'なんとなく';
  return { style, score: top.score, reason: why, ranked: ranked.slice(0, 5) };
}

function ひびき(sum) {
  if (sum.weight > 0.6) return 'おもたい ひびきだから';
  if (sum.bright > 0.6) return 'あかるい ひびきだから';
  if (sum.noisy > 0.55) return 'ざらざら してるから';
  if (sum.holdRatio > 0) return 'のばす おとだから';
  if (sum.accentRatio > 0) return 'するどい おとだから';
  if (sum.repetition > 0.4) return 'くりかえして るから';
  return 'ひびきが そんなかんじだから';
}
