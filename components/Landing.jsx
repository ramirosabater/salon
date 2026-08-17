'use client'

// ============================================================
//  Landing.jsx — bienvenida de Alma Nails (identidad dorada)
//  Si existe /logo.png en la carpeta public, lo muestra;
//  si no, muestra el wordmark dorado por defecto.
//  Uso: app/page.tsx
// ============================================================
import { useEffect, useState } from 'react'
import { usuarioActual, miPerfil } from '@/lib/reservas'

export default function Landing() {
  const [saludo, setSaludo] = useState(null)
  const [logoOk, setLogoOk] = useState(true)

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
      {/* Logo real (public/logo.png) o wordmark dorado */}
      {logoOk ? (
        <img
          src="/logo.png"
          alt="Alma Nails"
          onError={() => setLogoOk(false)}
          className="mb-4 h-40 w-auto object-contain"
        />
      ) : (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[#c9a227]">
            Con alma argentina y estilo francés
          </p>
          <h1 className="mt-3 font-serif text-5xl italic text-[#e3c05a]">Alma Nails</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-neutral-400">by Audrey</p>
        </div>
      )}

      <p className="mt-1 text-neutral-400">
        Uñas, masajes y pestañas. Reservá tu turno online en segundos.
      </p>

      <div className="mt-8 w-full space-y-3">
        <a
          href="/reservar"
          className="block w-full rounded-xl bg-[#e3b23c] py-3 text-center font-medium text-neutral-950 transition hover:bg-[#d4a226]"
        >
          Reservar un turno
        </a>

        {saludo ? (
          <a
            href={saludo.destino}
            className="block w-full rounded-xl border border-neutral-700 py-3 text-center font-medium text-neutral-200 hover:bg-white/5"
          >
            Entrar como {saludo.nombre}
          </a>
        ) : (
          <a
            href="/login"
            className="block w-full rounded-xl border border-neutral-700 py-3 text-center font-medium text-neutral-200 hover:bg-white/5"
          >
            Ingresar a mi cuenta
          </a>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        No necesitás cuenta para reservar. La cuenta te sirve para ver y cancelar tus turnos.
      </p>
    </div>
  )
}
