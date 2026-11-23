-- gatilho de eventos do Supabase que ativa RLS em tabelas novas: não deve ser chamável pela API
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
