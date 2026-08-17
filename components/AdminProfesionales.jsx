'use client'

// ============================================================
//  AdminProfesionales.jsx — ABM de profesionales
//  Alta/edición, qué servicios ofrece cada una, y sus horarios
//  de trabajo semanales (lo que alimenta la disponibilidad).
//  Uso: app/admin/profesionales/page.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  miPerfil,
  getProfesionalesAdmin,
  getServiciosAdmin,
  crearProfesional,
  editarProfesional,
  cambiarActivoProfesional,
  setServiciosDeProfesional,
  getHorariosDeProfesional,
  setHorariosDeProfesional,
  getCodigoProfesional,
  setCodigoProfesional,
} from '@/lib/reservas'
import AdminNav from '@/components/AdminNav'

// dia_semana ISO: 1=lunes ... 7=domingo
const DIAS = [
  { n: 1, l: 'Lunes' },
  { n: 2, l: 'Martes' },
  { n: 3, l: 'Miércoles' },
  { n: 4, l: 'Jueves' },
  { n: 5, l: 'Viernes' },
  { n: 6, l: 'Sábado' },
  { n: 7, l: 'Domingo' },
]
const horariosVacios = () =>
  DIAS.reduce((acc, d) => {
    acc[d.n] = { activo: false, desde: '09:00', hasta: '18:00' }
    return acc
  }, {})

export default function AdminProfesionales() {
  const [perfil, setPerfil] = useState(undefined)
  const [profes, setProfes] = useState([])
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', bio: '', activo: true })
  const [serviciosSel, setServiciosSel] = useState(new Set())
  const [horarios, setHorarios] = useState(horariosVacios())
  const [guardando, setGuardando] = useState(false)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [editandoCodigo, setEditandoCodigo] = useState(false)
  const [codigoBorrador, setCodigoBorrador] = useState('')

  useEffect(() => {
    miPerfil().then(setPerfil).catch(() => setPerfil(null))
  }, [])

  const esAdmin = perfil && perfil.rol === 'admin'

  useEffect(() => {
    if (!esAdmin) return
    recargar()
    getServiciosAdmin().then((s) => setServicios(s.filter((x) => x.activo))).catch(() => {})
    getCodigoProfesional().then(setCodigo).catch(() => {})
  }, [esAdmin])

  function recargar() {
    setCargando(true)
    getProfesionalesAdmin()
      .then(setProfes)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }

  async function empezarEdicion(p) {
    setError('')
    setEditId(p.id)
    setForm({ nombre: p.nombre, bio: p.bio || '', activo: p.activo })
    setServiciosSel(new Set((p.profesional_servicios || []).map((r) => r.servicio_id)))
    // Cargar horarios existentes y volcarlos al form
    const base = horariosVacios()
    try {
      const hs = await getHorariosDeProfesional(p.id)
      for (const h of hs) {
        base[h.dia_semana] = {
          activo: true,
          desde: (h.hora_inicio || '09:00').slice(0, 5),
          hasta: (h.hora_fin || '18:00').slice(0, 5),
        }
      }
    } catch (e) {
      setError(e.message)
    }
    setHorarios(base)
  }

  function toggleServicio(id) {
    setServiciosSel((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }
  function setDia(n, campos) {
    setHorarios((prev) => ({ ...prev, [n]: { ...prev[n], ...campos } }))
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    // Validar horarios activos
    const horariosArr = []
    for (const d of DIAS) {
      const h = horarios[d.n]
      if (!h.activo) continue
      if (h.hasta <= h.desde) {
        setError(`En ${d.l}, la hora de fin debe ser mayor a la de inicio.`)
        return
      }
      horariosArr.push({ dia_semana: d.n, hora_inicio: h.desde, hora_fin: h.hasta })
    }
    setGuardando(true)
    try {
      await editarProfesional(editId, {
        nombre: form.nombre.trim(),
        bio: form.bio.trim() || null,
        activo: form.activo,
      })
      await setServiciosDeProfesional(editId, [...serviciosSel])
      await setHorariosDeProfesional(editId, horariosArr)
      setEditId(null)
      recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function crear() {
    setError('')
    if (!nuevoNombre.trim()) {
      setError('Poné un nombre para la profesional.')
      return
    }
    try {
      const p = await crearProfesional({ nombre: nuevoNombre.trim(), bio: null })
      setNuevoNombre('')
      setMostrarAlta(false)
      recargar()
      // Abrir directo su edición para cargar servicios y horarios
      setTimeout(() => empezarEdicion({ ...p, profesional_servicios: [] }), 100)
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleActivo(p) {
    try {
      await cambiarActivoProfesional(p.id, !p.activo)
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function guardarCodigo() {
    setError('')
    try {
      await setCodigoProfesional(codigoBorrador.trim())
      setCodigo(codigoBorrador.trim())
      setEditandoCodigo(false)
    } catch (e) {
      setError(e.message)
    }
  }

  const nombreServicio = useMemo(() => {
    const m = {}
    for (const s of servicios) m[s.id] = s.nombre
    return m
  }, [servicios])

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
      <AdminNav actual="profesionales" />

      <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Código para que el equipo se registre
        </p>
        {editandoCodigo ? (
          <div className="mt-2 flex gap-2">
            <input
              value={codigoBorrador}
              onChange={(e) => setCodigoBorrador(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
            />
            <button onClick={guardarCodigo} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">Guardar</button>
            <button onClick={() => setEditandoCodigo(false)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm">Cancelar</button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <span className="text-lg font-medium tracking-wider text-neutral-900">{codigo || '—'}</span>
            <button
              onClick={() => { setCodigoBorrador(codigo); setEditandoCodigo(true) }}
              className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
            >
              Cambiar
            </button>
            <span className="text-xs text-neutral-400">Compartilo solo con tus profesionales</span>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium text-neutral-900">Profesionales</h1>
        <button
          onClick={() => setMostrarAlta((v) => !v)}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {mostrarAlta ? 'Cerrar' : '+ Nueva'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {mostrarAlta && (
        <div className="mb-5 flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre de la profesional"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <button onClick={crear} className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white">
            Crear
          </button>
        </div>
      )}

      {cargando && <p className="text-sm text-neutral-400">Cargando…</p>}

      <div className="space-y-3">
        {profes.map((p) =>
          editId === p.id ? (
            <div key={p.id} className="rounded-xl border border-rose-300 bg-rose-50 p-4">
              {/* Datos básicos */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Descripción (opcional)</label>
                  <input
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Especialista en uñas"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Servicios que ofrece */}
              <p className="mb-2 mt-4 text-sm font-medium text-neutral-700">Qué servicios hace</p>
              <div className="flex flex-wrap gap-2">
                {servicios.map((s) => {
                  const on = serviciosSel.has(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleServicio(s.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        on ? 'border-rose-400 bg-rose-100 text-rose-700' : 'border-neutral-300 text-neutral-500'
                      }`}
                    >
                      {on ? '✓ ' : ''}{s.nombre}
                    </button>
                  )
                })}
                {servicios.length === 0 && (
                  <p className="text-xs text-neutral-400">No hay servicios cargados todavía.</p>
                )}
              </div>

              {/* Horarios de trabajo */}
              <p className="mb-2 mt-4 text-sm font-medium text-neutral-700">Horarios de trabajo</p>
              <div className="space-y-1.5">
                {DIAS.map((d) => {
                  const h = horarios[d.n]
                  return (
                    <div key={d.n} className="flex items-center gap-2">
                      <label className="flex w-28 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={h.activo}
                          onChange={(e) => setDia(d.n, { activo: e.target.checked })}
                        />
                        {d.l}
                      </label>
                      <input
                        type="time"
                        value={h.desde}
                        disabled={!h.activo}
                        onChange={(e) => setDia(d.n, { desde: e.target.value })}
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-sm disabled:opacity-40"
                      />
                      <span className="text-neutral-400">a</span>
                      <input
                        type="time"
                        value={h.hasta}
                        disabled={!h.activo}
                        onChange={(e) => setDia(d.n, { hasta: e.target.value })}
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-sm disabled:opacity-40"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditId(null)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm">
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border border-neutral-200 p-4 ${
                !p.activo ? 'opacity-50' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 font-medium text-rose-700">
                {p.nombre[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  {p.nombre} {!p.activo && <span className="text-xs text-neutral-400">(inactiva)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {(p.profesional_servicios || []).length
                    ? (p.profesional_servicios || [])
                        .map((r) => nombreServicio[r.servicio_id])
                        .filter(Boolean)
                        .join(', ')
                    : 'Sin servicios asignados'}
                </p>
              </div>
              <button onClick={() => empezarEdicion(p)} className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600">
                Editar
              </button>
              <button
                onClick={() => toggleActivo(p)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  p.activo ? 'border-neutral-200 text-neutral-500' : 'border-emerald-300 text-emerald-700'
                }`}
              >
                {p.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          )
        )}
      </div>
    </Marco>
  )
}

function Marco({ children }) {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">{children}</div>
    </div>
  )
}
