import { canAgentReply as canAgentReplyRepository } from "@/lib/conversations/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function canAgentReply(phoneNumberId: string, contactPhone: string): Promise<boolean> {
  const client = createSupabaseAdminClient();
  return canAgentReplyRepository(client, phoneNumberId, contactPhone);
}
