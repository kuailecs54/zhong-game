import { describe, expect, test } from 'vitest'
import { deriveBurningFuseState } from './burningFuse'

describe('deriveBurningFuseState', () => {
  test('剩余比例限制在 0 到 100，秒数向上取整', () => {
    expect(deriveBurningFuseState(40, 35, false, false)).toMatchObject({ percent: 100, seconds: 40 })
    expect(deriveBurningFuseState(-1, 35, false, false)).toMatchObject({ percent: 0, seconds: 0 })
    expect(deriveBurningFuseState(12.1, 35, false, false).seconds).toBe(13)
  })

  test('剩余时间不超过 30% 时进入紧急状态', () => {
    expect(deriveBurningFuseState(10.6, 35, false, false).critical).toBe(false)
    expect(deriveBurningFuseState(10.5, 35, false, false).critical).toBe(true)
  })

  test('最后 5 秒进入终局倒计时状态', () => {
    expect(deriveBurningFuseState(5.1, 35, false, false).finalFive).toBe(false)
    expect(deriveBurningFuseState(5, 35, false, false).finalFive).toBe(true)
    expect(deriveBurningFuseState(1, 35, false, false).finalFive).toBe(true)
  })

  test('冰冻或视觉暂停时标记动画暂停', () => {
    expect(deriveBurningFuseState(20, 35, true, false)).toMatchObject({ frozen: true, paused: true })
    expect(deriveBurningFuseState(20, 35, false, true)).toMatchObject({ frozen: false, paused: true })
  })

  test('总时间无效时保持完整绳长', () => {
    expect(deriveBurningFuseState(0, 0, false, false).percent).toBe(100)
  })
})
