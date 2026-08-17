'use client'

// ============================================================
//  BookingFlow.jsx — flujo de reserva del portal del cliente
//  Permite reservar como invitado (nombre + WhatsApp) o con
//  cuenta. Conecta con reservas.js.
//  Uso: app/reservar/page.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  getServicios,
  getProfesionalesDeServicio,
  getHorariosDisponibles,
  reservar,
  reservarInvitado,
  usuarioActual,
  iniciarSesion,
  registrarse,
} from '@/lib/reservas'

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
    servicio: null,
    profesionalId: null,
    fecha: null,
    slot: null,
  })
  const [usuario, setUsuario] = useState(null)
  const [invitado, setInvitado] = useState({ nombre: '', telefono: '' })
  const [confirmado, setConfirmado] = useState(null)

  useEffect(() => {
    getServicios().then(setServicios).catch((e) => setError(e.message))
    usuarioActual().then(setUsuario)
  }, [])

  useEffect(() => {
    if (!sel.servicio) return
    getProfesionalesDeServicio(sel.servicio.id)
      .then(setProfesionales)
      .catch((e) => setError(e.message))
  }, [sel.servicio])

  useEffect(() => {
    if (!sel.servicio || !sel.fecha) return
    setCargando(true)
    const profId = sel.profesionalId === 'any' ? null : sel.profesionalId
    getHorariosDisponibles(sel.servicio.id, sel.fecha, profId)
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [sel.servicio, sel.fecha, sel.profesionalId])

  const dias = useMemo(() => {
    const out = []
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      out.push(d)
    }
    return out
  }, [])

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

  // Devuelve el mensaje de lo que falta en el paso actual, o null si está listo
  function faltanteDePaso() {
    if (paso === 0 && !sel.servicio) return 'Elegí un servicio para continuar.'
    if (paso === 1 && !sel.profesionalId) return 'Elegí una profesional (o "Cualquiera disponible").'
    if (paso === 2 && !sel.slot) return 'Elegí un día y un horario.'
    if (paso === 3 && !usuario && (!invitado.nombre.trim() || !invitado.telefono.trim()))
      return 'Completá tu nombre y WhatsApp para continuar.'
    return null
  }

  function avanzar() {
    const msg = faltanteDePaso()
    if (msg) {
      setError(msg)
      return
    }
    setError('')
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
      let turno
      if (usuario) {
        turno = await reservar({
          servicioId: sel.servicio.id,
          inicioISO: sel.slot.inicio,
          profesionalId: sel.slot.profesional_id,
        })
      } else {
        turno = await reservarInvitado({
          servicioId: sel.servicio.id,
          inicioISO: sel.slot.inicio,
          profesionalId: sel.slot.profesional_id,
          nombre: invitado.nombre,
          telefono: invitado.telefono,
        })
      }
      setConfirmado(turno)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  if (confirmado) {
    return (
      <Marco>
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check />
          </div>
          <h2 className="text-lg font-medium text-neutral-100">¡Turno confirmado!</h2>
          <p className="mt-1 text-sm text-neutral-400">Guardá la fecha. Te esperamos en el salón.</p>
          <div className="mx-auto mt-6 max-w-sm rounded-xl bg-white/5 p-4 text-left">
            <p className="font-medium text-neutral-100">{sel.servicio.nombre}</p>
            <p className="mt-1 text-sm text-neutral-400">
              {fmtFechaLarga(sel.slot.inicio)} · {fmtHora(sel.slot.inicio)}
            </p>
          </div>
          <a href="/" className="mt-6 inline-block text-sm text-[#e3b23c] underline">Volver al inicio</a>
        </div>
      </Marco>
    )
  }

  return (
    <Marco>
      <div className="mb-6 flex items-center gap-1.5">
        {PASOS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
            <div className={`h-1 w-full rounded-full ${i <= paso ? 'bg-[#e3b23c]' : 'bg-neutral-200'}`} />
            <span className={`text-[11px] ${i === paso ? 'text-[#e3b23c]' : 'text-neutral-500'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="min-h-[320px]">
        {paso === 0 && (
          <Seccion titulo="¿Qué te querés hacer?" sub="Elegí un servicio para empezar">
            {Object.entries(serviciosPorCat).map(([cat, items]) => (
              <div key={cat}>
                <p className="mt-4 mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">{cat}</p>
                {items.map((s) => (
                  <Fila
                    key={s.id}
                    activo={sel.servicio?.id === s.id}
                    onClick={() => setSel((v) => ({ ...v, servicio: s, profesionalId: null, slot: null }))}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-100">{s.nombre}</p>
                      <p className="text-sm text-neutral-400">{s.duracion_min} min</p>
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
                <p className="font-medium text-neutral-100">Cualquiera disponible</p>
                <p className="text-sm text-neutral-400">Te asignamos la que tenga lugar antes</p>
              </div>
            </Fila>
            {profesionales.map((p) => (
              <Fila
                key={p.id}
                activo={sel.profesionalId === p.id}
                onClick={() => setSel((v) => ({ ...v, profesionalId: p.id, slot: null }))}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9a227]/15 font-medium text-[#e3b23c]">
                  {p.nombre[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-100">{p.nombre}</p>
                  {p.bio && <p className="text-sm text-neutral-400">{p.bio}</p>}
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
                      activo ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : 'border-neutral-800'
                    }`}
                  >
                    <span className="text-[11px] text-neutral-400">
                      {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                    </span>
                    <span className="text-base font-medium">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>

            {!sel.fecha && <p className="text-sm text-neutral-500">Elegí un día para ver horarios.</p>}
            {cargando && <p className="text-sm text-neutral-500">Buscando horarios…</p>}
            {sel.fecha && !cargando && horasUnicas.length === 0 && (
              <p className="text-sm text-neutral-500">No hay horarios libres ese día. Probá otro.</p>
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
                        activo ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : 'border-neutral-800'
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
              <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-300">
                Sesión iniciada como {usuario.email}. Ya podés confirmar.
              </div>
            ) : (
              <DatosInvitado
                invitado={invitado}
                setInvitado={setInvitado}
                onLogin={setUsuario}
                onError={setError}
              />
            )}
          </Seccion>
        )}

        {paso === 4 && (
          <Seccion titulo="Revisá tu turno">
            <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
              <ResumenFila label="Servicio" val={sel.servicio.nombre} />
              <ResumenFila
                label="Profesional"
                val={sel.profesionalId === 'any' ? 'Cualquiera disponible' : nombreDe(profesionales, sel.slot.profesional_id)}
              />
              <ResumenFila label="Fecha" val={fmtFechaLarga(sel.slot.inicio)} />
              <ResumenFila label="Horario" val={`${fmtHora(sel.slot.inicio)} · ${sel.servicio.duracion_min} min`} />
              <ResumenFila label="A nombre de" val={usuario ? usuario.email : invitado.nombre} />
            </div>
            <div className="flex items-center justify-between px-1 pt-3">
              <span className="text-sm text-neutral-400">Total</span>
              <span className="text-xl font-medium">{money(sel.servicio.precio)}</span>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              El pago se abona en el salón. Podés cancelar hasta 4 h antes.
            </p>
          </Seccion>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
        <button onClick={volver} className={`text-sm text-neutral-400 ${paso === 0 ? 'invisible' : ''}`}>
          ← Atrás
        </button>
        {paso < 4 ? (
          <button
            onClick={avanzar}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              faltanteDePaso()
                ? 'bg-neutral-800 text-neutral-500'
                : 'bg-[#e3b23c] text-neutral-950 hover:bg-[#d4a226]'
            }`}
          >
            Continuar →
          </button>
        ) : (
          <button
            onClick={confirmar}
            disabled={cargando}
            className="rounded-lg bg-[#e3b23c] px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-[#d4a226] disabled:opacity-60"
          >
            {cargando ? 'Confirmando…' : 'Confirmar turno'}
          </button>
        )}
      </div>
    </Marco>
  )
}

// ---------- Datos del invitado + opción de iniciar sesión ----------
function DatosInvitado({ invitado, setInvitado, onLogin, onError }) {
  const [mostrarLogin, setMostrarLogin] = useState(false)
  if (mostrarLogin) {
    return (
      <div>
        <AuthInline onListo={onLogin} onError={onError} />
        <button onClick={() => setMostrarLogin(false)} className="mt-3 w-full text-center text-sm text-neutral-400">
          ← Reservar como invitado
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <Input label="Nombre y apellido" value={invitado.nombre}
        onChange={(v) => setInvitado({ ...invitado, nombre: v })} placeholder="María Pérez" />
      <Input label="WhatsApp" value={invitado.telefono}
        onChange={(v) => setInvitado({ ...invitado, telefono: v })} placeholder="11 2345 6789" type="tel" />
      <p className="text-xs text-neutral-500">No necesitás cuenta para reservar.</p>
      <button onClick={() => setMostrarLogin(true)} className="w-full text-center text-sm text-[#e3b23c]">
        ¿Ya sos cliente? Iniciá sesión
      </button>
    </div>
  )
}

// ---------- Login / registro embebido ----------
function AuthInline({ onListo, onError }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cargando, setCargando] = useState(false)

  async function submit() {
    onError('')
    if (!email.trim() || !pass.trim() || (modo === 'registro' && (!nombre.trim() || !telefono.trim()))) {
      onError('Completá todos los campos.')
      return
    }
    setCargando(true)
    try {
      const user =
        modo === 'login'
          ? await iniciarSesion({ email, password: pass })
          : await registrarse({ email, password: pass, nombre, telefono })
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
        <>
          <Input label="Nombre y apellido" value={nombre} onChange={setNombre} placeholder="María Pérez" />
          <Input label="WhatsApp" value={telefono} onChange={setTelefono} placeholder="11 2345 6789" type="tel" />
        </>
      )}
      <Input label="Email" value={email} onChange={setEmail} placeholder="maria@email.com" type="email" />
      <Input label="Contraseña" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
      <button onClick={submit} disabled={cargando}
        className="w-full rounded-lg bg-[#e3b23c] py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-60">
        {cargando ? 'Un momento…' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>
      <button onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
        className="w-full text-center text-sm text-neutral-400">
        {modo === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
      </button>
    </div>
  )
}

// ---------- Piezas de UI ----------
function Marco({ children }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">{children}</div>
  )
}
function Seccion({ titulo, sub, children }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-neutral-100">{titulo}</h2>
      {sub && <p className="mb-3 text-sm text-neutral-400">{sub}</p>}
      {children}
    </div>
  )
}
function Fila({ activo, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className={`mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
        activo ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {children}
    </div>
  )
}
function ResumenFila({ label, val }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-right text-sm font-medium">{val}</span>
    </div>
  )
}
function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-3 py-2 text-sm outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]"
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
