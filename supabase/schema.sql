-- Pathdle leaderboard schema
-- Apply with: node scripts/apply-schema.js  (or paste into the Supabase SQL Editor)

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(btrim(player_name)) between 1 and 20),
  mode text not null check (mode in ('endless', 'daily')),
  score integer not null check (score between 0 and 1000000),
  level integer not null check (level between 1 and 500),
  daily_date date,
  created_at timestamptz not null default now(),
  constraint daily_needs_date check ((mode = 'daily') = (daily_date is not null)),
  constraint daily_level_cap check (mode <> 'daily' or level <= 10)
);

-- Plausibility: no level can give more than 1,850 points
-- ((100 + 10 x 30s + 50 x 4 gold answers) x 1.5 Buy All x 2 streak + 50 champion bonus).
-- Keep in sync with MAX_POINTS_PER_LEVEL in src/utils/scoring.ts (a test pins it).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'score_plausible') then
    alter table public.scores add constraint score_plausible check (score <= level * 1850);
  end if;
end $$;

create index if not exists scores_mode_score_idx on public.scores (mode, score desc);
create index if not exists scores_daily_idx on public.scores (daily_date, score desc) where mode = 'daily';

alter table public.scores enable row level security;

drop policy if exists "scores are public" on public.scores;
create policy "scores are public" on public.scores
  for select to anon, authenticated using (true);

-- Daily scores may only be submitted for today (UTC +/- 1 day for timezone slack)
drop policy if exists "anyone can submit a score" on public.scores;
create policy "anyone can submit a score" on public.scores
  for insert to anon, authenticated
  with check (
    mode = 'endless'
    or daily_date between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1
  );

grant select, insert on public.scores to anon, authenticated;

-- Percentage of scores (same mode, and same day for daily) strictly below p_score
create or replace function public.get_percentile(p_mode text, p_score integer, p_date date default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    round(100.0 * count(*) filter (where score < p_score) / nullif(count(*), 0), 1),
    0
  )
  from public.scores
  where mode = p_mode
    and (p_mode <> 'daily' or daily_date = p_date);
$$;

grant execute on function public.get_percentile(text, integer, date) to anon, authenticated;
