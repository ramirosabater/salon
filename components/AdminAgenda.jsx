'use client'

// ============================================================
//  AdminAgenda.jsx — agenda del día (panel de administración)
//  Muestra todos los turnos de un día, agrupados por profesional.
//  Protegido: solo rol admin/profesional. El RLS de Supabase
//  garantiza que un cliente no pueda ver turnos ajenos.
//
//  Uso: se renderiza desde app/admin/page.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { miPerfil, agendaDelDia, cancelar } from '@/lib/reservas'
import AdminNav from '@/components/AdminNav'

const money = (n) => '$' + Number(n).toLocaleString('es-AR')
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const isoDeFecha = (d) => d.toISOString().slice(0, 10)

export default function AdminAgenda() {
  const [perfil, setPerfil] = useState(undefined) // undefined = cargando
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Verificar quién es el usuario
  useEffect(() => {
    miPerfil()
      .then((p) => setPerfil(p))
      .catch(() => setPerfil(null))
  }, [])

  const esAdmin = perfil && (perfil.rol === 'admin' || perfil.rol === 'profesional')

  // Cargar la agenda del día elegido
  useEffect(() => {
    if (!esAdmin) return
    setCargando(true)
    setError('')
    agendaDelDia(isoDeFecha(fecha))
      .then(setTurnos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [fecha, esAdmin])

  async function cancelarTurno(id) {
    if (!confirm('¿Cancelar este turno?')) return
    try {
      await cancelar(id)
      setTurnos((ts) => ts.map((t) => (t.id === id ? { ...t, estado: 'cancelado' } : t)))
    } catch (e) {
      alert(e.message)
    }
  }

  // Agrupar por profesional
  const porProfesional = useMemo(() => {
    const m = new Map()
    for (const t of turnos) {
      const prof = t.profesionales
      if (!prof) continue
      if (!m.has(prof.id)) m.set(prof.id, { nombre: prof.nombre, turnos: [] })
      m.get(prof.id).turnos.push(t)
    }
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [turnos])

  const activos = turnos.filter((t) => t.estado !== 'cancelado')
  const ingresoDia = activos.reduce((s, t) => s + Number(t.servicios?.precio || 0), 0)

  // --- Estados de acceso ---
  if (perfil === undefined) {
    return <Marco><p className="text-neutral-500">Cargando…</p></Marco>
  }
  if (!perfil) {
    return (
      <Marco>
        <h1 className="text-lg font-medium">Panel del salón</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Iniciá sesión desde la página principal y volvé a esta dirección.
        </p>
        <a href="/" className="mt-4 inline-block text-sm text-rose-500 underline">
          Ir a la página principal
        </a>
      </Marco>
    )
  }
  if (!esAdmin) {
    return (
      <Marco>
        <h1 className="text-lg font-medium">Sin acceso</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Esta sección es solo para el personal del salón.
        </p>
      </Marco>
    )
  }

  // --- Agenda ---
  return (
    <Marco>
      <AdminNav actual="agenda" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">Agenda del día</h1>
          <p className="text-sm text-neutral-500">Hola, {perfil.nombre || perfil.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFecha(sumarDias(fecha, -1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">←</button>
          <span className="min-w-[150px] text-center text-sm font-medium capitalize">
            {fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <button onClick={() => setFecha(sumarDias(fecha, 1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">→</button>
          <button onClick={() => setFecha(new Date())} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600">Hoy</button>
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-5 flex gap-3">
        <Tarjeta label="Turnos" valor={activos.length} />
        <Tarjeta label="Ingreso estimado" valor={money(ingresoDia)} />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-neutral-400">Cargando agenda…</p>}

      {!cargando && porProfesional.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-400">
          No hay turnos para este día.
        </p>
      )}

      <div className="space-y-6">
        {porProfesional.map((p) => (
          <div key={p.nombre}>
            <div className="mb-2 flex items-center gap-2 border-b border-neutral-100 pb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
                {p.nombre[0]}
              </div>
              <span className="font-medium text-neutral-800">{p.nombre}</span>
              <span className="text-sm text-neutral-400">
                · {p.turnos.filter((t) => t.estado !== 'cancelado').length} turnos
              </span>
            </div>

            <div className="space-y-2">
              {p.turnos.map((t) => {
                const cancelado = t.estado === 'cancelado'
                const tel = t.cliente?.telefono || t.cliente_telefono
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      cancelado ? 'border-neutral-100 bg-neutral-50 opacity-60' : 'border-neutral-200'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-900">{fmtHora(t.inicio)}</p>
                      <p className="text-[11px] text-neutral-400">{t.servicios?.duracion_min}min</p>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${cancelado ? 'line-through' : 'text-neutral-900'}`}>
                        {t.cliente?.nombre || t.cliente_nombre || 'Cliente'}
                      </p>
                      <p className="text-sm text-neutral-500">{t.servicios?.nombre}</p>
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {money(t.servicios?.precio)}
                    </span>
                    {!cancelado && (
                      <div className="flex items-center gap-1">
                        {tel && (
                          <a
                            href={`https://wa.me/${limpiarTel(tel)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700"
                            title="Escribir por WhatsApp"
                          >
                            WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => cancelarTurno(t.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    {cancelado && <span className="text-xs text-neutral-400">Cancelado</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Marco>
  )
}

// ---------- helpers ----------
function sumarDias(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
// Deja solo dígitos y antepone 54 (Argentina) si no tiene código de país
function limpiarTel(tel) {
  const soloNum = String(tel).replace(/\D/g, '')
  return soloNum.startsWith('54') ? soloNum : '54' + soloNum
}

// ---------- UI ----------
function Marco({ children }) {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">{children}</div>
    </div>
  )
}
function Tarjeta({ label, valor }) {
  return (
    <div className="flex-1 rounded-lg bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-medium text-neutral-900">{valor}</p>
    </div>
  )
}
