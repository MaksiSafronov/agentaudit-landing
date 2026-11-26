import { ArrowRight, ClipboardCheck, Plus, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { AuditList, EmptyState, PageHeading } from '../components/shared'
import { auditPath, auditResult } from '../features/audits/model'
import { selectAudits, useAppSelector } from '../features/audits/state'

export function OverviewPage() {
  const runs = useAppSelector(selectAudits)
  const completed = runs.filter(run => run.status === 'completed')
  const latest = completed.find(run => run.scenario !== 'custom')
  const result = latest && auditResult(latest.scenario)

  return <>
    <PageHeading title="Обзор проверок" description="Запускайте учебные проверки LLM-агентов и изучайте результаты."
      action={<Link className="button primary" to="/new"><Plus size={19} aria-hidden="true" />Новая проверка</Link>} />

    <section className="overview-panel panel" aria-labelledby="overview-title">
      <div className="overview-copy">
        <span className="overview-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
        <h2 id="overview-title">Состояние проверок</h2>
        <dl className="stats">
          <div><dt>Всего</dt><dd>{runs.length}</dd></div>
          <div><dt>Завершено</dt><dd>{completed.length}</dd></div>
          <div><dt>Выполняется</dt><dd>{runs.filter(run => run.status === 'running').length}</dd></div>
        </dl>
      </div>
      <div className="overview-report">
        <span className="report-caption"><ClipboardCheck size={17} aria-hidden="true" /> Последний отчёт</span>
        {latest && result ? <>
          <h3>{latest.agent}</h3>
          <p>{result.title}</p>
          <dl className="report-stats">
            <div><dt>Успешных проверок</dt><dd>{result.checks - result.findings.length} / {result.checks}</dd></div>
            <div><dt>Замечания</dt><dd>{result.findings.length}</dd></div>
          </dl>
          <Link className="text-link" to={auditPath(latest.id)}>Открыть отчёт <ArrowRight size={17} aria-hidden="true" /></Link>
        </> : <p className="overview-no-report">Завершите проверку, чтобы здесь появился отчёт.</p>}
      </div>
    </section>

    <section aria-labelledby="recent-title" className="recent">
      <div className="section-heading">
        <h2 id="recent-title">Недавние прогоны</h2>
        <Link to="/history" className="text-link">Вся история <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      {runs.length > 0 ? <AuditList runs={runs.slice(0, 4)} /> :
        <EmptyState title="Прогонов пока нет" description="Результат первой проверки появится здесь."
          action={<Link className="button secondary" to="/new">Запустить проверку</Link>} />}
    </section>
  </>
}
