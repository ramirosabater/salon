'use client'

// ============================================================
//  BookingFlow.jsx — flujo de reserva del portal del cliente
//  Conecta las pantallas diseñadas con el módulo reservas.js.
//  Estilado con Tailwind (re-tematizable). Next.js App Router.
//
//  Uso:  import BookingFlow from '@/components/BookingFlow'
//        <BookingFlow />
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  getServicios,
  getProfesionalesDeServicio,
  getHorariosDisponibles,
  reservar,
  usuarioActual,
  iniciarSesion,
  registrarse,
} from '@/lib/reservas' // ajustá la ruta a donde pongas reservas.js

const PASOS = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos', 'Confirmar']

const money = (n) => '$' + Number(n).toLocaleString('es-AR')
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const fmtFechaLarga = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function BookingFlow() {
  const [paso, setPaso] = useState(0)
  const [servicios, setServicios] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [slots, setSlots] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const [sel, setSel] = useState({
    servicio: null,       // objeto servicio
    profesionalId: null,  // number o 'any'
    fecha: null,          // 'YYYY-MM-DD'
    slot: null,           // { profesional_id, inicio }
  })
  const [usuario, setUsuario] = useState(null)
  const [confirmado, setConfirmado] = useState(null) // turno creado

  // Cargar servicios y usuario al montar
  useEffect(() => {
    getServicios().then(setServicios).catch((e) => setError(e.message))
    usuarioActual().then(setUsuario)
  }, [])

  // Al elegir servicio, traer sus profesionales
  useEffect(() => {
    if (!sel.servicio) return
    getProfesionalesDeServicio(sel.servicio.id)
      .then(setProfesionales)
      .catch((e) => setError(e.message))
  }, [sel.servicio])

  // Al elegir fecha, traer horarios disponibles
  useEffect(() => {
    if (!sel.servicio || !sel.fecha) return
    setCargando(true)
    const profId = sel.profesionalId === 'any' ? null : sel.profesionalId
    getHorariosDisponibles(sel.servicio.id, sel.fecha, profId)
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [sel.servicio, sel.fecha, sel.profesionalId])

  // Próximos 14 días para el selector de fecha
  const dias = useMemo(() => {
    const out = []
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      out.push(d)
    }
    return out
  }, [])

  // Horarios únicos por hora (para "cualquiera", varias profes dan la misma hora)
  const horasUnicas = useMemo(() => {
    const vistos = new Set()
    return slots.filter((s) => {
      const k = fmtHora(s.inicio)
      if (vistos.has(k)) return false
      vistos.add(k)
      return true
    })
  }, [slots])

  const serviciosPorCat = useMemo(() => {
    const m = {}
    for (const s of servicios) (m[s.categoria] ??= []).push(s)
    return m
  }, [servicios])

  function avanzar() {
    setError('')
    if (paso === 0 && !sel.servicio) return
    if (paso === 1 && !sel.profesionalId) return
    if (paso === 2 && !sel.slot) return
    if (paso === 3 && !usuario) {
      setError('Iniciá sesión o registrate para continuar.')
      return
    }
    setPaso((p) => Math.min(p + 1, PASOS.length - 1))
  }
  function volver() {
    setError('')
    setPaso((p) => Math.max(p - 1, 0))
  }

  async function confirmar() {
    setError('')
    setCargando(true)
    try {
      const turno = await reservar({
        servicioId: sel.servicio.id,
        inicioISO: sel.slot.inicio,
        profesionalId: sel.slot.profesional_id, // slot ya trae la profe concreta
      })
      setConfirmado(turno)
    } catch (e) {
      // Errores legibles que vienen de reservar_turno (p. ej. "se acaba de ocupar")
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  if (confirmado) {
    return (
      <Marco>
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check />
          </div>
          <h2 className="text-lg font-medium text-neutral-900">¡Turno confirmado!</h2>
          <p className="mt-1 text-sm text-neutral-500">Te llega la confirmación por WhatsApp.</p>
          <div className="mx-auto mt-6 max-w-sm rounded-xl bg-neutral-50 p-4 text-left">
            <p className="font-medium text-neutral-900">{sel.servicio.nombre}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {fmtFechaLarga(sel.slot.inicio)} · {fmtHora(sel.slot.inicio)}
            </p>
          </div>
        </div>
      </Marco>
    )
  }

  return (
    <Marco>
      {/* Barra de pasos */}
      <div className="mb-6 flex items-center gap-1.5">
        {PASOS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1 w-full rounded-full ${
                i <= paso ? 'bg-rose-400' : 'bg-neutral-200'
              }`}
            />
            <span className={`text-[11px] ${i === paso ? 'text-rose-500' : 'text-neutral-400'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[320px]">
        {paso === 0 && (
          <Seccion titulo="¿Qué te querés hacer?" sub="Elegí un servicio para empezar">
            {Object.entries(serviciosPorCat).map(([cat, items]) => (
              <div key={cat}>
                <p className="mt-4 mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {cat}
                </p>
                {items.map((s) => (
                  <Fila
                    key={s.id}
                    activo={sel.servicio?.id === s.id}
                    onClick={() => setSel((v) => ({ ...v, servicio: s, profesionalId: null, slot: null }))}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{s.nombre}</p>
                      <p className="text-sm text-neutral-500">{s.duracion_min} min</p>
                    </div>
                    <span className="font-medium">{money(s.precio)}</span>
                  </Fila>
                ))}
              </div>
            ))}
          </Seccion>
        )}

        {paso === 1 && (
          <Seccion titulo="¿Con quién?" sub={`Para ${sel.servicio?.nombre}`}>
            <Fila
              activo={sel.profesionalId === 'any'}
              onClick={() => setSel((v) => ({ ...v, profesionalId: 'any', slot: null }))}
            >
              <div className="flex-1">
                <p className="font-medium text-neutral-900">Cualquiera disponible</p>
                <p className="text-sm text-neutral-500">Te asignamos la que tenga lugar antes</p>
              </div>
            </Fila>
            {profesionales.map((p) => (
              <Fila
                key={p.id}
                activo={sel.profesionalId === p.id}
                onClick={() => setSel((v) => ({ ...v, profesionalId: p.id, slot: null }))}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 font-medium text-rose-700">
                  {p.nombre[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{p.nombre}</p>
                  {p.bio && <p className="text-sm text-neutral-500">{p.bio}</p>}
                </div>
              </Fila>
            ))}
          </Seccion>
        )}

        {paso === 2 && (
          <Seccion titulo="Elegí día y horario" sub="Disponibilidad real según la agenda">
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {dias.map((d) => {
                const iso = d.toISOString().slice(0, 10)
                const activo = sel.fecha === iso
                return (
                  <button
                    key={iso}
                    onClick={() => setSel((v) => ({ ...v, fecha: iso, slot: null }))}
                    className={`flex min-w-[56px] flex-col items-center rounded-lg border px-3 py-2 ${
                      activo ? 'border-rose-400 ring-1 ring-rose-400' : 'border-neutral-200'
                    }`}
                  >
                    <span className="text-[11px] text-neutral-500">
                      {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                    </span>
                    <span className="text-base font-medium">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>

            {!sel.fecha && <p className="text-sm text-neutral-400">Elegí un día para ver horarios.</p>}
            {cargando && <p className="text-sm text-neutral-400">Buscando horarios…</p>}
            {sel.fecha && !cargando && horasUnicas.length === 0 && (
              <p className="text-sm text-neutral-400">No hay horarios libres ese día. Probá otro.</p>
            )}
            {horasUnicas.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {horasUnicas.map((s) => {
                  const activo = sel.slot?.inicio === s.inicio
                  return (
                    <button
                      key={s.inicio}
                      onClick={() => setSel((v) => ({ ...v, slot: s }))}
                      className={`rounded-lg border py-2.5 text-sm font-medium ${
                        activo ? 'border-rose-400 ring-1 ring-rose-400' : 'border-neutral-200'
                      }`}
                    >
                      {fmtHora(s.inicio)}
                    </button>
                  )
                })}
              </div>
            )}
          </Seccion>
        )}

        {paso === 3 && (
          <Seccion titulo="Tus datos" sub="Para confirmarte el turno y avisarte recordatorios">
            {usuario ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                Sesión iniciada como {usuario.email}. Ya podés confirmar.
              </div>
            ) : (
              <AuthInline onListo={setUsuario} onError={setError} />
            )}
          </Seccion>
        )}

        {paso === 4 && (
          <Seccion titulo="Revisá tu turno">
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              <ResumenFila label="Servicio" val={sel.servicio.nombre} />
              <ResumenFila
                label="Profesional"
                val={sel.profesionalId === 'any' ? 'Cualquiera disponible' : nombreDe(profesionales, sel.slot.profesional_id)}
              />
              <ResumenFila label="Fecha" val={fmtFechaLarga(sel.slot.inicio)} />
              <ResumenFila label="Horario" val={`${fmtHora(sel.slot.inicio)} · ${sel.servicio.duracion_min} min`} />
              {usuario && <ResumenFila label="A nombre de" val={usuario.email} />}
            </div>
            <div className="flex items-center justify-between px-1 pt-3">
              <span className="text-sm text-neutral-500">Total</span>
              <span className="text-xl font-medium">{money(sel.servicio.precio)}</span>
            </div>
            <p className="mt-3 text-xs text-neutral-400">
              El pago se abona en el salón. Podés cancelar hasta 4 h antes.
            </p>
          </Seccion>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={volver}
          className={`text-sm text-neutral-600 ${paso === 0 ? 'invisible' : ''}`}
        >
          ← Atrás
        </button>
        {paso < 4 ? (
          <button
            onClick={avanzar}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Continuar →
          </button>
        ) : (
          <button
            onClick={confirmar}
            disabled={cargando}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {cargando ? 'Confirmando…' : 'Confirmar turno'}
          </button>
        )}
      </div>
    </Marco>
  )
}

// ---------- Login / registro embebido ----------
function AuthInline({ onListo, onError }) {
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)

  async function submit() {
    onError('')
    if (!email.trim() || !pass.trim() || (modo === 'registro' && !nombre.trim())) {
      onError('Completá todos los campos.')
      return
    }
    setCargando(true)
    try {
      const user =
        modo === 'login'
          ? await iniciarSesion({ email, password: pass })
          : await registrarse({ email, password: pass, nombre })
      onListo(user)
    } catch (e) {
      onError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-3">
      {modo === 'registro' && (
        <Input label="Nombre y apellido" value={nombre} onChange={setNombre} placeholder="María Pérez" />
      )}
      <Input label="Email" value={email} onChange={setEmail} placeholder="maria@email.com" type="email" />
      <Input label="Contraseña" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
      <button
        onClick={submit}
        disabled={cargando}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {cargando ? 'Un momento…' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>
      <button
        onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
        className="w-full text-center text-sm text-neutral-500"
      >
        {modo === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
      </button>
    </div>
  )
}

// ---------- Piezas de UI ----------
function Marco({ children }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      {children}
    </div>
  )
}
function Seccion({ titulo, sub, children }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-neutral-900">{titulo}</h2>
      {sub && <p className="mb-3 text-sm text-neutral-500">{sub}</p>}
      {children}
    </div>
  )
}
function Fila({ activo, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className={`mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
        activo ? 'border-rose-400 ring-1 ring-rose-400' : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      {children}
    </div>
  )
}
function ResumenFila({ label, val }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium">{val}</span>
    </div>
  )
}
function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
      />
    </label>
  )
}
function Check() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function nombreDe(profes, id) {
  return profes.find((p) => p.id === id)?.nombre ?? 'Profesional'
}
