-- Ao excluir uma fazenda, os registros são apagados em cascata; a auditoria da própria
-- fazenda também é apagada, então não há onde registrar esses eventos.
create or replace function privado.auditar_registros()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.fazendas where id = old.fazenda_id) then return old; end if;
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
revoke all on function privado.auditar_registros() from public, anon, authenticated;
