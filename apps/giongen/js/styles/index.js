/** 全スタイルの集約。 */
import pachi from './pachi.js';
import cat from './cat.js';
import meme from './meme.js';
import game from './game.js';
import music from './music.js';
import scifi from './scifi.js';
import pad from './pad.js';
import nature from './nature.js';
import town from './town.js';

export const CATEGORIES = [
  { id: 'pachi',  label: 'パチスロ', emoji: '🎰' },
  { id: 'cat',    label: 'ねこ',     emoji: '🐱' },
  { id: 'meme',   label: 'ネタ',     emoji: '🤪' },
  { id: 'game',   label: 'ゲーム',   emoji: '🎮' },
  { id: 'music',  label: 'おんがく', emoji: '🎵' },
  { id: 'scifi',  label: 'きかい',   emoji: '🤖' },
  { id: 'pad',    label: 'ふんいき', emoji: '✨' },
  { id: 'nature', label: 'いきもの', emoji: '🌍' },
  { id: 'town',   label: 'まちのおと', emoji: '🏪' },
];

export const STYLES = [...pachi, ...cat, ...meme, ...game, ...music, ...scifi, ...pad, ...nature, ...town];
export const STYLE_MAP = Object.fromEntries(STYLES.map(s => [s.id, s]));

export function findVariant(styleId, variantId) {
  const s = STYLE_MAP[styleId];
  if (!s) return null;
  return s.variants.find(v => v.id === variantId) || s.variants[0];
}

/** seed からバリエーションを抽選する（保存時は variantId を残すので完全再現できる） */
export function pickVariant(style, rnd) {
  return style.variants[Math.floor(rnd() * style.variants.length) % style.variants.length];
}

export const autoCandidates = () => STYLES.filter(s => !s.excludeFromAuto);
