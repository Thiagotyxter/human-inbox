alter table public.messages
add column if not exists media_url text,
add column if not exists media_asset_id text,
add column if not exists media_mime_type text,
add column if not exists media_filename text,
add column if not exists media_caption text,
add column if not exists transcript text,
add column if not exists transcription_status text
  check (transcription_status in ('pending', 'succeeded', 'failed')),
add column if not exists transcription_error text;

create index if not exists messages_media_asset_id_idx
on public.messages (media_asset_id)
where media_asset_id is not null;
