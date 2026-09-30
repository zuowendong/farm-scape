'use client'

import '@react-three/fiber'

/** 草地地面：大圆盘接收阴影，远端由场景雾色融入天空 */
export function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[40, 64]} />
      <meshStandardMaterial color="#8aa957" roughness={1} metalness={0} />
    </mesh>
  )
}
