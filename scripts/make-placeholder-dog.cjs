#!/usr/bin/env node
/**
 * 生成占位小狗 GLB 模型（public/models/animals/dog.glb）
 *
 * 用途：在真实小狗模型下载就位前，先跑通「GLB 加载 → 落地校准 → 渲染」整条管线。
 * 真实模型到位后替换同名文件即可，渲染代码零改动。
 *
 * 资产规范（与 lib/farm/assets.ts 呼应）：
 * - 单位：米；原点：脚底中心；正面朝 +Z
 * - 命名：小写 kebab-case，按类别存放于 public/models/<category>/
 */
const fs = require('node:fs')
const path = require('node:path')

/** Node 环境下为 GLTFExporter 补一个最小 FileReader（binary 导出路径需要） */
class FileReaderShim {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}

async function main() {
  globalThis.FileReader = FileReaderShim

  const THREE = await import('three')
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

  const bodyMat = new THREE.MeshStandardMaterial({ name: 'body', color: 0xc98a4b, roughness: 0.9, metalness: 0 })
  const darkMat = new THREE.MeshStandardMaterial({ name: 'dark', color: 0x8a5a2e, roughness: 0.9, metalness: 0 })
  const blackMat = new THREE.MeshStandardMaterial({ name: 'black', color: 0x1f1a17, roughness: 0.6, metalness: 0 })

  const dog = new THREE.Group()
  dog.name = 'PlaceholderDog'

  /** 添加一个盒子部件：尺寸 size、位置 pos、可选旋转 rot（弧度） */
  const addPart = (name, size, pos, material, rot) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
    mesh.name = name
    mesh.position.set(...pos)
    if (rot) mesh.rotation.set(...rot)
    dog.add(mesh)
  }

  // —— 占位小狗：面向 +Z，原点在脚底中心，身高约 1.06 米 ——
  addPart('Body', [0.5, 0.5, 0.95], [0, 0.5, 0], bodyMat)
  addPart('Head', [0.46, 0.42, 0.42], [0, 0.72, 0.52], bodyMat)
  addPart('Snout', [0.2, 0.16, 0.16], [0, 0.64, 0.78], darkMat)
  addPart('Nose', [0.08, 0.06, 0.04], [0, 0.67, 0.87], blackMat)
  addPart('EarL', [0.1, 0.2, 0.06], [-0.17, 0.96, 0.44], darkMat)
  addPart('EarR', [0.1, 0.2, 0.06], [0.17, 0.96, 0.44], darkMat)
  addPart('EyeL', [0.06, 0.06, 0.02], [-0.12, 0.78, 0.735], blackMat)
  addPart('EyeR', [0.06, 0.06, 0.02], [0.12, 0.78, 0.735], blackMat)
  addPart('LegFL', [0.14, 0.32, 0.14], [-0.17, 0.16, 0.3], bodyMat)
  addPart('LegFR', [0.14, 0.32, 0.14], [0.17, 0.16, 0.3], bodyMat)
  addPart('LegBL', [0.14, 0.32, 0.14], [-0.17, 0.16, -0.3], bodyMat)
  addPart('LegBR', [0.14, 0.32, 0.14], [0.17, 0.16, -0.3], bodyMat)
  addPart('Tail', [0.1, 0.1, 0.4], [0, 0.68, -0.62], darkMat, [0.65, 0, 0])

  const glb = await new Promise((resolve, reject) => {
    new GLTFExporter().parse(dog, resolve, reject, { binary: true })
  })

  const outPath = path.resolve(__dirname, '../public/models/animals/dog-placeholder.glb')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, Buffer.from(glb))
  console.log(`OK 占位小狗已生成：${outPath}（${(glb.byteLength / 1024).toFixed(1)} KB）`)
}

main().catch((error) => {
  console.error('生成失败：', error)
  process.exit(1)
})
