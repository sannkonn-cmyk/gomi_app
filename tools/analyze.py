#!/usr/bin/env python3
"""総合解析: EQ・重心・オンセット・f0・タイムライン。

  python tools/analyze.py <file.mp3> [--json]

「その音が明るいのか重いのか、どんな構造か」を最初に掴むための入口。
"""
import sys, json, math
import numpy as np
from common import load, stft_mag, envelope, band_energy, centroid, onsets, note_name


def analyze(path, as_json=False):
    y, sr, info = load(path)
    S, freqs, ts = stft_mag(y, sr)
    mag = S + 1e-12
    en = mag.sum(1)
    loud = en > 0.10 * en.max()
    bands, lt250, gt2k = band_energy(S, freqs, loud)
    cen = centroid(S, freqs, loud)
    on = onsets(y, sr)

    # f0（自己相関）
    fw, fh = int(0.040 * sr), int(0.010 * sr)
    n = 1 + max(0, (len(y) - fw)) // fh
    peak = np.max(np.abs(y)) or 1.0
    f0s = []
    for i in range(n):
        seg = y[i * fh:i * fh + fw]
        if np.sqrt(np.mean(seg ** 2)) < 0.06 * peak:
            continue
        s = seg - seg.mean()
        ac = np.correlate(s, s, 'full')[len(s) - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lo, hi = int(sr / 1200), min(int(sr / 60), len(ac) - 1)
        if hi <= lo:
            continue
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.30:
            f0s.append(sr / k)

    # 完全無音区間（フリーズ演出の検出）
    t, r = envelope(y, sr, 10.0, 20.0)
    silent, run, start = [], 0, 0
    for i in range(len(r)):
        if r[i] < 1e-5:
            if run == 0:
                start = t[i]
            run += 1
        else:
            if run > 10:
                silent.append([round(float(start), 3), round(float(t[i]), 3)])
            run = 0

    res = dict(info)
    res.update({
        'file': path.split('/')[-1],
        'centroidHz': cen,
        'bandEnergy': bands,
        'bandLt250Pct': lt250,
        'bandGt2kPct': gt2k,
        'onsets': on[:40],
        'onsetCount': len(on),
        'f0MedianHz': round(float(np.median(f0s)), 1) if f0s else None,
        'f0Note': note_name(float(np.median(f0s))) if f0s else None,
        'f0MinHz': round(float(np.min(f0s)), 1) if f0s else None,
        'f0MaxHz': round(float(np.max(f0s)), 1) if f0s else None,
        'f0SpanSemitones': round(12 * math.log2(max(f0s) / min(f0s)), 1) if f0s and min(f0s) > 0 else None,
        'silentGaps': silent,
    })
    if len(on) > 1:
        iv = np.diff(on)
        res['onsetIntervalsMs'] = [round(float(v * 1000), 1) for v in iv[:20]]
        res['onsetMedianMs'] = round(float(np.median(iv) * 1000), 1)

    if as_json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"### {res['file']}  {sr}Hz {info['channels']}ch {info['durationSec']}s peak={info['peak']}")
        if info['phaseInverted']:
            print("  ※ L/R 逆相を検出 → R を反転して合成済み")
        print(f"  重心 {cen}Hz   <250Hz {lt250}%   >2kHz {gt2k}%")
        print("  帯域: " + "  ".join(f"{k}:{v}%" for k, v in bands.items()))
        if res['f0MedianHz']:
            print(f"  f0 中央値 {res['f0MedianHz']}Hz ({res['f0Note']})  "
                  f"レンジ {res['f0MinHz']}-{res['f0MaxHz']}Hz  {res['f0SpanSemitones']}半音")
        print(f"  オンセット {len(on)}個" + (f"  中央間隔 {res.get('onsetMedianMs')}ms" if len(on) > 1 else ""))
        if silent:
            print(f"  ★完全無音区間: " + ", ".join(f"{a}-{b}s ({round((b-a)*1000)}ms)" for a, b in silent))
    return res


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    js = '--json' in sys.argv
    for p in args:
        analyze(p, js)
