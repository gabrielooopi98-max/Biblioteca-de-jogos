-- =============================================================================
-- Universal Games: catálogo, reservas com retirada na loja, painel administrativo e histórico.
-- Rode uma vez no SQL Editor do Supabase (ou `supabase db push`). Não apaga dados existentes:
-- pode rodar de novo sem perder nada (tudo usa "if not exists" / "create or replace").
--
-- Segurança: toda permissão é checada AQUI no banco (Row Level Security + funções), não só na tela.
--   - Visitante: lê produtos ativos e cria reservas pela função criar_reserva (preço calculado no banco).
--   - Administrador: quem está na tabela administradores (o primeiro é cadastrado pelo SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Administradores e checagem de permissão
-- -----------------------------------------------------------------------------
create table if not exists public.administradores (
    user_id uuid primary key references auth.users (id) on delete cascade,
    criado_em timestamptz not null default now()
);
alter table public.administradores enable row level security;
drop policy if exists "administradores: vê o próprio registro" on public.administradores;
create policy "administradores: vê o próprio registro" on public.administradores for select using (user_id = auth.uid());
-- sem política de insert/update/delete: ninguém vira admin pela API, só pelo SQL Editor

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 2) Categorias (departamentos da loja; "jogos" é a categoria de todos os jogos)
-- -----------------------------------------------------------------------------
create table if not exists public.categorias (
    id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
    nome text not null check (char_length(btrim(nome)) between 2 and 60),
    descricao text check (descricao is null or char_length(descricao) <= 200),
    tipo text not null default 'produto' check (tipo in ('jogo', 'produto')),
    ordem integer not null default 0,
    ativa boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3) Produtos (jogos e acessórios na mesma tabela; ids antigos preservados)
-- -----------------------------------------------------------------------------
create sequence if not exists public.produtos_id_seq start with 10000;

create table if not exists public.produtos (
    id bigint primary key default nextval('public.produtos_id_seq'),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    tipo text not null check (tipo in ('jogo', 'acessorio')),
    categoria_id text references public.categorias (id) on update cascade on delete set null,
    nome text not null check (char_length(btrim(nome)) between 2 and 160),
    descricao_curta text check (descricao_curta is null or char_length(descricao_curta) <= 300),
    descricao text check (descricao is null or char_length(descricao) <= 5000),
    status text not null default 'rascunho' check (status in ('ativo', 'inativo', 'rascunho', 'arquivado')),

    -- preço: o original nunca é sobrescrito pela promoção
    preco numeric(10, 2) not null check (preco >= 0),
    preco_promocional numeric(10, 2) check (preco_promocional is null or preco_promocional >= 0),
    promocao_ativa boolean not null default false,
    promocao_inicio timestamptz,
    promocao_fim timestamptz,

    -- imagens: URL (Supabase Storage ou externa) ou, nos acessórios antigos, o nome da ilustração
    imagem_principal text check (imagem_principal is null or char_length(imagem_principal) <= 600),
    imagem_capa text check (imagem_capa is null or char_length(imagem_capa) <= 600),
    galeria text[] not null default '{}',

    -- jogos
    app_id bigint,
    plataformas text[] not null default '{}',
    generos text[] not null default '{}',
    desenvolvedora text,
    lancamento integer check (lancamento is null or lancamento between 1970 and 2100),
    formato text check (formato is null or formato in ('midia_fisica', 'digital', 'outro')),
    requisitos text,
    nota numeric(3, 1) check (nota is null or nota between 0 and 10),
    trailer jsonb,
    capturas text[] not null default '{}',
    fundo text,
    imagens jsonb,
    destaque boolean not null default false,

    -- acessórios / produtos físicos
    marca text,
    modelo text,
    compatibilidade text[] not null default '{}',
    especificacoes text[] not null default '{}',
    avaliacoes integer check (avaliacoes is null or avaliacoes >= 0),
    variacoes text[] not null default '{}',
    controla_estoque boolean not null default false,
    estoque integer check (estoque is null or estoque >= 0),
    estoque_minimo integer not null default 3 check (estoque_minimo >= 0),

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),

    constraint promocao_abaixo_do_preco check (preco_promocional is null or preco_promocional < preco),
    constraint promocao_com_preco check (not promocao_ativa or preco_promocional is not null),
    constraint promocao_periodo check (promocao_inicio is null or promocao_fim is null or promocao_fim > promocao_inicio),
    constraint estoque_quando_controla check (not controla_estoque or estoque is not null)
);
create index if not exists produtos_tipo_status on public.produtos (tipo, status);
create index if not exists produtos_categoria on public.produtos (categoria_id);

-- promoção vale agora? (horário do servidor, o mesmo para a loja e para o checkout)
create or replace function public.promocao_vigente(p public.produtos) returns boolean
language sql stable as $$
    select p.promocao_ativa and p.preco_promocional is not null
       and (p.promocao_inicio is null or p.promocao_inicio <= now())
       and (p.promocao_fim is null or p.promocao_fim > now());
$$;

create or replace function public.preco_atual(p public.produtos) returns numeric
language sql stable as $$
    select case when public.promocao_vigente(p) then p.preco_promocional else p.preco end;
$$;

-- vitrine pública: só produtos ativos de categorias ativas, com o preço do momento calculado no banco.
-- "exists" (e não left join): o visitante nem enxerga categoria inativa, então um join a trataria como "sem categoria".
create or replace view public.vitrine with (security_invoker = true) as
select p.*,
       public.promocao_vigente(p) as em_promocao,
       public.preco_atual(p) as preco_atual,
       (p.controla_estoque and coalesce(p.estoque, 0) = 0) as esgotado
from public.produtos p
where p.status = 'ativo'
  and (p.categoria_id is null or exists (select 1 from public.categorias c where c.id = p.categoria_id and c.ativa));

-- -----------------------------------------------------------------------------
-- 4) Cupons (validados no banco na hora da reserva)
-- -----------------------------------------------------------------------------
create table if not exists public.cupons (
    codigo text primary key check (codigo ~ '^[A-Z0-9]{3,20}$'),
    percentual integer not null check (percentual between 1 and 90),
    descricao text,
    ativo boolean not null default true
);

-- -----------------------------------------------------------------------------
-- 5) Reservas (retirada na loja) e itens
-- -----------------------------------------------------------------------------
create table if not exists public.reservas (
    numero text primary key,
    codigo_retirada text not null,
    cliente_nome text not null,
    cliente_email text not null,
    cliente_telefone text,
    metodo text not null check (metodo in ('pix', 'cartao', 'boleto', 'loja')),
    status text not null default 'aguardando' check (status in ('aguardando', 'confirmado', 'retirado', 'cancelado')),
    pagamento text not null default 'pendente' check (pagamento in ('pendente', 'confirmado', 'no_balcao', 'devolvido')),
    cupom text,
    subtotal numeric(10, 2) not null,
    descontos numeric(10, 2) not null default 0,
    valor_cupom numeric(10, 2) not null default 0,
    valor_pix numeric(10, 2) not null default 0,
    total numeric(10, 2) not null check (total >= 0),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    confirmado_em timestamptz,
    retirado_em timestamptz,
    cancelado_em timestamptz
);
create index if not exists reservas_status on public.reservas (status, criado_em desc);

create table if not exists public.reserva_itens (
    id bigint generated always as identity primary key,
    reserva_numero text not null references public.reservas (numero) on delete cascade,
    produto_id bigint references public.produtos (id) on delete restrict,
    nome text not null,
    tipo text not null,
    preco_unitario numeric(10, 2) not null,
    quantidade integer not null default 1 check (quantidade > 0)
);
create index if not exists reserva_itens_reserva on public.reserva_itens (reserva_numero);

-- -----------------------------------------------------------------------------
-- 6) Estoque: movimentações e histórico de ações administrativas
-- -----------------------------------------------------------------------------
create table if not exists public.estoque_movimentos (
    id bigint generated always as identity primary key,
    produto_id bigint not null references public.produtos (id) on delete cascade,
    delta integer not null,
    saldo integer not null,
    motivo text,
    usuario_id uuid,
    criado_em timestamptz not null default now()
);
create index if not exists estoque_movimentos_produto on public.estoque_movimentos (produto_id, criado_em desc);

create table if not exists public.auditoria (
    id bigint generated always as identity primary key,
    usuario_id uuid,
    usuario_email text,
    acao text not null,
    entidade text not null,
    entidade_id text,
    detalhes jsonb,
    criado_em timestamptz not null default now()
);
create index if not exists auditoria_criado on public.auditoria (criado_em desc);

-- quem está agindo (sem tokens nem senhas: só id e e-mail)
create or replace function public.registrar_acao(p_acao text, p_entidade text, p_entidade_id text, p_detalhes jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
    insert into public.auditoria (usuario_id, usuario_email, acao, entidade, entidade_id, detalhes)
    values (auth.uid(), nullif(auth.jwt() ->> 'email', ''), p_acao, p_entidade, p_entidade_id, p_detalhes);
end;
$$;
revoke all on function public.registrar_acao(text, text, text, jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7) Gatilhos: data de atualização, histórico e movimentação de estoque
-- -----------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em() returns trigger language plpgsql as $$
begin
    new.atualizado_em := now();
    return new;
end;
$$;

drop trigger if exists categorias_atualizado on public.categorias;
create trigger categorias_atualizado before update on public.categorias for each row execute function public.tocar_atualizado_em();
drop trigger if exists produtos_atualizado on public.produtos;
create trigger produtos_atualizado before update on public.produtos for each row execute function public.tocar_atualizado_em();
drop trigger if exists reservas_atualizado on public.reservas;
create trigger reservas_atualizado before update on public.reservas for each row execute function public.tocar_atualizado_em();

create or replace function public.auditar_produto() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    id_texto text := coalesce(new.id, old.id)::text;
    editados text[];
begin
    if tg_op = 'INSERT' then
        perform public.registrar_acao('produto_criado', 'produto', id_texto, jsonb_build_object('nome', new.nome, 'tipo', new.tipo, 'preco', new.preco, 'status', new.status));
        if new.controla_estoque and coalesce(new.estoque, 0) > 0 then
            insert into public.estoque_movimentos (produto_id, delta, saldo, motivo, usuario_id) values (new.id, new.estoque, new.estoque, 'estoque inicial', auth.uid());
        end if;
        return new;
    elsif tg_op = 'DELETE' then
        perform public.registrar_acao('produto_removido', 'produto', id_texto, jsonb_build_object('nome', old.nome));
        return old;
    end if;

    if new.preco is distinct from old.preco then
        perform public.registrar_acao('preco_alterado', 'produto', id_texto, jsonb_build_object('nome', new.nome, 'de', old.preco, 'para', new.preco));
    end if;
    if (new.promocao_ativa, new.preco_promocional, new.promocao_inicio, new.promocao_fim) is distinct from (old.promocao_ativa, old.preco_promocional, old.promocao_inicio, old.promocao_fim) then
        perform public.registrar_acao(
            case when not new.promocao_ativa and old.promocao_ativa then 'promocao_encerrada' when new.promocao_ativa and not old.promocao_ativa then 'promocao_criada' else 'promocao_alterada' end,
            'produto', id_texto,
            jsonb_build_object('nome', new.nome, 'preco', new.preco, 'preco_promocional', new.preco_promocional, 'inicio', new.promocao_inicio, 'fim', new.promocao_fim));
    end if;
    if (new.imagem_principal, new.imagem_capa, new.galeria) is distinct from (old.imagem_principal, old.imagem_capa, old.galeria) then
        perform public.registrar_acao('imagem_alterada', 'produto', id_texto, jsonb_build_object('nome', new.nome));
    end if;
    if (new.estoque, new.controla_estoque) is distinct from (old.estoque, old.controla_estoque) then
        perform public.registrar_acao('estoque_alterado', 'produto', id_texto, jsonb_build_object('nome', new.nome, 'de', old.estoque, 'para', new.estoque));
        if new.controla_estoque then
            insert into public.estoque_movimentos (produto_id, delta, saldo, motivo, usuario_id)
            values (new.id, coalesce(new.estoque, 0) - coalesce(old.estoque, 0), coalesce(new.estoque, 0), coalesce(nullif(current_setting('ug.motivo_estoque', true), ''), 'ajuste manual'), auth.uid());
        end if;
    end if;
    if new.status is distinct from old.status then
        perform public.registrar_acao(case when new.status = 'arquivado' then 'produto_arquivado' else 'status_alterado' end, 'produto', id_texto, jsonb_build_object('nome', new.nome, 'de', old.status, 'para', new.status));
    end if;
    select array_agg(campo) into editados from unnest(array[
        case when new.nome is distinct from old.nome then 'nome' end,
        case when (new.descricao, new.descricao_curta) is distinct from (old.descricao, old.descricao_curta) then 'descrição' end,
        case when new.categoria_id is distinct from old.categoria_id then 'categoria' end,
        case when (new.plataformas, new.generos, new.desenvolvedora, new.lancamento, new.formato, new.requisitos) is distinct from (old.plataformas, old.generos, old.desenvolvedora, old.lancamento, old.formato, old.requisitos) then 'dados do jogo' end,
        case when (new.marca, new.modelo, new.compatibilidade, new.especificacoes, new.variacoes) is distinct from (old.marca, old.modelo, old.compatibilidade, old.especificacoes, old.variacoes) then 'dados do produto' end,
        case when new.slug is distinct from old.slug then 'endereço' end
    ]) as campo where campo is not null;
    if editados is not null then
        perform public.registrar_acao('produto_editado', 'produto', id_texto, jsonb_build_object('nome', new.nome, 'campos', to_jsonb(editados)));
    end if;
    return new;
end;
$$;
drop trigger if exists produtos_auditoria on public.produtos;
create trigger produtos_auditoria after insert or update or delete on public.produtos for each row execute function public.auditar_produto();

create or replace function public.auditar_categoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    perform public.registrar_acao(
        case tg_op when 'INSERT' then 'categoria_criada' when 'DELETE' then 'categoria_removida' else 'categoria_editada' end,
        'categoria', coalesce(new.id, old.id), jsonb_build_object('nome', coalesce(new.nome, old.nome)));
    return coalesce(new, old);
end;
$$;
drop trigger if exists categorias_auditoria on public.categorias;
create trigger categorias_auditoria after insert or update or delete on public.categorias for each row execute function public.auditar_categoria();

-- -----------------------------------------------------------------------------
-- 8) Funções da loja (visitante): criar, consultar e cancelar reserva
-- -----------------------------------------------------------------------------
create or replace function public.codigo_aleatorio(tamanho integer) returns text
language plpgsql volatile as $$
declare
    letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    saida text := '';
begin
    for i in 1..tamanho loop
        saida := saida || substr(letras, 1 + (get_byte(uuid_send(gen_random_uuid()), 0) % 32), 1);
    end loop;
    return saida;
end;
$$;

-- Cria a reserva com preço, cupom, desconto Pix e estoque validados no banco.
-- p_cliente: {"nome": "...", "email": "...", "telefone": "(11) 98765-4321"}
create or replace function public.criar_reserva(p_itens bigint[], p_metodo text, p_cupom text, p_cliente jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_nome text := btrim(coalesce(p_cliente ->> 'nome', ''));
    v_email text := lower(btrim(coalesce(p_cliente ->> 'email', '')));
    v_telefone text := nullif(btrim(coalesce(p_cliente ->> 'telefone', '')), '');
    v_ids bigint[];
    v_prod public.produtos;
    v_subtotal numeric := 0;
    v_com_desconto numeric := 0;
    v_percentual integer;
    v_valor_cupom numeric := 0;
    v_valor_pix numeric := 0;
    v_total numeric;
    v_numero text;
    v_itens jsonb := '[]'::jsonb;
begin
    if p_metodo is null or p_metodo not in ('pix', 'cartao', 'boleto', 'loja') then raise exception 'Forma de pagamento inválida.' using errcode = '22023'; end if;
    if char_length(v_nome) < 3 or char_length(v_nome) > 120 then raise exception 'Informe o nome completo.' using errcode = '22023'; end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 160 then raise exception 'E-mail inválido.' using errcode = '22023'; end if;
    if v_telefone is not null and regexp_replace(v_telefone, '\D', '', 'g') !~ '^\d{10,11}$' then raise exception 'Celular inválido.' using errcode = '22023'; end if;

    select array_agg(distinct x) into v_ids from unnest(p_itens) x;
    if v_ids is null or cardinality(v_ids) = 0 then raise exception 'O carrinho está vazio.' using errcode = '22023'; end if;
    if cardinality(v_ids) > 30 then raise exception 'No máximo 30 itens por reserva.' using errcode = '22023'; end if;

    loop
        v_numero := 'UG-' || public.codigo_aleatorio(8);
        exit when not exists (select 1 from public.reservas where numero = v_numero);
    end loop;

    insert into public.reservas (numero, codigo_retirada, cliente_nome, cliente_email, cliente_telefone, metodo, subtotal, total)
    values (v_numero, public.codigo_aleatorio(6), v_nome, v_email, v_telefone, p_metodo, 0, 0);

    for v_prod in
        select p.* from public.produtos p left join public.categorias c on c.id = p.categoria_id
        where p.id = any (v_ids) and p.status = 'ativo' and (c.id is null or c.ativa)
        order by p.id for update of p
    loop
        if v_prod.controla_estoque then
            if coalesce(v_prod.estoque, 0) < 1 then raise exception '"%" está esgotado.', v_prod.nome using errcode = 'P0001'; end if;
            perform set_config('ug.motivo_estoque', 'reserva ' || v_numero, true);
            update public.produtos set estoque = estoque - 1 where id = v_prod.id;
        end if;
        insert into public.reserva_itens (reserva_numero, produto_id, nome, tipo, preco_unitario)
        values (v_numero, v_prod.id, v_prod.nome, v_prod.tipo, public.preco_atual(v_prod));
        v_subtotal := v_subtotal + v_prod.preco;
        v_com_desconto := v_com_desconto + public.preco_atual(v_prod);
        v_itens := v_itens || jsonb_build_object('id', v_prod.id, 'nome', v_prod.nome, 'tipo', v_prod.tipo, 'pago', public.preco_atual(v_prod));
    end loop;
    perform set_config('ug.motivo_estoque', '', true);

    if jsonb_array_length(v_itens) <> cardinality(v_ids) then
        raise exception 'Algum item do carrinho não está mais disponível. Atualize a página.' using errcode = 'P0001';
    end if;

    if nullif(btrim(p_cupom), '') is not null then
        select percentual into v_percentual from public.cupons where codigo = upper(btrim(p_cupom)) and ativo;
        if v_percentual is null then raise exception 'Cupom inválido ou expirado.' using errcode = '22023'; end if;
        v_valor_cupom := round(v_com_desconto * v_percentual) / 100;
    end if;
    if p_metodo = 'pix' then v_valor_pix := round((v_com_desconto - v_valor_cupom) * 5) / 100; end if;
    v_total := v_com_desconto - v_valor_cupom - v_valor_pix;

    update public.reservas
       set subtotal = v_subtotal, descontos = v_subtotal - v_com_desconto, valor_cupom = v_valor_cupom, valor_pix = v_valor_pix,
           total = v_total, cupom = case when v_percentual is not null then upper(btrim(p_cupom)) end,
           pagamento = case when p_metodo = 'loja' then 'no_balcao' else 'pendente' end
     where numero = v_numero;

    return (select jsonb_build_object(
        'numero', r.numero, 'codigo', r.codigo_retirada, 'data', r.criado_em, 'metodo', r.metodo, 'status', r.status, 'pagamento', r.pagamento,
        'cupom', r.cupom, 'itens', v_itens,
        'resumo', jsonb_build_object('subtotal', r.subtotal, 'descontos', r.descontos, 'valorCupom', r.valor_cupom, 'valorPix', r.valor_pix, 'total', r.total))
        from public.reservas r where r.numero = v_numero);
end;
$$;

-- Situação das reservas do próprio cliente: só quem tem número + código de retirada consegue ver.
-- p_reservas: [{"numero": "UG-...", "codigo": "ABC123"}, ...]
create or replace function public.consultar_reservas(p_reservas jsonb)
returns table (numero text, status text, pagamento text, confirmado_em timestamptz, retirado_em timestamptz, cancelado_em timestamptz)
language sql stable security definer set search_path = public as $$
    select r.numero, r.status, r.pagamento, r.confirmado_em, r.retirado_em, r.cancelado_em
    from public.reservas r
    join jsonb_to_recordset(coalesce(p_reservas, '[]'::jsonb)) as q(numero text, codigo text)
      on q.numero = r.numero and q.codigo = r.codigo_retirada
    limit 100;
$$;

-- devolve ao estoque os itens de uma reserva cancelada
create or replace function public.devolver_estoque(p_numero text) returns void
language plpgsql security definer set search_path = public as $$
begin
    perform set_config('ug.motivo_estoque', 'cancelamento ' || p_numero, true);
    update public.produtos p set estoque = p.estoque + i.qtd
      from (select produto_id, sum(quantidade) as qtd from public.reserva_itens where reserva_numero = p_numero group by produto_id) i
     where p.id = i.produto_id and p.controla_estoque;
    perform set_config('ug.motivo_estoque', '', true);
end;
$$;
revoke all on function public.devolver_estoque(text) from public, anon, authenticated;

create or replace function public.cancelar_reserva(p_numero text, p_codigo text) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
    select status into v_status from public.reservas where numero = p_numero and codigo_retirada = p_codigo for update;
    if v_status is null then raise exception 'Reserva não encontrada.' using errcode = 'P0002'; end if;
    if v_status not in ('aguardando', 'confirmado') then raise exception 'Esta reserva não pode mais ser cancelada.' using errcode = 'P0001'; end if;
    update public.reservas set status = 'cancelado', cancelado_em = now(),
           pagamento = case when pagamento = 'confirmado' then 'devolvido' else pagamento end
     where numero = p_numero;
    perform public.devolver_estoque(p_numero);
    perform public.registrar_acao('reserva_cancelada_pelo_cliente', 'reserva', p_numero, null);
    return 'cancelado';
end;
$$;

-- -----------------------------------------------------------------------------
-- 9) Funções do painel (checam eh_admin() aqui dentro)
-- -----------------------------------------------------------------------------
-- avança a reserva: confirmar (pagamento conferido ou itens separados), retirar ou cancelar
create or replace function public.admin_atualizar_reserva(p_numero text, p_acao text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.reservas;
begin
    if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.' using errcode = '42501'; end if;
    select * into r from public.reservas where numero = p_numero for update;
    if r.numero is null then raise exception 'Reserva não encontrada.' using errcode = 'P0002'; end if;

    if p_acao = 'confirmar' and r.status = 'aguardando' then
        update public.reservas set status = 'confirmado', confirmado_em = now(),
               pagamento = case when r.metodo = 'loja' then 'no_balcao' else 'confirmado' end
         where numero = p_numero;
        perform public.registrar_acao(case when r.metodo = 'loja' then 'reserva_separada' else 'pagamento_confirmado' end, 'reserva', p_numero, jsonb_build_object('total', r.total));
    elsif p_acao = 'retirar' and r.status = 'confirmado' then
        update public.reservas set status = 'retirado', retirado_em = now(), pagamento = 'confirmado' where numero = p_numero;
        perform public.registrar_acao('reserva_retirada', 'reserva', p_numero, jsonb_build_object('total', r.total));
    elsif p_acao = 'cancelar' and r.status in ('aguardando', 'confirmado') then
        update public.reservas set status = 'cancelado', cancelado_em = now(),
               pagamento = case when r.pagamento = 'confirmado' then 'devolvido' else r.pagamento end
         where numero = p_numero;
        perform public.devolver_estoque(p_numero);
        perform public.registrar_acao('reserva_cancelada', 'reserva', p_numero, jsonb_build_object('total', r.total));
    else
        raise exception 'Não dá para "%" uma reserva com situação "%".', p_acao, r.status using errcode = 'P0001';
    end if;
    return (select status from public.reservas where numero = p_numero);
end;
$$;

-- ajuste de estoque com motivo (entrada de mercadoria, contagem, avaria...): fica nas movimentações
create or replace function public.admin_ajustar_estoque(p_produto bigint, p_saldo integer, p_motivo text) returns integer
language plpgsql security definer set search_path = public as $$
begin
    if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.' using errcode = '42501'; end if;
    if p_saldo is null or p_saldo < 0 or p_saldo > 100000 then raise exception 'Quantidade inválida.' using errcode = '22023'; end if;
    perform set_config('ug.motivo_estoque', left(coalesce(nullif(btrim(p_motivo), ''), 'ajuste manual'), 120), true);
    update public.produtos set controla_estoque = true, estoque = p_saldo where id = p_produto;
    if not found then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
    perform set_config('ug.motivo_estoque', '', true);
    return p_saldo;
end;
$$;

-- uma imagem ainda é usada por outro produto? (antes de apagar o arquivo antigo)
create or replace function public.imagem_em_uso(p_url text, p_ignorar_produto bigint default null) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
    if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.' using errcode = '42501'; end if;
    return exists (
        select 1 from public.produtos
        where (p_ignorar_produto is null or id <> p_ignorar_produto)
          and (imagem_principal = p_url or imagem_capa = p_url or p_url = any (galeria))
    );
end;
$$;

-- permissões de execução: visitante só nas funções da loja
revoke all on function public.criar_reserva(bigint[], text, text, jsonb) from public;
revoke all on function public.consultar_reservas(jsonb) from public;
revoke all on function public.cancelar_reserva(text, text) from public;
revoke all on function public.admin_atualizar_reserva(text, text) from public;
revoke all on function public.imagem_em_uso(text, bigint) from public;
revoke all on function public.admin_ajustar_estoque(bigint, integer, text) from public;
grant execute on function public.criar_reserva(bigint[], text, text, jsonb) to anon, authenticated;
grant execute on function public.consultar_reservas(jsonb) to anon, authenticated;
grant execute on function public.cancelar_reserva(text, text) to anon, authenticated;
grant execute on function public.admin_atualizar_reserva(text, text) to authenticated;
grant execute on function public.imagem_em_uso(text, bigint) to authenticated;
grant execute on function public.admin_ajustar_estoque(bigint, integer, text) to authenticated;
grant execute on function public.eh_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10) Row Level Security (quem lê e quem escreve cada tabela)
-- -----------------------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.cupons enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_itens enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.auditoria enable row level security;

drop policy if exists "categorias: leitura pública das ativas" on public.categorias;
create policy "categorias: leitura pública das ativas" on public.categorias for select using (ativa or public.eh_admin());
drop policy if exists "categorias: admin escreve" on public.categorias;
create policy "categorias: admin escreve" on public.categorias for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "produtos: leitura pública dos ativos" on public.produtos;
create policy "produtos: leitura pública dos ativos" on public.produtos for select using (status = 'ativo' or public.eh_admin());
drop policy if exists "produtos: admin escreve" on public.produtos;
create policy "produtos: admin escreve" on public.produtos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "cupons: admin" on public.cupons;
create policy "cupons: admin" on public.cupons for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- reservas: o cliente só usa as funções acima; o admin lê tudo (alterações pela função admin_atualizar_reserva)
drop policy if exists "reservas: admin lê" on public.reservas;
create policy "reservas: admin lê" on public.reservas for select to authenticated using (public.eh_admin());
drop policy if exists "reserva_itens: admin lê" on public.reserva_itens;
create policy "reserva_itens: admin lê" on public.reserva_itens for select to authenticated using (public.eh_admin());
drop policy if exists "estoque: admin lê" on public.estoque_movimentos;
create policy "estoque: admin lê" on public.estoque_movimentos for select to authenticated using (public.eh_admin());
drop policy if exists "auditoria: admin lê" on public.auditoria;
create policy "auditoria: admin lê" on public.auditoria for select to authenticated using (public.eh_admin());

grant select on public.vitrine to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 11) Imagens dos produtos (Supabase Storage): leitura pública, envio só do admin
--     JPEG, PNG ou WebP de até 5 MB (limite aplicado pelo próprio Storage)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagens: leitura pública" on storage.objects;
create policy "imagens: leitura pública" on storage.objects for select using (bucket_id = 'produtos');
drop policy if exists "imagens: admin envia" on storage.objects;
create policy "imagens: admin envia" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.eh_admin());
drop policy if exists "imagens: admin altera" on storage.objects;
create policy "imagens: admin altera" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.eh_admin());
drop policy if exists "imagens: admin apaga" on storage.objects;
create policy "imagens: admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.eh_admin());
