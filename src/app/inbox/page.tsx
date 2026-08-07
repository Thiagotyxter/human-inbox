import { InboxLayout } from "@/components/inbox/inbox-layout";
import { requirePageUser } from "@/lib/auth/user";
import { getConversationWithMessages, listConversations } from "@/lib/conversations/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPhoneNumberOptions } from "@/lib/tyxter/phone-numbers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const user = await requirePageUser();
  if (!user) redirect("/login");

  const supabase = createSupabaseAdminClient();

  const params = await searchParams;
  const conversations = await listConversations(supabase);
  const selectedConversationId = params.conversationId ?? conversations[0]?.id ?? null;
  const [selectedConversation, phoneNumbers] = await Promise.all([
    selectedConversationId ? getConversationWithMessages(supabase, selectedConversationId) : Promise.resolve(null),
    getPhoneNumberOptions().catch(() => []),
  ]);

  return (
    <InboxLayout
      conversations={conversations}
      selectedConversation={selectedConversation}
      selectedConversationId={selectedConversationId}
      phoneNumbers={phoneNumbers}
    />
  );
}
