/**
 * Web Audio 合成音效（惰性创建 AudioContext，首次用户交互后可用）。
 * 音量 ≤0.15、单音时长 ≤200ms，避免刺耳；创建失败静默降级为无音效。
 */

let ctx: AudioContext | null | undefined

function getCtx(): AudioContext | null {
  if (ctx === undefined) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      ctx = AC ? new AC() : null
    } catch {
      ctx = null
    }
  }
  return ctx
}

/** 合成单音：频率/时长(秒)/波形/音量/延迟(秒) */
function tone(freq: number, dur: number, type: OscillatorType, volume: number, delay = 0) {
  const c = getCtx()
  if (!c) return
  // 浏览器自动播放策略：挂起时尝试恢复（失败静默）
  if (c.state === 'suspended') {
    c.resume().catch(() => { /* ignore */ })
  }
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    const start = c.currentTime + delay
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(start)
    osc.stop(start + dur)
  } catch {
    // 合成失败静默降级
  }
}

/**
 * 答对音：上行双音 660→880Hz 正弦；连击倍率每档整体升 2 半音（连击升调）。
 * @param comboMultiplier 连击倍率 min(5, 1+floor(combo/3))，≥2 时开始升调
 */
export function playCorrect(comboMultiplier = 1) {
  const shift = Math.pow(2, ((Math.min(comboMultiplier, 5) - 1) * 2) / 12)
  tone(660 * shift, 0.12, 'sine', 0.12)
  tone(880 * shift, 0.12, 'sine', 0.1, 0.09)
}

/** 答错音：220Hz 方波短促低鸣 */
export function playWrong() {
  tone(220, 0.15, 'square', 0.08)
}
