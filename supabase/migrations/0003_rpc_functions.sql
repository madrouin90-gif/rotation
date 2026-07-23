-- ============================================================
-- Rend la contrainte unique(member_id, rank) de `shares` deferrable :
-- indispensable pour recompacter/réordonner les rangs en une seule
-- opération (ex. échanger les rangs 2 et 4) sans violation transitoire,
-- Postgres vérifiant les contraintes immédiates après CHAQUE ligne
-- modifiée dans un UPDATE multi-lignes, pas seulement à la fin.
-- Le nom exact de la contrainte n'est pas supposé : on le retrouve
-- dynamiquement via pg_constraint pour rester idempotent quel que
-- soit son nom actuel.
-- ============================================================
do $$
declare
  v_conname text;
  v_is_deferrable boolean;
begin
  select conname, condeferrable into v_conname, v_is_deferrable
  from pg_constraint
  where conrelid = 'shares'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like 'UNIQUE (member_id, rank)%';

  if v_conname is not null and not v_is_deferrable then
    execute format('alter table shares drop constraint %I', v_conname);
    execute 'alter table shares add constraint shares_member_rank_key unique (member_id, rank) deferrable initially deferred';
  elsif v_conname is null then
    execute 'alter table shares add constraint shares_member_rank_key unique (member_id, rank) deferrable initially deferred';
  end if;
end $$;

-- ============================================================
-- create_group_with_owner — crée le groupe puis son membre owner dans
-- la même transaction. Un conflit sur groups.code remonte l'exception
-- telle quelle (le TS retente avec un nouveau code).
-- ============================================================
create or replace function create_group_with_owner(
  p_name text,
  p_code text,
  p_settings jsonb,
  p_pseudo text,
  p_avatar_emoji text,
  p_avatar_color text,
  p_password_hash text
) returns table (group_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_member_id uuid;
begin
  insert into groups (name, code, settings)
  values (p_name, p_code, p_settings)
  returning id into v_group_id;

  insert into members (group_id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, password_hash)
  values (v_group_id, p_pseudo, p_avatar_emoji, p_avatar_color, true, true, p_password_hash)
  returning id into v_member_id;

  return query select v_group_id, v_member_id;
end;
$$;

-- ============================================================
-- place_share — ajoute ou remplace un partage de façon atomique.
-- pg_advisory_xact_lock sérialise les appels pour un même membre
-- (relâché automatiquement à la fin de la transaction) : deux ajouts
-- simultanés ne peuvent plus tous les deux lire "slot 1 libre" et se
-- marcher dessus — le second voit l'état à jour laissé par le premier.
-- ============================================================
create or replace function place_share(
  p_member_id uuid,
  p_item_id uuid,
  p_note text,
  p_replace_rank int,
  p_max_slots int
) returns table (out_rank int, out_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_id uuid;
  v_free_rank int;
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  if p_replace_rank is not null then
    select id into v_share_id from shares
      where member_id = p_member_id and rank = p_replace_rank;

    if v_share_id is null then
      return query select null::int, 'slot_missing'::text;
      return;
    end if;

    update shares set item_id = p_item_id, note = p_note, added_at = now()
      where id = v_share_id;

    -- share_events est un historique secondaire : un échec ici ne doit jamais faire
    -- échouer le partage lui-même (même principe qu'en TS avant la bascule RPC).
    begin
      insert into share_events (member_id, item_id) values (p_member_id, p_item_id);
    exception when others then
      raise warning 'share_events insert failed: %', sqlerrm;
    end;

    return query select p_replace_rank, 'ok'::text;
    return;
  end if;

  select min(r) into v_free_rank
    from generate_series(1, p_max_slots) r
    where r not in (select rank from shares where member_id = p_member_id);

  if v_free_rank is null then
    return query select null::int, 'slots_full'::text;
    return;
  end if;

  insert into shares (member_id, item_id, rank, note)
    values (p_member_id, p_item_id, v_free_rank, p_note);

  begin
    insert into share_events (member_id, item_id) values (p_member_id, p_item_id);
  exception when others then
    raise warning 'share_events insert failed: %', sqlerrm;
  end;

  return query select v_free_rank, 'ok'::text;
end;
$$;

-- ============================================================
-- delete_share_compact — supprime un partage et recompacte les rangs
-- supérieurs en une passe (contrainte deferrable ci-dessus).
-- ============================================================
create or replace function delete_share_compact(p_share_id uuid, p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank int;
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  select rank into v_rank from shares where id = p_share_id and member_id = p_member_id;

  if v_rank is null then
    return false;
  end if;

  delete from shares where id = p_share_id;

  update shares set rank = rank - 1
    where member_id = p_member_id and rank > v_rank;

  return true;
end;
$$;

-- ============================================================
-- reorder_shares — réattribue rank = position dans le tableau fourni,
-- après vérification que celui-ci contient exactement le même ensemble
-- de shares que ceux du membre (ni plus, ni moins, pas de doublon).
-- ============================================================
create or replace function reorder_shares(p_member_id uuid, p_share_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_sorted uuid[];
  v_new_sorted uuid[];
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  select coalesce(array_agg(id order by id), '{}') into v_current_sorted
    from shares where member_id = p_member_id;

  select coalesce(array_agg(x order by x), '{}') into v_new_sorted
    from unnest(p_share_ids) as x;

  if v_current_sorted is distinct from v_new_sorted then
    return false;
  end if;

  update shares s
    set rank = t.new_rank
    from unnest(p_share_ids) with ordinality as t(id, new_rank)
    where s.id = t.id and s.member_id = p_member_id;

  return true;
end;
$$;

-- ============================================================
-- apply_slot_reduction — supprime, pour chaque membre du groupe, les
-- shares dont le rang dépasse la nouvelle limite, et retourne l'impact
-- réel par membre.
-- ============================================================
create or replace function apply_slot_reduction(p_group_id uuid, p_new_slots int)
returns table (member_id uuid, pseudo text, shares_archived int)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with deleted as (
      delete from shares s
      using members m
      where s.member_id = m.id
        and m.group_id = p_group_id
        and s.rank > p_new_slots
      returning s.member_id as deleted_member_id
    )
    select m.id, m.pseudo, count(d.deleted_member_id)::int
    from members m
    join deleted d on d.deleted_member_id = m.id
    where m.group_id = p_group_id
    group by m.id, m.pseudo;
end;
$$;

grant execute on function create_group_with_owner(text, text, jsonb, text, text, text, text) to service_role;
grant execute on function place_share(uuid, uuid, text, int, int) to service_role;
grant execute on function delete_share_compact(uuid, uuid) to service_role;
grant execute on function reorder_shares(uuid, uuid[]) to service_role;
grant execute on function apply_slot_reduction(uuid, int) to service_role;
