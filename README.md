# T² Laboratory Presentation

Vite + React + TypeScript 構成の商談用プレゼンテーション。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## GitHub → Vercel デプロイ手順

### 1. GitHubにpush
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/t2lab-presentation.git
git push -u origin main
```

### 2. Vercelで接続
1. https://vercel.com → **Add New Project**
2. GitHubリポジトリを選択
3. Framework Preset: **Vite**（自動検出される）
4. **Deploy** をクリック

→ 以後 `main` へpushするたびに自動デプロイ。

## 操作

| 操作 | 動作 |
|------|------|
| `→` / `Space` | 次スライド |
| `←` | 前スライド |
| スワイプ | 前後スライド |
| PREV / NEXT ボタン | ナビゲーション |
