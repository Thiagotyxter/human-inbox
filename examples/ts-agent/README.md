# TypeScript Agent Integration

Para arquitetura, configuração de webhook, execução local com tunnel e teste de takeover, leia primeiro [`docs/CONNECT_YOUR_AGENT.md`](../../docs/CONNECT_YOUR_AGENT.md).

Copy `conversation-control.ts` into your TypeScript agent project and configure:

```bash
HUMAN_INBOX_BASE_URL=https://human-inbox.vercel.app
AGENT_CONTROL_SHARED_SECRET=...
```

Use exatamente o mesmo `AGENT_CONTROL_SHARED_SECRET` configurado no Human Inbox. O agente deve manter esse valor somente no backend.

Example:

```ts
import { AgentControlClient, runGuardedAgentTurn } from "./conversation-control";

const control = new AgentControlClient({
  baseUrl: process.env.HUMAN_INBOX_BASE_URL!,
  sharedSecret: process.env.AGENT_CONTROL_SHARED_SECRET!,
});

await runGuardedAgentTurn(
  control,
  {
    phoneNumberId: inbound.phoneNumberId,
    contactPhone: inbound.contactPhone,
    text: inbound.text,
  },
  async ({ text }) => runYourAgent(text),
  async ({ phoneNumberId, contactPhone, text }) => {
    await sendViaTyxter({
      senderPhoneNumberId: phoneNumberId,
      recipientPhone: contactPhone,
      text,
      metadata: { source: "agent" },
    });
  },
);
```
