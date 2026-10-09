begin;
create table if not exists public.voice_conversations (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consent_version text not null,
  status text not null default 'started' check (status in ('started','in_progress','ended')),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 240),
  revision integer not null default 0 check (revision >= 0),
  transcript jsonb not null default '[]'::jsonb check (jsonb_typeof(transcript) = 'array' and octet_length(transcript::text) <= 60000),
  summary text,
  summary_kind text check (summary_kind in ('extract','ai'))
);
alter table public.voice_conversations enable row level security;
revoke all on table public.voice_conversations from public, anon, authenticated;
grant select, insert, update on table public.voice_conversations to service_role;
comment on table public.voice_conversations is 'Transcripciones automáticas consentidas; sin audio. Texto enviado por el cliente, no verificado. Sin acceso público.';
commit;
