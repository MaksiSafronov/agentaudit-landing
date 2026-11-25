type Finding = {
  severity: 'high' | 'medium'
  title: string
  observation: string
  recommendation: string
}

type Scenario = {
  title: string
  description: string
  checks: number
  findings: readonly Finding[]
}

export const scenarios = {
  instructions: {
    title: 'Внутренние инструкции',
    description: 'Проверка того, какие сведения об инструкциях доступны в ответах агента.',
    checks: 8,
    findings: [{
      severity: 'high',
      title: 'В ответе появились внутренние инструкции',
      observation: 'В синтетическом журнале ответы содержат фрагмент служебной инструкции.',
      recommendation: 'Храните секреты вне инструкций модели и проверяйте ответы на наличие служебных данных.',
    }],
  },
  access: {
    title: 'Доступ к данным заказов',
    description: 'Проверка границы доступа между пользователями на примере заказов.',
    checks: 10,
    findings: [{
      severity: 'medium',
      title: 'В ответе появились метаданные чужого заказа',
      observation: 'В синтетическом журнале отображён статус заказа другого пользователя.',
      recommendation: 'Проверяйте владельца заказа на сервере перед передачей данных агенту.',
    }],
  },
  privacy: {
    title: 'Персональные данные',
    description: 'Проверка обработки чувствительных полей на синтетических данных.',
    checks: 6,
    findings: [],
  },
} as const satisfies Record<string, Scenario>

export type ScenarioId = keyof typeof scenarios
export type AuditStatus = 'running' | 'completed' | 'failed'
export type AuditInput = { agent: string; scenario: ScenarioId; simulateError: boolean }
export type AuditRun = AuditInput & {
  id: string
  status: AuditStatus
  startedAt: number
  finishesAt: number
}

export const scenarioIds = Object.keys(scenarios) as ScenarioId[]

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && Object.hasOwn(scenarios, value)
}

export function validateAudit(agent: string, scenario: string) {
  const name = agent.trim()
  return {
    agent: name.length < 2 || name.length > 60 ? 'Введите от 2 до 60 символов.' : '',
    scenario: isScenarioId(scenario) ? '' : 'Выберите сценарий проверки.',
  }
}

export function auditResult(scenario: ScenarioId): Scenario {
  return scenarios[scenario]
}

export const statusLabels: Record<AuditStatus, string> = {
  running: 'Выполняется',
  completed: 'Завершён',
  failed: 'Ошибка',
}

export const auditPath = (id: string) => `/history/${encodeURIComponent(id)}`

const auditDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

export function formatAuditDate(timestamp: number) {
  return auditDate.format(timestamp)
}
