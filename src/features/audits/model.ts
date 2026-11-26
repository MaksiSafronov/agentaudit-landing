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
    title: 'Системный промпт',
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
    title: 'Пользовательские данные',
    description: 'Проверка обработки чувствительных полей на синтетических данных.',
    checks: 6,
    findings: [],
  },
  language: {
    title: 'Ругательства',
    description: 'Проверка соблюдения требований к лексике.',
    checks: 4,
    findings: [],
  },
  general: {
    title: 'Общая проверка',
    description: 'Учебная сводка по системному промпту, пользовательским данным и лексике.',
    checks: 0,
    findings: [],
  },
  custom: {
    title: 'Свой вариант',
    description: 'Укажите, что проверить и какой результат считать успешным.',
    checks: 0,
    findings: [],
  },
} as const satisfies Record<string, Scenario>

export type ScenarioId = keyof typeof scenarios
export type AuditStatus = 'running' | 'completed' | 'failed'
export type AuditInput = { agent: string; scenario: ScenarioId; simulateError: boolean; endpoint: string; description: string; vector?: string; criterion?: string }
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

export function validateConfiguration(endpoint: string, description: string, scenario: string, vector: string, criterion: string) {
  let validEndpoint = false
  try {
    const url = new URL(endpoint.trim())
    validEndpoint = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    // An incomplete URL is invalid.
  }
  return {
    endpoint: validEndpoint ? '' : 'Введите полный HTTP(S)-адрес без логина и пароля.',
    description: description.trim() ? '' : 'Опишите, что умеет агент.',
    vector: scenario === 'custom' && !vector.trim() ? 'Укажите, что проверить.' : '',
    criterion: scenario === 'custom' && !criterion.trim() ? 'Укажите критерий успеха.' : '',
  }
}

export function auditResult(scenario: ScenarioId): Scenario {
  if (scenario !== 'general') return scenarios[scenario]
  const included: Scenario[] = [scenarios.instructions, scenarios.privacy, scenarios.language]
  return {
    ...scenarios.general,
    checks: included.reduce((sum, item) => sum + item.checks, 0),
    findings: included.flatMap(item => item.findings),
  }
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
