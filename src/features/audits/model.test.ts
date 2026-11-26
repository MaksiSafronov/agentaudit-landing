import { describe, expect, it, vi } from 'vitest'
import { auditResult, scenarioIds, validateAudit } from './model'
import { createAppStore, mockDuration, start, storageKey } from './state'

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
      expect(result.checks).toBeGreaterThanOrEqual(0)
      expect(result.findings.length).toBeLessThanOrEqual(result.checks)
    }
    expect(auditResult('privacy').findings).toHaveLength(0)
  })
})

describe('хранилище прогонов', () => {
  it('восстанавливает ожидающие прогоны и сохраняет исходы асинхронных запросов', async () => {
    vi.useFakeTimers()
    try {
      const storage = memoryStorage()
      const initial = createAppStore(storage)
      const success = initial.dispatch(start({ agent: '  Support  ', scenario: 'access', endpoint: 'https://example.com/chat', description: 'Support', simulateError: false })).payload
      const failure = initial.dispatch(start({ agent: 'Privacy', scenario: 'privacy', endpoint: 'https://example.com/chat', description: 'Privacy', simulateError: true })).payload
      const restoredStorage = memoryStorage()
      restoredStorage.setItem(storageKey, storage.getItem(storageKey)!)
      const restored = createAppStore(restoredStorage)

      expect(restored.getState().audits.find(run => run.id === success.id)?.status).toBe('running')
      await vi.advanceTimersByTimeAsync(mockDuration)

      expect(createAppStore(restoredStorage).getState().audits.slice(0, 2)).toEqual([
        { ...failure, status: 'failed' },
        { ...success, status: 'completed' },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('удаляет старые записи и сохраняет прогоны в новом формате', () => {
    const storage = memoryStorage()
    const legacy = { id: 'old', agent: 'Support', scenario: 'access', status: 'completed', simulateError: false, startedAt: 0, finishesAt: 1 }
    const current = { ...legacy, id: 'new', endpoint: 'https://example.com/chat', description: 'Служба поддержки' }
    const incomplete = { ...current, id: 'incomplete', scenario: 'custom', vector: 'Системный промпт' }
    storage.setItem(storageKey, JSON.stringify([legacy, current, incomplete]))
    expect(createAppStore(storage).getState().audits).toEqual([current])
    expect(JSON.parse(storage.getItem(storageKey)!)).toEqual([current])
  })

  it('сохраняет пустую историю и оставляет её пустой при повреждённой записи', () => {
    const storage = memoryStorage()
    storage.setItem(storageKey, '[]')
    expect(createAppStore(storage).getState().audits).toEqual([])
    storage.setItem(storageKey, '{"broken":')
    expect(createAppStore(storage).getState().audits).toEqual([])
  })
})
