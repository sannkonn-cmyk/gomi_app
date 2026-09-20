#!/usr/bin/env python3
"""音程・倍音比・アタック/減衰。

  python tools/melody.py <file.mp3> [--json]

成分比が整数倍なら楽音、外れていれば金属的な共鳴。
ただし 1.50=完全5度 / 1.26=長3度 は音楽的な音程であって非調和ではない。
比率は必ず「何半音か」に直してから判断すること。
"""
import sys, json, math
import numpy as np
from common import load, envelope, stft_mag, band_energy, centroid, onsets, note_name

INTERVALS = {0: '同度', 2: '長2度', 3: '短3度', 4: '長3度', 5: '完全4度',
             7: '完全5度', 8: '短6度', 9: '長6度', 10: '短7度', 12: 'オクターブ'}


def interval_name(ratio):
    if ratio <= 0:
        return ''
    st = 12 * math.log2(ratio)
    near = round(st)
    if abs(st - near) < 0.18 and near in INTERVALS:
        return INTERVALS[near]
    if abs(ratio - round(ratio)) < 0.06 and ratio >= 1:
        return f"{round(ratio)}倍音"
    return ''


def note_report(y, sr, t0, t1):
    a, b = int(t0 * sr), min(len(y), int(t1 * sr))
    seg = y[a:b]
    if len(seg) < 256:
        return None
    N = 16384
    seg2 = np.pad(seg, (0, max(0, N - len(seg))))[:N]
    S = np.abs(np.fft.rfft(seg2 * np.hanning(N)))
    f = np.fft.rfftfreq(N, 1 / sr)
    idx = [i for i in range(2, len(S) - 2)
           if S[i] > S[i - 1] and S[i] >= S[i + 1] and f[i] > 40]
    idx.sort(key=lambda i: -S[i])
    top = [(float(f[i]), float(S[i] / S[idx[0]])) for i in idx[:8]]
    cand = sorted([fq for fq, rel in top if rel > 0.25])
    base = cand[0] if cand else top[0][0]
    for c in cand:
        hits = sum(1 for fq, _ in top if abs(fq / c - round(fq / c)) < 0.06 and round(fq / c) >= 1)
        if hits >= 3:
            base = c
            break
    # アタック/減衰（窓は音の長さに合わせる。次の音を跨ぐと壊れるため）
    h, w = int(0.001 * sr), int(0.005 * sr)
    steps = max(1, (len(seg) - w) // h)
    e = np.array([np.sqrt(np.mean(seg[j * h:j * h + w] ** 2)) for j in range(steps)])
    pi = int(np.argmax(e))
    pk = e[pi]
    dec = None
    for j in range(pi, len(e)):
        if e[j] <= pk * 0.1:
            dec = round((j - pi) * h / sr * 1000, 1)
            break
    return {
        'startSec': round(t0, 3),
        'f0Hz': round(base, 1),
        'note': note_name(base),
        'attackMs': round(pi * h / sr * 1000, 1),
        'decay20dBMs': dec,
        'partials': [{'hz': round(fq, 1), 'ratio': round(fq / base, 3),
                      'rel': round(rel, 3), 'interval': interval_name(fq / base)}
                     for fq, rel in top],
    }


def main(path, as_json=False):
    y, sr, info = load(path)
    S, freqs, _ = stft_mag(y, sr)
    bands, lt250, gt2k = band_energy(S, freqs)
    on = onsets(y, sr, thr_db=5.0, min_gap=0.08, floor=0.10)
    dur = len(y) / sr
    bounds = on + [dur]
    notes = []
    for i, t0 in enumerate(on[:12]):
        r = note_report(y, sr, t0, min(bounds[i + 1], t0 + 0.6))
        if r:
            notes.append(r)
    if not notes:  # オンセットが立たない持続音
        r = note_report(y, sr, 0, min(dur, 0.6))
        if r:
            notes.append(r)
    res = dict(info)
    res.update({'file': path.split('/')[-1], 'centroidHz': centroid(S, freqs),
                'bandEnergy': bands, 'bandLt250Pct': lt250, 'bandGt2kPct': gt2k,
                'onsets': on, 'notes': notes})
    if len(on) > 1:
        res['onsetIntervalsMs'] = [round(float(v * 1000), 1) for v in np.diff(on)[:20]]
    if as_json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"### {res['file']}  {info['durationSec']}s peak={info['peak']}")
        if info['phaseInverted']:
            print("  ※ L/R 逆相を検出 → 補正済み")
        print(f"  重心 {res['centroidHz']}Hz  <250Hz {lt250}%  >2kHz {gt2k}%")
        print(f"  オンセット({len(on)}): " + ", ".join(str(v) for v in on[:12]))
        for i, nt in enumerate(notes):
            print(f"  [音{i+1}] {nt['startSec']}s  f0 {nt['f0Hz']}Hz {nt['note']}  "
                  f"アタック {nt['attackMs']}ms  減衰 {nt['decay20dBMs']}ms")
            print("      成分: " + "  ".join(
                f"{p['hz']}Hz({p['ratio']}x{'/'+p['interval'] if p['interval'] else ''}) {p['rel']}"
                for p in nt['partials'][:6]))
    return res


if __name__ == '__main__':
    js = '--json' in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        main(p, js)
