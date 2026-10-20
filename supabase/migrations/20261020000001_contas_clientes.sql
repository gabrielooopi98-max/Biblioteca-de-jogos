-- =============================================================================
-- Universal Games: contas de clientes da loja
-- Rode depois de 20261019000001_painel_admin.sql. Pode ser rodado de novo sem apagar nada.
--
-- Segurança:
--  * Cliente logado NÃO ganha nenhum acesso de administrador: todas as regras do painel
--    continuam exigindo public.eh_admin(), que confere a tabela administradores.
--  * Nome e telefone ficam nos metadados da própria conta (Supabase Auth); nunca são usados
--    para decidir permissão.
--  * A reserva é ligada à conta pelo banco (auth.uid() do token), não por um campo enviado pelo site.
-- =============================================================================

alter table public.reservas add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists reservas_usuario on public.reservas (user_id, criado_em desc);

-- toda reserva criada por um cliente logado fica ligada à conta dele (o site não escolhe o dono)
create or replace function public.reserva_do_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    new.user_id := auth.uid();
    return new;
end;
$$;
revoke all on function public.reserva_do_usuario() from public, anon, authenticated;

drop trigger if exists reserva_do_usuario on public.reservas;
create trigger reserva_do_usuario before insert on public.reservas
    for each row execute function public.reserva_do_usuario();

-- reservas da conta logada (com itens e código de retirada); sem login devolve lista vazia
create or replace function public.minhas_reservas() returns jsonb
language sql stable security definer set search_path = public as $$
    select coalesce(jsonb_agg(jsonb_build_object(
        'numero', r.numero,
        'codigo', r.codigo_retirada,
        'status', r.status,
        'pagamento', r.pagamento,
        'metodo', r.metodo,
        'total', r.total,
        'criado_em', r.criado_em,
        'confirmado_em', r.confirmado_em,
        'retirado_em', r.retirado_em,
        'cancelado_em', r.cancelado_em,
        'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', i.produto_id, 'nome', i.nome, 'preco', i.preco_unitario, 'quantidade', i.quantidade) order by i.id), '[]'::jsonb)
                  from public.reserva_itens i where i.reserva_numero = r.numero)
    ) order by r.criado_em desc), '[]'::jsonb)
    from public.reservas r
    where auth.uid() is not null and r.user_id = auth.uid();
$$;
revoke all on function public.minhas_reservas() from public, anon;
grant execute on function public.minhas_reservas() to authenticated;
