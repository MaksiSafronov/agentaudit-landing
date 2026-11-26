import { History, Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { AuditList, EmptyState, PageHeading } from '../components/shared'
import { scenarios, statusLabels } from '../features/audits/model'
import { selectAudits, useAppSelector } from '../features/audits/state'

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const requestedStatus = params.get('status') ?? ''
  const status = Object.hasOwn(statusLabels, requestedStatus) ? requestedStatus : ''
  const runs = useAppSelector(selectAudits)
  const search = query.trim().toLocaleLowerCase('ru')
  const filtered = runs.filter(run => {
    const matches = [run.agent, scenarios[run.scenario].title].some(text => text.toLocaleLowerCase('ru').includes(search))
    return matches && (!status || run.status === status)
  })

  function filter(key: 'q' | 'status', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return <>
    <PageHeading title="История прогонов" description="Найдите нужную проверку по агенту, сценарию или статусу."
      action={<Link className="button primary" to="/new"><Plus size={19} aria-hidden="true" />Новая проверка</Link>} />

    {runs.length === 0 ? <EmptyState title="История пока пуста" description="Запустите проверку, чтобы получить первый отчёт."
      action={<Link className="button primary" to="/new">Новая проверка</Link>} /> : <>
      <div className="filters">
        <div className="field">
          <label htmlFor="search">Агент или сценарий</label>
          <div className="search-field"><Search size={18} aria-hidden="true" />
            <input id="search" type="search" value={query} onChange={event => filter('q', event.target.value)} placeholder="Поиск по истории" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="status-filter">Статус</label>
          <select id="status-filter" value={status} onChange={event => filter('status', event.target.value)}>
            <option value="">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length > 0 ? <>
        <p className="result-count" role="status"><History size={16} aria-hidden="true" />Найдено прогонов: {filtered.length} из {runs.length}</p>
        <AuditList runs={filtered} />
      </> : <EmptyState title="Прогоны не найдены" description="Измените запрос или сбросьте фильтры."
        action={<button type="button" className="button secondary" onClick={() => setParams({}, { replace: true })}>Сбросить фильтры</button>} />}
    </>}
  </>
}
