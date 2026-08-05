import { addConversationEvent, getConversation, setConversationMode } from "@/lib/conversations/repository";

export async function takeoverConversation(client: Parameters<typeof getConversation>[0], conversationId: string, operatorId: string | null) {
  const conversation = await getConversation(client, conversationId);

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (conversation.mode === "human" && conversation.assigned_operator_id === operatorId) {
    return conversation;
  }

  await setConversationMode(client, {
    conversationId,
    mode: "human",
    assignedOperatorId: operatorId,
  });

  await addConversationEvent(client, {
    conversation_id: conversationId,
    event_type: "conversation.assigned_to_human",
    actor_id: operatorId,
    metadata: { mode: "human" },
  });

  return { ...conversation, mode: "human" as const, assigned_operator_id: operatorId };
}

export async function releaseConversation(client: Parameters<typeof getConversation>[0], conversationId: string, operatorId: string | null) {
  const conversation = await getConversation(client, conversationId);

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (conversation.mode === "agent" && !conversation.assigned_operator_id) {
    return conversation;
  }

  await setConversationMode(client, {
    conversationId,
    mode: "agent",
    assignedOperatorId: null,
  });

  await addConversationEvent(client, {
    conversation_id: conversationId,
    event_type: "conversation.returned_to_agent",
    actor_id: operatorId,
    metadata: { mode: "agent" },
  });

  return { ...conversation, mode: "agent" as const, assigned_operator_id: null };
}
