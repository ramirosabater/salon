'use client'

// ============================================================
//  MisTurnos.jsx — turnos del cliente logueado
//  Próximos (con opción de cancelar) + historial. Cerrar sesión.
//  Uso: app/mis-turnos/page.tsx
// ============================================================
import { useEffect, useState } from 'react'
import { usuarioActual, misTurnos, historialTurnos, cancelar, cerrarSesion } from '@/lib/reservas'

const money = (n) => '$' + Number(n).toLocaleString('es-AR')
const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export default function MisTurnos() {
  const [usuario, setUsuario] = useState(undefined)
  const [proximos, setProximos] = useState([])
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState('')
  const [confirmarId, setConfirmarId] = useState(null)

  useEffect(() => {
    usuarioActual().then((u) => {
      setUsuario(u || null)
      if (u) cargar()
    })
  }, [])

  function cargar() {
    misTurnos().then(setProximos).catch((e) => setError(e.message))
    historialTurnos().then(setHistorial).catch(() => {})
  }

  async function hacerCancelar(id) {
    if (confirmarId !== id) {
      setConfirmarId(id)
      return
    }
    try {
      await cancelar(id)
      setConfirmarId(null)
      cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function salir() {
    await cerrarSesion()
    window.location.href = '/'
  }

  if (usuario === undefined) {
    return <Envoltura><p className="text-neutral-500">Cargando…</p></Envoltura>
  }
  if (!usuario) {
    return (
      <Envoltura>
        <h1 className="text-lg font-medium">Mis turnos</h1>
        <p className="mt-2 text-sm text-neutral-500">Iniciá sesión para ver tus turnos.</p>
        <a href="/login" className="mt-4 inline-block rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white">
          Ingresar
        </a>
      </Envoltura>
    )
  }

  return (
    <Envoltura>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-medium text-neutral-900">Mis turnos</h1>
        <button onClick={salir} className="text-sm text-neutral-500">Cerrar sesión</button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Próximos</p>
      {proximos.length === 0 && (
        <p className="mb-4 text-sm text-neutral-400">No tenés turnos próximos.</p>
      )}
      {proximos.map((t) => (
        <div key={t.id} className="mb-3 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">{t.servicios?.nombre}</p>
              <p className="text-sm text-neutral-500">con {t.profesionales?.nombre}</p>
            </div>
            <span className="text-sm font-medium">{money(t.servicios?.precio)}</span>
          </div>
          <div className="mb-3 flex gap-4 text-sm text-neutral-500">
            <span>{fmtFecha(t.inicio)}</span>
            <span>{fmtHora(t.inicio)}</span>
          </div>
          <button
            onClick={() => hacerCancelar(t.id)}
            className={`w-full rounded-lg border py-2 text-sm ${
              confirmarId === t.id
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-neutral-200 text-neutral-600'
            }`}
          >
            {confirmarId === t.id ? '¿Seguro? Tocá de nuevo para cancelar' : 'Cancelar turno'}
          </button>
        </div>
      ))}

      <a href="/reservar" className="mb-6 mt-1 block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white">
        Reservar otro turno
      </a>

      {historial.length > 0 && (
        <>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Anteriores</p>
          {historial.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-neutral-100 py-2.5">
              <div>
                <p className="text-sm text-neutral-700">{t.servicios?.nombre}</p>
                <p className="text-xs text-neutral-400">{fmtFecha(t.inicio)} · {t.profesionales?.nombre}</p>
              </div>
              <span className="text-xs capitalize text-neutral-400">{t.estado}</span>
            </div>
          ))}
        </>
      )}
    </Envoltura>
  )
}

function Envoltura({ children }) {
  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">{children}</div>
    </div>
  )
}
