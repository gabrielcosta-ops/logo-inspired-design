
-- ROLES
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

create trigger on_auth_user_created_first_admin
after insert on auth.users for each row execute function public.handle_first_admin();

-- ENUMS
create type public.player_position as enum ('goleiro','zagueiro','meia','atacante');
create type public.event_type as enum ('goal','own_goal','yellow','red');

-- LEVELS
create table public.levels (
  id uuid primary key default gen_random_uuid(),
  rank int not null unique,
  name text not null,
  min_goals int not null default 0,
  min_assists int not null default 0,
  created_at timestamptz not null default now()
);

-- SETTINGS
create table public.settings (
  id int primary key default 1 check (id = 1),
  goal_points int not null default 3,
  assist_points int not null default 2,
  updated_at timestamptz not null default now()
);

-- SEASONS
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_current boolean not null default true
);
create unique index seasons_one_current on public.seasons (is_current) where is_current;

-- PLAYERS
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text not null,
  photo_url text,
  position public.player_position not null default 'meia',
  shirt_number int,
  level_rank int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  played_at date not null default current_date,
  team_a_name text not null default 'Amarelo',
  team_b_name text not null default 'Verde',
  status text not null default 'live' check (status in ('live','finished')),
  clock_started_at timestamptz,
  clock_offset_seconds int not null default 0,
  winner text check (winner in ('A','B','draw')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team text not null check (team in ('A','B')),
  primary key (match_id, player_id)
);

-- EVENTS
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  type public.event_type not null,
  team text not null check (team in ('A','B')),
  player_id uuid references public.players(id) on delete set null,
  assist_player_id uuid references public.players(id) on delete set null,
  minute int,
  created_at timestamptz not null default now()
);
create index match_events_match_idx on public.match_events(match_id);
create index match_events_season_idx on public.match_events(season_id);

create or replace function public.match_events_fill_season()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.season_id is null then
    select season_id into new.season_id from public.matches where id = new.match_id;
  end if;
  return new;
end $$;
create trigger match_events_fill_season before insert on public.match_events
for each row execute function public.match_events_fill_season();

-- LEVEL HISTORY
create table public.level_changes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  from_rank int not null,
  to_rank int not null,
  reason text,
  created_at timestamptz not null default now()
);

-- GRANTS + RLS (public read, admin write)
do $$
declare t text;
begin
  foreach t in array array['levels','settings','seasons','players','matches','match_players','match_events','level_changes'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Public read %s" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "Admin insert %s" on public.%I for insert to authenticated with check (public.has_role(auth.uid(), ''admin''))', t, t);
    execute format('create policy "Admin update %s" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t, t);
    execute format('create policy "Admin delete %s" on public.%I for delete to authenticated using (public.has_role(auth.uid(), ''admin''))', t, t);
  end loop;
end $$;

-- ADMIN RPCs
create or replace function public.set_player_level(p_player uuid, p_rank int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare old_rank int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  select level_rank into old_rank from public.players where id = p_player;
  if old_rank is null then raise exception 'player not found'; end if;
  if old_rank = p_rank then return; end if;
  update public.players set level_rank = p_rank where id = p_player;
  insert into public.level_changes (player_id, from_rank, to_rank, reason) values (p_player, old_rank, p_rank, p_reason);
end $$;

create or replace function public.close_season(p_new_name text, p_reset boolean)
returns void language plpgsql security definer set search_path = public as $$
declare cur uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not allowed'; end if;
  select id into cur from public.seasons where is_current;
  if p_reset then
    delete from public.matches where season_id = cur;
    if p_new_name is not null and length(trim(p_new_name)) > 0 then
      update public.seasons set name = p_new_name, started_at = now() where id = cur;
    end if;
  else
    update public.matches set status = 'finished', finished_at = coalesce(finished_at, now()), clock_started_at = null where season_id = cur and status = 'live';
    update public.seasons set is_current = false, ended_at = now() where id = cur;
    insert into public.seasons (name, is_current) values (coalesce(nullif(trim(p_new_name), ''), 'Nova temporada'), true);
  end if;
end $$;

revoke execute on function public.set_player_level(uuid, int, text) from anon;
revoke execute on function public.close_season(text, boolean) from anon;
grant execute on function public.set_player_level(uuid, int, text) to authenticated;
grant execute on function public.close_season(text, boolean) to authenticated;

-- REALTIME
alter publication supabase_realtime add table public.players, public.levels, public.settings, public.seasons, public.matches, public.match_players, public.match_events, public.level_changes;

-- SEED
insert into public.settings (id, goal_points, assist_points) values (1, 3, 2);

insert into public.levels (rank, name, min_goals, min_assists) values
  (1, 'Pereba', 0, 0),
  (2, 'Amador', 2, 1),
  (3, 'Pelada Fixa', 4, 3),
  (4, 'Craque', 8, 6),
  (5, 'Fenômeno', 14, 10),
  (6, 'Lenda', 22, 16);

insert into public.seasons (id, name, started_at, is_current) values
  ('00000000-0000-0000-0000-0000000000a1', 'Temporada 2026', now() - interval '30 days', true);

insert into public.players (id, name, nickname, position, shirt_number, level_rank) values
  ('00000000-0000-0000-0000-000000000001', 'Carlos Henrique', 'Bolinha', 'atacante', 9, 2),
  ('00000000-0000-0000-0000-000000000002', 'José Ribamar', 'Zé Canela', 'meia', 10, 1),
  ('00000000-0000-0000-0000-000000000003', 'Edson Lima', 'Pelé do Bairro', 'atacante', 11, 2),
  ('00000000-0000-0000-0000-000000000004', 'Marcos Vinícius', 'Tiziu', 'zagueiro', 4, 1),
  ('00000000-0000-0000-0000-000000000005', 'Rogério Dias', 'Mão de Alface', 'goleiro', 1, 1),
  ('00000000-0000-0000-0000-000000000006', 'Roberto Alves', 'Beto Chuteira', 'meia', 8, 2),
  ('00000000-0000-0000-0000-000000000007', 'Anderson Souza', 'Cabeção', 'zagueiro', 3, 1),
  ('00000000-0000-0000-0000-000000000008', 'Fábio Nunes', 'Perna de Pau', 'meia', 5, 1),
  ('00000000-0000-0000-0000-000000000009', 'Sandro Melo', 'Xuxinha', 'atacante', 7, 1),
  ('00000000-0000-0000-0000-000000000010', 'Gilberto Santos', 'Capitão Biriba', 'zagueiro', 6, 2);

insert into public.matches (id, season_id, played_at, team_a_name, team_b_name, status, winner, created_at, finished_at, clock_offset_seconds) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', current_date - 14, 'Amarelo', 'Verde', 'finished', 'A', now() - interval '14 days', now() - interval '14 days' + interval '50 minutes', 3000),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', current_date - 7, 'Amarelo', 'Verde', 'finished', 'draw', now() - interval '7 days', now() - interval '7 days' + interval '50 minutes', 3000);
insert into public.matches (id, season_id, played_at, team_a_name, team_b_name, status, clock_started_at, clock_offset_seconds, created_at) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', current_date, 'Amarelo', 'Verde', 'live', now() - interval '18 minutes', 0, now() - interval '18 minutes');

insert into public.match_players (match_id, player_id, team) values
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000001','A'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000002','A'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000003','A'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000004','A'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000005','A'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000006','B'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000007','B'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000008','B'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000009','B'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000010','B'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000003','A'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000006','A'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000008','A'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000010','A'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000005','A'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000001','B'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000002','B'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000004','B'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000007','B'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000009','B'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000001','A'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000003','A'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000007','A'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000008','A'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000005','A'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000002','B'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000004','B'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000006','B'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000009','B'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000010','B');

insert into public.match_events (match_id, season_id, type, team, player_id, assist_player_id, minute, created_at) values
  -- jogo 1: Amarelo 4 x 3 Verde
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',5, now() - interval '14 days' + interval '5 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','B','00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000006',11, now() - interval '14 days' + interval '11 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',17, now() - interval '14 days' + interval '17 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','yellow','B','00000000-0000-0000-0000-000000000007',null,20, now() - interval '14 days' + interval '20 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','B','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000010',24, now() - interval '14 days' + interval '24 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',31, now() - interval '14 days' + interval '31 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','B','00000000-0000-0000-0000-000000000009',null,38, now() - interval '14 days' + interval '38 minutes'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',46, now() - interval '14 days' + interval '46 minutes'),
  -- jogo 2: Amarelo 2 x 2 Verde
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006',8, now() - interval '7 days' + interval '8 minutes'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','goal','B','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',19, now() - interval '7 days' + interval '19 minutes'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003',33, now() - interval '7 days' + interval '33 minutes'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','own_goal','B','00000000-0000-0000-0000-000000000008',null,44, now() - interval '7 days' + interval '44 minutes'),
  -- jogo 3 (ao vivo): Amarelo 2 x 1 Verde
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',4, now() - interval '14 minutes'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a1','goal','B','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006',9, now() - interval '9 minutes'),
  ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a1','goal','A','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',15, now() - interval '3 minutes');

insert into public.level_changes (player_id, from_rank, to_rank, reason, created_at) values
  ('00000000-0000-0000-0000-000000000001', 1, 2, 'Bateu a meta de Amador', now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000003', 1, 2, 'Bateu a meta de Amador', now() - interval '14 days'),
  ('00000000-0000-0000-0000-000000000006', 1, 2, 'Decisão do admin', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000010', 1, 2, 'Capitão do time', now() - interval '20 days');
