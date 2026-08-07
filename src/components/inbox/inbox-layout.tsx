"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ConversationRecord, ConversationWithMessages, PhoneNumberOption } from "@/lib/app-types";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageComposer } from "@/components/inbox/message-composer";
import { MessageThread } from "@/components/inbox/message-thread";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FilterMode = "all" | "agent" | "human" | "unread";

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Request failed");
  }

  return response;
}

export function InboxLayout({
  conversations,
  selectedConversation,
  selectedConversationId,
  phoneNumbers,
}: {
  conversations: ConversationRecord[];
  selectedConversation: ConversationWithMessages | null;
  selectedConversationId: string | null;
  phoneNumbers: PhoneNumberOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("tyxter-human-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_events" }, () => router.refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    void fetch(`/api/conversations/${selectedConversationId}/read`, { method: "POST" });
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      if (selectedPhoneNumberId !== "all" && conversation.phone_number_id !== selectedPhoneNumberId) {
        return false;
      }

      if (filter === "agent" && conversation.mode !== "agent") {
        return false;
      }

      if (filter === "human" && conversation.mode !== "human") {
        return false;
      }

      if (filter === "unread" && conversation.unread_count === 0) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const haystack = `${conversation.contact_name ?? ""} ${conversation.contact_phone}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [conversations, filter, search, selectedPhoneNumberId]);

  function withRefresh(task: () => Promise<void>) {
    setError(null);

    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (taskError) {
        setError(taskError instanceof Error ? taskError.message : "Falha ao executar a operacao.");
      }
    });
  }

  async function handleSend(text: string) {
    if (!selectedConversationId) {
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      await postJson(`/api/conversations/${selectedConversationId}/messages`, { text });
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Falha ao enviar.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1720px] overflow-hidden rounded-[36px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_100px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <aside className="w-full shrink-0 border-r border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.34))] p-4 md:w-[356px] md:p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Human Inbox</p>
              <h1 className="text-[31px] font-semibold tracking-[-0.05em] text-slate-950">Conversas</h1>
              <p className="max-w-[26ch] text-sm leading-6 text-[var(--muted)]">Uma fila humana mais silenciosa, clara e rapida para operar handoff com contexto.</p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="w-full rounded-[22px] border border-[var(--border)] bg-white/88 px-4 py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white"
            />

            {phoneNumbers.length > 1 ? (
              <select
                value={selectedPhoneNumberId}
                onChange={(event) => setSelectedPhoneNumberId(event.target.value)}
                className="w-full rounded-[22px] border border-[var(--border)] bg-white/88 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:bg-white"
              >
                <option value="all">Todos os numeros</option>
                {phoneNumbers.map((phoneNumber) => (
                  <option key={phoneNumber.id} value={phoneNumber.id}>
                    {phoneNumber.label}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="grid grid-cols-2 gap-2 rounded-[26px] bg-black/[0.03] p-1">
              {[
                ["all", "Todas"],
                ["agent", "Agente"],
                ["human", "Humano"],
                ["unread", "Nao lidas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as FilterMode)}
                  className={`rounded-[20px] px-3 py-2.5 text-sm ${
                    filter === value
                      ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                      : "bg-transparent text-slate-500 hover:bg-white/80 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                withRefresh(async () => {
                  await postJson("/api/sync", selectedPhoneNumberId === "all" ? undefined : { phoneNumberId: selectedPhoneNumberId });
                })
              }
              className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white"
            >
              Sincronizar
            </button>

            <ConversationList
              conversations={filteredConversations}
              selectedConversationId={selectedConversationId}
              onSelect={(conversationId) => router.push(`/inbox?conversationId=${conversationId}`)}
            />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.76))]">
          <ConversationHeader
            conversation={selectedConversation}
            phoneNumbers={phoneNumbers}
            isSubmitting={isPending}
            onTakeover={() => {
              if (!selectedConversationId) return;
              withRefresh(async () => {
                await postJson(`/api/conversations/${selectedConversationId}/takeover`);
              });
            }}
            onRelease={() => {
              if (!selectedConversationId) return;
              withRefresh(async () => {
                await postJson(`/api/conversations/${selectedConversationId}/release`);
              });
            }}
          />

          {error ? <div className="border-b border-rose-100 bg-rose-50/90 px-6 py-3 text-sm text-rose-700">{error}</div> : null}

          <MessageThread conversation={selectedConversation} />

          <MessageComposer disabled={!selectedConversation || selectedConversation.mode !== "human"} isSending={isSending} onSend={handleSend} />
        </section>
      </div>
    </main>
  );
}
