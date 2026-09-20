/** localStorage。音声データは持たず、再合成に必要な材料だけを保存する。
 *  プライベートモード等で使えない環境でもアプリが落ちないようにする。 */
const SAVES = 'giongen.saves.v1';
const LEARN = 'giongen.learn.v1';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}

export const loadSaves = () => {
  const v = read(SAVES, []);
  return Array.isArray(v) ? v : [];
};
export function addSave(entry) {
  const list = loadSaves();
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...entry });
  write(SAVES, list.slice(0, 200));
  return list;
}
export function removeSave(id) {
  const list = loadSaves().filter(s => s.id !== id);
  write(SAVES, list);
  return list;
}

export const loadLearn = () => read(LEARN, { exact: {}, sig: {}, count: 0 });
export const saveLearn = d => write(LEARN, d);
export const clearLearn = () => write(LEARN, { exact: {}, sig: {}, count: 0 });

/** localStorage が使えるか */
export function storageAvailable() {
  try {
    localStorage.setItem('giongen.probe', '1');
    localStorage.removeItem('giongen.probe');
    return true;
  } catch { return false; }
}
