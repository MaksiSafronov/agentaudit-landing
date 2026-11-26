import { useRef, useState, type FormEvent } from 'react'
import { FlaskConical, Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { PageHeading } from '../components/shared'
import { auditPath, isScenarioId, scenarioIds, scenarios, validateAudit, validateConfiguration } from '../features/audits/model'
import { start, useAppDispatch } from '../features/audits/state'

export function NewAuditPage() {
  const [agent, setAgent] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [description, setDescription] = useState('')
  const [vector, setVector] = useState('')
  const [criterion, setCriterion] = useState('')
  const [scenario, setScenario] = useState('')
  const [simulateError, setSimulateError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const agentField = useRef<HTMLInputElement>(null)
  const scenarioField = useRef<HTMLSelectElement>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const errors = { ...validateAudit(agent, scenario), ...validateConfiguration(endpoint, description, scenario, vector, criterion) }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.agent) {
      agentField.current?.focus()
      return
    }
    if (!isScenarioId(scenario)) {
      scenarioField.current?.focus()
      return
    }
    for (const key of ['endpoint', 'description', 'vector', 'criterion'] as const) {
      if (errors[key]) {
        event.currentTarget.querySelector<HTMLElement>(`#${key}`)?.focus()
        return
      }
    }
    const custom = scenario === 'custom' ? { vector: vector.trim(), criterion: criterion.trim() } : {}
    const action = start({ agent, scenario, simulateError, endpoint: endpoint.trim(), description: description.trim(), ...custom })
    dispatch(action)
    navigate(auditPath(action.payload.id))
  }

  return <>
    <PageHeading title="Новая проверка" description="Опишите агента и выберите, что проверить." />
    <div className="form-layout">
      <form className="panel run-form" onSubmit={submit} noValidate>
        <h2>Настройки прогона</h2>
        <div className="field">
          <label htmlFor="agent">Имя агента</label>
          <input id="agent" ref={agentField} value={agent} onChange={event => setAgent(event.target.value)}
            aria-invalid={submitted && Boolean(errors.agent)} aria-describedby="agent-hint" required placeholder="Например, Support Agent" />
          <p id="agent-hint" className={submitted && errors.agent ? 'field-error' : 'field-hint'}>
            {submitted && errors.agent ? errors.agent : 'От 2 до 60 символов.'}
          </p>
        </div>
        <div className="field">
          <label htmlFor="endpoint">Эндпоинт агента</label>
          <input id="endpoint" value={endpoint} onChange={event => setEndpoint(event.target.value)}
            aria-invalid={submitted && Boolean(errors.endpoint)} aria-describedby="endpoint-hint" required placeholder="https://example.com/api/chat" type="url" />
          <p id="endpoint-hint" className="field-error">{submitted && errors.endpoint}</p>
        </div>
        <div className="field">
          <label htmlFor="description">Описание агента</label>
          <textarea id="description" value={description} onChange={event => setDescription(event.target.value)}
            aria-invalid={submitted && Boolean(errors.description)} aria-describedby="description-hint" required placeholder="Например, отвечает на вопросы о заказах" rows={3} />
          <p id="description-hint" className="field-error">{submitted && errors.description}</p>
        </div>
        <div className="field">
          <label htmlFor="scenario">Сценарий проверки</label>
          <select id="scenario" ref={scenarioField} value={scenario} onChange={event => setScenario(event.target.value)}
            aria-invalid={submitted && Boolean(errors.scenario)} aria-describedby="scenario-hint" required>
            <option value="" disabled>Выберите сценарий</option>
            {scenarioIds.map(id => <option key={id} value={id}>{scenarios[id].title}</option>)}
          </select>
          <p id="scenario-hint" className={submitted && errors.scenario ? 'field-error' : 'field-hint'}>
            {submitted && errors.scenario ? errors.scenario : isScenarioId(scenario) && scenarios[scenario].description}
          </p>
        </div>
        {scenario === 'custom' && <>
        <div className="field">
          <label htmlFor="vector">Что проверить</label>
          <textarea id="vector" value={vector} onChange={event => setVector(event.target.value)}
            aria-invalid={submitted && Boolean(errors.vector)} aria-describedby="vector-hint" required placeholder="Например, раскрытие внутренних инструкций" rows={3} />
          <p id="vector-hint" className="field-error">{submitted && errors.vector}</p>
        </div>
        <div className="field">
          <label htmlFor="criterion">Критерий успеха</label>
          <textarea id="criterion" value={criterion} onChange={event => setCriterion(event.target.value)}
            aria-invalid={submitted && Boolean(errors.criterion)} aria-describedby="criterion-hint" required placeholder="Например, агент выдал системный промпт" rows={3} />
          <p id="criterion-hint" className="field-error">{submitted && errors.criterion}</p>
        </div>
        </>}
        <label className="checkbox-row">
          <input type="checkbox" checked={simulateError} onChange={event => setSimulateError(event.target.checked)} />
          <span>Имитировать сбой<span className="field-hint">После ошибки прогон можно повторить с теми же настройками.</span></span>
        </label>
        <div className="form-actions">
          <button type="submit" className="button primary"><Play size={17} aria-hidden="true" />Запустить проверку</button>
          <Link className="button secondary" to="/">Отмена</Link>
        </div>
      </form>
      <aside className="panel demo-note">
        <FlaskConical aria-hidden="true" size={24} />
        <h2>Как работает демо</h2>
        <p>Эндпоинт сохраняется как часть настроек прогона. Отчёт строится на учебных данных без запросов к агенту.</p>
      </aside>
    </div>
  </>
}
