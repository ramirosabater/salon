'use client'

// ============================================================
//  AdminServicios.jsx — ABM de servicios y precios
//  Crear, editar (nombre, categoría, duración, precio) y
//  activar/desactivar servicios. Solo admin/profesional.
//  Uso: app/admin/servicios/page.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  miPerfil,
  getServiciosAdmin,
  crearServicio,
  editarServicio,
  cambiarActivoServicio,
} from '@/lib/reservas'
import AdminNav from '@/components/AdminNav'

const money = (n) => '$' + Number(n).toLocaleString('es-AR')
const VACIO = { categoria: '', nombre: '', duracion_min: '', precio: '' }

export default function AdminServicios() {
  const [perfil, setPerfil] = useState(undefined)
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [editId, setEditId] = useState(null)     // id en edición
  const [borrador, setBorrador] = useState(VACIO) // valores del form de edición
  const [nuevo, setNuevo] = useState(VACIO)       // valores del form de alta
  const [mostrarAlta, setMostrarAlta] = useState(false)

  useEffect(() => {
    miPerfil().then(setPerfil).catch(() => setPerfil(null))
  }, [])

  const esAdmin = perfil && perfil.rol === 'admin'

  useEffect(() => {
    if (!esAdmin) return
    recargar()
  }, [esAdmin])

  function recargar() {
    setCargando(true)
    getServiciosAdmin()
      .then(setServicios)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }

  const categorias = useMemo(
    () => [...new Set(servicios.map((s) => s.categoria))],
    [servicios]
  )
  const porCat = useMemo(() => {
    const m = {}
    for (const s of servicios) (m[s.categoria] ??= []).push(s)
    return m
  }, [servicios])

  function empezarEdicion(s) {
    setEditId(s.id)
    setBorrador({
      categoria: s.categoria,
      nombre: s.nombre,
      duracion_min: s.duracion_min,
      precio: s.precio,
    })
  }

  async function guardarEdicion() {
    setError('')
    try {
      await editarServicio(editId, {
        categoria: borrador.categoria.trim(),
        nombre: borrador.nombre.trim(),
        duracion_min: Number(borrador.duracion_min),
        precio: Number(borrador.precio),
      })
      setEditId(null)
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function crear() {
    setError('')
    if (!nuevo.categoria.trim() || !nuevo.nombre.trim() || !nuevo.duracion_min || !nuevo.precio) {
      setError('Completá categoría, nombre, duración y precio.')
      return
    }
    try {
      await crearServicio({
        categoria: nuevo.categoria.trim(),
        nombre: nuevo.nombre.trim(),
        duracion_min: Number(nuevo.duracion_min),
        precio: Number(nuevo.precio),
      })
      setNuevo(VACIO)
      setMostrarAlta(false)
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleActivo(s) {
    try {
      await cambiarActivoServicio(s.id, !s.activo)
      recargar()
    } catch (e) {
      setError(e.message)
    }
  }

  // --- Acceso ---
  if (perfil === undefined) return <Marco><p className="text-neutral-400">Cargando…</p></Marco>
  if (!perfil)
    return (
      <Marco>
        <h1 className="text-lg font-medium">Panel del salón</h1>
        <p className="mt-2 text-sm text-neutral-400">Iniciá sesión desde la página principal y volvé.</p>
        <a href="/" className="mt-4 inline-block text-sm text-[#e3b23c] underline">Ir al inicio</a>
      </Marco>
    )
  if (!esAdmin)
    return (
      <Marco>
        <h1 className="text-lg font-medium">Sin acceso</h1>
        <p className="mt-2 text-sm text-neutral-400">Esta sección es solo para el personal del salón.</p>
      </Marco>
    )

  return (
    <Marco>
      <AdminNav actual="servicios" />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium text-neutral-100">Servicios y precios</h1>
        <button
          onClick={() => setMostrarAlta((v) => !v)}
          className="rounded-lg bg-[#e3b23c] px-3 py-1.5 text-sm font-medium text-neutral-950"
        >
          {mostrarAlta ? 'Cerrar' : '+ Nuevo'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {mostrarAlta && (
        <div className="mb-5 rounded-lg border border-neutral-800 bg-white/5 p-3">
          <p className="mb-2 text-sm font-medium">Nuevo servicio</p>
          <FormFila
            valores={nuevo}
            onChange={setNuevo}
            categorias={categorias}
          />
          <div className="mt-2 flex justify-end">
            <button onClick={crear} className="rounded-lg bg-[#e3b23c] px-3 py-1.5 text-sm font-medium text-neutral-950">
              Crear servicio
            </button>
          </div>
        </div>
      )}

      {cargando && <p className="text-sm text-neutral-500">Cargando…</p>}

      {Object.entries(porCat).map(([cat, items]) => (
        <div key={cat} className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">{cat}</p>
          {items.map((s) =>
            editId === s.id ? (
              <div key={s.id} className="mb-2 rounded-lg border border-[#c9a227] bg-[#c9a227]/10 p-3">
                <FormFila valores={borrador} onChange={setBorrador} categorias={categorias} />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setEditId(null)} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm">
                    Cancelar
                  </button>
                  <button onClick={guardarEdicion} className="rounded-lg bg-[#e3b23c] px-3 py-1.5 text-sm font-medium text-neutral-950">
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={s.id}
                className={`mb-2 flex items-center gap-3 rounded-lg border border-neutral-800 p-3 ${
                  !s.activo ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-100">
                    {s.nombre} {!s.activo && <span className="text-xs text-neutral-500">(inactivo)</span>}
                  </p>
                  <p className="text-sm text-neutral-400">{s.duracion_min} min</p>
                </div>
                <span className="text-sm font-medium">{money(s.precio)}</span>
                <button onClick={() => empezarEdicion(s)} className="rounded-md border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-2 py-1 text-xs text-neutral-400">
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(s)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    s.activo ? 'border-neutral-800 text-neutral-400' : 'border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {s.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )
          )}
        </div>
      ))}
    </Marco>
  )
}

// ---------- Form reutilizable (alta y edición) ----------
function FormFila({ valores, onChange, categorias }) {
  const set = (k) => (e) => onChange({ ...valores, [k]: e.target.value })
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Categoría</label>
        <input
          list="cats"
          value={valores.categoria}
          onChange={set('categoria')}
          placeholder="Uñas"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm"
        />
        <datalist id="cats">
          {categorias.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Nombre</label>
        <input value={valores.nombre} onChange={set('nombre')} placeholder="Esmaltado semi"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Duración (min)</label>
        <input type="number" value={valores.duracion_min} onChange={set('duracion_min')} placeholder="60"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Precio</label>
        <input type="number" value={valores.precio} onChange={set('precio')} placeholder="12000"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm" />
      </div>
    </div>
  )
}

// ---------- Marco ----------
function Marco({ children }) {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">{children}</div>
    </div>
  )
}
