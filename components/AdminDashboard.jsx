'use client'

// ============================================================
//  AdminDashboard.jsx — resumen de ingresos y actividad
//  Métricas del mes: turnos, ingresos estimados, cancelaciones,
//  desglose por categoría y por profesional. Sin librerías de
//  gráficos: barras hechas con CSS.
//  Uso: app/admin/dashboard/page.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { miPerfil, turnosEnRango } from '@/lib/reservas'
import AdminNav from '@/components/AdminNav'

const money = (n) => '$' + Number(n).toLocaleString('es-AR')

// Primer y último instante del mes de una fecha dada
function rangoMes(ref) {
  const desde = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0)
  const hasta = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59)
  return { desde, hasta }
}

export default function AdminDashboard() {
  const [perfil, setPerfil] = useState(undefined)
  const [mesRef, setMesRef] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    miPerfil().then(setPerfil).catch(() => setPerfil(null))
  }, [])

  const esAdmin = perfil && (perfil.rol === 'admin' || perfil.rol === 'profesional')

  useEffect(() => {
    if (!esAdmin) return
    const { desde, hasta } = rangoMes(mesRef)
    setCargando(true)
    setError('')
    turnosEnRango(desde.toISOString(), hasta.toISOString())
      .then(setTurnos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [mesRef, esAdmin])

  // --- Cálculos ---
  const stats = useMemo(() => {
    const activos = turnos.filter((t) => t.estado !== 'cancelado')
    const cancelados = turnos.filter((t) => t.estado === 'cancelado')
    const ingreso = activos.reduce((s, t) => s + Number(t.servicios?.precio || 0), 0)

    const porCat = {}
    const porProf = {}
    for (const t of activos) {
      const cat = t.servicios?.categoria || 'Sin categoría'
      const prof = t.profesionales?.nombre || 'Sin asignar'
      const p = Number(t.servicios?.precio || 0)
      porCat[cat] = (porCat[cat] || 0) + p
      porProf[prof] = porProf[prof] || { ingreso: 0, turnos: 0 }
      porProf[prof].ingreso += p
      porProf[prof].turnos += 1
    }
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1])
    const profs = Object.entries(porProf).sort((a, b) => b[1].ingreso - a[1].ingreso)
    return { activos: activos.length, cancelados: cancelados.length, ingreso, cats, profs }
  }, [turnos])

  const maxCat = Math.max(1, ...stats.cats.map(([, v]) => v))
  const maxProf = Math.max(1, ...stats.profs.map(([, v]) => v.ingreso))

  // --- Acceso ---
  if (perfil === undefined) return <Marco><p className="text-neutral-500">Cargando…</p></Marco>
  if (!perfil)
    return (
      <Marco>
        <h1 className="text-lg font-medium">Panel del salón</h1>
        <p className="mt-2 text-sm text-neutral-500">Iniciá sesión desde la página principal y volvé.</p>
        <a href="/" className="mt-4 inline-block text-sm text-rose-500 underline">Ir al inicio</a>
      </Marco>
    )
  if (!esAdmin)
    return (
      <Marco>
        <h1 className="text-lg font-medium">Sin acceso</h1>
        <p className="mt-2 text-sm text-neutral-500">Esta sección es solo para el personal del salón.</p>
      </Marco>
    )

  return (
    <Marco>
      <AdminNav actual="dashboard" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium text-neutral-900">Ingresos</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMesRef(sumarMes(mesRef, -1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">←</button>
          <span className="min-w-[130px] text-center text-sm font-medium capitalize">
            {mesRef.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setMesRef(sumarMes(mesRef, 1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">→</button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-neutral-400">Cargando…</p>}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Kpi label="Ingreso estimado" valor={money(stats.ingreso)} destacado />
        <Kpi label="Turnos" valor={stats.activos} />
        <Kpi label="Cancelados" valor={stats.cancelados} />
      </div>

      {/* Por categoría */}
      <Bloque titulo="Ingresos por categoría">
        {stats.cats.length === 0 && <p className="text-sm text-neutral-400">Sin datos este mes.</p>}
        {stats.cats.map(([cat, val]) => (
          <Barra key={cat} label={cat} valor={money(val)} pct={(val / maxCat) * 100} />
        ))}
      </Bloque>

      {/* Por profesional */}
      <Bloque titulo="Ingresos por profesional">
        {stats.profs.length === 0 && <p className="text-sm text-neutral-400">Sin datos este mes.</p>}
        {stats.profs.map(([prof, v]) => (
          <Barra
            key={prof}
            label={`${prof} · ${v.turnos} turnos`}
            valor={money(v.ingreso)}
            pct={(v.ingreso / maxProf) * 100}
          />
        ))}
      </Bloque>

      <p className="mt-5 text-xs text-neutral-400">
        El ingreso es una estimación según los turnos reservados (no cancelados) del mes,
        usando el precio de cada servicio. No refleja pagos reales todavía.
      </p>
    </Marco>
  )
}

// ---------- helpers ----------
function sumarMes(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

// ---------- UI ----------
function Marco({ children }) {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">{children}</div>
    </div>
  )
}
function Kpi({ label, valor, destacado }) {
  return (
    <div className={`rounded-lg p-3 ${destacado ? 'bg-rose-50' : 'bg-neutral-50'}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-medium ${destacado ? 'text-rose-700' : 'text-neutral-900'}`}>{valor}</p>
    </div>
  )
}
function Bloque({ titulo, children }) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-sm font-medium text-neutral-700">{titulo}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}
function Barra({ label, valor, pct }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-neutral-900">{valor}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  )
}
