export interface BurningFuseState {
  percent: number
  seconds: number
  critical: boolean
  finalFive: boolean
  frozen: boolean
  paused: boolean
}

export function deriveBurningFuseState(
  timeLeft: number,
  totalTime: number,
  frozen: boolean,
  visualPaused: boolean,
): BurningFuseState {
  const percent = totalTime > 0
    ? Math.max(0, Math.min(100, (timeLeft / totalTime) * 100))
    : 100
  return {
    percent,
    seconds: Math.max(0, Math.ceil(timeLeft)),
    critical: totalTime > 0 && percent <= 30,
    finalFive: timeLeft > 0 && timeLeft <= 5,
    frozen,
    paused: frozen || visualPaused,
  }
}
