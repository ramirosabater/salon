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
export async function registrarse({ email, password, nombre, telefono }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, telefono } }, // llegan a raw_user_meta_data -> perfiles
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

// Devuelve el perfil del usuario logueado (incluye 'rol': cliente/profesional/admin)
export async function miPerfil() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email, telefono, rol')
    .eq('id', user.id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ------------------------------------------------------------
//  ETAPA 2 — registro de profesionales y agenda propia
// ------------------------------------------------------------

// Lista pública de profesionales activas (para el registro con código)
export async function getProfesionalesPublico() {
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

// Canjea el código del salón: te convierte en profesional y te vincula a tu ficha
export async function canjearCodigoProfesional(codigo, profesionalId) {
  const { error } = await supabase.rpc('canjear_codigo_profesional', {
    p_codigo: codigo,
    p_profesional_id: profesionalId,
  })
  if (error) throw new Error(error.message)
}

// La ficha de profesional vinculada al usuario actual (o null)
export async function miFichaProfesional() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('perfil_id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// Cambia el estado de un turno (confirmado / completado / cancelado)
export async function marcarTurno(id, estado) {
  const { data, error } = await supabase
    .from('turnos')
    .update({ estado })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Código del salón (solo admin)
export async function getCodigoProfesional() {
  const { data, error } = await supabase.rpc('get_codigo_profesional')
  if (error) throw new Error(error.message)
  return data
}
export async function setCodigoProfesional(nuevo) {
  const { error } = await supabase.rpc('set_codigo_profesional', { p_nuevo: nuevo })
  if (error) throw new Error(error.message)
}

// ------------------------------------------------------------
//  ADMIN — agenda del día
//  fecha: 'YYYY-MM-DD' (día local del salón). Requiere estar
//  logueado como admin/profesional (el RLS filtra el resto).
// ------------------------------------------------------------
export async function agendaDelDia(fecha) {
  const desde = new Date(`${fecha}T00:00:00`)
  const hasta = new Date(`${fecha}T23:59:59`)
  const { data, error } = await supabase
    .from('turnos')
    .select(
      'id, inicio, estado, cliente_nombre, cliente_telefono, servicios(nombre, precio, duracion_min), profesionales(id, nombre), cliente:perfiles!cliente_id(nombre, telefono)'
    )
    .gte('inicio', desde.toISOString())
    .lte('inicio', hasta.toISOString())
    .order('inicio')
  if (error) throw new Error(error.message)
  return data
}

// ------------------------------------------------------------
//  ADMIN — gestión de servicios (catálogo)
// ------------------------------------------------------------

// Todos los servicios, incluidos los inactivos (para el panel)
export async function getServiciosAdmin() {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('categoria')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function crearServicio({ categoria, nombre, duracion_min, precio }) {
  const { data, error } = await supabase
    .from('servicios')
    .insert({ categoria, nombre, duracion_min, precio })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function editarServicio(id, campos) {
  const { data, error } = await supabase
    .from('servicios')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Baja lógica: no se borra (rompería turnos viejos), se desactiva
export async function cambiarActivoServicio(id, activo) {
  return editarServicio(id, { activo })
}

// ------------------------------------------------------------
//  ADMIN — gestión de profesionales, sus servicios y horarios
// ------------------------------------------------------------

// Profesionales con la lista de servicios que ofrece cada una
export async function getProfesionalesAdmin() {
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre, bio, activo, profesional_servicios(servicio_id)')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function crearProfesional({ nombre, bio }) {
  const { data, error } = await supabase
    .from('profesionales')
    .insert({ nombre, bio })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function editarProfesional(id, campos) {
  const { data, error } = await supabase
    .from('profesionales')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function cambiarActivoProfesional(id, activo) {
  return editarProfesional(id, { activo })
}

// Reemplaza qué servicios ofrece una profesional (borra y vuelve a cargar)
export async function setServiciosDeProfesional(profId, servicioIds) {
  const { error: delErr } = await supabase
    .from('profesional_servicios')
    .delete()
    .eq('profesional_id', profId)
  if (delErr) throw new Error(delErr.message)
  if (!servicioIds.length) return
  const filas = servicioIds.map((sid) => ({ profesional_id: profId, servicio_id: sid }))
  const { error } = await supabase.from('profesional_servicios').insert(filas)
  if (error) throw new Error(error.message)
}

export async function getHorariosDeProfesional(profId) {
  const { data, error } = await supabase
    .from('horarios_trabajo')
    .select('*')
    .eq('profesional_id', profId)
    .order('dia_semana')
  if (error) throw new Error(error.message)
  return data
}

// Reemplaza los horarios de una profesional
// horarios: [{ dia_semana, hora_inicio, hora_fin }]
export async function setHorariosDeProfesional(profId, horarios) {
  const { error: delErr } = await supabase
    .from('horarios_trabajo')
    .delete()
    .eq('profesional_id', profId)
  if (delErr) throw new Error(delErr.message)
  if (!horarios.length) return
  const filas = horarios.map((h) => ({ profesional_id: profId, ...h }))
  const { error } = await supabase.from('horarios_trabajo').insert(filas)
  if (error) throw new Error(error.message)
}

// ------------------------------------------------------------
//  ADMIN — datos para el dashboard (turnos en un rango)
// ------------------------------------------------------------
export async function turnosEnRango(desdeISO, hastaISO) {
  const { data, error } = await supabase
    .from('turnos')
    .select('id, inicio, estado, servicios(nombre, precio, categoria), profesionales(nombre)')
    .gte('inicio', desdeISO)
    .lte('inicio', hastaISO)
    .order('inicio')
  if (error) throw new Error(error.message)
  return data
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

// Reserva sin cuenta (invitado): pide nombre y teléfono
export async function reservarInvitado({ servicioId, inicioISO, profesionalId = null, nombre, telefono }) {
  const { data, error } = await supabase.rpc('reservar_turno_invitado', {
    p_servicio_id: servicioId,
    p_inicio: inicioISO,
    p_nombre: nombre,
    p_telefono: telefono,
    p_profesional_id: profesionalId,
  })
  if (error) throw new Error(error.message)
  return data
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
