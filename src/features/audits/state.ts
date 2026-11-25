import { configureStore, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { demoRuns } from './fixtures'
import { isScenarioId, type AuditInput, type AuditRun } from './model'

export const storageKey = 'agentaudit:runs:v1'
export const mockDuration = 1800

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8.64e15
}

function isAuditRun(value: unknown): value is AuditRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Record<string, unknown>

  return typeof run.id === 'string' && typeof run.agent === 'string' && isScenarioId(run.scenario)
    && (run.status === 'running' || run.status === 'completed' || run.status === 'failed')
    && typeof run.simulateError === 'boolean' && isTimestamp(run.startedAt) && isTimestamp(run.finishesAt)
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

function readRuns(storage?: StorageAdapter): AuditRun[] {
  try {
    const raw = storage?.getItem(storageKey)
    if (raw == null) return demoRuns
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isAuditRun) ? parsed : demoRuns
  } catch {
    return demoRuns
  }
}

function browserStorage() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const auditsSlice = createSlice({
  name: 'audits',
  initialState: [] as AuditRun[],
  reducers: {
    start: {
      prepare(input: AuditInput) {
        const startedAt = Date.now()
        const payload: AuditRun = {
          ...input,
          agent: input.agent.trim(),
          id: nanoid(),
          status: 'running',
          startedAt,
          finishesAt: startedAt + mockDuration,
        }
        return { payload }
      },
      reducer(state, action: PayloadAction<AuditRun>) {
        state.unshift(action.payload)
      },
    },
    settleDue(state, action: PayloadAction<number>) {
      for (const run of state) {
        if (run.status === 'running' && run.finishesAt <= action.payload) {
          run.status = run.simulateError ? 'failed' : 'completed'
        }
      }
    },
  },
})

export const { start, settleDue } = auditsSlice.actions

export function createAppStore(storage: StorageAdapter | undefined = browserStorage()) {
  const store = configureStore({
    reducer: { audits: auditsSlice.reducer },
    preloadedState: { audits: readRuns(storage) },
  })

  let lastSaved = store.getState().audits
  store.subscribe(() => {
    const current = store.getState().audits
    if (current === lastSaved) return
    lastSaved = current
    try {
      storage?.setItem(storageKey, JSON.stringify(current))
    } catch {
      // Keep the workspace usable when local storage is unavailable.
    }
  })
  store.dispatch(settleDue(Date.now()))
  return store
}

type AppStore = ReturnType<typeof createAppStore>
export const useAppDispatch = useDispatch.withTypes<AppStore['dispatch']>()
export const useAppSelector = useSelector.withTypes<ReturnType<AppStore['getState']>>()
