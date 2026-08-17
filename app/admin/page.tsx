// Va en: app/admin/page.tsx
// (creá la carpeta 'admin' dentro de 'app' y adentro este archivo como page.tsx)
import AdminAgenda from '@/components/AdminAgenda'

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 py-6">
      <AdminAgenda />
    </main>
  )
}
