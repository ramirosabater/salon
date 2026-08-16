// ============================================================
//  reservas.js — capa de datos del salón
//  Requiere: npm install @supabase/supabase-js
//  Variables de entorno (poné las tuyas):
//    NEXT_PUBLIC_SUPABASE_URL      (o VITE_SUPABASE_URL en Vite)
//    NEXT_PUBLIC_SUPABASE_ANON_KEY (o VITE_SUPABASE_ANON_KEY)
// ============================================================
import { createClient } from '@supabase/supabase-js'

const URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? import.meta?.env?.VITE_SUPABASE_URL
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta?.env?.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(URL, ANON)

// ------------------------------------------------------------
//  AUTENTICACIÓN
// ------------------------------------------------------------

// Registro rápido. El perfil se crea solo por el trigger on_auth_user_created.
export async function registrarse({ email, password, nombre }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } }, // llega a raw_user_meta_data -> perfiles.nombre
  })
  if (error) throw new Error(error.message)
  return data.user
}

export async function iniciarSesion({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.user
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
}

export async function usuarioActual() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ------------------------------------------------------------
//  CATÁLOGO (lectura pública — el portal lo lee sin login)
// ------------------------------------------------------------

export async function getServicios() {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('categoria')
  if (error) throw new Error(error.message)
  return data
}

// Profesionales que realizan un servicio dado (para el paso "elegí profesional")
export async function getProfesionalesDeServicio(servicioId) {
  const { data, error } = await supabase
    .from('profesional_servicios')
    .select('profesionales(id, nombre, foto_url, bio)')
    .eq('servicio_id', servicioId)
  if (error) throw new Error(error.message)
  return data.map((r) => r.profesionales).filter((p) => p) // aplana la relación
}

// ------------------------------------------------------------
//  DISPONIBILIDAD (llama a la función SQL)
//  fecha en formato 'YYYY-MM-DD'. profesionalId opcional (null = cualquiera).
// ------------------------------------------------------------
export async function getHorariosDisponibles(servicioId, fecha, profesionalId = null) {
  const { data, error } = await supabase.rpc('horarios_disponibles', {
    p_servicio_id: servicioId,
    p_fecha: fecha,
    p_profesional_id: profesionalId,
  })
  if (error) throw new Error(error.message)
  // data: [{ profesional_id, inicio }, ...]  — 'inicio' es un timestamptz ISO
  return data
}

// ------------------------------------------------------------
//  RESERVAR (llama a la función SQL con manejo de errores amable)
//  inicioISO: string ISO del arranque, p.ej. '2026-08-19T12:30:00Z'
// ------------------------------------------------------------
export async function reservar({ servicioId, inicioISO, profesionalId = null }) {
  const { data, error } = await supabase.rpc('reservar_turno', {
    p_servicio_id: servicioId,
    p_inicio: inicioISO,
    p_profesional_id: profesionalId,
  })
  if (error) {
    // Los raise exception de la función llegan acá como error.message
    throw new Error(error.message)
  }
  return data // el turno creado
}

// ------------------------------------------------------------
//  MIS TURNOS
// ------------------------------------------------------------

// Próximos turnos del cliente logueado (RLS ya filtra a los suyos)
export async function misTurnos() {
  const { data, error } = await supabase
    .from('turnos')
    .select('id, inicio, estado, servicios(nombre, precio, categoria), profesionales(nombre)')
    .neq('estado', 'cancelado')
    .gte('inicio', new Date().toISOString())
    .order('inicio')
  if (error) throw new Error(error.message)
  return data
}

// Historial (turnos ya pasados)
export async function historialTurnos() {
  const { data, error } = await supabase
    .from('turnos')
    .select('id, inicio, estado, servicios(nombre, categoria), profesionales(nombre)')
    .lt('inicio', new Date().toISOString())
    .order('inicio', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function cancelar(turnoId) {
  const { data, error } = await supabase.rpc('cancelar_turno', { p_turno_id: turnoId })
  if (error) throw new Error(error.message)
  return data
}

// ------------------------------------------------------------
//  EJEMPLO DE USO (flujo completo de reserva)
// ------------------------------------------------------------
//
//  const servicios = await getServicios()
//  const profes    = await getProfesionalesDeServicio(1)
//  const libres    = await getHorariosDisponibles(1, '2026-08-19', null)
//  const turno     = await reservar({
//    servicioId: 1,
//    inicioISO: libres[0].inicio,
//    profesionalId: libres[0].profesional_id, // o null para "cualquiera"
//  })
//
