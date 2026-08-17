'use client'

// ============================================================
//  RegistroProfesional.jsx — alta del personal con código
//  1) Crea la cuenta (o usa la sesión actual)
//  2) La profesional elige su ficha e ingresa el código del salón
//  Al canjearlo, queda con rol 'profesional' y va a /pro.
//  Uso: app/soy-profesional/page.tsx
// ============================================================
import { useEffect, useState } from 'react'
import {
  usuarioActual,
  registrarse,
  getProfesionalesPublico,
  canjearCodigoProfesional,
} from '@/lib/reservas'

export default function RegistroProfesional() {
  const [usuario, setUsuario] = useState(undefined)
  const [profes, setProfes] = useState([])
  const [error, setError] = useState('')

  // paso 1 (crear cuenta)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')

  // paso 2 (canje)
  const [profId, setProfId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    usuarioActual().then((u) => setUsuario(u || null))
    getProfesionalesPublico().then(setProfes).catch(() => {})
  }, [])

  async function crearCuenta() {
    setError('')
    if (!nombre.trim() || !telefono.trim() || !email.trim() || !pass.trim()) {
      setError('Completá todos los campos.')
      return
    }
    setCargando(true)
    try {
      const u = await registrarse({ email, password: pass, nombre, telefono })
      setUsuario(u)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  async function canjear() {
    setError('')
    if (!profId || !codigo.trim()) {
      setError('Elegí tu nombre e ingresá el código.')
      return
    }
    setCargando(true)
    try {
      await canjearCodigoProfesional(codigo.trim(), Number(profId))
      window.location.href = '/pro'
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <a href="/" className="mb-6 text-center text-sm text-neutral-500">← Alma Nails</a>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="text-lg font-medium text-neutral-100">Soy del equipo</h1>
        <p className="mb-4 text-sm text-neutral-400">
          Registrate con el código que te dio el salón para acceder a tu agenda.
        </p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {usuario === undefined && <p className="text-sm text-neutral-500">Cargando…</p>}

        {/* Paso 1: crear cuenta (si no hay sesión) */}
        {usuario === null && (
          <div className="space-y-3">
            <Campo label="Nombre y apellido" value={nombre} onChange={setNombre} placeholder="Sofía Gómez" />
            <Campo label="WhatsApp" value={telefono} onChange={setTelefono} placeholder="11 2345 6789" type="tel" />
            <Campo label="Email" value={email} onChange={setEmail} placeholder="sofia@email.com" type="email" />
            <Campo label="Contraseña" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
            <button onClick={crearCuenta} disabled={cargando}
              className="w-full rounded-lg bg-[#e3b23c] py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-60">
              {cargando ? 'Un momento…' : 'Crear mi cuenta'}
            </button>
          </div>
        )}

        {/* Paso 2: elegir ficha + código */}
        {usuario && (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
              Cuenta lista. Ahora vinculá tu perfil.
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-400">¿Cuál sos?</span>
              <select
                value={profId}
                onChange={(e) => setProfId(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 px-3 py-2 text-sm"
              >
                <option value="">Elegí tu nombre…</option>
                {profes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-neutral-500">
                Si no está tu nombre, pedile al salón que te agregue primero.
              </span>
            </label>
            <Campo label="Código del salón" value={codigo} onChange={setCodigo} placeholder="ALMA2026" />
            <button onClick={canjear} disabled={cargando}
              className="w-full rounded-lg bg-[#e3b23c] py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-60">
              {cargando ? 'Verificando…' : 'Activar mi acceso'}
            </button>
          </div>
        )}
      </div>

      <a href="/login" className="mt-4 text-center text-sm text-neutral-400">
        ¿Ya tenés acceso? Ingresá
      </a>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
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
