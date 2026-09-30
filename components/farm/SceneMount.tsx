'use client'

import dynamic from 'next/dynamic'

// R3F 依赖浏览器 WebGL API，必须关闭 SSR
// （next/dynamic 的 ssr:false 只能在客户端组件中使用，所以包了这一层）
const FarmScene = dynamic(() => import('./FarmScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-sky-100">
      <p className="text-sm text-slate-500">农场加载中…</p>
    </div>
  ),
})

export default function SceneMount() {
  return <FarmScene />
}
