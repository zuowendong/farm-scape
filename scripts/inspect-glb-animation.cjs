#!/usr/bin/env node
/**
 * GLB 动画通道体检：每根骨骼在何时动了多大。
 *
 * 用途：判断模型动画里有没有可用的走路/奔跑数据（很多 Sketchfab 模型把
 * idle / walk / run 合并在同一个 clip 里，需要按时间段切开用）。
 *
 * 用法：node scripts/inspect-glb-animation.cjs public/models/animals/xxx.glb
 * 输出：每通道的 节点名 / 属性 / 关键帧数 / 时间范围 / 幅度 + 秒级活动时间线
 */
const fs = require('node:fs')

const [,, glbPath] = process.argv
if (!glbPath) {
  console.error('用法: node scripts/inspect-glb-animation.cjs <model.glb>')
  process.exit(1)
}

const buf = fs.readFileSync(glbPath)
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
if (dv.getUint32(0, true) !== 0x46546c67) {
  console.error('不是 GLB 文件（magic 不符）')
  process.exit(1)
}

// 解析 GLB：12 字节头 + JSON chunk + BIN chunk
let off = 12
const jsonLen = dv.getUint32(off, true)
off += 8
const gltf = JSON.parse(buf.subarray(off, off + jsonLen).toString('utf8'))
off += jsonLen
const binLen = dv.getUint32(off, true)
off += 8
const binOff = off

/** 按 accessor 读出 float 数组（动画输入输出都是浮点/整数标量，逐分量展开） */
function readAccessor(acc) {
  const view = gltf.bufferViews[acc.bufferView]
  const start = binOff + (view.byteOffset || 0) + (acc.byteOffset || 0)
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type] || 1
  const count = acc.count * comps
  const out = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    switch (acc.componentType) {
      case 5126: out[i] = dv.getFloat32(start + i * 4, true); break
      case 5125: out[i] = dv.getUint32(start + i * 4, true); break
      case 5123: out[i] = dv.getUint16(start + i * 2, true); break
      case 5122: out[i] = dv.getInt16(start + i * 2, true); break
      default: throw new Error(`不支持的 componentType: ${acc.componentType}`)
    }
  }
  return out
}

/** 四元数夹角（弧度） */
function quatAngle(a, ai, b, bi) {
  const dot = Math.abs(a[ai] * b[bi] + a[ai+1] * b[bi+1] + a[ai+2] * b[bi+2] + a[ai+3] * b[bi+3])
  return 2 * Math.acos(Math.min(1, dot))
}

for (const anim of gltf.animations || []) {
  console.log(`\n动画片段 "${anim.name}"：${anim.channels.length} 通道`)
  console.log('节点名                     属性        帧数   时长(s)   幅度          活动时间线(1字符=1秒)')

  const rows = []
  for (const ch of anim.channels) {
    const node = (gltf.nodes || [])[ch.target.node] || {}
    const sampler = anim.samplers[ch.sampler]
    const times = readAccessor(gltf.accessors[sampler.input])
    const vals = readAccessor(gltf.accessors[sampler.output])
    const comps = { SCALAR: 1, VEC3: 3, VEC4: 4 }[gltf.accessors[sampler.output].type] || 1
    const nKeys = times.length

    // 按秒分桶记录每秒最大变化量
    const buckets = new Map()
    const isQuat = ch.target.path === 'rotation' && comps === 4
    for (let k = 0; k < nKeys - 1; k++) {
      const t = times[k]
      let delta
      if (isQuat) {
        delta = quatAngle(vals, k * 4, vals, (k + 1) * 4)
      } else {
        delta = 0
        for (let c = 0; c < comps; c++) {
          delta = Math.max(delta, Math.abs(vals[k * comps + c] - vals[(k + 1) * comps + c]))
        }
      }
      const b = Math.floor(t)
      if (delta > (buckets.get(b) ?? 0)) buckets.set(b, delta)
    }
    const duration = nKeys ? times[nKeys - 1] - times[0] : 0
    const maxDelta = Math.max(0, ...buckets.values())

    // 时间线字符：. 静止，数字=强度（每 0.05rad/0.005m 一级，封顶 9）
    const quiet = isQuat ? 0.02 : 0.002
    const step = isQuat ? 0.05 : 0.005
    const totalSec = Math.ceil(duration)
    let timeline = ''
    for (let s = 0; s < totalSec; s++) {
      const d = buckets.get(s) ?? 0
      timeline += d < quiet ? '.' : String(Math.min(9, Math.floor(d / step) + 1))
    }

    rows.push({
      name: (node.name || `<node ${ch.target.node}>`).padEnd(26),
      path: ch.target.path.padEnd(10),
      nKeys: String(nKeys).padStart(5),
      duration: duration.toFixed(1).padStart(7),
      maxDelta: (isQuat ? maxDelta.toFixed(2) + 'rad' : maxDelta.toFixed(3) + 'm').padEnd(12),
      timeline,
      sortKey: maxDelta,
    })
  }

  // 按动静幅度降序：最活跃的骨头排最前
  rows.sort((a, b) => b.sortKey - a.sortKey)
  for (const r of rows) {
    console.log(`${r.name} ${r.path} ${r.nKeys} ${r.duration} ${r.maxDelta}  ${r.timeline}`)
  }

  const legLike = rows.filter(r => /leg|foot|paw|thigh|calf|knee|arm|hip/i.test(r.name))
  if (legLike.length > 0) {
    console.log('\n>>> 检测到腿/脚相关骨骼通道，模型可能含走路/奔跑数据，看它们的活动时间线判断时间段')
  } else {
    console.log('\n>>> 未检测到腿/脚相关骨骼通道：此 clip 大概率是纯 idle（呼吸/头/尾），没有步态数据')
  }
}

if (!gltf.animations || gltf.animations.length === 0) {
  console.log('该 GLB 没有动画数据')
}
