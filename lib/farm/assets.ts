/**
 * 万象农场 · 3D 资产注册表
 *
 * 所有进入场景的模型（第三方下载 / Blender 自制 / 占位脚本生成）都必须在这里登记，
 * 场景代码只认资产 id，不直接写文件路径 —— 换模型、改路径不动渲染代码。
 *
 * 资产文件规范（public/models/）：
 * - 格式统一 GLB；单位：米；原点：脚底/底部中心；正面朝 +Z
 * - 命名：小写 kebab-case，按类别存放：animals/ buildings/ vegetation/ vehicles/ props/
 * - 下载的第三方模型若原点/朝向不规范也没关系，渲染层会做落地校准兜底
 * - 模型优化建议：几何用 gltf-transform 做 meshopt 或 draco 压缩，
 *   纹理降采样到 1024/2048；加载管线已同时支持两种压缩格式
 *
 * 第三方模型接入流程（以 Sketchfab 下载为例）：
 * 1. 下载的分离式 glTF（scene.gltf + bin + textures）放入 assets-src/<类别>/<名称>/ 原样保存（含 license.txt）
 * 2. 用 gltf-transform 转换优化为单个 GLB 放入 public/models/<类别>/：
 *    pnpm dlx @gltf-transform/cli copy assets-src/animals/dog/scene.gltf public/models/animals/dog.glb
 *    pnpm dlx @gltf-transform/cli metalrough public/models/animals/dog.glb public/models/animals/dog.glb
 *    pnpm dlx @gltf-transform/cli resize public/models/animals/dog.glb public/models/animals/dog.glb --width 2048 --height 2048
 *    pnpm dlx @gltf-transform/cli webp public/models/animals/dog.glb public/models/animals/dog.glb --quality 85
 *    （metalrough 必不可少：老模型常用已废弃的 KHR_materials_pbrSpecularGlossiness 扩展，
 *     新版 three.js 已移除其支持，不转换会丢贴图变灰白色）
 * 3. 在下方 FARM_ASSETS 登记（来源/许可协议必须如实填写，CC-BY 需署名）
 */

export type AssetCategory = 'animal' | 'building' | 'vegetation' | 'vehicle' | 'prop'

export interface FarmAsset {
  /** 资产唯一 id，场景代码通过它引用资产 */
  id: string
  /** 展示名称 */
  name: string
  /** GLB 文件路径（public 目录下的 Web 绝对路径） */
  file: string
  category: AssetCategory
  /** 展示高度（米）。加载后统一归一化到该高度，避免不同来源模型尺度悬殊 */
  displayHeight: number
  /** 模型来源（下载站点 / 自制 / 占位脚本） */
  source: string
  /** 许可协议。CC-BY 系列需在页面署名，商用前必须逐个确认 */
  license: string
  /** 模型自带的动画片段名（如有） */
  animations?: string[]
  /** 是否为占位模型（等待替换为真实资产） */
  placeholder?: boolean
}

export const FARM_ASSETS: FarmAsset[] = [
  {
    id: 'labrador',
    name: '拉布拉多犬',
    file: '/models/animals/labrador.glb',
    category: 'animal',
    displayHeight: 0.6,
    source:
      'Sketchfab "Labrador Dog" by kenchoo (https://sketchfab.com/3d-models/labrador-dog-1f56cfbab07e4fe49b5d9e521c82073a)',
    license: 'CC-BY-4.0（需署名，原始文件与 license.txt 存于 assets-src/animals/labrador_dog/）',
    animations: ['Animation'],
  },
]

/** 按 id 取资产，未登记的资产直接报错（防止场景里出现幽灵路径） */
export function getAsset(id: string): FarmAsset {
  const asset = FARM_ASSETS.find((item) => item.id === id)
  if (!asset) {
    throw new Error(`[farm-assets] 未注册的资产 id: "${id}"，请先在 lib/farm/assets.ts 中登记`)
  }
  return asset
}
