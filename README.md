# gomi_app

ゴミアプリ制作シリーズ。小さくて実用性が低くて、でも触ると楽しいアプリ置き場。

## アプリ

| | | |
|---|---|---|
| 🔊 | **[汎用擬音ジェネレーター](apps/giongen/)** | ひらがなを入れると、文字に書き起こせない音が鳴る |

## 遊びかた

`apps/giongen/index.html` をブラウザで開くだけ。
サーバーもビルドも不要で、通信も発生しません。音はすべてブラウザ内で合成しています。

## GitHub Pages で公開する

リポジトリの **Settings → Pages** で Source を `Deploy from a branch`、
ブランチを `main` / フォルダを `/ (root)` に設定すると、
`https://<user>.github.io/gomi_app/` で公開されます。

## 開発

素の HTML / CSS / ES モジュールのみ。npm もビルドツールも使いません。
`tools/` は音源から合成パラメータを抽出する Python スクリプト群です。
詳細は [CLAUDE.md](CLAUDE.md) を参照。

```bash
python3 -m venv venv
./venv/bin/pip install -r tools/requirements.txt
cd tools && ../venv/bin/python analyze.py yourfile.mp3
```
