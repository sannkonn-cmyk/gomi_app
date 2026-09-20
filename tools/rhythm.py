#!/usr/bin/env python3
"""BPM推定（スペクトルフラックスの自己相関）。

  python tools/rhythm.py <file.mp3> [--json]

出た BPM は必ずオンセット間隔と突き合わせて裏を取る。
猫ミームダンスでは 137BPM の8分=218ms が実測オンセット間隔216-220msと一致した。
"""
import sys, json
import numpy as np
from common import load, onsets


def main(path, as_json=False):
    y, sr, info = load(path)
    N, H = 2048, 512
    w = np.hanning(N)
    n = 1 + max(0, (len(y) - N)) // H
    S = np.empty((n, N // 2 + 1), np.float32)
    for i in range(n):
        S[i] = np.abs(np.fft.rfft(y[i * H:i * H + N] * w))
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    if flux.std() < 1e-12:
        print("リズム成分なし"); return dict(info)
    flux = (flux - flux.mean()) / flux.std()
    fps = sr / H
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    ac = ac / (ac[0] + 1e-12)
    cands = []
    for bpm in np.arange(60, 201, 0.5):
        lag = int(round(60.0 / bpm * fps))
        if 1 < lag < len(ac):
            cands.append((float(ac[lag]), float(bpm)))
    cands.sort(reverse=True)
    best = cands[0][1]
    f = np.fft.rfftfreq(N, 1 / sr)
    sub = S[:, f < 100].sum(1) / (S.sum(1) + 1e-12)
    on = onsets(y, sr, thr_db=4.0, min_gap=0.08)
    res = dict(info)
    res.update({
        'file': path.split('/')[-1],
        'bpm': round(best, 1),
        'bpmConfidence': round(cands[0][0], 3),
        'quarterMs': round(60000 / best, 1),
        'eighthMs': round(30000 / best, 1),
        'sixteenthMs': round(15000 / best, 1),
        'subBassMeanPct': round(float(np.mean(sub) * 100), 1),
        'subBassMaxPct': round(float(np.max(sub) * 100), 1),
        'onsetIntervalsMs': [round(float(v * 1000), 1) for v in np.diff(on)[:20]] if len(on) > 1 else [],
    })
    if as_json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"### {res['file']}  {info['durationSec']}s")
        print(f"  BPM {res['bpm']} (相関 {res['bpmConfidence']})")
        print(f"  4分 {res['quarterMs']}ms / 8分 {res['eighthMs']}ms / 16分 {res['sixteenthMs']}ms")
        print(f"  サブベース(<100Hz) 平均 {res['subBassMeanPct']}% / 最大 {res['subBassMaxPct']}%")
        if res['onsetIntervalsMs']:
            print("  実測オンセット間隔(ms): " + ", ".join(str(v) for v in res['onsetIntervalsMs'][:12]))
            print("  ↑ 8分/16分の値と一致するか必ず確認する")
    return res


if __name__ == '__main__':
    js = '--json' in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        main(p, js)
