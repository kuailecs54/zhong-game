import { expect, test } from 'vitest'
import { createQuizAttemptKey } from './quizAttemptKey'

test('同一过程再次抽卡时生成不同组件 key', () => {
  expect(createQuizAttemptKey('p001', 1)).toBe('p001:1')
  expect(createQuizAttemptKey('p001', 2)).toBe('p001:2')
  expect(createQuizAttemptKey('p001', 2)).not.toBe(createQuizAttemptKey('p001', 1))
})
