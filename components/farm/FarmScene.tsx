'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { CameraControls } from './CameraControls'
import { AnimalModel } from './AnimalModel'
import { Ground } from './Ground'

/**
 * 万象农场 3D 场景（M0 技术验证）：
 * R3F Canvas + 环境光照 + 小狗模型（GLB 管线）+ 轨道相机。
 */
export default function FarmScene() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.4, 1.35, 3.0], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#a9d3ea']} />
        <fog attach="fog" args={['#a9d3ea', 24, 60]} />

        {/* 环境光照：天空漫射光 + 太阳平行光（带阴影） */}
        <hemisphereLight args={['#cfe8ff', '#6a8a4f', 0.85]} />
        <directionalLight
          castShadow
          position={[6, 9, 4]}
          intensity={1.7}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-camera-near={1}
          shadow-camera-far={30}
          shadow-bias={-0.0004}
        />

        <Suspense fallback={null}>
          <AnimalModel assetId="labrador" />
        </Suspense>

        <Ground />
        <CameraControls />
      </Canvas>
      {/* drei 加载进度条（模型下载期间显示） */}
      <Loader />
    </>
  )
}
