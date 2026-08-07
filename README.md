# Tyxter Human Inbox

Template open source para acompanhar conversas do WhatsApp atendidas por agentes na Tyxter e assumir o atendimento humano quando necessário.

O projeto inclui histórico em tempo real, imagens, áudios, documentos, transcrição de áudio, envio manual e controle de handoff entre agente e operador. A stack padrão é Next.js, Vercel e Supabase.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Thiagotyxter/human-inbox&env=TYXTER_API_KEY,TYXTER_WEBHOOK_SIGNING_SECRET,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,AGENT_CONTROL_SHARED_SECRET)

## O que este template entrega

- Inbox de conversas inbound e outbound do WhatsApp.
- Sincronização inicial e atualização por webhooks Tyxter.
- Imagens, stickers, áudios, vídeos e documentos inbound.
- Transcrição assíncrona de áudio inbound.
- Supabase Auth, Postgres e Realtime.
- Takeover humano, devolução ao agente e envio manual.
- Endpoint e helper `canAgentReply` para interromper o agente durante o takeover.
- Migrations versionadas e deploy pronto para Vercel.

## Stack

- Next.js 16 App Router, React 19 e TypeScript
- Tailwind CSS
- Supabase Auth, Postgres e Realtime
- Tyxter Messaging API e webhooks
- Vercel

## Instruções para agentes de implementação

Este repositório foi preparado para ser entregue a um agente de código. Se você é o agente responsável pela instalação:

1. Leia este README inteiro e o `AGENTS.md` antes de editar código.
2. Confirme quais projetos Tyxter, Supabase e Vercel devem ser usados.
3. Nunca imprima, versione ou envie segredos em logs, commits ou respostas.
4. Crie o projeto Supabase e aplique **todas** as migrations em ordem.
5. Configure as variáveis localmente e na Vercel.
6. Faça o primeiro deploy antes de cadastrar o webhook, pois a Tyxter precisa de HTTPS público.
7. Cadastre o webhook com todos os eventos listados abaixo.
8. Salve o `signing_secret` retornado pela Tyxter e faça um novo deploy.
9. Crie o primeiro operador e desabilite cadastros públicos se o inbox for privado.
10. Integre `canAgentReply` no agente antes e depois da geração de resposta.
11. Execute typecheck, lint, build e o checklist manual.
12. Entregue URLs, recursos criados e passos manuais restantes sem revelar credenciais.

Não substitua Supabase ou Vercel sem solicitação explícita. Eles são o caminho suportado pelo template.

## Arquitetura

```text
WhatsApp
   │
   ▼
Tyxter ── mensagens / status / transcrição ──► Webhook Next.js
   ▲                                               │
   │                                               ▼
   ├── envio / media capability / transcription  Supabase
   │                                               │
   │                                               ▼
Agente externo ◄── canAgentReply ── Human Inbox ◄── Realtime
```

A Tyxter espelha mídias inbound em assets próprios. O inbox persiste o `asset_id`, solicita uma capability curta e entrega os bytes pelo backend. URLs privadas da Meta e a API key nunca são expostas ao navegador.

## Pré-requisitos

- Node.js 22+ e npm 10+
- Conta, API key e número WhatsApp conectado na Tyxter
- Projeto Supabase
- Conta Vercel
- Git; CLIs `supabase` e `vercel` são recomendadas

## 1. Clone e instale

```bash
git clone https://github.com/Thiagotyxter/human-inbox.git
cd human-inbox
npm install
cp .env.example .env.local
```

## 2. Configure o Supabase

Crie um projeto em [supabase.com](https://supabase.com). Em `Project Settings > API`, obtenha o Project URL, a anon key e a service role key.

Nunca exponha a service role no navegador nem a prefixe com `NEXT_PUBLIC_`.

### Aplique as migrations

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Alternativamente, execute os arquivos de `supabase/migrations/` em ordem no SQL Editor. Eles criam tabelas, índices, triggers, RLS, Realtime e os campos de mídia/transcrição. Não pule migrations.

### Configure autenticação

1. Habilite Email em `Authentication > Providers`.
2. Adicione `http://localhost:3000` e o domínio final em `Authentication > URL Configuration`.
3. Crie o primeiro operador em `/login` ou no painel.
4. Para um inbox privado, desabilite novos cadastros públicos depois de criar os operadores.

O template exige sessão Supabase no inbox e nas APIs operacionais. Webhooks usam assinatura Tyxter e a integração do agente usa outro segredo.

## 3. Configure o ambiente

Preencha `.env.local`:

```dotenv
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

`TYXTER_PHONE_NUMBER_ID` é opcional. Gere um segredo forte para controle do agente:

```bash
openssl rand -hex 32
```

O signing secret será preenchido depois do primeiro deploy.

## 4. Execute e valide localmente

```bash
npm run dev
```

Abra `http://localhost:3000/login`.

```bash
npm run typecheck
npm run lint
npm run build
```

## 5. Faça o deploy na Vercel

Importe o repositório na Vercel ou use:

```bash
vercel link
vercel env add TYXTER_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add AGENT_CONTROL_SHARED_SECRET production
vercel --prod
```

Configure também `NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app` e `TYXTER_API_BASE_URL=https://api.tyxter.com`. Ao alterar variáveis, faça redeploy.

## 6. Cadastre o webhook na Tyxter

O endpoint será:

```text
https://seu-dominio.vercel.app/api/webhooks/tyxter
```

```bash
curl -X POST "https://api.tyxter.com/v1/webhook-endpoints" \
  -H "Authorization: Bearer $TYXTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.vercel.app/api/webhooks/tyxter",
    "description": "Tyxter Human Inbox",
    "subscribed_events": [
      "message.received",
      "message.sent",
      "message.delivered",
      "message.read",
      "message.failed",
      "message.media_transcribed"
    ]
  }'
```

Guarde o `signing_secret`, configure-o como `TYXTER_WEBHOOK_SIGNING_SECRET` na Vercel e faça outro deploy. Ele pode ser exibido somente uma vez. Em produção, webhooks sem assinatura válida recebem 401.

## 7. Sincronize o histórico

Autentique e clique em `Sincronizar`. `POST /api/sync` pagina `GET /v1/messages?include=payload`, importa inbound/outbound e é idempotente.

## 8. Integre o takeover ao agente

Takeover muda o modo para `human`, mas não interrompe sozinho um agente hospedado em outro serviço. Esse agente deve consultar:

```text
GET /api/agent-control/can-reply?phone_number_id=...&contact_phone=...
Authorization: Bearer <AGENT_CONTROL_SHARED_SECRET>
```

```json
{
  "data": {
    "can_agent_reply": false,
    "mode": "human",
    "phone_number_id": "pn_123",
    "contact_phone": "+5511999999999"
  }
}
```

Verifique antes da geração e antes do envio:

```ts
if (!(await canAgentReply(phoneNumberId, contactPhone))) return;
const reply = await generateAgentReply();
if (!(await canAgentReply(phoneNumberId, contactPhone))) return;
await sendReply(reply);
```

Isso evita a race em que o operador assume enquanto a resposta está sendo gerada. Há um cliente em `examples/ts-agent/`.

## Mídia inbound

No `message.received`, o template lê `data.content.media.asset_id`.

1. O navegador solicita `/api/messages/[messageId]/media` autenticado.
2. O backend chama `GET /v1/media/{asset_id}/download-url`.
3. O backend baixa a capability autenticada e transmite os bytes.
4. A URL curta nunca é persistida.

São suportados image, audio, video, document e sticker.

## Transcrição de áudio

O template usa:

- `POST /v1/messages/{message_id}/transcription`
- `GET /v1/messages/{message_id}/transcription`
- webhook `message.media_transcribed`

Os estados persistidos são `pending`, `succeeded` e `failed`.

## Personalização

- Visual: `src/app/globals.css` e `src/components/inbox/`
- Handoff: `src/lib/conversations/handoff.ts`
- Controle do agente: `src/lib/conversations/can-agent-reply.ts`
- Webhooks: `src/lib/conversations/tyxter-events.ts`
- Cliente Tyxter: `src/lib/tyxter/`
- Banco: `supabase/migrations/`

Crie migrations novas; não reescreva migrations já aplicadas.

## Segurança

- Nunca envie a API key Tyxter ou service role para Client Components.
- Mantenha RLS habilitado e não crie leitura `anon` para dados do inbox.
- Restrinja criação de operadores.
- Verifique assinatura do webhook em produção.
- Use segredos distintos para webhook e controle do agente.
- Não persista capabilities de mídia.
- Revogue imediatamente qualquer segredo versionado por engano.

## Checklist de aceite

- [ ] Todas as migrations foram aplicadas.
- [ ] Operador autorizado entra; usuário sem sessão vai para `/login`.
- [ ] Sync importa histórico sem duplicar.
- [ ] Webhooks atualizam mensagens em tempo real.
- [ ] Imagem/sticker carregam; áudio permite seek; documentos/vídeos abrem.
- [ ] Transcrição percorre pending até succeeded ou failed.
- [ ] Takeover, envio humano e release funcionam.
- [ ] O agente não responde quando `can_agent_reply` é false.
- [ ] Webhook inválido recebe 401.
- [ ] Typecheck, lint e build passam.

## Troubleshooting

### Mídia retorna 401

- Confirme que `TYXTER_API_KEY` pertence ao projeto que recebeu a mensagem.
- Use o `asset_id` Tyxter, não o ID de provider da Meta.
- Não consuma `lookaside.fbsbx.com` diretamente.
- Gere uma capability nova, pois ela expira rapidamente.

### Mídia retorna 404

- Aplique todas as migrations.
- Rode sync novamente para enriquecer mensagens antigas.
- Confirme `data.content.media.asset_id` no webhook.

### Webhook retorna 401

- Confirme que o signing secret corresponde ao endpoint cadastrado.
- Se recriou o endpoint, atualize a Vercel e faça redeploy.

### O agente continua respondendo

- Integre `canAgentReply` no backend real do agente.
- Verifique antes da geração e imediatamente antes do envio.
- Use os mesmos `phone_number_id` e `contact_phone` persistidos pelo inbox.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Issues e pull requests são bem-vindos.

## Licença

MIT — veja [LICENSE](LICENSE).
