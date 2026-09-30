'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFAULT_WANDER_CONFIG, WanderBrain, type WanderConfig } from '@/lib/farm/wander'

interface WanderBehaviorProps {
  /** 游走配置；不传用默认步行风格 */
  config?: WanderConfig
  /** 向上暴露移动节点（相机跟随等用途） */
  moverRef?: React.RefObject<THREE.Group | null>
  children: React.ReactNode
}

/**
 * 游走行为组件：每帧从 WanderBrain 取位姿，驱动子物体在圆形区域内闲逛。
 *
 * 分层（从外到内）：WanderBehavior（整只动物位移/转向）
 *   → AnimalModel 校准层（尺度归一 + 贴地）
 *     → 骨骼动画（呼吸/摇尾继续播）
 * 位移写在外层 group 上，不碰校准层的 position，两者天然不冲突。
 */
export function WanderBehavior({ config, moverRef, children }: WanderBehaviorProps) {
  const fallbackRef = useRef<THREE.Group>(null!)
  const group = moverRef ?? fallbackRef
  const brain = useMemo(() => new WanderBrain(config ?? DEFAULT_WANDER_CONFIG), [config])

  useFrame((_, delta) => {
    const node = group.current
    if (!node) return
    // 钳制 dt：从后台标签页切回时 delta 可能好几秒，不钳制会瞬移
    brain.update(Math.min(delta, 0.05))
    const p = brain.pose
    node.position.set(p.x, p.y, p.z)
    node.rotation.y = p.heading
  })

  return <group ref={group}>{children}</group>
}
