# Conectando seu agente ao Tyxter Human Inbox

Este guia explica como conectar um agente existente ao Human Inbox para que um operador possa acompanhar mensagens, assumir uma conversa e impedir respostas automáticas enquanto o atendimento estiver em modo humano.

## Resposta curta: o agente precisa de um servidor?

O agente precisa rodar em algum backend capaz de receber ou processar mensagens e chamar a API da Tyxter. Isso pode ser:

- uma função serverless na Vercel;
- um serviço no Railway, Render, Fly.io ou Cloud Run;
- uma aplicação em AWS, Azure ou outro cloud;
- um processo em VPS;
- um processo local durante desenvolvimento.

Ele não precisa necessariamente de uma VPS ligada permanentemente. Uma função serverless acionada por webhook também serve. Para receber webhooks enquanto roda localmente, porém, ele precisa de uma URL HTTPS pública criada por um tunnel.

O Human Inbox não executa nem hospeda o agente. Ele acompanha conversas, mantém o estado de handoff e informa se o agente ainda pode responder.

## Responsabilidade de cada serviço

```text
Tyxter Human Inbox
  - recebe e armazena eventos de conversa
  - mostra mensagens e mídias
  - permite takeover e release
  - responde canAgentReply

Backend do agente
  - recebe ou consome a mensagem inbound
  - executa modelo, ferramentas e regras do agente
  - consulta canAgentReply
  - envia a resposta pela Tyxter
```

## Escolha a arquitetura

### Opção A — dois consumidores de eventos, recomendada

```text
                         ┌──► Human Inbox webhook
WhatsApp ──► Tyxter ─────┤
                         └──► webhook/backend do agente
```

Use esta opção quando o agente já recebe eventos da Tyxter ou quando o projeto permite cadastrar endpoints separados. O inbox e o agente evoluem de forma independente.

### Opção B — Human Inbox encaminha ao agente

```text
WhatsApp ──► Tyxter ──► Human Inbox ──► backend do agente
```

Use esta opção quando você quer manter um único webhook Tyxter. Este template não inclui um encaminhador genérico porque autenticação, payload e política de retry variam entre agentes. O agente de implementação deve adicionar uma fila ou chamada autenticada após persistir `message.received`.

Não bloqueie a resposta do webhook Tyxter esperando o modelo gerar. Confirme o evento rapidamente e processe o agente em background.

## Antes de começar

Você precisa ter:

- Human Inbox configurado e acessível;
- migrations aplicadas no Supabase;
- `AGENT_CONTROL_SHARED_SECRET` configurado no inbox;
- API key Tyxter disponível somente no backend do agente;
- `phone_number_id` e telefone do contato disponíveis no evento inbound;
- uma função existente que gere a resposta do agente;
- uma função existente que envie texto pela Tyxter.

## Passo 1 — configure um segredo compartilhado

Gere um segredo:

```bash
openssl rand -hex 32
```

Configure o mesmo valor nos dois backends.

No Human Inbox:

```dotenv
AGENT_CONTROL_SHARED_SECRET=valor-gerado
```

No agente:

```dotenv
HUMAN_INBOX_BASE_URL=https://seu-human-inbox.vercel.app
AGENT_CONTROL_SHARED_SECRET=valor-gerado
TYXTER_API_KEY=sua-chave-do-projeto
```

Nunca use uma variável `NEXT_PUBLIC_` para esses segredos.

## Passo 2 — copie o cliente de controle

Copie `examples/ts-agent/conversation-control.ts` para o projeto TypeScript do agente ou adapte seu conteúdo à linguagem utilizada.

O cliente chama:

```http
GET /api/agent-control/can-reply?phone_number_id=...&contact_phone=...
Authorization: Bearer <AGENT_CONTROL_SHARED_SECRET>
```

Teste manualmente a conectividade:

```bash
curl "https://seu-human-inbox.vercel.app/api/agent-control/can-reply?phone_number_id=SEU_PHONE_NUMBER_ID&contact_phone=%2B5511999999999" \
  -H "Authorization: Bearer $AGENT_CONTROL_SHARED_SECRET"
```

Sem uma conversa registrada, a resposta padrão é `can_agent_reply: true`. Depois do takeover, deve ser `false`.

## Passo 3 — mapeie as identidades inbound

Para uma mensagem inbound, o agente precisa montar:

```ts
const phoneNumberId = event.data.recipient.id;
const contactPhone = event.data.sender.id;
```

- `phoneNumberId` identifica o número WhatsApp conectado à Tyxter.
- `contactPhone` identifica o cliente, idealmente em E.164, por exemplo `+5511999999999`.

Use os valores do evento sem criar outro formato. O Human Inbox procura a conversa pela combinação exata desses dois campos. Se o agente remover `+`, espaços ou código do país de forma diferente, o takeover pode não ser encontrado.

Adapte o caminho acima se o SDK do agente já entregar um objeto normalizado, mas preserve os valores finais.

## Passo 4 — proteja a execução do agente

```ts
import { AgentControlClient, runGuardedAgentTurn } from "./conversation-control";

const control = new AgentControlClient({
  baseUrl: process.env.HUMAN_INBOX_BASE_URL!,
  sharedSecret: process.env.AGENT_CONTROL_SHARED_SECRET!,
});

export async function handleInbound(event: TyxterInboundEvent) {
  const phoneNumberId = event.data.recipient.id;
  const contactPhone = event.data.sender.id;
  const text = event.data.content.text?.body ?? "";

  return runGuardedAgentTurn(
    control,
    { phoneNumberId, contactPhone, text },
    async ({ text: customerMessage }) => {
      return runYourAgent(customerMessage);
    },
    async ({ phoneNumberId, contactPhone, text: reply }) => {
      await sendTextViaTyxter({
        senderPhoneNumberId: phoneNumberId,
        recipientPhone: contactPhone,
        text: reply,
        metadata: { source: "agent" },
      });
    },
  );
}
```

O helper consulta o inbox duas vezes:

1. antes de executar o agente;
2. depois da geração, imediatamente antes do envio.

A segunda consulta evita esta race condition:

```text
mensagem chega → agente começa → operador assume → agente termina → resposta deve ser descartada
```

Trate os resultados para observabilidade:

- `blocked_before_run`: conversa já estava em modo humano;
- `blocked_before_send`: operador assumiu durante a geração;
- `no_reply`: agente decidiu não responder;
- `sent`: resposta enviada.

## Passo 5 — envie a resposta pela Tyxter

O envio deve acontecer somente no backend do agente. Um exemplo conceitual:

```ts
async function sendTextViaTyxter(input: {
  senderPhoneNumberId: string;
  recipientPhone: string;
  text: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await fetch("https://api.tyxter.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYXTER_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      channel: "whatsapp",
      sender: { type: "whatsapp_phone_number", id: input.senderPhoneNumberId },
      recipient: { type: "phone_e164", id: input.recipientPhone },
      message: { type: "text", text: { body: input.text } },
      metadata: input.metadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tyxter send failed: ${response.status}`);
  }
}
```

Use o SDK oficial ou cliente já existente no projeto quando disponível. Preserve `metadata.source = "agent"` para distinguir respostas automáticas.

## Executando tudo localmente

### Terminal 1 — Human Inbox

```bash
cd human-inbox
cp .env.example .env.local
npm install
npm run dev
```

O inbox estará em `http://localhost:3000`.

### Terminal 2 — tunnel do inbox

Com ngrok:

```bash
ngrok http 3000
```

Ou com Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Use a URL HTTPS gerada para:

- `NEXT_PUBLIC_APP_URL`;
- endpoint Tyxter `/api/webhooks/tyxter`;
- `HUMAN_INBOX_BASE_URL` do agente.

Reinicie o Next.js se alterar `.env.local`.

### Terminal 3 — backend do agente

```bash
cd seu-agente
npm install
npm run dev
```

Suponha que ele rode em `http://localhost:4000`.

### Terminal 4 — tunnel do agente, se ele recebe webhook

```bash
ngrok http 4000
```

Cadastre a URL HTTPS gerada como endpoint do agente. O caminho depende do projeto, por exemplo:

```text
https://URL-DO-AGENTE.ngrok.app/webhooks/tyxter
```

Se o agente consome uma fila ou se o Human Inbox encaminha o evento, esse segundo tunnel não é necessário.

### Cuidados com tunnels

- URLs gratuitas podem mudar ao reiniciar; atualize o webhook cadastrado.
- Cada endpoint tem seu próprio signing secret.
- Não compartilhe signing secrets entre projetos.
- Em produção, use domínio estável em vez de tunnel temporário.

## Exemplo de webhook do agente

O formato de framework varia, mas o handler deve:

1. ler o body bruto;
2. verificar a assinatura Tyxter;
3. responder rapidamente;
4. deduplicar pelo ID do evento;
5. colocar o processamento em background;
6. executar `runGuardedAgentTurn`.

Pseudocódigo:

```ts
export async function POST(request: Request) {
  const rawBody = await request.text();
  verifyTyxterSignature(request.headers, rawBody);

  const event = JSON.parse(rawBody);
  if (await wasAlreadyProcessed(event.id)) {
    return Response.json({ deduped: true });
  }

  await enqueueInbound(event);
  return Response.json({ accepted: true }, { status: 202 });
}
```

Nunca execute uma geração longa antes de responder ao webhook.

## Teste ponta a ponta do takeover

Execute nesta ordem:

1. Abra o Human Inbox e faça login.
2. Envie uma mensagem WhatsApp para o número conectado.
3. Confirme que a conversa aparece no inbox.
4. Confirme que o agente responde normalmente.
5. Clique em `Assumir conversa`.
6. Consulte `can-reply` manualmente e confirme `false`.
7. Envie outra mensagem WhatsApp.
8. Confirme que o agente registra `blocked_before_run` e não responde.
9. Envie uma resposta manual pelo inbox.
10. Clique em `Devolver ao agente`.
11. Consulte `can-reply` e confirme `true`.
12. Envie nova mensagem e confirme que o agente voltou a responder.
13. Teste a race: faça o agente demorar, assuma durante a geração e confirme `blocked_before_send`.

## Comportamento em falhas

Escolha explicitamente a política do agente se o Human Inbox estiver indisponível:

- **Fail closed, recomendado:** não responder até conseguir confirmar `canAgentReply`.
- **Fail open:** responder mesmo sem consultar o inbox.

Para atendimento humano, fail closed evita que uma automação interrompa o operador. Implemente timeout curto, retry com backoff e logs sem dados sensíveis.

Exemplo:

```ts
try {
  const allowed = await control.canAgentReply(phoneNumberId, contactPhone);
  if (!allowed) return;
} catch (error) {
  logger.warn("human_inbox_unavailable");
  return; // fail closed
}
```

## Checklist para o agente de implementação

- [ ] Identificou onde o agente recebe mensagens inbound.
- [ ] Confirmou os campos `phone_number_id` e `contact_phone`.
- [ ] Configurou o mesmo `AGENT_CONTROL_SHARED_SECRET` nos dois backends.
- [ ] Copiou ou reimplementou `AgentControlClient`.
- [ ] Verifica permissão antes da geração.
- [ ] Verifica novamente antes do envio.
- [ ] Envia pela Tyxter somente no backend.
- [ ] Deduplica webhooks.
- [ ] Valida assinatura Tyxter.
- [ ] Definiu fail closed ou fail open conscientemente.
- [ ] Testou takeover, race e release.
- [ ] Removeu tunnels temporários e usou URLs estáveis em produção.

## Troubleshooting

### `can-reply` retorna 401

Os valores de `AGENT_CONTROL_SHARED_SECRET` são diferentes ou o header Bearer não foi enviado.

### Takeover acontece, mas o agente continua respondendo

- O agente não consulta antes do envio.
- As identidades usadas pelo agente não correspondem ao inbox.
- A resposta já estava em outra fila sem checagem final.
- O agente está configurado como fail open.

### `can-reply` sempre retorna true

Confirme `phone_number_id` e `contact_phone`. A ausência de conversa registrada permite resposta por padrão.

### Funciona hospedado, mas não localmente

Confirme que o tunnel está ativo, que a URL não mudou e que o webhook cadastrado usa HTTPS. Verifique também se o firewall local permite a porta.
