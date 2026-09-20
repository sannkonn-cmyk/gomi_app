#!/usr/bin/env python3
"""声のざらつき: ジッタ・シマー・HNR・サブハーモニクス。

  python tools/roughness.py <file.mp3> [file2.mp3 ...] [--json]

spectral flatness では「がなり」を測れない。表記が濁点だらけの叫びでも
flatness は 0.002 と極めてトーナルに出る。こちらの4指標を使うこと。

注意: ここでの「ジッタ」は10msごとのf0変動で、抑揚やビブラートも含む。
素材間の相対比較用であって、音声医学的なジッタではない。
f0が150Hz未満だと30ms窓に周期が数個しか入らず信頼度が落ちる。
"""
import sys, json, math
import numpy as np
from common import load, note_name


def analyze(path):
    y, sr, info = load(path)
    fw, fh = int(0.030 * sr), int(0.010 * sr)
    n = 1 + max(0, (len(y) - fw)) // fh
    mx = np.max(np.abs(y)) or 1.0
    f0s, amps, hnrs, subs = [], [], [], []
    for i in range(n):
        seg = y[i * fh:i * fh + fw]
        r = np.sqrt(np.mean(seg ** 2))
        if r < 0.10 * mx:
            continue
        s = seg - seg.mean()
        ac = np.correlate(s, s, 'full')[len(s) - 1:]
        if ac[0] <= 0:
            continue
        acn = ac / ac[0]
        lo, hi = int(sr / 800), min(int(sr / 70), len(acn) - 1)
        if hi <= lo:
            continue
        k = lo + int(np.argmax(acn[lo:hi]))
        if acn[k] < 0.35:
            continue
        f0 = sr / k
        f0s.append(f0); amps.append(r)
        pk = min(acn[k], 0.999)
        hnrs.append(10 * math.log10(pk / (1 - pk)))
        N = 4096
        sg = np.pad(s, (0, max(0, N - len(s))))[:N]
        S = np.abs(np.fft.rfft(sg * np.hanning(N)))
        ff = np.fft.rfftfreq(N, 1 / sr)

        def band(c):
            i0, i1 = np.searchsorted(ff, c * 0.9), np.searchsorted(ff, c * 1.1)
            return S[i0:max(i1, i0 + 1)].max()

        if f0 / 2 > 70:
            subs.append(band(f0 / 2) / (band(f0) + 1e-12))

    res = dict(info); res['file'] = path.split('/')[-1]
    if len(f0s) < 5:
        res['error'] = 'データ不足'
        return res
    f0s, amps = np.array(f0s), np.array(amps)
    res.update({
        'f0MedianHz': round(float(np.median(f0s)), 1),
        'f0Note': note_name(float(np.median(f0s))),
        'jitterPct': round(float(100 * np.mean(np.abs(np.diff(f0s))) / np.mean(f0s)), 2),
        'shimmerPct': round(float(100 * np.mean(np.abs(np.diff(amps))) / np.mean(amps)), 2),
        'hnrDb': round(float(np.mean(hnrs)), 1),
        'subharmonicRatio': round(float(np.mean(subs)), 3) if subs else None,
        'lowF0Warning': bool(np.median(f0s) < 150),
    })
    return res


if __name__ == '__main__':
    js = '--json' in sys.argv
    out = [analyze(p) for p in sys.argv[1:] if not p.startswith('--')]
    if js:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(f"{'素材':<26}{'f0':>8}{'ジッタ%':>9}{'シマー%':>9}{'HNR':>7}{'サブH':>7}")
        print("-" * 68)
        for r in out:
            if r.get('error'):
                print(f"{r['file'][:24]:<26}  {r['error']}"); continue
            w = ' ※f0低' if r['lowF0Warning'] else ''
            print(f"{r['file'][:24]:<26}{r['f0MedianHz']:>8}{r['jitterPct']:>9}"
                  f"{r['shimmerPct']:>9}{r['hnrDb']:>7}{r['subharmonicRatio'] or 0:>7}{w}")
        print("\n※ジッタ/シマー: 大きいほど不安定＝がなり・しゃがれ")
        print("※HNR: 小さいほど雑音が多い＝ざらつく")
        print("※サブH: f0の半分の成分。大きいほど「二重声」")
