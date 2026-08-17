'use client'

// ============================================================
//  Login.jsx — ingreso unificado
//  Tras iniciar sesión, redirige según el rol:
//    admin → /admin   ·   profesional → /pro   ·   cliente → /mis-turnos
//  Uso: app/login/page.tsx
// ============================================================
import { useState } from 'react'
import { iniciarSesion, registrarse, miPerfil } from '@/lib/reservas'

function destinoPorRol(rol) {
  if (rol === 'admin') return '/admin'
  if (rol === 'profesional') return '/pro'
  return '/mis-turnos'
}

export default function Login() {
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!email.trim() || !pass.trim() || (modo === 'registro' && (!nombre.trim() || !telefono.trim()))) {
      setError('Completá todos los campos.')
      return
    }
    setCargando(true)
    try {
      if (modo === 'login') {
        await iniciarSesion({ email, password: pass })
      } else {
        await registrarse({ email, password: pass, nombre, telefono })
      }
      const p = await miPerfil()
      window.location.href = destinoPorRol(p?.rol)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <a href="/" className="mb-6 text-center text-sm text-neutral-400">← Salón Bella</a>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-medium text-neutral-900">
          {modo === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
        </h1>
        <p className="mb-4 text-sm text-neutral-500">
          {modo === 'login' ? 'Para ver y gestionar tus turnos' : 'Con nombre y WhatsApp para tus recordatorios'}
        </p>

        <div className="space-y-3">
          {modo === 'registro' && (
            <>
              <Campo label="Nombre y apellido" value={nombre} onChange={setNombre} placeholder="María Pérez" />
              <Campo label="WhatsApp" value={telefono} onChange={setTelefono} placeholder="11 2345 6789" type="tel" />
            </>
          )}
          <Campo label="Email" value={email} onChange={setEmail} placeholder="maria@email.com" type="email" />
          <Campo label="Contraseña" value={pass} onChange={setPass} placeholder="••••••••" type="password" />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={cargando}
            className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {cargando ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </div>

        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
          className="mt-4 w-full text-center text-sm text-neutral-500"
        >
          {modo === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>

      <a href="/reservar" className="mt-4 text-center text-sm text-rose-500">
        Reservar sin cuenta →
      </a>
      <a href="/soy-profesional" className="mt-2 text-center text-xs text-neutral-400">
        ¿Sos del equipo? Registrate como profesional
      </a>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
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
