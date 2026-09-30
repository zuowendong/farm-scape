import * as THREE from 'three'

/**
 * 模型落地校准（对所有来源的模型统一兜底）：
 * 1. 尺度归一化：把模型缩放到 targetHeight（不同站点的模型尺度差异可达数十倍）
 * 2. 水平居中：包围盒中心对齐 x/z 原点（有的模型原点偏得离谱）
 * 3. 贴地：包围盒底部对齐 y=0，保证站在地面上不穿模
 *
 * 调用约定：object 应挂在无变换的父级下（如 Canvas 直接子级 group），
 * 因为校准基于世界坐标包围盒计算平移量。
 *
 * @returns 校准后的世界包围盒（可用于相机取景、交互命中范围等）
 */
export function snapToGround(
  object: THREE.Object3D,
  options: { targetHeight?: number } = {},
): THREE.Box3 {
  object.updateWorldMatrix(true, true)
  let box = new THREE.Box3().setFromObject(object)

  // 1. 尺度归一化
  if (options.targetHeight !== undefined) {
    const height = box.max.y - box.min.y
    if (height > 0 && Number.isFinite(height)) {
      const scale = options.targetHeight / height
      object.scale.multiplyScalar(scale)
      object.updateWorldMatrix(true, true)
      box = new THREE.Box3().setFromObject(object)
    }
  }

  // 2. 水平居中 + 3. 贴地
  const center = box.getCenter(new THREE.Vector3())
  object.position.x -= center.x
  object.position.z -= center.z
  object.position.y -= box.min.y

  object.updateWorldMatrix(true, true)
  return new THREE.Box3().setFromObject(object)
}
