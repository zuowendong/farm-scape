# farm-scape · 万象农场

浏览器端 3D 农场数字场景：以观赏为主、叠加轻交互的「活的农场小世界」——有建筑、树木花草、车辆和许多小动物。个人学习 + 作品展示项目，**场景中的第三方模型仅供学习使用，不商用**。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS 4
- [three](https://threejs.org/) + [@react-three/fiber](https://r3f.docs.pmnd.rs/) + [@react-three/drei](https://drei.docs.pmnd.rs/)
- pnpm 包管理

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

其他命令：

```bash
pnpm build      # 生产构建
pnpm start      # 生产运行
pnpm lint       # 代码检查
pnpm models:dog # 重新生成占位小狗 GLB（输出 dog-placeholder.glb，不会覆盖真实模型）
```

## 目录结构

```
app/                    # 页面路由（page.tsx 挂载 3D 场景）
components/farm/        # 3D 场景组件（FarmScene / AnimalModel / Ground / CameraControls / SceneMount）
lib/farm/assets.ts      # 资产注册表：所有模型必须先在此登记
lib/farm/model-utils.ts # 模型落地校准工具（尺度归一 / 贴地 / 居中）
public/models/          # 模型资产库（优化后的 GLB），按类别分目录
assets-src/             # 第三方模型原始下载存档（含 license.txt，不进部署产物）
scripts/                # 工具脚本（含占位模型生成）
```

## 3D 资产规范

所有进入场景的模型（第三方下载 / Blender 自制）遵循：

- **格式**：统一 GLB
- **存放**：`public/models/<类别>/`，类别为 `animals/ buildings/ vegetation/ vehicles/ props/`
- **命名**：小写 kebab-case，如 `dog.glb`、`barn-01.glb`
- **规范**：单位米、原点脚底中心、正面朝 +Z——不规范的模型也没关系，渲染层的落地校准会自动兜底
- **登记**：放入文件后在 `lib/farm/assets.ts` 注册（id、名称、来源、许可协议、目标高度、动画片段）
- **许可**：第三方模型需逐个确认协议（CC0 / CC-BY 等），CC-BY 需在页面署名

### 模型下载与优化建议

| 事项 | 建议 |
|------|------|
| 体积 | 单个 GLB 控制在 10MB 内为宜；大模型用 [gltf-transform](https://gltf-transform.dev/) 做 `draco` 或 `meshopt` 压缩（加载管线已支持 Draco 解码） |
| 纹理 | 降采样到 1024 / 2048，避免 4K 纹理直接入站 |
| 动画 | 动物模型优先选自带骨骼动画的（Idle / Walk 等），点击反馈会优先用模型动画 |
| 尺度 | 无需在意，加载后统一按注册表 `displayHeight` 归一化 |

### 第三方模型接入流程（已在小狗上跑通）

以 Sketchfab 下载的分离式 glTF 为例：

1. **存档原始文件**：下载包（scene.gltf + scene.bin + textures + license.txt）原样放入 `assets-src/<类别>/<名称>/`，不进部署产物
2. **转换优化**：用 [gltf-transform](https://gltf-transform.dev/) CLI 转为单个 GLB 并压缩纹理（小狗实测 11.27MB → 2.87MB）：

```bash
# metalrough：把已废弃的 KHR_materials_pbrSpecularGlossiness 材质转为标准 metal/rough 工作流
# ——新版本 three.js 已移除该扩展支持，不做这步会丢失贴图、模型呈灰白色！
pnpm dlx @gltf-transform/cli copy assets-src/animals/dog/scene.gltf public/models/animals/dog.glb
pnpm dlx @gltf-transform/cli metalrough public/models/animals/dog.glb public/models/animals/dog.glb
pnpm dlx @gltf-transform/cli resize public/models/animals/dog.glb public/models/animals/dog.glb --width 2048 --height 2048
pnpm dlx @gltf-transform/cli webp public/models/animals/dog.glb public/models/animals/dog.glb --quality 85
```

3. **登记**：在 `lib/farm/assets.ts` 注册 id、名称、来源、许可协议、目标高度

### 当前资产署名（CC-BY-4.0 要求）

- 拉布拉多犬：["Labrador Dog"](https://sketchfab.com/3d-models/labrador-dog-1f56cfbab07e4fe49b5d9e521c82073a) by [kenchoo](https://sketchfab.com/kenchoo)，CC-BY-4.0（自带 13 秒骨骼动画）

### 占位小狗

管线验证用的方块小狗，需要时重新生成（输出 `dog-placeholder.glb`，不覆盖真实模型）：

```bash
pnpm models:dog
```

## 路线图

- **M0** ✅ 技术验证：R3F 接入、轨道相机（旋转/缩放/平移，不穿模不钻地）、GLB 加载管线
- **M1** 静态世界：核心院落（农舍 + 谷仓 + 围栏动物区 + 农田）
- **M2** 生命气息：动物巡游与点击反馈、车辆行驶、昼夜循环、天气动效、环境音
- **M3** 打磨扩展：第一人称漫游、农场图鉴、Blender 自制模型接入、性能优化与发布
