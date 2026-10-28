# AGENTS.md

Este arquivo define como qualquer agente de IA deve trabalhar no Nook.

Ele complementa:

- `PROJECT.md`: arquitetura, domínio e decisões permanentes;
- `STATUS.md`: estado atual, riscos e próxima ação;
- `Nook-ROADMAP.md`: backlog e sequência de produto;
- `setup.sql`: baseline versionada do contrato Supabase.

Antes de alterar código, leia nesta ordem:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. `Nook-ROADMAP.md` quando a tarefa envolver priorização/produto
5. `setup.sql` quando tocar dados, Auth, RPC, RLS, Realtime ou Storage

Nunca presuma que um prompt antigo representa a implementação atual. O código do snapshot mais recente é a fonte de verdade operacional.

# Princípios de trabalho

## 1. Simplicidade vence abstração preventiva

Nook é um projeto pessoal e deve permanecer fácil de entender e manter por uma única pessoa.

- Prefira a menor solução correta.
- Não introduza framework, bundler, state manager, ORM ou biblioteca sem necessidade concreta.
- Não crie `services/`, `repositories/`, `controllers/` ou camadas equivalentes apenas por padrão arquitetural.
- Não refatore código não relacionado à tarefa.
- Preserve HTML/CSS/JavaScript ES Modules enquanto a arquitetura atual continuar suficiente.
- Crie arquivo novo somente quando a responsabilidade realmente não couber de forma clara em um arquivo existente.

## 2. Confiabilidade e segurança vêm antes de feature nova

Não considere uma alteração pronta apenas porque a UI funciona.

Sempre pensar em:

- persistência após reload;
- troca de sessão;
- dois usuários simultâneos;
- `couple_id`;
- RLS;
- `nook_version`;
- Realtime;
- Storage privado;
- Service Worker/cache quando assets mudarem.

## 3. `couple_id` é a principal fronteira de dados

Todo dado compartilhado pertence ao casal atual.

Regras obrigatórias:

- nunca fazer update/delete apenas por `id` quando o registro pertence a um casal;
- preservar `.eq('couple_id', couple)` nas mutações;
- preservar RLS no backend;
- não permitir que resposta atrasada de sessão/casal anterior altere o estado atual;
- não confiar em filtro JavaScript como barreira de autorização.

## 4. Supabase é a fonte de verdade

- Não mover dados compartilhados para `localStorage` como atalho.
- Não aplicar optimistic update cego antes da confirmação do banco.
- Depois de escrita bem-sucedida, usar o registro retornado pelo Supabase como versão canônica.
- Ao reconectar/voltar de background, reconciliar com backend em vez de assumir que o estado em memória está correto.

## 5. Preservar controle de concorrência

Para entidades versionadas:

- não remover `nook_version`;
- não remover filtros de versão em update/delete;
- usar `captureEdit()` ao abrir edição;
- usar `saveEdit()` / `saveFormEdit()` para salvar;
- tratar conflito como conflito, não como overwrite silencioso.

Se uma mudança de schema remover `nook_version`, interrompa e alinhe o contrato antes de continuar.

# Responsabilidade dos arquivos

## `js/app.js`

Use para:

- boot;
- sessão;
- roteamento de alto nível;
- inicialização global;
- eventos globais.

Não colocar regra específica de listas, finanças, mural etc.

## `js/store.js`

Use para:

- Supabase Auth;
- acesso ao Postgres;
- estado compartilhado em memória;
- row ↔ domínio;
- CRUD;
- controle de sessão/contexto;
- filas/serialização de mutações;
- `nook_version`;
- Realtime;
- operações comuns de Storage privado;
- geração/validação de paths de foto;
- resolução/cache de signed URLs.

Evite chamadas diretas às tabelas ou ao Storage dentro dos módulos quando já existe helper no store.

## `js/rules.js`

Use para regras puras:

- validação;
- normalização;
- dinheiro;
- datas;
- cálculos;
- regras de progresso/conclusão/undo de metas;
- status de vencimento;
- constantes de domínio sem DOM/rede.

Constantes atuais importantes:

```text
OWNER.P1 = IS
OWNER.P2 = VO
OWNER.COUPLE = Casal
GOAL_TYPE.FINANCIAL = financial
GOAL_TYPE.HABIT = habit
```

Use essas constantes no código novo/alterado, mas não faça migração nem busca-e-substituição global apenas por estética.

Uma função de `rules.js` deve idealmente ser testável apenas com argumento/retorno.

## `js/utils.js`

Use para helpers transversais de UI/navegador:

- escaping;
- formatação;
- bottom sheets;
- confirmação visual;
- proteção de formulário não salvo;
- haptics;
- toast;
- `runAction`;
- validação genérica de arquivo;
- helpers genéricos de edição.

Não colocar regra de negócio específica aqui.

## `js/modules/*.js`

Use para comportamento do domínio/view correspondente.

Padrão esperado:

```text
estado local pequeno
→ renderX()
→ initX()
→ listeners chamam store/rules/utils
```

Não transformar módulos de UI em segunda camada de persistência.

# Convenções obrigatórias de UI

## Bottom sheets e confirmações

A experiência normal do Nook **não deve usar**:

```text
alert()
confirm()
prompt()
```

Use:

- `openConfirmSheet(...)` para confirmação relevante/destrutiva;
- bottom sheets existentes para formulários;
- `showToast(...)` para feedback curto não bloqueante.

Antes de criar um modal novo, confirme se o `confirm-action-bottom-sheet` ou outro sheet existente resolve o caso.

A proteção contra descarte de formulário não salvo também usa o sistema visual atual. Não reintroduza `window.confirm()`.

## Ações assíncronas

Use `runAction()` quando aplicável para:

- impedir duplo clique/double submit;
- sinalizar saving;
- desabilitar ação temporariamente;
- manter o formulário aberto se o `await` falhar;
- padronizar feedback de erro.

Erros conhecidos devem passar por `humanizeError()`/`runAction()` em vez de exibir mensagens técnicas cruas de Supabase/Postgres. Preserve o erro técnico no console para debug.

## HTML seguro

- Prefira `textContent` quando não precisar de markup.
- Ao inserir texto do usuário em `innerHTML`, use `escapeHTML`.
- Não interpolar entrada de usuário diretamente em HTML/CSS.
- Para imagens/URLs, use os helpers seguros existentes.

## Estilos

- Layout, cores, tipografia, gap, padding, borda, radius e estados visuais pertencem a `style.css`.
- Valores dependentes dos dados podem continuar dinâmicos no JS.
- Quando fizer sentido, use CSS custom property para progresso/percentual.
- Não perseguir “zero `.style`” se o estilo for genuinamente dinâmico, como imagem de fundo, progresso ou gráfico.

## Loading e movimento

Skeleton existe apenas onde agrega valor:

- Home;
- recorte de Memórias dentro da Home;
- Finanças;
- Agenda.

Não adicionar timer artificial. Assim que o dado chegar, mostrar conteúdo real.

`prefers-reduced-motion` deve continuar reduzindo animações/transições sem quebrar comportamento funcional.

Haptic deve ficar restrito a ações significativas. Não reintroduzir vibração em abertura de modal, navegação, foco ou clique trivial.

Autofocus deve ser opt-in (`data-autofocus`) e não deve forçar teclado no mobile; o comportamento atual foca automaticamente apenas em pointer fino/desktop.

# Regras de domínio importantes

## Identidade do casal

- `p1` e `p2` são slots internos.
- `IS`, `VO` e `Casal` são identificadores internos usados por vários domínios.
- Nomes reais são apresentação e não devem substituir identificadores internos.

## `approved`

No contrato atual, `nook_join()`:

1. preenche `p2_email`;
2. define `approved = true`.

Portanto, na experiência atual, `approved = false` significa **parceiro ainda não conectado**, não “aguardando aprovação de administrador”.

Não reintroduzir linguagem de aprovação manual sem mudar explicitamente o produto/backend.

## Convite

Use os dados já carregados em `store.profile`.

- compartilhar com `navigator.share()` quando disponível;
- fallback para `navigator.clipboard.writeText()`;
- `AbortError` do share é cancelamento normal e não deve virar erro;
- não hardcodar domínio/URL inexistente;
- não criar fetch extra apenas para renderizar estado do convite.

## Mood

- o usuário pode editar somente o próprio mood;
- parceiro é read-only;
- mudança deve passar por `store.setMood()` / RPC `nook_set_mood`;
- não atualizar mood diretamente na tabela pelo módulo.

## Recados

Durações suportadas pela UI:

- 24 horas;
- 72 horas;
- 168 horas;
- permanente (`expires_at = null`).

Recado permanente deve usar `null` real, nunca data artificial distante.

Reações canônicas:

```text
❤️
😘
☕
```

### Edição de recado

A UI atual permite ao autor editar:

- texto;
- duração.

Não muda:

- autor;
- data original;
- cor;
- reações.

Use `captureEdit()` + `saveFormEdit()`.

### Identidade e autorização de autoria

`notes.created_by` é a identidade estável do autor e aceita `p1`, `p2` ou `null` para registros legacy ambíguos.

Regras:

- novo recado sempre grava `created_by = store.getLoggedUser()`;
- usar `created_by` prioritariamente para decidir autor/editar/excluir e para resolver o nome atual de apresentação;
- `owner` permanece por compatibilidade e apresentação, não como identidade primária;
- recado legacy com `created_by = null` pode usar o fallback textual existente; não inventar backfill se não for determinístico.

Isso **não é autorização forte no banco**. Se a tarefa exigir impedir tecnicamente o parceiro de atualizar recado alheio, propor policy/RPC específica; não misturar essa feature com a identidade estável.

## Metas

Metas possuem dois tipos persistidos:

```text
financial
habit
```

Regras obrigatórias:

- conclusão é sempre derivada de `current >= target`;
- não criar campo `completed`/`archived` para representar esse estado;
- edição deve reutilizar `captureEdit()` + `saveFormEdit()` e preservar `current`, `history`, identidade e `nook_version`;
- o tipo não deve ser trocado durante edição sem redesign explícito do histórico;
- undo deve usar o último item do `history`, remover esse item e recalcular `current` pelo histórico restante;
- não implementar undo como simples subtração presumida;
- meta concluída continua com histórico/editar/excluir/undo acessíveis;
- ao voltar a `current < target`, a meta retorna automaticamente para Em andamento;
- seção Concluídas é estado de UI local e começa recolhida.

Histórico financeiro deve continuar usando normalização em centavos; hábito deve continuar usando inteiros.

`canvas-confetti` foi removido. Conclusão de meta usa badge, haptic já existente e microanimação CSS discreta, respeitando `prefers-reduced-motion`. Não reintroduzir biblioteca de partículas sem decisão explícita.

## Memórias e fotos

O viewer de memória usa dados já carregados e não deve fazer query adicional apenas para abrir.

A grid usa `<img loading="lazy">` para fotos de memória.

Compressão de fotos é centralizada em `store.uploadPhoto()`:

```text
maior lado: 1600 px
formato: WebP
qualidade: 0,82
```

GIF permanece original. Não duplicar compressão em onboarding/home/outros módulos.

## Listas

- abas continuam representando todas as listas;
- a área de itens deve renderizar apenas `activeList.items`;
- não voltar a criar itens ocultos de outras listas no DOM;
- preservar filtros, concluídas, drag e roleta no contexto da lista ativa.

## Agenda

- criação e edição usam o mesmo formulário;
- `agenda.time = null` significa evento **Dia todo**; nunca usar `00:00`, `23:59` ou outro horário fake como sentinel;
- na ordenação atual, Dia todo vem antes dos eventos com horário;
- edição deve usar `captureEdit()` + `saveFormEdit()`;
- ao criar, preservar a data atualmente selecionada na Agenda;
- autoria atual usa `created_by = p1/p2`;
- não inferir autoria de compromisso legado sem `created_by`;
- `confirmed = true` representa que ambos estão cientes; não transformar isso em sistema de RSVP.

## Finanças

- **A pagar** continua global;
- resumo/acerto continua limitado ao mês selecionado;
- status de vencimento de pendentes deve usar `expenseDueStatus()`;
- despesa paga não deve mostrar atraso;
- copy do acerto pode mudar, mas a matemática deve continuar vindo de `financialSummary().balance`;
- o sheet de configuração financeira deve capturar `id + nook_version` quando abrir e salvar com essa versão esperada;
- nunca incrementar `nook_version` manualmente no frontend;
- em `FINANCE_CONFLICT`, recarregar configuração atual e informar o usuário em vez de sobrescrever silenciosamente.

# Regras para Supabase

## Baseline

`setup.sql` é a fonte de verdade versionada do contrato atual.

Se código e SQL divergirem:

- não afrouxar RLS/policy para “fazer funcionar”;
- identificar a incompatibilidade;
- decidir explicitamente se o frontend ou backend está errado;
- se houver mudança de banco, fornecer migração SQL explícita.

`CREATE TABLE IF NOT EXISTS` não deve ser tratado como ferramenta de migração de uma tabela incompatível existente.

## Auth

- derivar usuário da sessão autenticada;
- logout deve limpar estado compartilhado;
- nunca reutilizar estado carregado antes de troca de sessão;
- recuperação de senha deve usar o client Supabase existente, `resetPasswordForEmail()` + evento `PASSWORD_RECOVERY` + `updateUser({ password })`;
- `redirectTo` deve ser derivado da origem/path atuais, nunca de domínio Vercel hardcoded;
- não logar/armazenar senha.

## RLS

Toda tabela compartilhada precisa restringir acesso ao casal correto.

Filtro de frontend não substitui RLS.

## RPC

Use RPC quando autorização/atomicidade não deve ficar sob controle direto do cliente.

RPCs atuais importantes:

- `nook_join`;
- `nook_set_mood`.

## Realtime

Para nova tabela compartilhada que precisa sincronizar:

- configurar Realtime no backend;
- adicionar reader no store;
- preservar isolamento por contexto;
- validar RLS/Realtime authorization.

## Storage

Bucket `photos` é privado.

Contrato atual:

```text
<couple_id>/avatars/...
<couple_id>/covers/...
<couple_id>/memories/...
```

Use:

- `store.uploadPhoto(...)`;
- `store.resolvePhotoUrl(...)`;
- `store.getPhotoDisplayUrl(...)`;
- `store.deletePhoto(...)`.

`store.uploadPhoto()` também é o ponto central de compressão. Não criar compressão paralela em módulo de avatar, capa ou memória.

Nunca:

- tornar bucket público para simplificar UI;
- reintroduzir `getPublicUrl()` para novas fotos;
- persistir signed URL temporária no banco.

URLs antigas `http://`/`https://` podem continuar sendo lidas pela camada de compatibilidade existente, mas não devem ser geradas como novo formato de persistência.

# PWA e Service Worker

O Service Worker deve continuar simples.

- Cachear app shell e dependências estáticas.
- Não interceptar Auth, Data API, Realtime ou Storage privado.
- Não criar fila offline de mutações sem design explícito de reconciliação.
- Ao alterar asset estático, incrementar `CACHE_NAME`.
- Ao adicionar/remover arquivo essencial, revisar `LOCAL_ASSETS`.
- URLs externas em `OPTIONAL_ASSETS` devem ser **exatamente as mesmas** usadas por `index.html`.
- Não usar versões genéricas como `@2` se o HTML usa uma versão fixada.
- Não usar `skipWaiting`/`clients.claim` sem analisar risco de mistura de versões durante sessão ativa.

Versões atuais:

```text
Supabase JS: 2.118.0
Phosphor Web: 2.1.2
Cache: nook-v1.15
```

# Inicialização e listeners

`initX()` deve instalar listeners uma única vez por ciclo normal.

Não chamar repetidamente um inicializador apenas para atualizar tela.

Para atualização, usar:

- `renderX()`;
- evento de estado;
- helper específico.

Quando um módulo realmente precisar ser inicializado em mais de uma etapa do roteamento, ele deve ser idempotente/protegido contra listeners duplicados, como ocorre em `settings.js`.

# Testes mínimos antes de considerar mudança pronta

## Sempre

- JS sem erro de sintaxe;
- IDs/seletores alterados existem;
- imports/exports consistentes;
- fluxo feliz;
- reload após persistência;
- cancelar ação não produz efeito;
- erro não é tratado como sucesso.

## Auth/contexto

- login;
- sessão existente;
- logout;
- troca de conta no mesmo navegador;
- dados do casal anterior não reaparecem.

## Casal

- P1 e P2 do mesmo casal veem o mesmo dado;
- outro casal não acessa esse dado.

## CRUD

Quando o domínio suporta:

- criar;
- reload;
- editar;
- reload;
- excluir;
- reload.

Para Metas, testar também:

- concluir por `current >= target`;
- editar target mudando o estado;
- undo financeiro;
- undo de hábito;
- concluída → ativa após undo.

## Concorrência

Quando aplicável:

- abrir mesmo registro em dois clientes;
- salvar no primeiro;
- tentar salvar no segundo;
- segundo deve receber conflito, não sobrescrever silenciosamente.

## PWA

Se asset estático mudou:

- incrementar `CACHE_NAME`;
- confirmar URLs CDN sincronizadas;
- confirmar cache novo;
- confirmar que API/Auth não entram no cache.

## Storage

- upload;
- path iniciado por `couple_id`;
- reload;
- visualização por P1/P2;
- substituição;
- exclusão;
- outro casal sem acesso.

# O que evitar

- Migração de framework sem dor concreta.
- TypeScript/build system “porque é melhor”.
- Layers artificiais de arquitetura enterprise.
- Regra duplicada em vários módulos.
- Cálculo financeiro dentro de handler de DOM.
- `innerHTML` inseguro.
- `alert()`/`confirm()`/`prompt()` na experiência normal.
- RLS afrouxada para resolver bug de frontend.
- Storage público para contornar policy.
- Update/delete sem `couple_id`.
- Remoção de `nook_version` sem redesign explícito.
- Dados compartilhados em chaves globais de `localStorage`.
- Erro de rede transformado em “lista vazia”.
- Inicializador chamado várias vezes para forçar render.
- Feature nova em cima de regressão de persistência/segurança conhecida.

# Mudanças grandes

Considere grande qualquer mudança envolvendo:

- framework/toolchain;
- novo serviço externo;
- Auth;
- modelo `couple_id`;
- schema amplo;
- RLS/RPC crítica;
- grande reestruturação do store;
- offline sync;
- mudança de bucket/policies;
- remoção de versionamento de conflito.

Antes de implementar, documentar:

- problema concreto;
- solução proposta;
- alternativa mais simples;
- impacto em dados existentes;
- impacto no backend;
- rollback;
- smoke tests.

# Atualização da documentação

Após sessão relevante:

- atualizar `STATUS.md` sempre que mudar estado real, riscos ou próxima ação;
- atualizar `PROJECT.md` somente quando mudar arquitetura, fluxo permanente, regra de negócio ou decisão estrutural;
- atualizar `AGENTS.md` quando mudar a forma correta de agentes trabalharem;
- atualizar `Nook-ROADMAP.md` quando item for concluído, repriorizado ou descartado;
- atualizar comentário de `setup.sql` somente se ele ficar factualmente incorreto; nunca alterar SQL funcional apenas para “sincronizar documentação”.

Não usar `PROJECT.md` como lista de tarefas.
Não usar `STATUS.md` como documentação arquitetural completa.
