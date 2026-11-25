import { describe, expect, it } from 'vitest'
import { auditResult, scenarioIds, validateAudit } from './model'
import { createAppStore, settleDue, start, storageKey } from './state'

function memoryStorage() {
  const contents = new Map<string, string>()
  return {
    getItem: (key: string) => contents.get(key) ?? null,
    setItem: (key: string, value: string) => { contents.set(key, value) },
  }
}

describe('валидация прогона', () => {
  it('учитывает длину строки после обрезки и принимает только известные сценарии', () => {
    expect(validateAudit('  A ', 'constructor')).toEqual({
      agent: 'Введите от 2 до 60 символов.',
      scenario: 'Выберите сценарий проверки.',
    })
    expect(validateAudit('  SA  ', 'privacy')).toEqual({ agent: '', scenario: '' })
    expect(validateAudit('a'.repeat(60), 'access').agent).toBe('')
    expect(validateAudit('a'.repeat(61), 'access').agent).not.toBe('')
  })

  it('использует согласованные результаты учебных сценариев', () => {
    for (const scenario of scenarioIds) {
      const result = auditResult(scenario)
      expect(result.checks).toBeGreaterThan(0)
      expect(result.findings.length).toBeLessThanOrEqual(result.checks)
    }
    expect(auditResult('privacy').findings).toHaveLength(0)
  })
})

describe('хранилище прогонов', () => {
  it('восстанавливает ожидающие и завершённые прогоны', () => {
    const storage = memoryStorage()
    const initial = createAppStore(storage)
    const success = initial.dispatch(start({ agent: '  Support  ', scenario: 'access', simulateError: false })).payload
    const failure = initial.dispatch(start({ agent: 'Privacy', scenario: 'privacy', simulateError: true })).payload
    const restored = createAppStore(storage)
    const deadline = Math.max(success.finishesAt, failure.finishesAt)

    expect(restored.getState().audits.find(run => run.id === success.id)?.status).toBe('running')
    restored.dispatch(settleDue(deadline))

    expect(createAppStore(storage).getState().audits.slice(0, 2)).toEqual([
      { ...failure, status: 'failed' },
      { ...success, agent: 'Support', status: 'completed' },
    ])
  })

  it('сохраняет пустую историю и восстанавливает демоданные при повреждённой записи', () => {
    const storage = memoryStorage()
    storage.setItem(storageKey, '[]')
    expect(createAppStore(storage).getState().audits).toEqual([])
    storage.setItem(storageKey, '{"broken":')
    expect(createAppStore(storage).getState().audits.length).toBeGreaterThan(0)
  })
})
