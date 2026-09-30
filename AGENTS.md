# AGENTS.md — 万象农场 farm-scape

面向 AI 编码代理的项目工作指南。人读版详见 `README.md`。

## 项目概述

浏览器端 3D 农场数字场景（观赏 + 轻交互），最终部署 Vercel。
**第三方模型均为 CC-BY 等需署名协议，仅供学习不商用**——接入任何新资产必须登记来源与许可。

## 常用命令

```bash
pnpm dev        # 开发（Turbopack）
pnpm build      # 生产构建
pnpm lint       # ESLint
pnpm models:dog # 生成占位小狗（输出 dog-placeholder.glb，不覆盖真实模型）
npx tsc --noEmit  # 类型检查（改动后必须跑）
```

## 目录结构

```
app/page.tsx             # Server Component，只做挂载
components/farm/
  SceneMount.tsx         # 'use client' + next/dynamic(ssr:false) —— 唯一的 SSR 边界
  FarmScene.tsx          # R3F Canvas + 光照 + 雾 + 相机
  AnimalModel.tsx        # 通用动物模型（GLB 加载 + 落地校准 + 动画播放）
  CameraControls.tsx     # 轨道相机（后期加第一人称漫游）
  Ground.tsx
lib/farm/
  assets.ts              # 资产注册表（唯一允许出现模型路径的地方）
  model-utils.ts         # snapToGround 落地校准
public/models/<类别>/     # 优化后的 GLB（animals/buildings/vegetation/vehicles/props）
assets-src/<类别>/<名称>/ # 第三方原始下载存档（含 license.txt，不进部署产物）
scripts/                 # 占位模型生成等工具脚本
```

## 核心架构约定（改动前必读）

1. **资产注册表模式**：模型必须先在 `lib/farm/assets.ts` 登记（id/file/displayHeight/source/license/animations），场景代码只认 `assetId`，禁止直接写文件路径。`getAsset()` 对未登记 id 直接抛错，这是有意的。
2. **落地校准**：所有模型经 `snapToGround(object, { targetHeight })` 统一——尺度归一化到 displayHeight → 水平居中 → 包围盒底部贴 y=0。模型原点/尺度不规范没关系，校准兜底；**不要**为单个模型在场景里手写偏移。
3. **尺度归一化只作用在外层 group**，不触碰内层骨骼动画节点。
4. **防穿模是硬约束**：OrbitControls 的 `minDistance`（防钻进模型）与 `maxPolarAngle < π/2`（防钻入地下）不可移除。
5. **`ssr: false` 只能在客户端组件中使用**（Next.js 16 限制），所以 R3F Canvas 必须经 `SceneMount` 这层 'use client' 包裹，不要在 page.tsx 直接 dynamic。
6. **蒙皮网格（SkinnedMesh）必须 `frustumCulled = false`**，否则动画姿态超出 bind-pose 包围盒时模型会闪现消失。

## 3D 资产接入流程

```bash
# 0. 原始包存档到 assets-src/<类别>/<名称>/（含 license.txt）
# 1. 体检：看扩展、纹理大小、确认 animations 字段存在
pnpm dlx @gltf-transform/cli inspect assets-src/animals/xxx/scene.gltf
# 2. 打包单 GLB
pnpm dlx @gltf-transform/cli copy assets-src/animals/xxx/scene.gltf public/models/animals/xxx.glb
# 3.（仅当 inspect 出现 KHR_materials_pbrSpecularGlossiness 时）材质工作流转换
pnpm dlx @gltf-transform/cli metalrough public/models/animals/xxx.glb public/models/animals/xxx.glb
# 4. 纹理降采样 + 转 WebP（体积大头在纹理，这两步是主要收益）
pnpm dlx @gltf-transform/cli resize public/models/animals/xxx.glb public/models/animals/xxx.glb --width 2048 --height 2048
pnpm dlx @gltf-transform/cli webp public/models/animals/xxx.glb public/models/animals/xxx.glb --quality 85
# 5. assets.ts 登记，页面强刷验证（浏览器会缓存旧 GLB）
```

几何本身很大（inspect 显示几十万顶点）时再加 `meshopt`；`draco` 慎用（CPU 解码重）。
纹理质量分档：展示贴图 85 起步，normal 贴图可压狠。

## 已知坑（按复发概率排序）

1. **Sketchfab 预览会动 ≠ 下载包含动画**：接入动物前先 inspect 确认 `animations` 存在；无动画模型静默兼容（AnimalModel 自动跳过播放）。
2. **`KHR_materials_pbrSpecularGlossiness`（已废弃扩展）**：three 0.186 GLTFLoader 零支持，贴图读不到 → 模型灰白色。必须 `metalrough` 转换。模型变色先查 `extensionsRequired`。
3. **Node 脚本跑 three**（GLTFExporter 等）需要浏览器 API shim（见 scripts/make-placeholder-dog.cjs 的 FileReader shim）。
4. **next dev 会自动重写本文件的 nextjs-agent-rules 块**：保留该块提交即可，不要删除。
5. **浏览器缓存 GLB**：替换同名模型文件后需强刷验证，别误判为代码问题。

## Git 提交工作流

simple-git-hooks 四钩子（pnpm 会拦截 postinstall，clone 后需手动 `npx simple-git-hooks` 激活）：

- `prepare-commit-msg` → `scripts/ai-commit.cjs`：AI 生成 Conventional Commits 信息（用户说 "commit" 时用 commit-message skill 走此流程）
- `commit-msg` → commitlint 校验（`commitlint.config.cjs`）
- `pre-push` → `scripts/check-commits.cjs`
- `post-commit` → `scripts/post-commit.cjs`（合并 CHANGELOG）

**不要绕过钩子提交（--no-verify）**，除非用户明确要求。

## 编码约定

- TypeScript strict；路径别名 `@/*` 指向项目根
- 组件注释与关键逻辑用中文，说明「为什么」而非复述代码
- 3D 数值（光照强度/相机距离等）带单位与用途注释
- R3F 组件一律 'use client'；纯工具函数（lib/）保持框架无关

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
