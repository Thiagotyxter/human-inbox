# Contribuindo

Obrigado por contribuir com o Tyxter Human Inbox.

## Desenvolvimento

1. Crie um fork e uma branch curta para sua mudança.
2. Instale com `npm install`.
3. Copie `.env.example` para `.env.local` e use credenciais de desenvolvimento.
4. Para mudanças de banco, adicione uma migration em `supabase/migrations/`.
5. Não inclua segredos, payloads reais de clientes ou dados pessoais em commits e fixtures.

## Validação obrigatória

```bash
npm run typecheck
npm run lint
npm run build
```

Teste também o fluxo afetado no navegador. Para mídia, valide imagem e áudio; para handoff, valide takeover, bloqueio do agente e release.

## Pull requests

Descreva o problema, a abordagem, o impacto, migrations ou variáveis novas e as evidências de validação. Mantenha o PR focado.
