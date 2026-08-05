create policy "profiles_select_anon"
on public.profiles
for select
to anon
using (true);

create policy "conversations_select_anon"
on public.conversations
for select
to anon
using (true);

create policy "messages_select_anon"
on public.messages
for select
to anon
using (true);

create policy "conversation_events_select_anon"
on public.conversation_events
for select
to anon
using (true);
