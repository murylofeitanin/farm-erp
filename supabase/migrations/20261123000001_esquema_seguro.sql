-- =====================================================================
-- Farm ERP · esquema multiusuário seguro
-- Princípios:
--   * nenhuma tabela acessível ao papel anon;
--   * RLS habilitado em todas as tabelas, acesso sempre por vínculo
--     (membros) do usuário com a fazenda;
--   * papéis: admin (gerencia usuários), editor (lança dados), leitor;
--   * 2FA (aal2) obrigatório para quem cadastrou um fator e para fazendas
--     que exigem 2FA (políticas RESTRICTIVE);
--   * funções privilegiadas com search_path vazio; auxiliares no esquema
--     "privado", que não é exposto pela API;
--   * trilha de auditoria gravada por gatilho, somente leitura para admins.
-- =====================================================================

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------- tabelas
create table public.fazendas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 2 and 120),
  exigir_mfa  boolean not null default false,
  criado_em   timestamptz not null default now(),
  criado_por  uuid references auth.users(id) on delete set null
);

create table public.membros (
  fazenda_id  uuid not null references public.fazendas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('admin', 'editor', 'leitor')),
  criado_em   timestamptz not null default now(),
  primary key (fazenda_id, user_id)
);
create index membros_user_idx on public.membros (user_id);

create table public.convites (
  fazenda_id  uuid not null references public.fazendas(id) on delete cascade,
  email       text not null check (email = lower(btrim(email)) and char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  papel       text not null check (papel in ('admin', 'editor', 'leitor')),
  criado_por  uuid references auth.users(id) on delete set null,
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null default now() + interval '14 days',
  primary key (fazenda_id, email)
);
create index convites_criado_por_idx on public.convites (criado_por);

create table public.registros (
  fazenda_id     uuid not null references public.fazendas(id) on delete cascade,
  colecao        text not null check (colecao in ('cfg','culturas','talhoes','safras','categorias','lancamentos','insumos','movimentos','colheitas','ativos','contratos','orcamentos')),
  id             text not null check (id ~ '^[A-Za-z0-9_.:@+~-]{1,100}$'),
  dados          jsonb not null check (jsonb_typeof(dados) = 'object' and pg_column_size(dados) <= 262144),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (fazenda_id, colecao, id)
);
create index registros_versao_idx on public.registros (fazenda_id, atualizado_em);
create index registros_atualizado_por_idx on public.registros (atualizado_por);

create table public.auditoria (
  id           bigint generated always as identity primary key,
  fazenda_id   uuid not null references public.fazendas(id) on delete cascade,
  tabela       text not null,
  colecao      text,
  registro_id  text,
  operacao     text not null,
  usuario      uuid,
  em           timestamptz not null default now(),
  antes        jsonb,
  depois       jsonb
);
create index auditoria_fazenda_em_idx on public.auditoria (fazenda_id, em desc);

create index fazendas_criado_por_idx on public.fazendas (criado_por);

-- ------------------------------------------------- funções auxiliares (privado)
create or replace function privado.papel(f uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.papel from public.membros m
  where m.fazenda_id = f and m.user_id = (select auth.uid())
$$;

-- true quando a sessão tem o nível de autenticação exigido:
--  * usuário com fator 2FA verificado precisa estar em aal2;
--  * fazenda com exigir_mfa precisa de aal2.
create or replace function privado.aal_ok(f uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or (
        not exists (select 1 from auth.mfa_factors mf
                    where mf.user_id = (select auth.uid()) and mf.status = 'verified')
        and not coalesce((select fz.exigir_mfa from public.fazendas fz where fz.id = f), false)
      )
$$;

create or replace function privado.pode_ler(f uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select privado.papel(f) is not null and privado.aal_ok(f)
$$;

create or replace function privado.pode_editar(f uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select privado.papel(f) in ('admin', 'editor') and privado.aal_ok(f)
$$;

create or replace function privado.e_admin(f uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select privado.papel(f) = 'admin' and privado.aal_ok(f)
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

-- ------------------------------------------------------------------- RLS
alter table public.fazendas  enable row level security;
alter table public.membros   enable row level security;
alter table public.convites  enable row level security;
alter table public.registros enable row level security;
alter table public.auditoria enable row level security;

-- nenhum privilégio padrão: concede somente o necessário
revoke all on public.fazendas, public.membros, public.convites, public.registros, public.auditoria from anon, authenticated, public;
grant select on public.fazendas, public.membros, public.convites, public.auditoria to authenticated;
grant update (nome, exigir_mfa) on public.fazendas to authenticated;
grant select, insert, update, delete on public.registros to authenticated;

create policy fazendas_ler on public.fazendas for select to authenticated
  using ((select privado.pode_ler(id)));
create policy fazendas_admin_altera on public.fazendas for update to authenticated
  using ((select privado.e_admin(id))) with check ((select privado.e_admin(id)));

create policy membros_ler on public.membros for select to authenticated
  using ((select privado.pode_ler(fazenda_id)));

create policy convites_admin_le on public.convites for select to authenticated
  using ((select privado.e_admin(fazenda_id)));

create policy registros_ler on public.registros for select to authenticated
  using ((select privado.pode_ler(fazenda_id)));
create policy registros_inserir on public.registros for insert to authenticated
  with check ((select privado.pode_editar(fazenda_id)));
create policy registros_alterar on public.registros for update to authenticated
  using ((select privado.pode_editar(fazenda_id))) with check ((select privado.pode_editar(fazenda_id)));
create policy registros_excluir on public.registros for delete to authenticated
  using ((select privado.pode_editar(fazenda_id)));

create policy auditoria_admin_le on public.auditoria for select to authenticated
  using ((select privado.e_admin(fazenda_id)));

-- --------------------------------------------------------------- gatilhos
create or replace function privado.registros_carimbo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.fazenda_id <> old.fazenda_id or new.colecao <> old.colecao or new.id <> old.id) then
    raise exception 'Não é permitido mover registros entre fazendas ou coleções';
  end if;
  new.atualizado_em := clock_timestamp();
  new.atualizado_por := auth.uid();
  return new;
end $$;
create trigger registros_carimbo before insert or update on public.registros
  for each row execute function privado.registros_carimbo();

create or replace function privado.auditar_registros()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.auditoria (fazenda_id, tabela, colecao, registro_id, operacao, usuario, antes)
    values (old.fazenda_id, 'registros', old.colecao, old.id, 'excluir', auth.uid(), old.dados);
    return old;
  elsif tg_op = 'UPDATE' then
    if new.dados is distinct from old.dados then
      insert into public.auditoria (fazenda_id, tabela, colecao, registro_id, operacao, usuario, antes, depois)
      values (new.fazenda_id, 'registros', new.colecao, new.id, 'alterar', auth.uid(), old.dados, new.dados);
    end if;
    return new;
  else
    insert into public.auditoria (fazenda_id, tabela, colecao, registro_id, operacao, usuario, depois)
    values (new.fazenda_id, 'registros', new.colecao, new.id, 'incluir', auth.uid(), new.dados);
    return new;
  end if;
end $$;
create trigger registros_auditoria after insert or update or delete on public.registros
  for each row execute function privado.auditar_registros();

create or replace function privado.auditar_membros()
returns trigger language plpgsql security definer set search_path = '' as $$
declare f uuid := coalesce(new.fazenda_id, old.fazenda_id);
begin
  if exists (select 1 from public.fazendas where id = f) then
    insert into public.auditoria (fazenda_id, tabela, registro_id, operacao, usuario, antes, depois)
    values (f, 'membros', coalesce(new.user_id, old.user_id)::text, lower(tg_op), auth.uid(),
            case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  end if;
  return coalesce(new, old);
end $$;
create trigger membros_auditoria after insert or update or delete on public.membros
  for each row execute function privado.auditar_membros();

create or replace function privado.auditar_fazendas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.auditoria (fazenda_id, tabela, registro_id, operacao, usuario, antes, depois)
  values (new.id, 'fazendas', new.id::text, lower(tg_op), auth.uid(), case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end $$;
create trigger fazendas_auditoria after insert or update on public.fazendas
  for each row execute function privado.auditar_fazendas();

revoke all on all functions in schema privado from public, anon, authenticated;
grant execute on function privado.papel(uuid), privado.aal_ok(uuid), privado.pode_ler(uuid), privado.pode_editar(uuid), privado.e_admin(uuid) to authenticated;

-- ------------------------------------------------- funções RPC (API pública)
create or replace function public.minhas_fazendas()
returns table (id uuid, nome text, papel text, exigir_mfa boolean)
language sql stable security definer set search_path = '' as $$
  select f.id, f.nome, m.papel, f.exigir_mfa
  from public.membros m join public.fazendas f on f.id = m.fazenda_id
  where m.user_id = (select auth.uid())
  order by f.nome
$$;

create or replace function public.criar_fazenda(p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo uuid;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2'
     and exists (select 1 from auth.mfa_factors where user_id = uid and status = 'verified') then
    raise exception 'Confirme o segundo fator de autenticação';
  end if;
  if (select count(*) from public.membros where user_id = uid and papel = 'admin') >= 10 then
    raise exception 'Limite de fazendas por usuário atingido';
  end if;
  insert into public.fazendas (nome, criado_por) values (btrim(p_nome), uid) returning id into novo;
  insert into public.membros (fazenda_id, user_id, papel) values (novo, uid, 'admin');
  return novo;
end $$;

create or replace function public.aceitar_convites()
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_email text; n integer := 0;
begin
  if uid is null then return 0; end if;
  select lower(u.email) into v_email from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  insert into public.membros (fazenda_id, user_id, papel)
    select c.fazenda_id, uid, c.papel from public.convites c
    where c.email = v_email and c.expira_em > now()
  on conflict (fazenda_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from public.convites where email = v_email;
  return n;
end $$;

create or replace function public.adicionar_membro(p_fazenda uuid, p_email text, p_papel text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_user uuid;
begin
  if not privado.e_admin(p_fazenda) then raise exception 'Apenas administradores podem adicionar usuários'; end if;
  if p_papel not in ('admin', 'editor', 'leitor') then raise exception 'Papel inválido'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  select u.id into v_user from auth.users u where lower(u.email) = v_email and u.email_confirmed_at is not null;
  if v_user is not null then
    insert into public.membros (fazenda_id, user_id, papel) values (p_fazenda, v_user, p_papel)
      on conflict (fazenda_id, user_id) do update set papel = excluded.papel;
    return 'membro';
  end if;
  insert into public.convites (fazenda_id, email, papel, criado_por) values (p_fazenda, v_email, p_papel, auth.uid())
    on conflict (fazenda_id, email) do update set papel = excluded.papel, criado_por = excluded.criado_por, expira_em = now() + interval '14 days';
  return 'convite';
end $$;

create or replace function public.alterar_papel(p_fazenda uuid, p_user uuid, p_papel text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.e_admin(p_fazenda) then raise exception 'Apenas administradores podem alterar papéis'; end if;
  if p_papel not in ('admin', 'editor', 'leitor') then raise exception 'Papel inválido'; end if;
  if p_papel <> 'admin' and (select papel from public.membros where fazenda_id = p_fazenda and user_id = p_user) = 'admin'
     and (select count(*) from public.membros where fazenda_id = p_fazenda and papel = 'admin') <= 1 then
    raise exception 'A fazenda precisa de pelo menos um administrador';
  end if;
  update public.membros set papel = p_papel where fazenda_id = p_fazenda and user_id = p_user;
end $$;

create or replace function public.remover_membro(p_fazenda uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (privado.e_admin(p_fazenda) or p_user = auth.uid()) then raise exception 'Sem permissão'; end if;
  if (select papel from public.membros where fazenda_id = p_fazenda and user_id = p_user) = 'admin'
     and (select count(*) from public.membros where fazenda_id = p_fazenda and papel = 'admin') <= 1 then
    raise exception 'A fazenda precisa de pelo menos um administrador';
  end if;
  delete from public.membros where fazenda_id = p_fazenda and user_id = p_user;
end $$;

create or replace function public.cancelar_convite(p_fazenda uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.e_admin(p_fazenda) then raise exception 'Sem permissão'; end if;
  delete from public.convites where fazenda_id = p_fazenda and email = lower(btrim(p_email));
end $$;

create or replace function public.listar_membros(p_fazenda uuid)
returns table (user_id uuid, email text, papel text, desde timestamptz, ultimo_acesso timestamptz, mfa boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.pode_ler(p_fazenda) then raise exception 'Sem permissão'; end if;
  return query
    select m.user_id,
           case when privado.e_admin(p_fazenda) or m.user_id = auth.uid() then u.email::text else null end,
           m.papel, m.criado_em,
           case when privado.e_admin(p_fazenda) then u.last_sign_in_at else null end,
           exists (select 1 from auth.mfa_factors mf where mf.user_id = m.user_id and mf.status = 'verified')
    from public.membros m join auth.users u on u.id = m.user_id
    where m.fazenda_id = p_fazenda
    order by m.papel, u.email;
end $$;

-- versão e contagem para sincronização incremental (sem Realtime)
create or replace function public.estado_fazenda(p_fazenda uuid)
returns table (versao timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.pode_ler(p_fazenda) then raise exception 'Sem permissão'; end if;
  return query select max(r.atualizado_em), count(*) from public.registros r where r.fazenda_id = p_fazenda;
end $$;

revoke all on function public.minhas_fazendas(), public.criar_fazenda(text), public.aceitar_convites(),
  public.adicionar_membro(uuid, text, text), public.alterar_papel(uuid, uuid, text), public.remover_membro(uuid, uuid),
  public.cancelar_convite(uuid, text), public.listar_membros(uuid), public.estado_fazenda(uuid) from public, anon;
grant execute on function public.minhas_fazendas(), public.criar_fazenda(text), public.aceitar_convites(),
  public.adicionar_membro(uuid, text, text), public.alterar_papel(uuid, uuid, text), public.remover_membro(uuid, uuid),
  public.cancelar_convite(uuid, text), public.listar_membros(uuid), public.estado_fazenda(uuid) to authenticated;

-- objetos futuros no esquema public não ficam abertos ao anon por padrão
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;
