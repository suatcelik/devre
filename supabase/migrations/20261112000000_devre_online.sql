-- Devre çevrimiçi şeması (DEVRE_TASKS 5.1–5.4)
-- Anonim oyuncular, Günün Tahtası puanları, arkadaş kodları ve sıralamalar.
-- Puanı istemci yazamaz: daily_scores yalnızca hamleleri yeniden oynatıp doğrulayan
-- submit-daily sunucu fonksiyonu (service role) tarafından yazılır.

-- ---------- Profiller (5.1) ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- İsteğe bağlı takma ad; boşsa "Oyuncu ABC123" gösterilir.
  nickname text check (nickname is null or char_length(btrim(nickname)) between 2 and 16),
  -- Arkadaş kodu: karışmayan harf/rakamlar (0/O, 1/I yok), 6 karakter.
  friend_code text not null unique check (friend_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiller herkese açık" on public.profiles
  for select to authenticated using (true);

create policy "yalnız kendi profilini günceller" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Yalnızca takma ad değiştirilebilir; arkadaş kodu ve kimlik sabit.
revoke update on public.profiles from authenticated;
grant update (nickname) on public.profiles to authenticated;

create or replace function public.gen_friend_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

-- Her yeni (anonim dahil) kullanıcıya profil ve arkadaş kodu.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, friend_code) values (new.id, public.gen_friend_code());
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Günün Tahtası puanları (5.2, 5.4) ----------

create table public.daily_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  score integer not null check (score >= 0),
  longest_circuit integer not null check (longest_circuit >= 0),
  circuits integer not null default 0 check (circuits >= 0),
  -- Doğrulanan hamle listesi: itiraz ve yeniden doğrulama için saklanır.
  moves jsonb not null,
  created_at timestamptz not null default now(),
  -- Günde tek deneme: aynı gün ikinci kayıt reddedilir.
  primary key (user_id, date)
);

alter table public.daily_scores enable row level security;

create policy "puanlar herkese açık" on public.daily_scores
  for select to authenticated using (true);
-- Bilerek insert/update/delete politikası yok: yalnız service role (sunucu fonksiyonu) yazar.

create index daily_scores_by_date on public.daily_scores (date, score desc, created_at);

-- ---------- Arkadaşlar (5.3) ----------

create table public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.friends enable row level security;

create policy "kendi arkadaşlarını görür" on public.friends
  for select to authenticated using (user_id = auth.uid());

create policy "kendi arkadaşını siler" on public.friends
  for delete to authenticated using (user_id = auth.uid());
-- Ekleme yalnız add_friend ile: kod çözülür, iki yönlü eklenir.

create or replace function public.add_friend(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'not-authenticated';
  end if;
  select id into fid from public.profiles where friend_code = upper(btrim(code));
  if fid is null then
    raise exception 'friend-not-found';
  end if;
  if fid = auth.uid() then
    raise exception 'friend-self';
  end if;
  insert into public.friends (user_id, friend_id) values (auth.uid(), fid) on conflict do nothing;
  insert into public.friends (user_id, friend_id) values (fid, auth.uid()) on conflict do nothing;
  return fid;
end;
$$;

revoke all on function public.add_friend(text) from public;
grant execute on function public.add_friend(text) to authenticated;

-- ---------- Sıralamalar (5.3) ----------

-- Günün genel sıralaması: eşit puanda önce gönderen öne geçer.
create or replace function public.daily_leaderboard(day date, max_rows integer default 50)
returns table (rank bigint, user_id uuid, nickname text, friend_code text, score integer, longest_circuit integer)
language sql
stable
security invoker
set search_path = public
as $$
  select rank() over (order by s.score desc, s.created_at asc) as rank,
         s.user_id, p.nickname, p.friend_code, s.score, s.longest_circuit
  from public.daily_scores s
  join public.profiles p on p.id = s.user_id
  where s.date = day
  order by rank
  limit least(greatest(max_rows, 1), 100);
$$;

-- Arkadaş sıralaması: oyuncu ve arkadaşları arasında.
create or replace function public.friends_leaderboard(day date)
returns table (rank bigint, user_id uuid, nickname text, friend_code text, score integer, longest_circuit integer)
language sql
stable
security invoker
set search_path = public
as $$
  select rank() over (order by s.score desc, s.created_at asc) as rank,
         s.user_id, p.nickname, p.friend_code, s.score, s.longest_circuit
  from public.daily_scores s
  join public.profiles p on p.id = s.user_id
  where s.date = day
    and (s.user_id = auth.uid()
         or s.user_id in (select f.friend_id from public.friends f where f.user_id = auth.uid()))
  order by rank;
$$;

-- Oyuncunun o günkü genel sırası ve toplam oyuncu sayısı.
create or replace function public.my_daily_rank(day date)
returns table (rank bigint, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select score, created_at from public.daily_scores where date = day and user_id = auth.uid()
  )
  select
    (select count(*) + 1 from public.daily_scores s, mine m
      where s.date = day and (s.score > m.score or (s.score = m.score and s.created_at < m.created_at))) as rank,
    (select count(*) from public.daily_scores where date = day) as total
  from mine;
$$;

grant execute on function public.daily_leaderboard(date, integer) to authenticated;
grant execute on function public.friends_leaderboard(date) to authenticated;
grant execute on function public.my_daily_rank(date) to authenticated;
