import type { AuditRun } from './model'

const examples = [
  { id: 'demo-104', agent: 'Support Agent', scenario: 'access', date: '2026-11-18T11:24:00+03:00' },
  { id: 'demo-103', agent: 'Privacy Assistant', scenario: 'privacy', date: '2026-11-17T16:08:00+03:00' },
  { id: 'demo-102', agent: 'Knowledge Bot', scenario: 'instructions', date: '2026-11-16T10:42:00+03:00' },
] as const

export const demoRuns: AuditRun[] = examples.map(({ date, ...run }) => {
  const startedAt = Date.parse(date)
  return { ...run, status: 'completed', simulateError: false, startedAt, finishesAt: startedAt + 1800 }
})
