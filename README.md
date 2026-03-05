# T² Laboratory — Sales Presentation

AIエッジコンピュータ設計サービス 商談用プレゼンテーション

## デプロイ手順

### 1. GitHubにリポジトリを作成
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/t2lab-presentation.git
git push -u origin main
```

### 2. Vercelに接続
1. https://vercel.com にログイン
2. "Add New Project" → GitHubリポジトリを選択
3. Framework Preset: **Other**
4. Root Directory: `.`（デフォルトのまま）
5. **Deploy** をクリック

→ 自動でビルド＆デプロイ完了。以後 `main` ブランチにpushするたびに自動更新。

## ファイル構成

```
t2lab-presentation/
├── index.html      # プレゼンテーション本体（全スライド含む）
├── vercel.json     # Vercelデプロイ設定
├── .gitignore
└── README.md
```

## 操作方法

| 操作 | アクション |
|------|-----------|
| `→` キー / `Space` | 次のスライド |
| `←` キー | 前のスライド |
| スワイプ左 | 次のスライド |
| スワイプ右 | 前のスライド |
| NEXT / PREV ボタン | ナビゲーション |
| スライド6のビューア | ドラッグで回転 / スクロールでズーム |
