import { useEffect, useRef } from 'react'
import { ExternalLink, History, LayoutDashboard, Plus } from 'lucide-react'
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router'
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
  useEffect(() => {
    const title = main.current?.querySelector('h1')?.textContent
    document.title = title ? `${title} · Ag3ntAud1t` : 'Ag3ntAud1t'
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
        <span className="brand-terminal"><span aria-hidden="true">&gt;</span>Ag3ntAud1t<span className="brand-terminal-cursor" aria-hidden="true" /></span>
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
