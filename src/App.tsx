import { useEffect, useRef } from 'react'
import { ExternalLink, History, LayoutDashboard, Plus, Terminal } from 'lucide-react'
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAppDispatch, useAppSelector, settleDue } from './features/audits/state'
import { OverviewPage } from './pages/OverviewPage'
import { NewAuditPage } from './pages/NewAuditPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReportPage, MissingPage } from './pages/ReportPage'

const navigation = [
  { to: '/', label: 'Обзор', Icon: LayoutDashboard },
  { to: '/new', label: 'Новая проверка', Icon: Plus },
  { to: '/history', label: 'История', Icon: History },
]

function Workspace() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const dispatch = useAppDispatch()
  const nextFinish = useAppSelector(({ audits }) => audits.reduce(
    (earliest, run) => run.status === 'running' ? Math.min(earliest, run.finishesAt) : earliest,
    Infinity,
  ))

  useEffect(() => {
    if (!Number.isFinite(nextFinish)) return
    const finish = () => dispatch(settleDue(Math.max(Date.now(), nextFinish)))
    const timer = window.setTimeout(finish, Math.max(0, nextFinish - Date.now()))
    return () => window.clearTimeout(timer)
  }, [dispatch, nextFinish])

  useEffect(() => {
    const title = main.current?.querySelector('h1')?.textContent
    document.title = title ? `${title} · AgentAudit` : 'AgentAudit'
  }, [pathname])

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return <div className="workspace">
    <a className="skip-link" href="#workspace-main" onClick={event => {
      event.preventDefault()
      main.current?.focus()
    }}>К содержимому</a>
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="AgentAudit, обзор">
        <span className="brand-mark"><Terminal size={20} aria-hidden="true" /></span>
        AgentAudit
      </NavLink>
      <nav className="navigation" aria-label="Кабинет">
        {navigation.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'}>
          <Icon size={18} aria-hidden="true" />{label}
        </NavLink>)}
      </nav>
      <a className="landing-link" href="./index.html">О проекте <ExternalLink size={14} aria-hidden="true" /></a>
    </aside>
    <div className="workspace-body">
      <div className="topbar">
        <span>Кабинет проверок</span>
        <span className="mode"><span aria-hidden="true" />Демо-режим</span>
      </div>
      <main className="content" id="workspace-main" tabIndex={-1} ref={main}><Outlet /></main>
    </div>
  </div>
}

export function App() {
  return <Routes>
    <Route element={<Workspace />}>
      <Route index element={<OverviewPage />} />
      <Route path="new" element={<NewAuditPage />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="history/:id" element={<ReportPage />} />
      <Route path="*" element={<MissingPage />} />
    </Route>
  </Routes>
}
