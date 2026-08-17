// Va en: app/admin/profesionales/page.tsx
// (creá la carpeta 'profesionales' dentro de 'app/admin/' y este archivo como page.tsx)
import AdminProfesionales from '@/components/AdminProfesionales'

export default function ProfesionalesPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 py-6">
      <AdminProfesionales />
    </main>
  )
}
