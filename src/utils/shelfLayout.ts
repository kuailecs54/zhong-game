import type { Process } from '@/data/types'

/** 书脊固定宽度与最小宽度（窄单元收缩下限） */
export const SPINE_WIDTH = 20
export const SPINE_WIDTH_MIN = 14
/** 书脊间 gap 与单元内水平 padding 合计（与 .layer-spines/.shelf-body CSS 一致） */
const SPINE_GAP = 2
const UNIT_H_PADDING = 12
/** 单元宽阈值：低于此值书脊收缩到最小宽 */
const NARROW_UNIT_THRESHOLD = 60

export interface MergedSpine {
  process: Process
  count: number
}

export interface ShelfLayer {
  layer: number
  spines: MergedSpine[]
}

/** 按单元宽计算书脊实际宽度 */
export function spineWidthFor(unitWidth: number): number {
  if (unitWidth <= 0) return SPINE_WIDTH
  return unitWidth < NARROW_UNIT_THRESHOLD ? SPINE_WIDTH_MIN : SPINE_WIDTH
}

/** 每层容量 = 可容纳书脊数 */
export function layerCapacityFor(unitWidth: number): number {
  if (unitWidth <= 0) return 4
  return Math.max(1, Math.floor((unitWidth - UNIT_H_PADDING) / (spineWidthFor(unitWidth) + SPINE_GAP)))
}

/**
 * 按容量填层：书种少时单层并排；超过每层容量自动加层（自下而上填充）。
 * 层号 0 = 最底层；同种书在层内合并为 1 本书脊 + ×N 角标（固定宽，不增厚）。
 */
export function buildShelfLayers(books: Process[], capacity: number): ShelfLayer[] {
  const layers: ShelfLayer[] = []
  for (const book of books) {
    const existing = layers.find(l => l.spines.some(s => s.process.id === book.id))
    if (existing) {
      existing.spines.find(s => s.process.id === book.id)!.count++
      continue
    }
    let target = layers.find(l => l.spines.length < capacity)
    if (!target) {
      target = { layer: layers.length, spines: [] }
      layers.push(target)
    }
    target.spines.push({ process: book, count: 1 })
  }
  return layers
}
