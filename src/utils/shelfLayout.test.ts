import { describe, it, expect } from 'vitest'
import { spineWidthFor, layerCapacityFor, buildShelfLayers } from './shelfLayout'
import type { Process } from '@/data/types'

/** 构造最小 Process 对象（仅分层算法用到 id） */
function p(id: string): Process {
  return { id, name: id, processGroupId: 'g', knowledgeAreaId: 'ka' } as Process
}

describe('spineWidthFor', () => {
  it('常规单元（≥60px）返回 20px', () => {
    expect(spineWidthFor(110)).toBe(20)
    expect(spineWidthFor(94)).toBe(20)
  })
  it('窄单元（<60px）收缩到 14px', () => {
    expect(spineWidthFor(43)).toBe(14)
  })
})

describe('layerCapacityFor', () => {
  it('110px 单元每层 4 本', () => {
    expect(layerCapacityFor(110)).toBe(4)
  })
  it('94px 单元每层 3 本', () => {
    expect(layerCapacityFor(94)).toBe(3)
  })
  it('43px 单元每层 1 本', () => {
    expect(layerCapacityFor(43)).toBe(1)
  })
})

describe('buildShelfLayers', () => {
  it('书种少时单层并排，同种合并为 ×N 角标', () => {
    const books = [p('a'), p('b'), p('a')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(1)
    expect(layers[0].spines.map(s => s.process.id)).toEqual(['a', 'b'])
    expect(layers[0].spines.find(s => s.process.id === 'a')!.count).toBe(2)
  })
  it('超过容量自动加层（自下而上）', () => {
    const books = [p('a'), p('b'), p('c'), p('d'), p('e'), p('f')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(2)
    expect(layers[0].spines.length).toBe(4)
    expect(layers[1].spines.length).toBe(2)
  })
  it('同种合并不占新位置（不因重复增加层）', () => {
    const books = [p('a'), p('a'), p('a'), p('a'), p('a')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(1)
    expect(layers[0].spines[0].count).toBe(5)
  })
})
