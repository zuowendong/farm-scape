'use client'

import { useLayoutEffect, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getAsset } from '@/lib/farm/assets'
import { snapToGround } from '@/lib/farm/model-utils'

interface AnimalModelProps {
  /** 资产注册表 id */
  assetId: string
  /** 播放哪个动画片段；缺省按 注册表 animations[0] → 模型首个片段 的顺序取 */
  clip?: string
}

/**
 * 通用动物模型：GLB 挂起加载 → 落地校准 → 骨骼动画自动播放。
 *
 * - 尺度归一化在外层 group 上做，不影响内层 AnimationMixer 的骨骼动画
 * - 蒙皮网格关闭视锥裁剪（动画姿态常超出 bind-pose 包围盒，否则会闪现消失）
 * - 模型自带动画时自动播放第一个片段；无动画的模型保持静止（待 M2 接程序化动效）
 */
export function AnimalModel({ assetId, clip }: AnimalModelProps) {
  const asset = getAsset(assetId)
  // 第二个参数 true：启用 Draco 解码支持（为将来压缩模型预留）
  const { scene, animations } = useGLTF(asset.file, true)
  const wrapper = useRef<THREE.Group>(null!)
  const { actions, names } = useAnimations(animations, wrapper)

  useLayoutEffect(() => {
    const group = wrapper.current
    group.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true
        if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
          node.frustumCulled = false
        }
      }
    })
    // 落地校准：无论模型原点/尺度多离谱，统一「站」在 y=0 地面、位于原点
    snapToGround(group, { targetHeight: asset.displayHeight })

    // 播放动画：显式指定 > 注册表登记 > 模型首个片段
    const clipName = clip ?? asset.animations?.[0] ?? names[0]
    const action = clipName ? actions[clipName] : undefined
    if (action) {
      action.reset().fadeIn(0.3).play()
    }
    return () => {
      action?.fadeOut(0.3)
    }
  }, [asset, clip, actions, names])

  return (
    <group ref={wrapper}>
      <primitive object={scene} />
    </group>
  )
}
