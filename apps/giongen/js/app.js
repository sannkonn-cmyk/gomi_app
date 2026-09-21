/** UI配線。ちびっこが独力で操作できることを最優先にしている。 */
import { toMoras, MAX_MORAS } from './kana.js';
import { traitsFromMoras, summarize } from './traits.js';
import { audio, resume, stopAll, play, getAnalyser, getMaster } from './engine.js';
import { STYLES, STYLE_MAP, CATEGORIES, findVariant, pickVariant } from './styles/index.js';
import { match } from './matcher.js';
import { mulberry32, newSeed, hashSeed } from './rng.js';
import { loadSaves, addSave, removeSave, storageAvailable } from './storage.js';
import { learnFromSave, learnFromCorrection, learnCount, forget } from './learn.js';

const $ = id => document.getElementById(id);
const state = {
  text: '',
  styleId: null,       // null = おまかせ
  variantId: null,
  seed: newSeed(),
  lastAuto: null,      // おまかせが選んだ styleId（訂正学習に使う）
  adult: false,
  daku: false, handa: false, small: false,
};

/* ---------------- 五十音キーボード ---------------- */
const ROWS = [
  ['あ','い','う','え','お'], ['か','き','く','け','こ'], ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'], ['な','に','ぬ','ね','の'], ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'], ['や','','ゆ','','よ'],     ['ら','り','る','れ','ろ'],
  ['わ','','を','','ん'],
];
const DAKU = { か:'が',き:'ぎ',く:'ぐ',け:'げ',こ:'ご', さ:'ざ',し:'じ',す:'ず',せ:'ぜ',そ:'ぞ',
  た:'だ',ち:'ぢ',つ:'づ',て:'で',と:'ど', は:'ば',ひ:'び',ふ:'ぶ',へ:'べ',ほ:'ぼ', う:'ゔ' };
const HANDA = { は:'ぱ',ひ:'ぴ',ふ:'ぷ',へ:'ぺ',ほ:'ぽ' };
const SMALL = { あ:'ぁ',い:'ぃ',う:'ぅ',え:'ぇ',お:'ぉ', や:'ゃ',ゆ:'ゅ',よ:'ょ', つ:'っ', わ:'ゎ' };

function buildKeyboard() {
  const g = $('kbGrid');
  g.innerHTML = '';
  ROWS.flat().forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    if (!k) { b.className = 'blank'; b.disabled = true; b.textContent = '　'; }
    else { b.textContent = k; b.dataset.kana = k; }
    g.appendChild(b);
  });
}
function applyMods(k) {
  if (state.daku && DAKU[k]) return DAKU[k];
  if (state.handa && HANDA[k]) return HANDA[k];
  if (state.small && SMALL[k]) return SMALL[k];
  return k;
}
function refreshKeyLabels() {
  $('kbGrid').querySelectorAll('button[data-kana]').forEach(b => {
    b.textContent = applyMods(b.dataset.kana);
  });
}
function setMod(name, on) {
  ['daku', 'handa', 'small'].forEach(m => { if (m !== name) state[m] = false; });
  state[name] = on;
  $('dakuBtn').setAttribute('aria-pressed', String(state.daku));
  $('handaBtn').setAttribute('aria-pressed', String(state.handa));
  $('smallBtn').setAttribute('aria-pressed', String(state.small));
  refreshKeyLabels();
}

/* ---------------- 入力 ---------------- */
function setText(t) {
  state.text = t.slice(0, 64);
  $('shown').textContent = state.text;
  if ($('txt').value !== state.text) $('txt').value = state.text;
}
function push(ch) {
  setText(state.text + ch);
  // 1文字押したら、その音だけプレビューする（押した瞬間鳴るのが楽しい）
  previewOne(ch);
  setMod('daku', false);
}
function previewOne(ch) {
  try {
    const trs = traitsFromMoras(toMoras(ch));
    if (!trs.length) return;
    const style = currentStyleForPreview();
    const rnd = mulberry32(hashSeed(ch));
    const variant = state.variantId ? findVariant(style.id, state.variantId) : pickVariant(style, rnd);
    play(style, variant, trs, mulberry32(hashSeed(ch)));
  } catch (e) { console.error(e); }
}
function currentStyleForPreview() {
  if (state.styleId) return STYLE_MAP[state.styleId];
  return STYLE_MAP.gako;  // おまかせ時のプレビューは軽い打撃音で固定
}

/* ---------------- スタイル選択 ---------------- */
let activeCat = CATEGORIES[0].id;
function buildTabs() {
  const t = $('tabs');
  t.innerHTML = '';
  CATEGORIES.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'tab';
    b.textContent = `${c.emoji} ${c.label}`;
    b.setAttribute('aria-selected', String(c.id === activeCat));
    b.onclick = () => { activeCat = c.id; buildTabs(); buildStyles(); };
    t.appendChild(b);
  });
}
function buildStyles() {
  const box = $('styles');
  box.innerHTML = '';
  STYLES.filter(s => s.category === activeCat)
        .filter(s => !s.hidden || state.adult)
        .forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.styleId === s.id));
    if (s.hidden) b.classList.add('locked');
    b.innerHTML = `<span class="e">${s.emoji}</span><span>${s.label}</span>`;
    b.title = s.note || s.label;
    b.onclick = () => selectStyle(s);
    box.appendChild(b);
  });
}
function selectStyle(s) {
  const go = () => {
    // おまかせの直後に手で選び直したら「訂正」として学習する
    if (state.lastAuto && state.lastAuto !== s.id && state.text) {
      const sum = summarize(traitsFromMoras(toMoras(state.text)));
      if (sum) learnFromCorrection(state.text, sum, state.lastAuto, s.id);
      state.lastAuto = null;
      refreshLearn();
    }
    state.styleId = s.id;
    state.variantId = null;
    $('pickerNow').textContent = `${s.emoji} ${s.label}`;
    buildStyles();
    doPlay();
  };
  if (s.warn) {
    $('warnText').textContent = s.warn;
    const dlg = $('warnDlg');
    $('warnOk').onclick = () => { dlg.close(); go(); };
    $('warnCancel').onclick = () => dlg.close();
    dlg.showModal();
    return;
  }
  go();
}

/* ---------------- 再生 ---------------- */
function currentTraits() {
  const trs = traitsFromMoras(toMoras(state.text));
  return trs;
}
function doPlay(useAuto = false) {
  const trs = currentTraits();
  if (!trs.length) { $('autoResult').innerHTML = 'ひらがなを いれてね'; return; }
  resume();
  const seed = state.seed;
  const rnd = mulberry32(seed);
  let style;
  if (useAuto || !state.styleId) {
    const sum = summarize(trs);
    const r = match(state.text, sum, mulberry32(seed));
    style = r.style;
    state.lastAuto = style.id;
    $('autoResult').innerHTML =
      `これは ${style.emoji} <b>${style.label}</b> っぽい！ <span class="why">${r.reason}</span>`;
  } else {
    style = STYLE_MAP[state.styleId];
    $('autoResult').innerHTML = '';
  }
  const variant = state.variantId ? findVariant(style.id, state.variantId) : pickVariant(style, rnd);
  state.playing = { styleId: style.id, variantId: variant.id, seed };
  const scale = style.volumeScale || 1;
  const m = getMaster();
  if (m) m.gain.value = 0.9 * scale;
  play(style, variant, trs, mulberry32(seed));
  $('pickerNow').textContent = state.styleId
    ? `${style.emoji} ${style.label}` : `おまかせ → ${style.emoji}${style.label}`;
  if (variant.label && style.variants.length > 1) {
    $('autoResult').innerHTML += ` <span class="why">（${variant.label}）</span>`;
  }
}

/* ---------------- ほぞん ---------------- */
function refreshSaves() {
  const list = loadSaves();
  const box = $('saveList');
  box.innerHTML = '';
  $('saveEmpty').hidden = list.length > 0;
  list.forEach(s => {
    const style = STYLE_MAP[s.styleId];
    if (!style) return;
    const card = document.createElement('div');
    card.className = 'save-card';
    const p = document.createElement('button');
    p.type = 'button'; p.className = 'play';
    p.innerHTML = `${style.emoji} ${s.text}<span class="sub">${style.label}</span>`;
    p.onclick = () => {
      setText(s.text);
      state.styleId = s.styleId; state.variantId = s.variantId; state.seed = s.seed;
      const trs = currentTraits();
      resume();
      const m = getMaster();
      if (m) m.gain.value = 0.9 * (style.volumeScale || 1);
      play(style, findVariant(s.styleId, s.variantId), trs, mulberry32(s.seed));
      $('pickerNow').textContent = `${style.emoji} ${style.label}`;
      buildStyles();
    };
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'del btn-ghost'; d.textContent = '✕';
    d.setAttribute('aria-label', `${s.text} を けす`);
    d.onclick = () => { removeSave(s.id); refreshSaves(); };
    card.append(p, d);
    box.appendChild(card);
  });
}
function doSave() {
  const trs = currentTraits();
  if (!trs.length || !state.playing) return;
  const { styleId, variantId, seed } = state.playing;
  addSave({ text: state.text, styleId, variantId, seed, createdAt: Date.now() });
  const sum = summarize(trs);
  if (sum) learnFromSave(state.text, sum, styleId);
  state.lastAuto = null;
  refreshSaves(); refreshLearn();
  const b = $('saveBtn');
  b.textContent = '✅';
  setTimeout(() => { b.textContent = '⭐'; }, 900);
}
function refreshLearn() {
  const n = learnCount();
  $('learnCount').textContent = n;
  $('learnBar').style.width = Math.min(100, n * 4) + '%';
}

/* ---------------- ビジュアル ---------------- */
function draw() {
  requestAnimationFrame(draw);
  const cv = $('viz'), cx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const cs = getComputedStyle(document.body);
  cx.clearRect(0, 0, w, h);
  const an = getAnalyser();
  cx.lineWidth = 3;
  cx.strokeStyle = (cs.getPropertyValue('--accent') || '#E8542F').trim();
  cx.beginPath();
  if (!an) { cx.moveTo(0, h / 2); cx.lineTo(w, h / 2); cx.stroke(); return; }
  const buf = new Uint8Array(an.fftSize);
  an.getByteTimeDomainData(buf);
  for (let i = 0; i < buf.length; i++) {
    const x = (i / buf.length) * w;
    const y = h / 2 + ((buf[i] - 128) / 128) * (h / 2 - 4);
    i ? cx.lineTo(x, y) : cx.moveTo(x, y);
  }
  cx.stroke();
}

/* ---------------- 起動 ---------------- */
buildKeyboard(); buildTabs(); buildStyles(); refreshSaves(); refreshLearn(); draw();

$('kbGrid').addEventListener('click', e => {
  const b = e.target.closest('button[data-kana]');
  if (b) push(applyMods(b.dataset.kana));
});
document.querySelectorAll('[data-insert]').forEach(b => {
  b.onclick = () => push(b.dataset.insert);
});
$('dakuBtn').onclick  = () => setMod('daku',  !state.daku);
$('handaBtn').onclick = () => setMod('handa', !state.handa);
$('smallBtn').onclick = () => setMod('small', !state.small);
$('backBtn').onclick  = () => setText([...state.text].slice(0, -1).join(''));
$('clearBtn').onclick = () => { setText(''); $('autoResult').innerHTML = ''; };
$('txt').addEventListener('input', e => setText(e.target.value));

$('playBtn').onclick = () => { state.seed = newSeed(); doPlay(); };
$('stopBtn').onclick = () => stopAll();
$('saveBtn').onclick = () => doSave();
$('autoBtn').onclick = () => {
  state.styleId = null; state.variantId = null; state.seed = newSeed();
  buildStyles(); doPlay(true);
};
$('rerollBtn').onclick = () => { state.seed = newSeed(); doPlay(!state.styleId); };
$('randStyleBtn').onclick = () => {
  const pool = STYLES.filter(s => !s.hidden || state.adult);
  selectStyle(pool[Math.floor(Math.random() * pool.length)]);
};
$('adultBtn').onclick = () => {
  state.adult = !state.adult;
  $('adultBtn').setAttribute('aria-pressed', String(state.adult));
  buildStyles();
};
$('forgetBtn').onclick = () => {
  forget(); refreshLearn();
  $('autoResult').innerHTML = '<span class="why">まなんだことを ぜんぶ わすれました</span>';
};

if (!storageAvailable()) {
  $('saveEmpty').textContent = 'この ブラウザでは ほぞん できません（プライベートモードかも）';
}
setText('にゃーん');
