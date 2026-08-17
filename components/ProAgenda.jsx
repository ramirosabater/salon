'use client'

// ============================================================
//  ProAgenda.jsx — agenda personal de la profesional
//  Muestra SOLO los turnos propios (el RLS ya los filtra).
//  Puede marcar completado o cancelar. Uso: app/pro/page.tsx
// ============================================================
import { useEffect, useState } from 'react'
import {
  miPerfil,
  miFichaProfesional,
  agendaDelDia,
  marcarTurno,
  cancelar,
  cerrarSesion,
} from '@/lib/reservas'

const money = (n) => '$' + Number(n).toLocaleString('es-AR')
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const isoDeFecha = (d) => d.toISOString().slice(0, 10)
function limpiarTel(t) {
  const n = String(t || '').replace(/\D/g, '')
  return n.startsWith('54') ? n : '54' + n
}
function sumarDias(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default function ProAgenda() {
  const [perfil, setPerfil] = useState(undefined)
  const [ficha, setFicha] = useState(undefined)
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [confirmarId, setConfirmarId] = useState(null)

  useEffect(() => {
    miPerfil().then(setPerfil).catch(() => setPerfil(null))
    miFichaProfesional().then(setFicha).catch(() => setFicha(null))
  }, [])

  const habilitado = perfil && (perfil.rol === 'profesional' || perfil.rol === 'admin')

  useEffect(() => {
    if (!habilitado) return
    setCargando(true)
    setError('')
    agendaDelDia(isoDeFecha(fecha))
      .then(setTurnos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [fecha, habilitado])

  async function completar(id) {
    try {
      await marcarTurno(id, 'completado')
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }
  async function cancelarTurno(id) {
    if (confirmarId !== id) {
      setConfirmarId(id)
      return
    }
    try {
      await cancelar(id)
      setConfirmarId(null)
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }
  function recargar() {
    agendaDelDia(isoDeFecha(fecha)).then(setTurnos).catch((e) => setError(e.message))
  }
  async function salir() {
    await cerrarSesion()
    window.location.href = '/'
  }

  if (perfil === undefined) return <Env><p className="text-neutral-500">Cargando…</p></Env>
  if (!perfil)
    return (
      <Env>
        <h1 className="text-lg font-medium">Mi agenda</h1>
        <p className="mt-2 text-sm text-neutral-500">Iniciá sesión para ver tu agenda.</p>
        <a href="/login" className="mt-4 inline-block rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white">Ingresar</a>
      </Env>
    )
  if (!habilitado)
    return (
      <Env>
        <h1 className="text-lg font-medium">Sin acceso</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Esta sección es para el personal del salón. Si sos del equipo,{' '}
          <a href="/soy-profesional" className="text-rose-500 underline">registrate con el código</a>.
        </p>
      </Env>
    )
  // profesional sin ficha vinculada
  if (perfil.rol === 'profesional' && ficha === null)
    return (
      <Env>
        <h1 className="text-lg font-medium">Falta vincular tu perfil</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Tu cuenta todavía no está asociada a una ficha de profesional. Pedile al salón que te
          agregue, o volvé a{' '}
          <a href="/soy-profesional" className="text-rose-500 underline">ingresar el código</a>.
        </p>
        <button onClick={salir} className="mt-4 text-sm text-neutral-500">Cerrar sesión</button>
      </Env>
    )

  const activos = turnos.filter((t) => t.estado !== 'cancelado')
  const ingreso = activos.reduce((s, t) => s + Number(t.servicios?.precio || 0), 0)

  return (
    <Env>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">Mi agenda</h1>
          <p className="text-sm text-neutral-500">{ficha?.nombre || perfil.nombre}</p>
        </div>
        <button onClick={salir} className="text-sm text-neutral-500">Salir</button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setFecha(sumarDias(fecha, -1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">←</button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize">
            {fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <button onClick={() => setFecha(sumarDias(fecha, 1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">→</button>
        </div>
        <button onClick={() => setFecha(new Date())} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600">Hoy</button>
      </div>

      <div className="mb-4 flex gap-3">
        <Tarjeta label="Turnos" valor={activos.length} />
        <Tarjeta label="Ingreso del día" valor={money(ingreso)} />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-neutral-400">Cargando…</p>}

      {!cargando && activos.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-400">No tenés turnos este día.</p>
      )}

      <div className="space-y-2">
        {turnos.map((t) => {
          const cancelado = t.estado === 'cancelado'
          const completado = t.estado === 'completado'
          const nombre = t.cliente?.nombre || t.cliente_nombre || 'Cliente'
          const tel = t.cliente?.telefono || t.cliente_telefono
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 ${
                cancelado ? 'border-neutral-100 bg-neutral-50 opacity-60' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-900">{fmtHora(t.inicio)}</p>
                  <p className="text-[11px] text-neutral-400">{t.servicios?.duracion_min}min</p>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${cancelado ? 'line-through' : 'text-neutral-900'}`}>{nombre}</p>
                  <p className="text-sm text-neutral-500">{t.servicios?.nombre}</p>
                </div>
                <span className="text-sm font-medium text-neutral-700">{money(t.servicios?.precio)}</span>
              </div>

              {!cancelado && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tel && (
                    <a href={`https://wa.me/${limpiarTel(tel)}`} target="_blank" rel="noreferrer"
                      className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700">
                      WhatsApp
                    </a>
                  )}
                  {!completado && (
                    <button onClick={() => completar(t.id)}
                      className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600">
                      Marcar hecho
                    </button>
                  )}
                  {completado && <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">Completado</span>}
                  <button onClick={() => cancelarTurno(t.id)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      confirmarId === t.id ? 'border-red-400 bg-red-50 text-red-700' : 'border-red-200 text-red-600'
                    }`}>
                    {confirmarId === t.id ? '¿Seguro?' : 'Cancelar'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Env>
  )
}

function Env({ children }) {
  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
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
