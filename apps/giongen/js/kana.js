/** かな → モーラ列。
 *  発音のためではなく、音響パラメータを取り出すための分割。 */

const BASE = {
  'あ':['','a'],'い':['','i'],'う':['','u'],'え':['','e'],'お':['','o'],
  'か':['k','a'],'き':['k','i'],'く':['k','u'],'け':['k','e'],'こ':['k','o'],
  'が':['g','a'],'ぎ':['g','i'],'ぐ':['g','u'],'げ':['g','e'],'ご':['g','o'],
  'さ':['s','a'],'し':['sh','i'],'す':['s','u'],'せ':['s','e'],'そ':['s','o'],
  'ざ':['z','a'],'じ':['j','i'],'ず':['z','u'],'ぜ':['z','e'],'ぞ':['z','o'],
  'た':['t','a'],'ち':['ch','i'],'つ':['ts','u'],'て':['t','e'],'と':['t','o'],
  'だ':['d','a'],'ぢ':['j','i'],'づ':['z','u'],'で':['d','e'],'ど':['d','o'],
  'な':['n','a'],'に':['n','i'],'ぬ':['n','u'],'ね':['n','e'],'の':['n','o'],
  'は':['h','a'],'ひ':['h','i'],'ふ':['f','u'],'へ':['h','e'],'ほ':['h','o'],
  'ば':['b','a'],'び':['b','i'],'ぶ':['b','u'],'べ':['b','e'],'ぼ':['b','o'],
  'ぱ':['p','a'],'ぴ':['p','i'],'ぷ':['p','u'],'ぺ':['p','e'],'ぽ':['p','o'],
  'ま':['m','a'],'み':['m','i'],'む':['m','u'],'め':['m','e'],'も':['m','o'],
  'や':['y','a'],'ゆ':['y','u'],'よ':['y','o'],
  'ら':['r','a'],'り':['r','i'],'る':['r','u'],'れ':['r','e'],'ろ':['r','o'],
  'わ':['w','a'],'ゐ':['w','i'],'ゑ':['w','e'],'を':['w','o'],'ゔ':['v','u'],
};
const SMALL = { 'ゃ':'a','ゅ':'u','ょ':'o','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o' };
const LONG = 'ー〜～ｰ';

export const MAX_MORAS = 32;

/** カタカナ・全角を正規化してひらがなに寄せる */
export function normalize(src) {
  return (src || '')
    .normalize('NFC')
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * @returns {{c:string, v:string, kana:string, hold:number, special?:string}[]}
 *   c: 子音キー（拗音は 'ky' のように y が付く）／ v: 母音／ hold: 長音の数
 *   special: 'q'=促音（タメ） 'n'=撥音（余韻）
 */
export function toMoras(src) {
  const s = normalize(src);
  const out = [];
  for (const ch of s) {
    if (SMALL[ch]) {
      const p = out[out.length - 1];
      if (p && !p.special) {
        // 「き＋ゃ」→ 拗音。子音に y を足してスイープ対象にする
        if (p.v === 'i' && 'ゃゅょ'.includes(ch) && p.c) p.c = p.c.replace(/y?$/, 'y');
        p.v = SMALL[ch];
        p.kana += ch;
      } else {
        out.push({ c: '', v: SMALL[ch], kana: ch, hold: 0 });
      }
      continue;
    }
    if (ch === 'っ') { out.push({ special: 'q', c: '', v: 'a', kana: ch, hold: 0 }); continue; }
    if (ch === 'ん') { out.push({ special: 'n', c: 'n', v: 'n', kana: ch, hold: 0 }); continue; }
    if (LONG.includes(ch)) {
      const p = out[out.length - 1];
      if (p) p.hold = (p.hold || 0) + 1;
      continue;
    }
    const b = BASE[ch];
    if (b) out.push({ c: b[0], v: b[1], kana: ch, hold: 0 });
    // かな以外は無視（漢字・英数・絵文字）
  }
  return out.slice(0, MAX_MORAS);
}
