#!/usr/bin/env python3
"""LPCフォルマント解析と母音推定。

  python tools/voice.py <file.mp3> [--json]

44.1kHz のまま LPC を掛けると次数が足りず F1 を取り逃す。
必ず ~11kHz までダウンサンプリングしてから次数14で解くこと。
"""
import sys, json, math
import numpy as np
from common import load, note_name

# 実測で更新済み（咆哮/ンアーの F2≈1420 を反映し あ の F2 を 1200→1300 に）
VOWEL_REF = {'a': (800, 1300), 'i': (300, 2300), 'u': (350, 1250),
             'e': (500, 1900), 'o': (500, 900), 'n': (250, 1000)}


def lpc(x, order):
    r = np.correlate(x, x, 'full')[len(x) - 1:len(x) - 1 + order + 1]
    if r[0] <= 0:
        return None
    a = np.zeros(order + 1); a[0] = 1.0; e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + sum(a[j] * r[i - j] for j in range(1, i))
        k = -acc / e
        an = a.copy()
        for j in range(1, i):
            an[j] = a[j] + k * a[i - j]
        an[i] = k; a = an; e *= (1 - k * k)
        if e <= 0:
            return None
    return a


def formants(seg, sr, order=14):
    seg = seg - seg.mean()
    if np.sqrt(np.mean(seg ** 2)) < 1e-5:
        return []
    pe = np.append(seg[0], seg[1:] - 0.97 * seg[:-1]) * np.hamming(len(seg))
    a = lpc(pe, order)
    if a is None:
        return []
    out = []
    for r in np.roots(a):
        if np.imag(r) <= 0.01:
            continue
        f = np.arctan2(np.imag(r), np.real(r)) * sr / (2 * np.pi)
        bw = -0.5 * (sr / (2 * np.pi)) * np.log(abs(r) + 1e-12)
        if 120 < f < 4800 and bw < 700:
            out.append((float(f), float(bw)))
    out.sort()
    return out


def f0_ac(seg, sr, fmin=70, fmax=900):
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    if ac[0] <= 0:
        return None
    ac = ac / ac[0]
    lo, hi = int(sr / fmax), min(int(sr / fmin), len(ac) - 1)
    if hi <= lo:
        return None
    k = lo + int(np.argmax(ac[lo:hi]))
    return sr / k if ac[k] > 0.25 else None


def guess_vowel(f1, f2, scale=1.0):
    best, bd = None, 1e9
    for v, (r1, r2) in VOWEL_REF.items():
        d = (math.log2(f1 / (r1 * scale))) ** 2 + (math.log2(f2 / (r2 * scale))) ** 2
        if d < bd:
            bd, best = d, v
    return best


def main(path, as_json=False):
    y, sr, info = load(path)
    D = 4; tgt = sr // D
    Y = np.fft.rfft(y); f = np.fft.rfftfreq(len(y), 1 / sr)
    Y[f > tgt / 2 * 0.95] = 0
    yd = np.fft.irfft(Y, len(y))[::D]
    fw, fh = int(0.030 * tgt), int(0.010 * tgt)
    n = 1 + max(0, (len(yd) - fw)) // fh
    mx = np.max(np.abs(yd)) or 1.0
    rows = []
    for i in range(n):
        seg = yd[i * fh:i * fh + fw]
        if np.sqrt(np.mean(seg ** 2)) < 0.06 * mx:
            continue
        F = formants(seg, tgt)
        if len(F) < 2:
            continue
        rows.append({'t': round(i * fh / tgt, 3), 'f0': f0_ac(seg, tgt),
                     'F': [round(x[0], 1) for x in F[:4]]})
    res = dict(info); res['file'] = path.split('/')[-1]
    if rows:
        f0s = np.array([r['f0'] for r in rows if r['f0']])
        F1 = np.array([r['F'][0] for r in rows])
        F2 = np.array([r['F'][1] for r in rows])
        res.update({
            'voicedFrames': len(rows),
            'f0MedianHz': round(float(np.median(f0s)), 1) if len(f0s) else None,
            'f0Note': note_name(float(np.median(f0s))) if len(f0s) else None,
            'f0SpanSemitones': round(12 * math.log2(f0s.max() / f0s.min()), 1) if len(f0s) and f0s.min() > 0 else None,
            'F1MedianHz': round(float(np.median(F1)), 1),
            'F2MedianHz': round(float(np.median(F2)), 1),
            'F1p10': round(float(np.percentile(F1, 10)), 1),
            'F1p90': round(float(np.percentile(F1, 90)), 1),
            'closestVowel': guess_vowel(float(np.median(F1)), float(np.median(F2))),
            'catFormantRatio': [round(float(np.median(F1)) / 800, 2), round(float(np.median(F2)) / 1300, 2)],
            'frames': rows[:60],
        })
    if as_json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"### {res['file']}  {info['durationSec']}s")
        if not rows:
            print("  有声フレームなし"); return res
        print(f"  有声 {res['voicedFrames']}フレーム")
        print(f"  f0 中央値 {res['f0MedianHz']}Hz ({res['f0Note']})  レンジ {res['f0SpanSemitones']}半音")
        print(f"  F1 {res['F1MedianHz']}Hz (p10 {res['F1p10']} / p90 {res['F1p90']})   F2 {res['F2MedianHz']}Hz")
        print(f"  最も近い母音: 「{res['closestVowel']}」")
        print(f"  人の「あ」(800/1300)に対する倍率: F1×{res['catFormantRatio'][0]} / F2×{res['catFormantRatio'][1]}")
    return res


if __name__ == '__main__':
    js = '--json' in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        main(p, js)
