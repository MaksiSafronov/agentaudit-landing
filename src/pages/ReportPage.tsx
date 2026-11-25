import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState, PageHeading, StatusBadge } from '../components/shared'
import { auditPath, auditResult, formatAuditDate, scenarios, type AuditRun } from '../features/audits/model'
import { start, useAppDispatch, useAppSelector } from '../features/audits/state'

export function MissingPage({ audit = false }: { audit?: boolean }) {
  return <>
    <PageHeading title={audit ? 'Прогон не найден' : 'Страница не найдена'}
      description={audit ? 'Откройте прогон из истории этого браузера.' : 'Перейдите в кабинет и выберите нужный раздел.'} />
    <Link className="button secondary" to={audit ? '/history' : '/'}>
      <ArrowLeft size={18} aria-hidden="true" />{audit ? 'Вернуться в историю' : 'Перейти к обзору'}
    </Link>
  </>
}

function ReportContent({ run }: { run: AuditRun }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  function retry() {
    const action = start({ agent: run.agent, scenario: run.scenario, simulateError: false })
    dispatch(action)
    navigate(auditPath(action.payload.id), { replace: true })
  }

  if (run.status === 'running') return <div role="status" className="panel report-state">
    <span className="spinner" aria-hidden="true" />
    <h2>Проверка выполняется</h2>
    <p>Готовим учебный отчёт. Он появится на этой странице автоматически.</p>
  </div>

  if (run.status === 'failed') return <div className="panel report-state error-state">
    <div role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <h2>Не удалось сформировать отчёт</h2>
      <p>Учебный прогон завершился имитированным сбоем. Повторите проверку с теми же настройками.</p>
    </div>
    <button type="button" className="button primary" onClick={retry}><RefreshCw size={17} aria-hidden="true" />Повторить проверку</button>
  </div>

  const result = auditResult(run.scenario)

  return <>
    <section className="panel report-summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Сводка результатов</h2>
      <dl className="stats">
        <div><dt>Всего проверок</dt><dd>{result.checks}</dd></div>
        <div><dt>Успешных</dt><dd>{result.checks - result.findings.length}</dd></div>
        <div><dt>Замечаний</dt><dd>{result.findings.length}</dd></div>
      </dl>
    </section>
    <section className="recent" aria-labelledby="finding-title">
      <div className="section-heading"><h2 id="finding-title">Замечания и рекомендации</h2></div>
      {result.findings.length === 0 ?
        <EmptyState title="Замечаний нет" description="Все проверки учебного сценария пройдены." /> :
        <ul className="panel findings-list">
          {result.findings.map(finding => <li key={finding.title}>
            <span className={`severity severity-${finding.severity}`}>{finding.severity === 'high' ? 'Высокий риск' : 'Средний риск'}</span>
            <h3>{finding.title}</h3>
            <p>{finding.observation}</p>
            <p className="recommendation"><CheckCircle2 size={18} aria-hidden="true" />{finding.recommendation}</p>
          </li>)}
        </ul>}
    </section>
  </>
}

export function ReportPage() {
  const { id } = useParams()
  const run = useAppSelector(state => state.audits.find(item => item.id === id))

  if (!run) return <MissingPage audit />

  return <>
    <Link to="/history" className="text-link back-link"><ArrowLeft size={17} aria-hidden="true" />История прогонов</Link>
    <PageHeading title={`Прогон · ${run.agent}`} description={scenarios[run.scenario].title}
      action={<StatusBadge status={run.status} />} />
    <p className="report-meta">Запущен <time dateTime={new Date(run.startedAt).toISOString()}>{formatAuditDate(run.startedAt)}</time></p>
    <div aria-live="polite"><ReportContent run={run} /></div>
  </>
}
