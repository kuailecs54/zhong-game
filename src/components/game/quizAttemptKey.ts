export function createQuizAttemptKey(processId: string | null, cardsDrawn: number): string {
  return `${processId ?? 'none'}:${cardsDrawn}`
}
