"""共通処理。すべての解析スクリプトはここを経由して音声を読む。

最重要: safe_mono()
  左右が逆相のファイルを単純平均するとほぼ無音になる。
  実際にそれで正常なファイルを2度「壊れている」と誤診した。
  以後、モノラル化は必ずこの関数を通すこと。
"""
import math
import numpy as np
import soundfile as sf

NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def safe_mono(x):
    """ステレオをモノラルに落とす。逆相なら R を反転してから合成する。"""
    if x.ndim == 1:
        return x
    if x.shape[1] < 2:
        return x[:, 0]
    L, R = x[:, 0], x[:, 1]
    if np.std(L) > 1e-9 and np.std(R) > 1e-9:
        if np.corrcoef(L, R)[0, 1] < -0.2:
            R = -R
    return (L + R) / 2


def load(path):
    """(mono_signal, samplerate, info) を返す。"""
    x, sr = sf.read(path, always_2d=True)
    ch = x.shape[1]
    corr = None
    if ch >= 2 and np.std(x[:, 0]) > 1e-9 and np.std(x[:, 1]) > 1e-9:
        corr = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1])
    y = safe_mono(x)
    info = {
        'channels': ch,
        'sampleRate': sr,
        'durationSec': round(len(y) / sr, 4),
        'peak': round(float(np.max(np.abs(y))), 4),
        'lrCorrelation': None if corr is None else round(corr, 4),
        'phaseInverted': bool(corr is not None and corr < -0.2),
    }
    return y, sr, info


def note_name(f):
    if f is None or f <= 0 or not np.isfinite(f):
        return '-'
    m = 69 + 12 * math.log2(f / 440.0)
    i = int(round(m))
    return f"{NOTE[i % 12]}{i // 12 - 1}"


def to_midi(f):
    if f is None or f <= 0 or not np.isfinite(f):
        return float('nan')
    return 69 + 12 * math.log2(f / 440.0)


def envelope(y, sr, hop_ms=2.0, win_ms=10.0):
    hop = max(1, int(hop_ms * sr / 1000))
    win = max(2, int(win_ms * sr / 1000))
    n = 1 + max(0, (len(y) - win)) // hop
    r = np.array([np.sqrt(np.mean(y[i * hop:i * hop + win] ** 2)) for i in range(n)])
    return np.arange(n) * hop / sr, r


def stft_mag(y, sr, n_fft=4096, hop_ms=10.0):
    hop = int(hop_ms * sr / 1000)
    w = np.hanning(n_fft)
    n = 1 + max(0, (len(y) - n_fft)) // hop
    S = np.empty((n, n_fft // 2 + 1), dtype=np.float32)
    for i in range(n):
        S[i] = np.abs(np.fft.rfft(y[i * hop:i * hop + n_fft] * w))
    return S, np.fft.rfftfreq(n_fft, 1 / sr), np.arange(n) * hop / sr


BANDS = [(20, 80), (80, 250), (250, 500), (500, 1000),
         (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]


def band_energy(S, freqs, loud_mask=None):
    mag = S + 1e-12
    if loud_mask is None:
        en = mag.sum(1)
        loud_mask = en > 0.10 * en.max()
    if loud_mask.sum() == 0:
        loud_mask = np.ones(len(mag), bool)
    tot = mag[loud_mask].sum()
    out = {}
    for b0, b1 in BANDS:
        i0, i1 = np.searchsorted(freqs, b0), np.searchsorted(freqs, b1)
        out[f"{b0}-{b1}"] = round(float(100 * mag[loud_mask][:, i0:i1].sum() / tot), 2)
    lt250 = out['20-80'] + out['80-250']
    gt2k = out['2000-4000'] + out['4000-8000'] + out['8000-16000']
    return out, round(lt250, 2), round(gt2k, 2)


def centroid(S, freqs, loud_mask=None):
    mag = S + 1e-12
    c = (mag * freqs).sum(1) / mag.sum(1)
    if loud_mask is None:
        en = mag.sum(1)
        loud_mask = en > 0.10 * en.max()
    if loud_mask.sum() == 0:
        return round(float(c.mean()), 1)
    return round(float(c[loud_mask].mean()), 1)


def onsets(y, sr, thr_db=4.0, min_gap=0.03, floor=0.08):
    t, r = envelope(y, sr)
    db = 20 * np.log10(r + 1e-12)
    d = np.diff(db, prepend=db[0])
    out, last = [], -9e9
    for i in range(1, len(t)):
        if d[i] > thr_db and r[i] > floor * r.max() and t[i] - last > min_gap:
            out.append(round(float(t[i]), 4))
            last = t[i]
    return out
