import { configureStore, createAsyncThunk, createListenerMiddleware, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { isScenarioId, validateConfiguration, type AuditInput, type AuditRun } from './model'

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
    && typeof run.endpoint === 'string' && typeof run.description === 'string'
    && (run.vector === undefined || typeof run.vector === 'string')
    && (run.criterion === undefined || typeof run.criterion === 'string')
    && !Object.values(validateConfiguration(run.endpoint, run.description, run.scenario, run.vector ?? '', run.criterion ?? '')).some(Boolean)
    && typeof run.simulateError === 'boolean' && isTimestamp(run.startedAt) && isTimestamp(run.finishesAt)
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

function readRuns(storage?: StorageAdapter): AuditRun[] {
  try {
    const raw = storage?.getItem(storageKey)
    if (raw == null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const runs = parsed.filter(isAuditRun)
    if (runs.length !== parsed.length) saveRuns(storage, runs)
    return runs
  } catch {
    return []
  }
}

function saveRuns(storage: StorageAdapter | undefined, runs: AuditRun[]) {
  try {
    storage?.setItem(storageKey, JSON.stringify(runs))
  } catch {
    // Keep the workspace usable when local storage is unavailable.
  }
}

function browserStorage() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

type AuditState = { audits: AuditRun[] }

export const selectAudits = (state: AuditState) => state.audits
export const selectAuditById = (state: AuditState, id: string | undefined) =>
  selectAudits(state).find(run => run.id === id)

const fetchAuditOutcome = createAsyncThunk<'completed', AuditRun, { rejectValue: string }>(
  'audits/fetchOutcome',
  async (run, { rejectWithValue }) => {
    const delay = Math.min(mockDuration, Math.max(0, run.finishesAt - Date.now()))
    if (delay > 0) await new Promise<void>(resolve => setTimeout(resolve, delay))
    if (run.simulateError) return rejectWithValue('Имитированный сбой')
    return 'completed'
  },
)

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
  },
  extraReducers: builder => builder
    .addCase(fetchAuditOutcome.fulfilled, (state, action) => {
      const run = state.find(run => run.id === action.meta.arg.id)
      if (run?.status === 'running') run.status = action.payload
    })
    .addCase(fetchAuditOutcome.rejected, (state, action) => {
      const run = state.find(run => run.id === action.meta.arg.id)
      if (run?.status === 'running') run.status = 'failed'
    }),
})

export const { start } = auditsSlice.actions

export function createAppStore(storage: StorageAdapter | undefined = browserStorage()) {
  const listener = createListenerMiddleware()
  const store = configureStore({
    reducer: { audits: auditsSlice.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listener.middleware),
    preloadedState: { audits: readRuns(storage) },
  })

  let lastSaved = store.getState().audits
  store.subscribe(() => {
    const current = store.getState().audits
    if (current === lastSaved) return
    lastSaved = current
    saveRuns(storage, current)
  })
  listener.startListening({
    actionCreator: start,
    effect: action => { void store.dispatch(fetchAuditOutcome(action.payload)) },
  })
  for (const run of selectAudits(store.getState())) {
    if (run.status === 'running') void store.dispatch(fetchAuditOutcome(run))
  }
  return store
}

type AppStore = ReturnType<typeof createAppStore>
export const useAppDispatch = useDispatch.withTypes<AppStore['dispatch']>()
export const useAppSelector = useSelector.withTypes<ReturnType<AppStore['getState']>>()
