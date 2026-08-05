# TypeScript Agent Integration

Copy `conversation-control.ts` into your TypeScript agent project and configure:

```bash
HUMAN_INBOX_BASE_URL=https://human-inbox.vercel.app
AGENT_CONTROL_SHARED_SECRET=...
```

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
