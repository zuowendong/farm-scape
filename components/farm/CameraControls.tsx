'use client'

import { OrbitControls } from '@react-three/drei'

/**
 * 轨道相机（M0 阶段，后续演进为可切换的第一人称漫游）：
 * - 左键拖拽旋转 / 滚轮缩放 / 右键平移，带阻尼惯性
 * - minDistance：最近距离下限，防止缩放时钻进小狗模型内部
 * - maxPolarAngle：极角上限 < 90°，相机永远转不到地面以下
 */
export function CameraControls() {
  return (
    <OrbitControls
      makeDefault
      target={[0, 0.3, 0]}
      minDistance={1.2}
      maxDistance={14}
      maxPolarAngle={Math.PI / 2 - 0.02}
      enableDamping
      dampingFactor={0.08}
    />
  )
}
