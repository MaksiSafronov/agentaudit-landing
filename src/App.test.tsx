// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAppStore, mockDuration, storageKey } from './features/audits/state'

let host: HTMLDivElement
let root: Root
let storage: Map<string, string>

function render(path: string) {
  act(() => root.render(
    <Provider store={createAppStore({
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value) },
    })}>
      <MemoryRouter initialEntries={[path]}><App /></MemoryRouter>
    </Provider>,
  ))
}

function click<T extends HTMLElement>(element: T) {
  act(() => element.click())
}

function field(id: string, value: string) {
  const input = host.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}

function submit() {
  act(() => host.querySelector('form')!.requestSubmit())
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  storage = new Map()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('кабинет AgentAudit', () => {
  it('показывает ошибки формы, а затем завершает прогон и показывает отчёт', async () => {
    render('/new')
    submit()
    expect(host.querySelector('#agent')?.getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector('#scenario')?.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement?.id).toBe('agent')

    field('agent', 'Test Assistant')
    field('scenario', 'privacy')
    submit()
    expect(host.querySelector('h1')?.textContent).toContain('Test Assistant')
    expect(host.textContent).toContain('Проверка выполняется')

    await act(async () => vi.advanceTimersByTimeAsync(mockDuration))
    expect(host.textContent).toContain('Сводка результатов')
    expect(host.textContent).toContain('Замечаний нет')
  })

  it('обрабатывает сбой и позволяет повторить прогон с теми же настройками', async () => {
    render('/new')
    field('agent', 'Support Demo')
    field('scenario', 'access')
    click(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!)
    submit()
    await act(async () => vi.advanceTimersByTimeAsync(mockDuration))
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('имитированным сбоем')

    click(host.querySelector<HTMLButtonElement>('main button')!)
    expect(host.textContent).toContain('Проверка выполняется')
    await act(async () => vi.advanceTimersByTimeAsync(mockDuration))
    expect(host.querySelector('h1')?.textContent).toContain('Support Demo')
    expect(host.textContent).toContain('Проверяйте владельца заказа')
    expect(JSON.parse(storage.get(storageKey)!).slice(0, 2).map((run: { status: string }) => run.status))
      .toEqual(['completed', 'failed'])
  })

  it('фильтрует историю, сбрасывает фильтр и открывает существующий отчёт', () => {
    render('/history')
    field('search', 'нет совпадений')
    expect(host.textContent).toContain('Прогоны не найдены')
    click(host.querySelector('button')!)
    field('search', 'support')
    expect(host.querySelectorAll('.audit-row')).toHaveLength(1)
    click(host.querySelector<HTMLAnchorElement>('.audit-row')!)
    expect(host.querySelector('h1')?.textContent).toContain('Support Agent')
    expect(host.textContent).toContain('Средний риск')
  })
})
