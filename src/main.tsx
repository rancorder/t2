// main.tsx に以下を適用してください
// （既存の import App from './App' の下に追加）

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AppV2 from './AppV2'

// URL パラメータで切り替え
// 例: https://your-domain.vercel.app/?v=2 → V2 LP
//     https://your-domain.vercel.app/       → V1 Slide
const params = new URLSearchParams(window.location.search)
const Root = params.get('v') === '2' ? AppV2 : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
