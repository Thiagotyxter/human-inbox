export class AgentControlClient {
  constructor(
    private readonly baseUrl: string,
    private readonly sharedSecret: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async canAgentReply(phoneNumberId: string, contactPhone: string): Promise<boolean> {
    const url = new URL(`${this.baseUrl.replace(/\/+$/, "")}/api/agent-control/can-reply`);
    url.searchParams.set("phone_number_id", phoneNumberId);
    url.searchParams.set("contact_phone", contactPhone);

    const response = await this.fetchFn(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.sharedSecret}`,
      },
    });

    const payload = (await response.json()) as {
      data?: { can_agent_reply?: boolean };
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Agent control request failed");
    }

    return payload.data?.can_agent_reply === true;
  }
}

export async function runGuardedAgentTurn(
  client: AgentControlClient,
  input: {
    phoneNumberId: string;
    contactPhone: string;
    text: string;
  },
  runAgent: (input: { phoneNumberId: string; contactPhone: string; text: string }) => Promise<string | null>,
  sendReply: (input: { phoneNumberId: string; contactPhone: string; text: string }) => Promise<void>,
): Promise<"blocked_before_run" | "blocked_before_send" | "no_reply" | "sent"> {
  if (!(await client.canAgentReply(input.phoneNumberId, input.contactPhone))) {
    return "blocked_before_run";
  }

  const reply = await runAgent(input);

  if (!reply || !reply.trim()) {
    return "no_reply";
  }

  if (!(await client.canAgentReply(input.phoneNumberId, input.contactPhone))) {
    return "blocked_before_send";
  }

  await sendReply({
    phoneNumberId: input.phoneNumberId,
    contactPhone: input.contactPhone,
    text: reply,
  });

  return "sent";
}
