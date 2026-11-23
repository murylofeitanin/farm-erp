-- Somente o primeiro usuário (implantação) ou administradores existentes podem criar fazendas.
-- O bloqueio consultivo serializa a criação para evitar corrida entre dois "primeiros" usuários.
create or replace function public.criar_fazenda(p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); novo uuid;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2'
     and exists (select 1 from auth.mfa_factors where user_id = uid and status = 'verified') then
    raise exception 'Confirme o segundo fator de autenticação';
  end if;
  perform pg_advisory_xact_lock(hashtext('farm_erp_criar_fazenda'));
  if exists (select 1 from public.fazendas)
     and not exists (select 1 from public.membros where user_id = uid and papel = 'admin') then
    raise exception 'Apenas administradores de uma fazenda podem criar novas fazendas';
  end if;
  if (select count(*) from public.membros where user_id = uid and papel = 'admin') >= 10 then
    raise exception 'Limite de fazendas por usuário atingido';
  end if;
  insert into public.fazendas (nome, criado_por) values (btrim(p_nome), uid) returning id into novo;
  insert into public.membros (fazenda_id, user_id, papel) values (novo, uid, 'admin');
  return novo;
end $$;
revoke all on function public.criar_fazenda(text) from public, anon;
grant execute on function public.criar_fazenda(text) to authenticated;
