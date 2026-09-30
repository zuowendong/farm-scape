/**
 * 游走行为状态机（框架无关，纯数学）：
 * rest（原地休息）→ turn（转身朝向目标）→ move（移动过去）→ rest …循环
 *
 * 分层约定：本类只产出位姿（x/z/y/heading），不碰任何渲染对象。
 * 由 WanderBehavior 组件把位姿写入场景节点——
 * 骨骼动画（呼吸/摇尾）在内层继续播放，整只动物的位移在外层叠加，互不干扰。
 *
 * 两种移动风格：
 * - walk：平滑滑行 + 轻微颠簸（适合大中型动物，如狗/牛/马）
 * - hop：抛物线蹦跳（适合小动物，如兔子/鸡——后续拆动物包接入时用）
 */

export interface WanderConfig {
  /** 游走范围半径（米），以出生点为圆心 */
  radius: number
  /** 移动速度（米/秒） */
  speed: number
  /** 移动风格：walk 平滑滑行 / hop 抛物线蹦跳 */
  style: 'walk' | 'hop'
  /** 单次蹦跳时长（秒），style=hop 时生效 */
  hopDuration: number
  /** 蹦跳离地最高高度（米），style=hop 时生效 */
  hopHeight: number
  /** walk 模式的颠簸幅度（米），模拟迈步起伏 */
  bobAmplitude: number
  /** walk 模式的颠簸频率（Hz），约等于步频 */
  bobFrequency: number
  /** 休息时长区间（秒），每次到达目标后随机停一会儿 */
  restRange: [number, number]
  /** 转身角速度（弧度/秒） */
  turnSpeed: number
}

export interface WanderPose {
  x: number
  z: number
  /** 离地高度（米）：hop 的抛物线抬升 / walk 的颠簸 */
  y: number
  /** Y 轴朝向（弧度），0 = 面向 +Z（与资产规范一致） */
  heading: number
}

/** 默认配置：中大型动物的步行风格 */
export const DEFAULT_WANDER_CONFIG: WanderConfig = {
  radius: 2.5,
  speed: 0.6,
  style: 'walk',
  hopDuration: 0.45,
  hopHeight: 0.2,
  bobAmplitude: 0.02,
  bobFrequency: 2.2,
  restRange: [1.5, 4],
  turnSpeed: 2.2,
}

type Phase = 'rest' | 'turn' | 'move'

export class WanderBrain {
  private phase: Phase = 'rest'
  private timer: number
  private targetX = 0
  private targetZ = 0
  private bobTime = 0

  /** 每帧 update 后读取的当前位姿（同一对象复用，避免每帧分配） */
  readonly pose: WanderPose = { x: 0, z: 0, y: 0, heading: 0 }

  constructor(private config: WanderConfig) {
    this.timer = this.nextRestDuration()
  }

  update(dt: number): void {
    const c = this.config
    switch (this.phase) {
      case 'rest': {
        this.pose.y = 0
        this.timer -= dt
        if (this.timer <= 0) {
          // 目标点取圆内随机位置；0.2~1 倍半径，避免总贴着边界走
          const angle = Math.random() * Math.PI * 2
          const dist = c.radius * (0.2 + 0.8 * Math.random())
          this.targetX = Math.cos(angle) * dist
          this.targetZ = Math.sin(angle) * dist
          this.phase = 'turn'
        }
        break
      }
      case 'turn': {
        const desired = Math.atan2(this.targetX - this.pose.x, this.targetZ - this.pose.z)
        const diff = wrapAngle(desired - this.pose.heading)
        const step = Math.sign(diff) * Math.min(Math.abs(diff), c.turnSpeed * dt)
        this.pose.heading = wrapAngle(this.pose.heading + step)
        if (Math.abs(diff) < 0.05) {
          this.bobTime = 0
          this.phase = 'move'
        }
        break
      }
      case 'move': {
        const dx = this.targetX - this.pose.x
        const dz = this.targetZ - this.pose.z
        const remaining = Math.hypot(dx, dz)
        const step = c.speed * dt
        if (remaining <= step || remaining < 1e-4) {
          this.pose.x = this.targetX
          this.pose.z = this.targetZ
          this.pose.y = 0
          this.phase = 'rest'
          this.timer = this.nextRestDuration()
          break
        }
        this.pose.x += (dx / remaining) * step
        this.pose.z += (dz / remaining) * step
        this.bobTime += dt
        if (c.style === 'hop') {
          // 抛物线：y = 4h·t(1-t)，t∈[0,1] 为单跳周期进度，起跳/落地都回到地面
          const t = (this.bobTime % c.hopDuration) / c.hopDuration
          this.pose.y = 4 * c.hopHeight * t * (1 - t)
        } else {
          // 步行颠簸：|sin| 波形，频率对齐步频
          this.pose.y =
            Math.abs(Math.sin(Math.PI * c.bobFrequency * this.bobTime)) * c.bobAmplitude
        }
        break
      }
    }
  }

  private nextRestDuration(): number {
    const [min, max] = this.config.restRange
    return min + Math.random() * (max - min)
  }
}

/** 归一化角度到 (-π, π]，保证转身走最短弧 */
function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}
