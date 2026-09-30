'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraFollowProps {
  /** 跟随对象（通常是 WanderBehavior 的 moverRef） */
  targetRef: React.RefObject<THREE.Object3D | null>
  /** 注视高度（米）。固定高度而非跟随狗的 y，避免相机跟着每次蹦跳颠簸 */
  height?: number
  /** 跟随松紧度 0~1，越小越缓 */
  strength?: number
}

const _worldPos = new THREE.Vector3()
const _desired = new THREE.Vector3()

/**
 * 轨道相机注视点软跟随：动物走远时，OrbitControls 的 target 缓慢追过去。
 * 软 lerp 保证用户旋转/缩放操作不被打断，只是视域中心慢慢漂移。
 */
export function CameraFollow({ targetRef, height = 0.3, strength = 0.04 }: CameraFollowProps) {
  // makeDefault 的 OrbitControls 会把自己挂到 state.controls 上
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3 }
    | null

  useFrame(() => {
    const target = targetRef.current
    if (!controls || !target) return
    target.getWorldPosition(_worldPos)
    _desired.set(_worldPos.x, height, _worldPos.z)
    controls.target.lerp(_desired, strength)
  })

  return null
}
