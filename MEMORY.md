# MEMORY.md

## Projeto

Frontend principal do ELO/Conjugal em Next.js, React e TypeScript.

Raiz:

```text
C:\CONJUGAL\elo-front-master-new
```

Responsabilidades principais:

- Interface operacional do produto.
- Consumo da API NestJS.
- Telas administrativas.
- Tela financeira SaaS recorrente.

## Comandos

Rodar local:

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

Porta esperada:

```text
http://localhost:3001
```

## Estrutura Relevante

Tela de billing:

```text
C:\CONJUGAL\elo-front-master-new\src\app\(main)\billing\page.tsx
```

Servico de billing:

```text
C:\CONJUGAL\elo-front-master-new\src\services\billing.service.ts
```

Menu lateral:

```text
C:\CONJUGAL\elo-front-master-new\src\components\sidebar.tsx
```

## Fluxo Financeiro SaaS

A tela `/billing` foi criada como painel operacional para:

- Visualizar status da conta/assinatura.
- Ver receita recebida e indicadores de webhooks.
- Criar e listar planos.
- Iniciar assinatura via Asaas.
- Ver parceiros pendentes.
- Ver comissoes e liberacoes.

## Padroes de UI

- Seguir os componentes e estilo existentes.
- Evitar landing page quando a demanda for ferramenta operacional.
- Priorizar telas densas, claras e escaneaveis.
- Usar icones em itens de menu quando houver padrao existente.
- Conferir responsividade quando alterar layout.

## Cuidados

- Depois de alterar UI, rodar `npm run build`.
- Manter chamadas de API centralizadas em `src/services`.
- Nao alterar telas de rotas/driver fora do escopo sem pedido explicito.
- Ao adicionar nova pagina em `(main)`, verificar menu e permissao de acesso.

