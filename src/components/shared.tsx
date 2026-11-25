import type { ReactNode } from 'react'
import { Activity, ArrowUpRight, ClipboardList } from 'lucide-react'
import { Link } from 'react-router'
import { auditPath, formatAuditDate, scenarios, statusLabels, type AuditRun, type AuditStatus } from '../features/audits/model'

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading">
    <div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </header>
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  return <span className={`status-badge status-${status}`}><span aria-hidden="true" />{statusLabels[status]}</span>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="panel empty-state">
    <ClipboardList size={28} aria-hidden="true" />
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
  </div>
}

export function AuditList({ runs }: { runs: AuditRun[] }) {
  return <ul className="panel audit-list" aria-label="Список прогонов">
    {runs.map(run => <li key={run.id}>
      <Link className="audit-row" to={auditPath(run.id)} aria-label={`Открыть прогон «${run.agent}» · ${scenarios[run.scenario].title} · ${statusLabels[run.status]} · ${formatAuditDate(run.startedAt)}`}>
        <span className="audit-identity">
          <span className="row-icon"><Activity size={17} aria-hidden="true" /></span>
          <span className="row-name"><strong>{run.agent}</strong><small>{scenarios[run.scenario].title}</small></span>
        </span>
        <span className="audit-date"><time dateTime={new Date(run.startedAt).toISOString()}>{formatAuditDate(run.startedAt)}</time></span>
        <StatusBadge status={run.status} />
        <ArrowUpRight className="row-arrow" size={18} aria-hidden="true" />
      </Link>
    </li>)}
  </ul>
}
