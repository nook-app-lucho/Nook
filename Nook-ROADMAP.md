# ROADMAP — Nook

> Roadmap de produto e engenharia atualizado para o snapshot `Nook - 25 Out.zip` e a rodada P0 de 25/10/2026.
>
> Princípio central: **aumentar valor percebido sem transformar o Nook em um ERP de casal**. A simplicidade é parte do produto, não apenas uma restrição técnica.

---

# 1. Visão de produto para orientar o roadmap

O Nook funciona melhor quando é entendido como **o pequeno espaço compartilhado do casal para organizar o cotidiano e preservar a vida a dois**.

Ele já combina quatro necessidades que normalmente ficam espalhadas em vários apps:

1. **Organização prática** — listas, agenda e contas.
2. **Coordenação do casal** — responsáveis, confirmações, divisão financeira e decisões compartilhadas.
3. **Conexão emocional** — humor e mural de recados.
4. **História do casal** — metas, memórias e cápsula do tempo.

O roadmap deve aprofundar essas quatro camadas sem adicionar novas áreas de navegação sempre que surgir uma ideia nova.

## North Star do produto

Abrir o Nook e, em menos de 10 segundos, responder:

- Como estamos hoje?
- O que precisamos resolver hoje?
- Tem alguma conta ou compromisso que merece atenção?
- Há algo do meu parceiro que eu deveria ver?
- Como estão nossos planos e nossa história?

Se uma funcionalidade não ajuda uma dessas perguntas, provavelmente não é prioridade.

---

# 2. Regras de simplicidade

Estas regras devem ser usadas para aceitar ou rejeitar features futuras.

## Regra 1 — Não criar módulo quando uma feature cabe em um módulo existente

Exemplos:

- Rotina doméstica → Lista.
- Date night → Lista de decisão.
- Contas recorrentes → Finanças.
- Viagem futura → Meta + Lista + Agenda.
- Hábito do casal → Meta.
- Lembrete romântico → Recado ou Agenda.

## Regra 2 — Preferir ações manuais simples a automações complexas

Exemplo: antes de desenvolver um mecanismo de recorrência mensal completo para despesas, oferecer **“Duplicar para o próximo mês”**.

Isso resolve 80% do problema com muito menos risco.

## Regra 3 — Uma ação frequente deve exigir no máximo 1–2 interações

Adicionar tarefa, conta, compromisso, reação ou progresso de meta precisa continuar extremamente rápido.

## Regra 4 — Progressive disclosure

A tela inicial não precisa mostrar tudo. Deve mostrar o que merece atenção agora e oferecer “Ver tudo” quando necessário.

## Regra 5 — Segurança e confiabilidade vencem feature nova

Fotos privadas, dados financeiros, isolamento por casal e conflitos de edição precisam estar corretos antes de aumentar o escopo.

## Regra 6 — Não migrar de stack sem uma dor concreta

A arquitetura atual em HTML/CSS/JavaScript modular é adequada para o tamanho do Nook.

**Não recomendo migrar para React/Next/Vue apenas por modernização.**

## Regra 7 — Evitar dependências

Sempre que algo puder ser resolvido com APIs nativas do browser ou poucas linhas de JavaScript, preferir isso a instalar uma biblioteca.

---

# 3. Diagnóstico atual

## O que está bom e deve ser preservado

- JavaScript separado por módulos funcionais.
- Regras puras concentradas em `rules.js`.
- Estado e acesso ao Supabase concentrados em `store.js`.
- Proteções contra resposta assíncrona obsoleta.
- Serialização de alterações concorrentes.
- `nook_version` para evitar sobrescritas cegas.
- Realtime entre as duas pessoas.
- Revalidação ao voltar do background ou recuperar conexão.
- PWA extremamente leve.
- Feedback háptico e microinterações.
- Personalidade visual própria.
- Módulo de decisão dentro de Listas em vez de criar outra área.
- Cálculos financeiros isolados em regras puras.
- Boa preocupação com dados inválidos e preservação de conteúdo original.

## Principais limitações atuais

### Produto/UI

- A Home contém muitas seções completas e pode começar a parecer feed/dashboard longo.
- A barra inferior possui 6 destinos; é muita coisa para uma navegação mobile primária.
- Configurações ocupam espaço equivalente a módulos usados diariamente.
- Vários fluxos ainda usam `alert`, `confirm` e `prompt`, quebrando a identidade visual.
- Há estilos inline em HTML gerado por JavaScript.
- Algumas telas têm excelente empty state; outras ainda são mais funcionais que refinadas.

### Funcionalidades

- Agenda permite criar e excluir, mas não editar compromisso.
- Metas permitem criar/progredir/excluir, mas não editar configuração.
- Não existe desfazer um depósito ou incremento de meta.
- Finanças não oferecem uma forma simples de repetir uma conta mensal.
- Home mostra a linha do tempo completa, o que perde escalabilidade conforme as memórias crescem.
- Mural não permite “até eu remover”.

### Correções P0 concluídas em 25/10/2026

- Mural alinhado em uma fonte única de reações: `❤️`, `😘`, `☕`.
- “Remover concluídas” virou **Limpar concluídas**, com bottom sheet e copy de exclusão definitiva.
- Resumo financeiro mensal passou a considerar somente despesas do mês selecionado; “A pagar” permanece um conceito global separado.
- Boot inicial removeu o segundo `fetchProfile()` e evita refresh redundante no primeiro `SUBSCRIBED`.
- Fotos passaram a usar bucket privado, path iniciado por `couple_id`, signed URL temporária e cache em memória.
- Operações comuns de fotos foram centralizadas em `store.js`.
- `setup.sql` está versionado na raiz como baseline do backend.
- Dependências CDN relevantes estão fixadas em versões explícitas.
- Service Worker avançou para `nook-v1.08`.

### Infraestrutura ainda pendente/para validar

- Executar smoke test completo contra o Supabase real, especialmente Auth/RLS/Storage/Realtime em P1/P2.
- Migrar URLs antigas de fotos somente se o uso real justificar; compatibilidade de leitura permanece ativa.
- Corrigir mensagens antigas que ainda citam `INSTRUCOES.md`.
- Não há testes automatizados das regras de negócio.
- Compressão client-side de imagens continua fora do P0.

---

# 4. Prioridades

Legenda:

- **P0** — corrigir antes de ampliar funcionalidades.
- **P1** — alto impacto / baixa ou média complexidade.
- **P2** — bom valor, depois da experiência principal estar sólida.
- **P3** — somente após uso real comprovar necessidade.

Complexidade:

- **S** — pequena.
- **M** — média.
- **L** — grande.

---

# 5. Fase 0 — Confiabilidade antes de novas features

Objetivo: eliminar inconsistências e deixar frontend + Supabase alinhados.

## P0.1 — Corrigir reações do mural

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S

Implementado com uma única fonte de verdade em `rules.js`:

- ❤️
- 😘
- ☕

A rodada não criou contagem por usuário, toggle nem tabela separada de reações.

### Critério de pronto

Toda reação disponível na UI deve ser aceita pelo `store` e sincronizada entre as duas pessoas.

---

## P0.2 — Corrigir “Remover concluídas”

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S

Implementado sem criar archive/arquivo morto.

A ação agora usa copy de exclusão definitiva, por exemplo:

> Excluir 4 itens concluídos? Esta ação não poderá ser desfeita.

E o botão passou a ser:

> Limpar concluídas

A confirmação usa bottom sheet e revalida a quantidade antes de excluir.

---

## P0.3 — Tornar fotos realmente privadas

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** M

Implementado com bucket `photos` privado e paths:

```text
<couple_id>/avatars/...
<couple_id>/covers/...
<couple_id>/memories/...
```

Salvar no banco **o path do arquivo**, não uma URL pública ou signed URL temporária.

Ao renderizar:

- gerar signed URL;
- mantê-la em cache apenas na sessão;
- renovar quando necessário.

### Também fazer

- Excluir arquivo antigo ao substituir avatar/capa quando seguro.
- Excluir a foto associada ao apagar uma memória.
- Configurar limite de tamanho e MIME no bucket além da validação de frontend.

### Não fazer

- Criar CDN própria.
- Criar serviço de imagens separado.
- Adicionar biblioteca de upload.

---

## P0.4 — Centralizar operações de fotos

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S/M

Avatar, capa e memória agora reutilizam helpers pequenos centralizados em `store.js`:

```text
uploadPhoto(folder, file)
resolvePhotoUrl(path)
deletePhoto(path)
```

A implementação ficou em `store.js`, sem criar arquitetura de services.

---

## P0.5 — Versionar o backend

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S

Baseline implementada como:

```text
setup.sql
```

Ele contém:

- tabelas;
- índices;
- RLS;
- policies;
- triggers de `nook_version`;
- RPC `nook_join`;
- RPC `nook_set_mood`;
- Realtime;
- bucket e policies de Storage.

Para o tamanho atual, **um baseline SQL único continua mais simples que uma estrutura sofisticada de migrations**. Para evoluções incompatíveis futuras, adicionar SQL explícito de alteração/migração em vez de confiar em `CREATE TABLE IF NOT EXISTS`.

---

## P0.6 — Corrigir semântica do resumo financeiro mensal

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S/M

Implementado separando claramente:

### A pagar

Todas as despesas pendentes relevantes, independentemente do mês selecionado.

### Resumo do mês selecionado

Somente despesas cuja data pertence ao mês selecionado.

O gráfico por categoria usa o segundo conjunto.

Isso evita que uma conta pendente de outro mês distorça o gráfico atual.

---

## P0.7 — Remover consulta duplicada de perfil

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S

Antes da correção, `routeApp()` fazia `fetchProfile()` e `store.init()` repetia a leitura.

Agora o fluxo inicial faz uma única leitura de perfil; o primeiro `SUBSCRIBED` também não dispara uma hidratação redundante. Não foi criado cache global complexo.

---

## P0.8 — Fixar versões externas

**Status:** ✅ Concluído na rodada de 25/10/2026.

**Complexidade:** S

Dependências CDN relevantes foram fixadas em versões explícitas:

- Supabase JS `2.118.0`;
- Phosphor Icons Web `2.1.2`;
- mobile-drag-drop `2.3.0-rc.2`;
- canvas-confetti `1.6.0`.

Objetivo preservado: deploy reproduzível e menos surpresas de runtime.

---

# 6. Fase 1 — Simplificação visual e experiência principal

Esta é a fase que provavelmente produzirá o maior salto percebido no Nook.

## P1.1 — Redesenhar a Home para “Hoje primeiro”

**Complexidade:** M

A Home atual tenta mostrar muita coisa completa.

Nova hierarquia sugerida:

### Bloco 1 — Identidade

Hero um pouco mais compacto:

- foto/capa;
- nomes/avatares;
- saudação;
- tempo juntos.

### Bloco 2 — Como estamos

Manter os dois moods.

### Bloco 3 — Hoje

Um único card/resumo com:

- próximo compromisso;
- quantidade de tarefas pendentes;
- contas vencendo/atrasadas;
- ação prioritária.

Exemplo:

```text
Hoje
18:30 • Jantar com Ana
3 tarefas pendentes
1 conta vence hoje
```

Cada linha leva ao módulo correspondente.

### Bloco 4 — Recado

Mostrar apenas o recado mais recente ou no máximo 2.

Botão:

> Ver mural

### Bloco 5 — Nós

Mostrar:

- cápsula do tempo, quando existir;
- 2–3 memórias recentes;
- CTA “Ver nossa linha do tempo”.

### Resultado

A Home deixa de ser “todos os módulos empilhados” e passa a ser **um resumo inteligente da vida do casal**.

---

## P1.2 — Reduzir navegação inferior para 5 itens

**Complexidade:** S

Sugestão:

```text
Início | Listas | Agenda | Finanças | Metas
```

Retirar `Ajustes` da bottom bar.

Acessar Ajustes por um ícone discreto no topo da Home.

Isso preserva todas as funcionalidades e reduz ruído.

---

## P1.3 — Padronizar ações destrutivas e confirmações

**Complexidade:** M

Substituir gradualmente:

- `alert()`;
- `confirm()`;
- `prompt()`.

Por bottom sheets e toasts já compatíveis com a linguagem visual do Nook.

Prioridade:

1. Renomear lista.
2. Excluir lista.
3. Excluir memória.
4. Excluir meta.
5. Excluir conta.
6. Alertas de mood/roleta.

Não precisa criar um framework de modal. Reutilizar `bottom-sheet` existente.

---

## P1.4 — Tirar estilos inline do JavaScript

**Complexidade:** S/M

Há várias estruturas HTML geradas com CSS inline.

Mover para classes em `style.css`.

Benefícios:

- dark mode mais previsível;
- visual consistente;
- HTML gerado mais legível;
- manutenção mais fácil.

---

## P1.5 — Criar hierarquia consistente de cards

**Complexidade:** S

Definir apenas três padrões:

### Card principal

Informação importante e clicável.

### Row card

Listas, contas e compromissos.

### Highlight card

Cápsula, settlement financeiro e alertas.

Evitar criar um estilo novo para cada feature.

---

## P1.6 — Melhorar estados de loading

**Complexidade:** S/M

Hoje existe um estado global de carregamento.

Adicionar skeleton apenas onde realmente melhora a experiência:

- Home;
- Lista de despesas;
- Agenda;
- Memórias.

Não criar skeleton para cada botão ou modal.

---

## P1.7 — Estado offline explícito

**Complexidade:** S

O service worker mantém o shell, mas os dados dependem do Supabase.

Quando `navigator.onLine === false`:

- mostrar um pequeno banner “Sem conexão”;
- manter dados já carregados visíveis;
- bloquear gravações com mensagem clara.

**Não implementar fila offline de mutações agora.**

É muito mais complexo do que o benefício atual.

---

## P1.8 — Acessibilidade básica

**Complexidade:** S

- garantir alvos de toque de ~44px;
- `aria-label` em botões apenas com ícone;
- manter foco visível;
- respeitar `prefers-reduced-motion`;
- revisar contraste no dark mode;
- evitar que informação dependa somente de cor.

---

# 7. Módulo: Login, criação do Nook e onboarding

## Estado atual

Já há:

- login;
- cadastro;
- criação do espaço;
- entrada via código;
- etapa de aprovação;
- nomes;
- data do relacionamento;
- avatar por emoji ou foto.

A base é suficiente.

## P1 — Compartilhar convite nativamente

**Complexidade:** S

Além de copiar o código, usar `navigator.share()` quando disponível.

Exemplo:

> Vem pro nosso Nook 💛 Código: ABC123

Fallback: copiar para clipboard.

---

## P1 — Mostrar estado do convite

**Complexidade:** S

Em Ajustes:

```text
Parceiro conectado ✓
```

ou

```text
Esperando seu parceiro entrar
[Compartilhar convite]
```

Isso reduz dúvida sem criar novo fluxo.

---

## P2 — Simplificar aprovação

Se o Nook passar a ser usado por pessoas fora do teste pessoal, reavaliar `approved=false` como fluxo padrão.

Possível evolução:

1. email confirmado;
2. cria/entra no Nook;
3. acesso liberado automaticamente.

Manter aprovação manual somente se ela estiver cumprindo uma função real de beta fechado.

---

## Não fazer agora

- login social;
- telefone/OTP;
- múltiplos casais por conta;
- perfis familiares;
- permissões complexas.

---

# 8. Módulo: Home

A Home deve receber a maior parte do investimento de UI.

## P1 — “Hoje” agregado

Usar apenas dados que já existem:

- próximo evento de hoje;
- tarefas pendentes;
- conta vencendo ou atrasada;
- mood do casal.

Nenhuma tabela nova.

---

## P1 — Quick Add

**Complexidade:** S/M

Adicionar um único botão `+` na Home.

Ao tocar:

```text
Adicionar...
Tarefa
Conta
Compromisso
Recado
Memória
```

Cada opção abre o bottom sheet já existente.

Isso melhora muito o uso diário sem duplicar lógica.

---

## P1 — Preview em vez de feed completo

Home:

- 1–2 recados;
- 3 memórias;
- 1–3 eventos do dia.

As telas especializadas mostram o resto.

---

## P2 — Resumo da semana

**Complexidade:** M

Gerado dinamicamente a partir dos dados existentes.

Exemplo:

```text
Nossa semana
4 compromissos
7 tarefas abertas
R$ 820 em contas vencendo
Meta Viagem: 62%
```

Nenhum dado novo precisa ser salvo.

---

## P2 — “Uma coisa para nós”

Card leve gerado a partir do que já existe.

Exemplos:

- “Vocês ainda não registraram uma memória este mês.”
- “A meta Viagem chegou a 75% 🎉”
- “Hoje faz 2 anos daquela memória…”

Importante: usar regras determinísticas simples. **Não precisa IA.**

---

# 9. Módulo: Humor

## Manter simples

O mood funciona bem justamente por ser instantâneo.

## P1 — Permitir trocar o humor do próprio usuário

O comportamento atual já suporta atualização; apenas deixar claro visualmente que tocar novamente altera.

---

## P1 — Feedback do parceiro

Quando o parceiro já marcou:

- mostrar o mood;
- manter card read-only;
- evitar `alert()` ao tocar;
- usar toast discreto.

---

## P3 — Histórico de humor

**Não recomendo agora.**

Isso exigiria mudar a modelagem de `moods` de estado diário único para histórico, introduziria analytics e mudaria a natureza leve da feature.

Só fazer se uso real mostrar valor.

---

# 10. Módulo: Mural de recados

## ✅ Concluído — Corrigir reações

Concluído na Fase 0 em 25/10/2026.

---

## P1 — Opção “Até eu remover”

**Complexidade:** S

O renderer já aceita nota sem expiração.

Adicionar ao seletor:

```text
24 horas
3 dias
7 dias
Até eu remover
```

---

## P1 — Mostrar apenas recados atuais na Home

Já ocorre por expiração; complementar limitando quantidade mostrada.

---

## P2 — Editar recado

**Complexidade:** S/M

Útil, mas menos prioritário que edição de agenda e metas.

Se implementado, reutilizar `captureEdit/saveEdit`.

---

## Não fazer agora

- threads;
- comentários;
- chat;
- anexos;
- status de leitura;
- notificação push.

O mural é charmoso porque **não é um mensageiro**.

---

# 11. Módulo: Memórias

Este é um dos diferenciais emocionais mais fortes do Nook.

## ✅ Concluído — Storage privado

Concluído na Fase 0 em 25/10/2026; resta smoke test real do ambiente Supabase.

---

## P1 — Timeline progressiva

Home mostra apenas as últimas 3 memórias.

Botão:

> Ver todas as memórias

Abrir bottom sheet ou uma subview simples com timeline completa.

Não é necessário criar item novo na navegação principal.

---

## P1 — Viewer de foto

**Complexidade:** S

Tocar na memória abre:

- foto maior;
- data;
- título;
- descrição;
- editar;
- excluir.

A grid permanece limpa.

---

## P1 — Lazy loading das imagens

**Complexidade:** S/M

Para memórias, preferir `<img loading="lazy">` com `object-fit: cover` em vez de usar todas como `background-image`.

Benefícios:

- browser controla carregamento;
- melhor acessibilidade;
- melhor performance conforme timeline cresce.

---

## P1 — Compressão antes de upload

**Complexidade:** M

Sem biblioteca externa:

1. carregar imagem em `Image`;
2. limitar maior lado, por exemplo, a uma dimensão razoável para mobile;
3. converter via Canvas para WebP/JPEG;
4. fazer upload.

Isso reduz armazenamento e tempo de carregamento.

Não precisa preservar foto original em 8 MB para um card mobile.

---

## P2 — Busca simples

**Complexidade:** S

Filtro client-side por:

- título;
- descrição;
- ano.

Só adicionar quando existirem memórias suficientes para justificar.

---

## P2 — Cápsula aprimorada

Além de “neste dia”, mostrar ocasionalmente:

```text
Há 1 ano...
Há 2 anos...
```

O mecanismo já existe; é mais UI que infraestrutura.

---

## Não fazer agora

- álbum separado;
- reconhecimento facial;
- mapa;
- vídeo;
- tagging complexo;
- IA para gerar texto.

---

# 12. Módulo: Listas

É provavelmente o módulo de maior frequência de uso.

## P1 — Substituir prompt de renomear por bottom sheet

**Complexidade:** S

Mantém visual consistente e permite validação melhor.

---

## P1 — Separar pendentes de concluídas

**Complexidade:** S/M

Em vez de misturar e depender apenas do estilo `completed`:

```text
Pendentes (5)
...

Concluídas (3) ▾
```

Concluídas começam recolhidas.

Isso reduz ruído visual.

---

## ✅ Concluído — Limpar concluídas com copy correta

Concluído na Fase 0 em 25/10/2026.

---

## P1 — Duplicar lista

**Complexidade:** S

Muito útil para:

- mercado;
- viagem;
- mala;
- checklist recorrente.

Duplica estrutura e itens, inicialmente todos como `completed=false`.

É mais simples que criar recorrência de tarefas.

---

## P1 — Templates de lista

**Complexidade:** S

Na criação, oferecer opcionalmente:

```text
Em branco
Compras de mercado
Limpeza da casa
Viagem
Filmes/séries
Date night
```

Templates são arrays JavaScript locais. Nenhuma tabela nova.

O usuário continua podendo criar uma lista vazia.

---

## P1 — Roleta melhor

Adicionar:

- “Sortear novamente”;
- “Aceitar escolha”.

Hoje a escolha final já pode marcar o item como concluído.

Não registrar histórico da roleta ainda.

---

## P2 — Duplicar item

**Complexidade:** S

Ação secundária no menu de edição.

---

## P2 — Busca dentro da lista ativa

**Complexidade:** S

Só se listas começarem a ficar grandes.

---

## P2 — Ordenação manual mobile mais previsível

O drag-and-drop atual depende de polyfill.

Alternativa mais simples e acessível se houver problemas reais:

- botão ↑;
- botão ↓.

Não precisa substituir agora se drag funciona bem nos aparelhos usados.

---

## Não adicionar por enquanto

- subtarefas;
- comentários;
- anexos;
- dependências;
- Kanban;
- datas obrigatórias;
- recorrência complexa.

Se uma tarefa precisa de data e horário, Agenda é o lugar natural.

---

# 13. Módulo: Agenda

## P1 — Editar compromisso

**Complexidade:** M

É a maior lacuna funcional do módulo.

Reutilizar o formulário atual e o mecanismo:

```text
captureEdit()
saveEdit()
```

Campos:

- título;
- data;
- hora;
- responsável;
- local/nota.

---

## P1 — Melhorar o card do próximo compromisso

Na Home:

- mostrar apenas próximo evento;
- hora;
- título;
- responsável;
- “+2 hoje” se houver mais.

---

## P1 — Duplicar compromisso

**Complexidade:** S

Ação:

> Duplicar

Depois o usuário altera data/hora.

---

## P1/P2 — Atalhos de repetição simples

Em vez de um motor de recorrência:

```text
Duplicar para amanhã
Duplicar para semana que vem
Duplicar para mês que vem
```

Resolve atividades recorrentes sem RRULE, jobs ou geração automática.

---

## P2 — Compromisso sem horário

**Complexidade:** M

Adicionar toggle:

> Dia todo

Só fazer se uso real exigir; hoje horário obrigatório mantém a modelagem simples.

---

## P2 — Melhorar confirmação de compromisso do casal

O atual “Ambos cientes” é uma boa ideia.

Melhorias pequenas:

- mostrar quem criou;
- botão “Ciente” somente para parceiro;
- feedback por toast.

Não criar RSVP completo.

---

## Não fazer agora

- Google Calendar sync;
- Apple Calendar sync;
- push notifications;
- convidados;
- recorrência RRULE;
- timezone avançado.

---

# 14. Módulo: Finanças

Este módulo precisa ser simples o suficiente para não competir com apps financeiros completos.

A proposta deve continuar sendo:

> “O que temos que pagar e como dividimos isso entre nós?”

Não:

> “Controle financeiro completo da nossa vida.”

## ✅ Concluído — Corrigir escopo mensal

Concluído na Fase 0 em 25/10/2026.

---

## P1 — Status de vencimento

**Complexidade:** S

Cada conta pendente deve mostrar:

- hoje;
- amanhã;
- em X dias;
- atrasada há X dias.

Sem notification engine.

---

## P1 — Separar visualmente

```text
Atrasadas
Vencem em breve
Depois
```

Somente se houver itens em cada bloco.

---

## P1 — “Duplicar para próximo mês”

**Complexidade:** S

Ação na conta:

> Repetir no próximo mês

Duplica:

- título;
- valor;
- categoria;
- responsável;
- dia equivalente do próximo mês;
- `completed=false`.

Essa é minha recomendação no lugar de recorrência automática.

---

## P1 — Filtro mensal real

Permitir selecionar o mês e ver:

- total daquele mês;
- categorias daquele mês;
- pagas;
- pendentes daquele mês.

Manter um card separado para “Total pendente geral”.

---

## P1 — Acerto mais explicativo

Hoje o cálculo já existe.

Melhorar copy:

```text
Para equilibrar as contas de outubro:
Luis transfere R$ 148,30 para X
```

ou

```text
Tudo equilibrado neste mês ✓
```

---

## P2 — “Marcar todas como pagas” não recomendado

É fácil demais cometer erro.

Melhor manter ação individual.

---

## P2 — Categorias adicionais somente se necessário

Hoje:

- Moradia;
- Mercado;
- Lazer;
- Transporte;
- Outros.

Antes de permitir categorias customizadas, observar se `Outros` está concentrando uso demais.

Categorias customizadas aumentam bastante a complexidade de gráficos, cores e edição.

---

## P2 — Resumo mensal leve

```text
Outubro
R$ 3.280 em despesas
Moradia 46%
12 contas pagas
2 pendentes
```

Sem orçamento, patrimônio ou fluxo de caixa.

---

## Não fazer agora

- Open Finance;
- importação bancária;
- cartões;
- parcelamento sofisticado;
- orçamento por envelope;
- investimentos;
- OCR de boleto;
- conciliação automática.

Essas features mudariam completamente o escopo do Nook.

---

# 15. Módulo: Metas

## P1 — Editar meta

**Complexidade:** M

Atualmente é possível criar/progredir/excluir.

Adicionar edição de:

- título;
- ícone;
- responsável;
- alvo;
- prazo;
- unidade.

Preservar histórico existente.

---

## P1 — Estado concluído

**Complexidade:** S

Quando `current >= target`:

- card ganha estado “Concluída 🎉”;
- esconder CTA de contribuição;
- manter histórico acessível.

---

## P1 — Separar ativas e concluídas

```text
Em andamento
Concluídas ▾
```

Concluídas recolhidas por padrão.

Nenhum campo `archived` obrigatório.

---

## P1 — Desfazer último lançamento

**Complexidade:** M

Para corrigir erro de toque:

- “Desfazer último depósito”;
- “Desfazer último +1”.

Usar o último item do histórico e recalcular `current`.

Isso é muito mais importante que adicionar mais tipos de meta.

---

## P1 — Clarificar meta de hábito

Hoje uma meta de hábito representa uma quantidade total.

Copy sugerida:

> Quantas vezes vocês querem fazer isso?

Evitar transmitir ideia de streak diário/semanal enquanto esse comportamento não existe.

---

## P2 — Templates de meta

**Complexidade:** S

Exemplos:

- Reserva de viagem;
- Entrada da casa;
- Date nights;
- Treinos juntos;
- Filmes para ver juntos.

O template apenas preenche o formulário.

---

## P3 — Metas recorrentes/hábitos por período

Somente depois de validar necessidade.

Exigiria:

- períodos;
- resets;
- streak;
- calendário;
- regras de atraso.

É uma escalada grande de complexidade.

---

# 16. Módulo: Ajustes

## P1 — Tirar da bottom navigation

Manter acessível pela Home.

---

## P1 — Organizar em quatro grupos

```text
Nosso Nook
- Editar perfil
- Compartilhar convite

Aparência
- Tema

Dados
- Exportar backup

Conta
- Sair
```

---

## P1 — Compartilhar código

Já descrito.

---

## P2 — Exportar backup JSON

**Complexidade:** S/M

Gerar um arquivo com:

- perfil;
- listas;
- agenda;
- finanças;
- metas;
- memórias sem bytes de fotos;
- recados.

Primeiro implementar **somente exportação**.

Importação traz muito mais risco de conflito e corrupção e pode esperar.

---

## P2 — Informações técnicas discretas

No rodapé:

```text
Nook v1.x
Última sincronização: agora
```

Útil principalmente enquanto o app está em desenvolvimento.

---

# 17. Nova funcionalidade transversal: Resumo da semana

Esta seria minha principal feature nova depois do polimento dos módulos existentes.

## Por que vale a pena

Ela conecta módulos sem criar um novo sistema.

## Dados usados

- Agenda próximos 7 dias.
- Tarefas pendentes.
- Contas vencendo.
- Meta mais próxima de conclusão.
- Memória/cápsula relevante.

## Onde fica

Home.

Não criar nova aba.

## Exemplo

```text
Nossa semana

3 compromissos
5 tarefas abertas
R$ 640 vencem até domingo
Viagem está em 78%

[Ver semana]
```

## Complexidade

Média, mas quase toda no frontend.

---

# 18. Nova funcionalidade transversal: Quick Add

Minha segunda feature transversal favorita.

Um único botão acessa todas as ações frequentes.

```text
+ Tarefa
+ Conta
+ Compromisso
+ Recado
+ Memória
```

Não adiciona tabela, regra de negócio ou dependência.

É uma melhoria de **velocidade percebida**.

---

# 19. Nova funcionalidade transversal: Templates

Templates são uma forma excelente de adicionar valor sem adicionar arquitetura.

## Listas

- Mercado.
- Limpeza.
- Mala de viagem.
- Filmes.
- Date night.

## Metas

- Viagem.
- Reserva.
- Experiência juntos.
- Hábito compartilhado.

## Decisão

- Onde comer.
- O que assistir.
- O que fazer no fim de semana.

Tudo pode morar em constantes JavaScript locais.

Nenhum backend adicional.

---

# 20. Performance

O Nook já é pequeno. O objetivo não é micro-otimizar, e sim evitar problemas futuros óbvios.

## ✅ Concluído — Remover fetch duplicado de profile

Concluído na Fase 0 em 25/10/2026.

---

## P1 — Lazy load das memórias

Já descrito.

---

## P1 — Comprimir imagens

Já descrito.

---

## P1 — Limitar render da Home

Não renderizar toda timeline de memórias e todos os recados na Home.

Isso melhora simultaneamente UX e performance.

---

## P2 — Renderizar apenas itens da lista ativa

Hoje `renderLists()` cria DOM para todos os itens de todas as listas e esconde os não ativos.

Para um app pessoal isso funciona bem.

Só mudar quando houver sinais como:

- centenas de itens;
- lentidão de render;
- memória excessiva.

Se acontecer, renderizar apenas a lista ativa será mais simples do que virtualização.

**Não implementar virtual list.**

---

## P2 — Selecionar somente colunas necessárias

O store usa `select('*')`.

Pode futuramente trocar por colunas explícitas, mas o ganho atual é pequeno.

Prioridade baixa.

---

## ✅ Concluído — Cache de signed URLs

Implementado em memória junto do Storage privado:

```text
path -> { url, expiresAt }
```

Não usa `localStorage` persistente.

---

## P2 — Atualização do PWA

O service worker protege contra mistura de versões, o que é bom.

Adicionar posteriormente um aviso:

> Uma nova versão do Nook está disponível.
> [Atualizar]

Sem forçar refresh no meio de uma sessão.

---

# 21. Qualidade de código

## Princípio

Melhorar código sem transformar o projeto em arquitetura enterprise.

## P1 — Constantes de domínio

Hoje aparecem valores como:

```text
IS
VO
Casal
```

Centralizar em `rules.js` ou `store.js`:

```js
OWNER.P1
OWNER.P2
OWNER.COUPLE
```

Não precisa migrar banco ou refatorar tudo de uma vez.

---

## ✅ Concluído — Helpers de Storage

`uploadPhoto`, `resolvePhotoUrl`/`getPhotoDisplayUrl` e `deletePhoto` foram centralizados em `store.js`.

---

## P1 — Remover duplicação de UI de confirmação

Criar um bottom sheet de confirmação reutilizável simples.

Não criar componente genérico complexo.

---

## P1 — Manter regras fora do DOM

Continuar usando `rules.js` para:

- cálculos financeiros;
- datas;
- validações;
- progresso de metas;
- normalizações.

Esse é um dos melhores padrões atuais do projeto.

---

## P1 — Testes das regras puras

As primeiras funções que merecem testes:

- `cents`;
- `validDate`;
- `daysTogether`;
- `financeShare`;
- `financialSummary`;
- `normalizeListItems`;
- `normalizeGoalHistory`;
- `goalProgress`;
- `goalForecast`;
- `validateExpense`;
- `validateGoal`.

### Abordagem simples

Usar test runner nativo do Node, sem Jest/Vitest, se possível.

Adicionar somente a infraestrutura mínima necessária para rodar:

```text
node --test
```

Prioridade maior para finanças, porque um erro ali é muito mais grave que um erro cosmético.

---

## P2 — Dividir `home.js` somente quando necessário

`home.js` já reúne mood, memória, mural e hero.

Se crescer muito após o roadmap, considerar:

```text
home.js
memories.js
notes.js
```

Não dividir agora apenas por estética arquitetural.

---

## P2 — Event delegation somente onde houver ganho claro

Listas criam muitos listeners por item.

Event delegation pode reduzir isso, mas também aumenta indireção.

Fazer somente se o volume real justificar.

---

## P2 — Padronizar nomenclatura gradual

Hoje há mistura de português, inglês e identificadores históricos.

Não fazer mega-refactor.

Apenas definir que **código novo** segue uma convenção consistente.

Sugestão:

- nomes técnicos em inglês;
- textos de interface em pt-BR;
- IDs estáveis e sem nomes pessoais históricos.

---

# 22. Segurança e privacidade

## ✅ Concluído no baseline — RLS em todas as tabelas

`setup.sql` define policies por membership/couple para as tabelas compartilhadas. O frontend não é barreira de segurança; validar a implantação real continua obrigatório.

---

## ✅ Concluído no código — Storage privado e por casal

Frontend e `setup.sql` estão alinhados; validar o ambiente Supabase real no smoke test.

---

## ✅ Concluído no baseline — RPCs seguras

`setup.sql` versiona `nook_join` e `nook_set_mood` com o contrato de autorização atual. Validar o comportamento no projeto Supabase implantado continua parte do smoke test.

---

## ✅ Concluído — Limites do Storage

`setup.sql` configura 8 MB e MIME types `image/jpeg`, `image/png`, `image/webp` e `image/gif`; o frontend também valida para UX.

---

## P1 — Limpeza de arquivos órfãos

Ao trocar ou excluir uma foto do próprio Nook, remover arquivo antigo quando não houver mais referência.

---

## P2 — Exclusão da conta

Necessária antes de transformar o app em produto público.

Para uso pessoal atual, pode esperar.

---

# 23. PWA e experiência mobile

## P1 — Banner offline

Já descrito.

---

## P1 — Instalação

Opcionalmente mostrar uma dica de instalação depois de algumas sessões, não no primeiro acesso.

Não bloquear experiência.

---

## P1 — Safe areas

Continuar respeitando `env(safe-area-inset-*)` especialmente na bottom bar e sheets.

---

## P2 — Nova versão disponível

Já descrito.

---

## Não fazer agora

- background sync complexo;
- offline mutations;
- push infrastructure;
- native wrapper/Cordova/Capacitor.

A PWA é suficiente para o estágio atual.

---

# 24. UI Design System mínimo

Não criar Storybook, tokens JSON ou biblioteca de componentes.

Manter apenas um sistema CSS pequeno.

## Tokens que vale adicionar

Além dos já existentes:

```text
--space-1
--space-2
--space-3
--shadow-sm
--shadow-md
--danger
--success
--warning
```

## Componentes visuais canônicos

- `.btn-primary`
- `.btn-secondary`
- `.btn-danger`
- `.icon-button`
- `.dash-card`
- `.row-card`
- `.bottom-sheet`
- `.empty-state`
- `.status-badge`
- `.toast-notification`

Evitar criar uma classe visual exclusiva para cada tela.

---

# 25. Melhorias pequenas de UX com alto retorno

## P1

- Autofocus no campo principal ao abrir formulário.
- Data padrão = hoje onde fizer sentido.
- Preservar data selecionada da Agenda ao adicionar evento.
- Mostrar success toast após operações importantes.
- Mensagens de erro humanas, sem texto técnico do Supabase.
- Botões de ícone com tooltip/`aria-label`.
- Não fechar modal se gravação falhou.
- Desabilitar ação enquanto grava.
- Manter proteção contra alterações não salvas.
- Mostrar “Salvando…” somente quando operação for perceptível.

## P2

- Animações de entrada/saída mais discretas.
- `prefers-reduced-motion`.
- Haptic somente em ações importantes; evitar excesso.
- Empty states contextuais com CTA único.

---

# 26. Features que parecem boas, mas eu deixaria fora do roadmap principal

## Chat do casal

Já existem WhatsApp/iMessage. Não há vantagem em competir.

## IA

Nenhuma dor atual exige IA.

## Feed social

Mudaria completamente o produto.

## Gamificação/pontos

Pode tornar tarefas domésticas infantis ou competitivas.

## Calendário externo

Integração complexa para ganho ainda não validado.

## Open Finance

Transformaria Nook em fintech/finance manager.

## Push notifications

Úteis futuramente, mas exigem infraestrutura e podem tornar o app invasivo.

## Recorrência complexa

Preferir “duplicar amanhã/semana/mês” enquanto isso resolver o problema.

## Offline-first completo

Realtime + conflitos + filas offline formam um sistema muito mais complexo.

## Migração de framework

Não existe benefício atual proporcional ao custo.

---

# 27. Sequência recomendada de implementação

## Release A — “Confiável”

### Objetivo

Eliminar inconsistências antes de crescer.

### Entregas

1. Corrigir emojis do mural.
2. Corrigir copy/comportamento de limpar concluídas.
3. Corrigir resumo financeiro mensal.
4. Alinhar Storage privado por `couple_id`.
5. Centralizar upload/resolve/delete de fotos.
6. Versionar SQL/RLS/RPCs.
7. Remover fetch duplicado de perfil.
8. Fixar versões CDN.
9. Executar bateria manual em duas contas simultâneas.

### Definição de pronto

Nenhum fluxo principal perde dados, sobrescreve alterações silenciosamente ou expõe foto de outro casal.

---

## Release B — “Mais simples”

### Objetivo

Fazer o Nook parecer menor mesmo tendo muitas funcionalidades.

### Entregas

1. Home “Hoje primeiro”.
2. Resumos em vez de feeds completos na Home.
3. Settings fora da bottom bar.
4. Navegação com 5 itens.
5. Padronização de dialogs/bottom sheets.
6. Remoção progressiva de `alert/confirm/prompt`.
7. Classes CSS no lugar dos estilos inline mais visíveis.
8. Offline banner.
9. Revisão de tap targets/acessibilidade.

### Definição de pronto

Um usuário abre o app e entende em menos de 10 segundos o que precisa de atenção.

---

## Release C — “Completo sem ficar pesado”

### Objetivo

Fechar lacunas funcionais óbvias.

### Entregas

1. Editar compromisso.
2. Editar meta.
3. Desfazer último progresso de meta.
4. Duplicar conta para próximo mês.
5. Status de vencimento das contas.
6. Duplicar lista.
7. Melhorar roleta.
8. Recado “Até eu remover”.
9. Viewer de memória.
10. Lazy loading/compressão de imagem.

---

## Release D — “Uso diário”

### Objetivo

Aumentar frequência sem criar novas áreas.

### Entregas

1. Quick Add.
2. Templates de lista.
3. Templates de meta.
4. Atalhos de duplicação de agenda.
5. Resumo da semana.
6. Atalhos contextuais na Home.

---

## Release E — “Polimento técnico”

### Objetivo

Garantir que crescimento não degrade experiência.

### Entregas

1. Testes das regras puras.
2. Cache de signed URLs.
3. Update prompt do service worker.
4. Export JSON.
5. Refatorações pequenas orientadas por tamanho real dos módulos.
6. Revisão de queries e renderização com dados reais maiores.

---

# 28. Ranking geral — impacto x esforço

| Item | Prioridade | Impacto | Complexidade | Recomendo agora? |
|---|---|---:|---:|---|
| Corrigir reactions | P0 | Alto | S | Sim |
| Corrigir “arquivo recuperável” | P0 | Alto | S | Sim |
| Storage privado por casal | P0 | Muito alto | M | Sim |
| Corrigir resumo mensal de finanças | P0 | Muito alto | S/M | Sim |
| Remover fetch duplicado | P0 | Médio | S | Sim |
| Versionar SQL/RLS | P0 | Muito alto | S/M | Sim |
| Home “Hoje primeiro” | P1 | Muito alto | M | Sim |
| Retirar Settings da bottom bar | P1 | Alto | S | Sim |
| Substituir dialogs nativos | P1 | Alto | M | Sim |
| Editar Agenda | P1 | Muito alto | M | Sim |
| Editar Metas | P1 | Alto | M | Sim |
| Desfazer progresso de Meta | P1 | Alto | M | Sim |
| Duplicar conta próximo mês | P1 | Muito alto | S | Sim |
| Vencimento/atraso de contas | P1 | Alto | S | Sim |
| Duplicar lista | P1 | Alto | S | Sim |
| Templates | P1/P2 | Alto | S | Sim |
| Quick Add | P1/P2 | Muito alto | S/M | Sim |
| Resumo da semana | P2 | Muito alto | M | Depois |
| Viewer de memória | P1 | Alto | S | Sim |
| Compressão de fotos | P1 | Alto | M | Sim |
| Lazy loading de fotos | P1 | Alto | S/M | Sim |
| Export JSON | P2 | Médio | S/M | Depois |
| Testes de rules.js | P1/P2 | Alto | M | Sim |
| Histórico de mood | P3 | Baixo/Médio | M/L | Não |
| Recorrência completa | P3 | Médio | L | Não |
| Push notifications | P3 | Médio | L | Não |
| Calendar sync | P3 | Médio | L | Não |
| Open Finance | P3 | Baixo para o core | Muito alto | Não |
| IA | P3 | Indefinido | Alto | Não |
| Migração para framework | P3 | Baixo | Muito alto | Não |

---

# 29. As 15 próximas tarefas que eu executaria

Se fosse continuar o projeto agora, faria exatamente nesta ordem:

1. Corrigir whitelist das reações do mural.
2. Corrigir texto/comportamento de “Limpar concluídas”.
3. Corrigir o cálculo/escopo do resumo mensal de Finanças.
4. Implementar Storage privado com path por `couple_id`.
5. Centralizar helpers de fotos.
6. Adicionar `SUPABASE.sql` versionado.
7. Remover fetch duplicado de perfil.
8. Fazer teste manual simultâneo com duas contas.
9. Redesenhar a Home para “Hoje primeiro”.
10. Tirar Ajustes da bottom bar.
11. Implementar edição de compromisso.
12. Implementar edição + desfazer em Metas.
13. Implementar “Duplicar para próximo mês” em Finanças.
14. Implementar Quick Add usando modais existentes.
15. Adicionar templates simples para Listas e Metas.

---

# 30. Resultado esperado após esse roadmap

O Nook deve continuar parecendo pequeno mesmo ficando mais poderoso.

A experiência ideal é:

```text
Abro o Nook
↓
Vejo como estamos e o que importa hoje
↓
Resolvo uma tarefa, conta ou compromisso em poucos toques
↓
Deixo algo para meu parceiro ou registro uma memória
↓
Fecho o app
```

Não:

```text
Abro o Nook
↓
Vejo seis dashboards
↓
Configuro filtros
↓
Gerencio um sistema complexo
```

O maior diferencial do Nook não deve ser ter mais funcionalidades que outros apps. Deve ser **juntar exatamente as pequenas coisas que um casal precisa em um lugar agradável, pessoal e extremamente fácil de usar**.

Esse princípio deve ser o filtro de todas as próximas decisões de produto e engenharia.
