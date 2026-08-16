-- ============================================================
--  Función reservar_turno
--  Envuelve la reserva en una sola operación segura y devuelve
--  mensajes claros en lugar del error crudo de la constraint.
--  Correr DESPUÉS de salon_supabase.sql.
-- ============================================================
create or replace function reservar_turno(
  p_servicio_id    bigint,
  p_inicio         timestamptz,
  p_profesional_id bigint default null   -- NULL = "cualquiera disponible"
)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := auth.uid();
  v_prof    bigint := p_profesional_id;
  v_dur     interval;
  v_fin     timestamptz;
  v_turno   turnos;
begin
  -- 1. Debe estar logueado
  if v_cliente is null then
    raise exception 'Necesitás iniciar sesión para reservar.';
  end if;

  -- 2. El servicio debe existir y estar activo
  select make_interval(mins => duracion_min) into v_dur
  from servicios where id = p_servicio_id and activo;
  if v_dur is null then
    raise exception 'El servicio no existe o no está disponible.';
  end if;
  v_fin := p_inicio + v_dur;

  -- 3. No permitir reservar en el pasado
  if p_inicio <= now() then
    raise exception 'Ese horario ya pasó. Elegí uno futuro.';
  end if;

  if v_prof is null then
    -- 4a. "Cualquiera disponible": tomar la primera profe libre que
    --     ofrezca el servicio en ese horario.
    select ps.profesional_id into v_prof
    from profesional_servicios ps
    join profesionales pr on pr.id = ps.profesional_id and pr.activo
    where ps.servicio_id = p_servicio_id
      and not exists (
        select 1 from turnos t
        where t.profesional_id = ps.profesional_id
          and t.estado <> 'cancelado'
          and t.periodo && tstzrange(p_inicio, v_fin, '[)')
      )
      and not exists (
        select 1 from bloqueos b
        where b.profesional_id = ps.profesional_id
          and b.periodo && tstzrange(p_inicio, v_fin, '[)')
      )
    order by ps.profesional_id
    limit 1;

    if v_prof is null then
      raise exception 'No hay profesionales disponibles en ese horario.';
    end if;
  else
    -- 4b. Profesional elegida: validar que realice el servicio
    if not exists (
      select 1 from profesional_servicios
      where profesional_id = v_prof and servicio_id = p_servicio_id
    ) then
      raise exception 'Esa profesional no realiza este servicio.';
    end if;
  end if;

  -- 5. Insertar. Si el horario se ocupó entre medio, la constraint de
  --    exclusión lanza exclusion_violation y devolvemos un mensaje amable.
  begin
    insert into turnos (cliente_id, profesional_id, servicio_id, inicio)
    values (v_cliente, v_prof, p_servicio_id, p_inicio)
    returning * into v_turno;
  exception when exclusion_violation then
    raise exception 'Ese horario se acaba de ocupar. Elegí otro.';
  end;

  return v_turno;
end;
$$;

-- Cancelar un turno propio (marca como cancelado, no borra el registro)
create or replace function cancelar_turno(p_turno_id bigint)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
begin
  update turnos
    set estado = 'cancelado'
  where id = p_turno_id
    and (cliente_id = auth.uid() or es_admin())
    and estado not in ('cancelado', 'completado')
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'No se pudo cancelar este turno.';
  end if;
  return v_turno;
end;
$$;
