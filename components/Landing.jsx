'use client'

// ============================================================
//  Landing.jsx — pantalla de bienvenida (URL principal)
//  Dos caminos: reservar un turno o ingresar a la cuenta.
//  Uso: app/page.tsx
// ============================================================
import { useEffect, useState } from 'react'
import { usuarioActual, miPerfil } from '@/lib/reservas'

export default function Landing() {
  const [saludo, setSaludo] = useState(null) // {nombre, destino} si hay sesión

  useEffect(() => {
    usuarioActual().then(async (u) => {
      if (!u) return
      try {
        const p = await miPerfil()
        const destino =
          p?.rol === 'admin' ? '/admin' : p?.rol === 'profesional' ? '/pro' : '/mis-turnos'
        setSaludo({ nombre: p?.nombre || u.email, destino })
      } catch {
        setSaludo({ nombre: u.email, destino: '/mis-turnos' })
      }
    })
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
        💅
      </div>
      <h1 className="text-3xl font-semibold text-neutral-900">Salón Bella</h1>
      <p className="mt-2 text-neutral-500">
        Uñas, masajes y pestañas. Reservá tu turno online en segundos.
      </p>

      <div className="mt-8 w-full space-y-3">
        <a
          href="/reservar"
          className="block w-full rounded-xl bg-rose-500 py-3 text-center font-medium text-white hover:bg-rose-600"
        >
          Reservar un turno
        </a>

        {saludo ? (
          <a
            href={saludo.destino}
            className="block w-full rounded-xl border border-neutral-200 py-3 text-center font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Entrar como {saludo.nombre}
          </a>
        ) : (
          <a
            href="/login"
            className="block w-full rounded-xl border border-neutral-200 py-3 text-center font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Ingresar a mi cuenta
          </a>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        No necesitás cuenta para reservar. La cuenta te sirve para ver y cancelar tus turnos.
      </p>
    </div>
  )
}
