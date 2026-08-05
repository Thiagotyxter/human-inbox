# Tyxter Human Inbox

Inbox web enxuta para visualizar conversas do WhatsApp via Tyxter, assumir uma conversa para atendimento humano e depois devolvê-la ao agente.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Vercel

## O que foi implementado

- Login com Supabase Auth por e-mail e senha
- Inbox desktop simples em `/inbox`
- Sincronização inicial via `POST /api/sync`
- Webhook assinado em `POST /api/webhooks/tyxter`
- Listagem de conversas e mensagens inbound/outbound
- Assumir e devolver conversas (`agent` / `human`)
- Envio manual de texto quando a conversa está em modo `human`
- Reprodução de áudio via `GET /api/messages/[messageId]/media`
- Atualização em tempo real via Supabase Realtime
- Função reutilizável `canAgentReply(phoneNumberId, contactPhone)`
- Endpoint interno para agentes externos TypeScript consultarem `canAgentReply`

## Estrutura

```text
src/
  app/
    login/
    inbox/
    api/
  components/
    inbox/
  lib/
    auth/
    conversations/
    supabase/
    tyxter/

supabase/
  migrations/
```

## Pré-requisitos

- Node.js 22 ou superior
- npm 10 ou superior
- Um projeto Supabase
- Uma API key Tyxter
- Um deploy Vercel para receber o webhook público

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

```bash
TYXTER_API_KEY=
TYXTER_API_BASE_URL=https://api.tyxter.com
TYXTER_WEBHOOK_SIGNING_SECRET=
TYXTER_PHONE_NUMBER_ID=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
AGENT_CONTROL_SHARED_SECRET=
```

Observações:

- `TYXTER_PHONE_NUMBER_ID` é opcional.
- Se existir apenas um número ativo, a aplicação o usa automaticamente.
- Se houver mais de um número ativo, a UI permite filtrar por número.
- Nunca exponha `TYXTER_API_KEY`, `TYXTER_WEBHOOK_SIGNING_SECRET` ou `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- `AGENT_CONTROL_SHARED_SECRET` protege o endpoint interno consumido por agentes externos.

## Como criar o projeto no Supabase

1. Crie um novo projeto no Supabase.
2. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`
   - `service_role key`
3. Em `Authentication > Providers`, deixe `Email` habilitado.
4. Em `Authentication > URL Configuration`, configure a URL do app local e depois da Vercel.

## Como executar as migrations

As migrations estão em:

```text
supabase/migrations/20260804213000_initial_inbox.sql
```

Você pode aplicar de dois jeitos.

### Opção 1: SQL Editor do Supabase

Cole o SQL da migration no editor e execute.

### Opção 2: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

## O que a migration cria

- `profiles`
- `conversations`
- `messages`
- `processed_webhook_events`
- `conversation_events`
- enum `conversation_mode`
- índices exigidos para `conversations.last_message_at`, `messages.conversation_id`, `messages.occurred_at`, `messages.tyxter_message_id`
- trigger de `updated_at`
- trigger para criar `profiles` ao criar usuário
- RLS para leitura autenticada
- tabelas no `supabase_realtime`

## Como configurar o Supabase Auth

1. Habilite `Email`.
2. Crie o primeiro usuário pelo próprio formulário em `/login` ou pelo painel do Supabase.
3. Se você exigir confirmação de e-mail no projeto, confirme o e-mail antes de usar `/inbox`.

## Instalação

```bash
npm install
```

## Execução local

```bash
npm run dev
```

Abra:

```text
http://localhost:3000/login
```

## Comandos de validação

```bash
npm run typecheck
npm run lint
npm run build
```

Observação:

- O script de build usa `next build --webpack` para evitar um problema do Turbopack no sandbox usado durante a implementação em Wednesday, August 5, 2026.

## Integracao com agentes externos TypeScript

Quando o agente roda fora da Tyxter e fora desta aplicacao, o bloqueio de handoff precisa acontecer no backend do proprio agente.

Esta aplicacao expoe:

```text
GET /api/agent-control/can-reply?phone_number_id=...&contact_phone=...
```

Autenticacao:

- `Authorization: Bearer <AGENT_CONTROL_SHARED_SECRET>`
- ou `x-agent-control-secret: <AGENT_CONTROL_SHARED_SECRET>`

Resposta:

```json
{
  "data": {
    "can_agent_reply": true,
    "mode": "agent",
    "phone_number_id": "pn_123",
    "contact_phone": "+5511999999999"
  }
}
```

Regra:

- sem conversa registrada: `can_agent_reply = true`
- `mode = agent`: `true`
- `mode = human`: `false`

Para agentes TypeScript, existe um helper pronto em:

```text
examples/ts-agent/
```

O backend do agente deve consultar esse endpoint:

1. antes de rodar o agente
2. antes de enviar a resposta final

Isso evita a race:

1. cliente manda mensagem
2. agente comeca a gerar
3. operador assume a conversa
4. agente termina
5. resposta nao deve mais ser enviada

## Primeiro deploy na Vercel

1. Suba este projeto para um repositório Git.
2. Importe o repositório na Vercel.
3. Configure as mesmas variáveis de ambiente da `.env.local`.
4. Faça o primeiro deploy.
5. Anote a URL pública do projeto, por exemplo:

```text
https://seu-dominio.vercel.app
```

## URL pública do webhook

Depois do primeiro deploy, a URL do webhook será:

```text
https://seu-dominio.vercel.app/api/webhooks/tyxter
```

## Como cadastrar o webhook na Tyxter

Use a rota pública documentada:

```text
POST /v1/webhook-endpoints
```

Payload confirmado no material local da Tyxter:

```json
{
  "url": "https://seu-dominio.vercel.app/api/webhooks/tyxter",
  "description": "Inbox humana Tyxter",
  "subscribed_events": [
    "message.received",
    "message.sent",
    "message.delivered",
    "message.read",
    "message.failed"
  ]
}
```

Exemplo com `curl`:

```bash
curl -X POST "https://api.tyxter.com/v1/webhook-endpoints" \
  -H "Authorization: Bearer $TYXTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.vercel.app/api/webhooks/tyxter",
    "description": "Inbox humana Tyxter",
    "subscribed_events": [
      "message.received",
      "message.sent",
      "message.delivered",
      "message.read",
      "message.failed"
    ]
  }'
```

Guarde o `signing_secret` retornado. A Tyxter só retorna esse valor uma vez.

## Como salvar o signing secret

1. Copie o `signing_secret` retornado pela Tyxter.
2. Salve na Vercel como:

```bash
TYXTER_WEBHOOK_SIGNING_SECRET=...
```

3. Faça um novo deploy.

Em produção, esta aplicação rejeita webhooks sem assinatura válida.

## Como identificar números conectados

A aplicação consulta:

```text
GET /v1/phone-numbers
```

Regras implementadas:

- se houver um único número ativo, ele é usado automaticamente;
- se `TYXTER_PHONE_NUMBER_ID` estiver preenchido, ele é priorizado;
- se houver vários números ativos, a interface pode filtrar por número.

## Como disparar a sincronização inicial

Em desenvolvimento, a aplicação funciona mesmo sem webhook por meio desta rota:

```text
POST /api/sync
```

Exemplo:

```bash
curl -X POST "http://localhost:3000/api/sync" \
  -H "Content-Type: application/json" \
  -H "Cookie: <sua-sessao-supabase>"
```

Ou use o botão `Sincronizar` na sidebar após login.

A sincronização:

- exige autenticação;
- usa `GET /v1/messages`;
- usa `include=payload`;
- usa paginação por `starting_after`;
- importa inbound e outbound;
- é idempotente;
- pode rodar várias vezes.

## Como testar uma mensagem inbound

Fluxo recomendado:

1. Faça login.
2. Rode a sincronização inicial.
3. Envie uma mensagem real para o número conectado à Tyxter.
4. Com webhook configurado, a mensagem deve entrar automaticamente.
5. Sem webhook configurado ainda, clique em `Sincronizar`.

## Como assumir uma conversa

Na inbox:

1. Selecione a conversa.
2. Clique em `Assumir conversa`.
3. A rota usada é:

```text
POST /api/conversations/[conversationId]/takeover
```

O sistema:

- muda `mode` para `human`;
- define `assigned_operator_id`;
- grava `conversation.assigned_to_human`;
- atualiza a UI em realtime.

## Como devolver ao agente

Na inbox:

1. Abra a conversa em modo humano.
2. Clique em `Devolver ao agente`.
3. A rota usada é:

```text
POST /api/conversations/[conversationId]/release
```

O sistema:

- muda `mode` para `agent`;
- limpa `assigned_operator_id`;
- grava `conversation.returned_to_agent`;
- atualiza a UI em realtime.

## Como funciona o envio manual

Rota:

```text
POST /api/conversations/[conversationId]/messages
```

Body:

```json
{
  "text": "Mensagem enviada pelo operador"
}
```

Regras:

- exige autenticação;
- valida com Zod;
- só envia se a conversa estiver em `mode = human`;
- usa `POST /v1/messages`;
- envia `metadata.source = "human_inbox"`;
- salva a mensagem no Postgres.

## Como funciona a mídia de áudio

Rota:

```text
GET /api/messages/[messageId]/media
```

Regras:

- exige autenticação;
- busca a URL de mídia no backend;
- nunca expõe a API key;
- faz redirect ou proxy seguro;
- não usa Supabase Storage;
- renderiza no frontend com `<audio controls />`.

## Como integrar `canAgentReply` ao agente existente

Função pronta:

```ts
import { canAgentReply } from "@/lib/conversations/can-agent-reply";
```

Assinatura:

```ts
canAgentReply(phoneNumberId: string, contactPhone: string): Promise<boolean>
```

Uso esperado no backend do agente:

1. Ao receber uma mensagem inbound, salve a mensagem na inbox.
2. Antes de iniciar a geração da resposta, consulte `canAgentReply`.
3. Se retornar `false`, não chame o agente.
4. Se retornar `true`, o agente pode continuar.
5. Antes de enviar uma resposta já gerada, consulte `canAgentReply` novamente.
6. Se o modo tiver mudado para `human`, descarte a resposta automática.

Exemplo:

```ts
const allowedBeforeGeneration = await canAgentReply(phoneNumberId, contactPhone);
if (!allowedBeforeGeneration) return;

const reply = await generateAgentReply();

const allowedBeforeSend = await canAgentReply(phoneNumberId, contactPhone);
if (!allowedBeforeSend) return;

await sendReply(reply);
```

## Realtime

O frontend assina mudanças nas tabelas:

- `conversations`
- `messages`
- `conversation_events`

via Supabase Realtime.

## Limitações atuais

- Esta aplicação não pausa um agente externo sozinha. Ela só controla o estado `agent/human` e expõe `canAgentReply`.
- Se o agente atual roda fora desta aplicação e não consultar `canAgentReply`, o handoff não interromperá a automação por si só.
- O endpoint de mídia inbound depende da URL temporária presente no detalhe da mensagem retornado pela Tyxter. Não há cópia persistida localmente.
- A documentação principal citada no pedido, `Texto colado(35).txt`, não estava acessível no workspace durante a implementação; por isso a confirmação dos endpoints foi feita com o corpus local de documentação Tyxter presente em `tyxter-messaging/packages/platform/docs-corpus` e com `/openapi.json`.
- O build validado durante a implementação rodou em um ambiente cuja ferramenta de execução usava Node.js 20, o que gera warnings do `@supabase/supabase-js`. O projeto deve ser executado com Node.js 22 ou superior.

## Arquivos principais criados

- `src/app/login/page.tsx`
- `src/app/inbox/page.tsx`
- `src/app/api/sync/route.ts`
- `src/app/api/webhooks/tyxter/route.ts`
- `src/app/api/phone-numbers/route.ts`
- `src/app/api/conversations/...`
- `src/app/api/messages/[messageId]/media/route.ts`
- `src/components/inbox/*`
- `src/lib/supabase/*`
- `src/lib/tyxter/*`
- `src/lib/conversations/*`
- `supabase/migrations/20260804213000_initial_inbox.sql`
- `.env.example`

## Checklist de aceite coberto

- login
- listagem de conversas
- sincronização inicial
- webhook de novas mensagens
- histórico inbound e outbound
- áudio reproduzível
- takeover
- retorno ao agente
- prevenção de duplicidade por webhook
- atualização monotônica de status
- secrets no backend
- migrations incluídas
- projeto validado com `typecheck`, `lint` e `build`
