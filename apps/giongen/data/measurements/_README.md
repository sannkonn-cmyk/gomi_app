# 実測データ

ユーザー提供の音源を `tools/` で解析して抽出した特徴量。
**音源ファイル自体はリポジトリに入れない**（`.gitignore` で除外）。ここに入るのは数値だけ。

## これは「正解」ではなく「出発点」

元音源は BGM・残響・複数レイヤー込みの平均値なので、そのまま再現すると特徴が薄まる。
実際に「学習させたものより、オリジナルのほうが特徴を捉えている」と指摘されている。
**擬音は忠実再現より戯画化が効く。1.3〜1.8倍に誇張してよい。**

## 追加のしかた

```bash
cd tools
../venv/bin/python analyze.py <file> --json   # EQ・重心・構造
../venv/bin/python melody.py  <file> --json   # 音程・倍音比・エンベロープ
../venv/bin/python voice.py   <file> --json   # フォルマント
../venv/bin/python rhythm.py  <file> --json   # BPM
../venv/bin/python roughness.py <file> --json # 声のざらつき
```
