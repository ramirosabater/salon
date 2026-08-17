// Va en: app/admin/servicios/page.tsx
// (creá la carpeta 'servicios' dentro de 'app/admin/' y este archivo como page.tsx)
import AdminServicios from '@/components/AdminServicios'

export default function ServiciosPage() {
  return (
    <main className="min-h-screen bg-neutral-50 py-6">
      <AdminServicios />
    </main>
  )
}
