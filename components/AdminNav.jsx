'use client'

// ============================================================
//  AdminNav.jsx — navegación entre secciones del panel
//  Se usa en todas las pantallas de admin. Pasale 'actual'
//  con el id de la sección activa: 'agenda' | 'servicios' | 'profesionales'
// ============================================================
export default function AdminNav({ actual }) {
  const items = [
    { href: '/admin', label: 'Agenda', id: 'agenda' },
    { href: '/admin/servicios', label: 'Servicios', id: 'servicios' },
    { href: '/admin/profesionales', label: 'Profesionales', id: 'profesionales' },
    { href: '/admin/dashboard', label: 'Ingresos', id: 'dashboard' },
  ]
  return (
    <div className="mb-5 flex gap-1 border-b border-neutral-800 pb-2 text-sm">
      {items.map((i) => (
        <a
          key={i.id}
          href={i.href}
          className={`rounded-md px-3 py-1.5 ${
            actual === i.id ? 'bg-[#e3b23c] text-neutral-950' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          {i.label}
        </a>
      ))}
    </div>
  )
}
