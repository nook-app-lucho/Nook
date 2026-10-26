# PROJECT — Nook

# 1. Objetivo do produto

Nook é uma PWA privada para organizar a vida de um casal em um único espaço compartilhado.

O produto centraliza pequenas necessidades recorrentes do dia a dia:

- humor;
- listas e tarefas;
- compromissos;
- finanças da casa;
- metas;
- memórias;
- mural de recados;
- preferências do app.

A proposta não é virar um ERP doméstico nem um mensageiro. O valor do Nook está em reunir exatamente o que o casal usa com frequência em uma experiência íntima, leve e simples.

O produto foi desenhado primeiro para uso pessoal e mobile-first.

Prioridades arquiteturais:

1. simplicidade;
2. confiabilidade;
3. segurança/isolamento por casal;
4. UX mobile;
5. manutenção por uma única pessoa;
6. poucas dependências e pouca abstração.

# 2. Modelo mental principal

Cada espaço compartilhado é um **Nook**, identificado por `couple_id`.

Um Nook possui até duas contas autenticadas:

- `p1` — criador/primeira pessoa;
- `p2` — parceiro que entra pelo código.

O banco é a fonte de verdade dos dados compartilhados.

O frontend mantém:

- estado em memória;
- cache temporário de signed URLs de fotos;
- preferência local de tema.

Não existe banco local de dados compartilhados.

# 3. Stack tecnológica

## Frontend

- HTML5 em `index.html`;
- CSS puro em `style.css`;
- JavaScript ES Modules;
- sem framework;
- sem etapa de build;
- sem `package.json`;
- sem state manager externo.

Web APIs usadas atualmente:

- `crypto.randomUUID()`;
- `CustomEvent`;
- `navigator.clipboard`;
- `navigator.share`;
- `navigator.vibrate`;
- Service Worker;
- Cache API;
- File API;
- `matchMedia`.

## Backend

Supabase fornece:

- Auth;
- Postgres;
- Realtime;
- Storage;
- RPCs.

O contrato do backend está versionado em:

```text
setup.sql
```

## Dependências externas por CDN

Versões atuais:

- `@supabase/supabase-js@2.118.0`;
- `@phosphor-icons/web@2.1.2`;
- `mobile-drag-drop@2.3.0-rc.2`;
- `canvas-confetti@1.6.0`.

O `sw.js` usa exatamente as mesmas URLs/versionamentos das dependências externas carregadas pelo `index.html`.

# 4. Estrutura do projeto

```text
/
├─ index.html
├─ style.css
├─ manifest.json
├─ sw.js
├─ setup.sql
├─ AGENTS.md
├─ PROJECT.md
├─ STATUS.md
├─ Nook-ROADMAP.md
├─ img/
│  ├─ icon.svg
│  ├─ icon-192.png
│  └─ icon-512.png
└─ js/
   ├─ app.js
   ├─ store.js
   ├─ rules.js
   ├─ utils.js
   └─ modules/
      ├─ navigation.js
      ├─ onboarding.js
      ├─ home.js
      ├─ lists.js
      ├─ agenda.js
      ├─ goals.js
      ├─ finances.js
      └─ settings.js
```

# 5. Arquitetura

A aplicação é uma SPA sem framework e sem roteamento por URL.

A navegação ativa/desativa views já presentes no DOM.

A arquitetura prática é dividida em quatro blocos:

1. **Shell e visual** — `index.html` + `style.css`;
2. **Boot/roteamento** — `app.js` + `navigation.js`;
3. **Estado/persistência** — `store.js`;
4. **Regras/helpers/módulos** — `rules.js`, `utils.js`, `modules/*.js`.

## `index.html`

Contém:

- login/cadastro;
- criar/entrar em Nook;
- tela de espera do parceiro;
- onboarding;
- Home;
- Listas;
- Agenda;
- Finanças;
- Metas;
- Ajustes;
- bottom sheets reutilizados pelos módulos.

A bottom navigation possui exatamente 5 destinos principais:

```text
Início | Listas | Agenda | Finanças | Metas
```

Ajustes é uma área secundária acessada pela engrenagem na Home.

## `js/app.js`

Responsável por:

- registrar Service Worker;
- verificar sessão;
- carregar perfil;
- decidir a view inicial;
- criar/entrar no Nook;
- inicializar módulos;
- coordenar o loading inicial;
- reagir a eventos globais.

Não contém regra específica de domínio.

## `js/store.js`

É o boundary central de dados.

Responsabilidades:

- cliente Supabase;
- Auth/sessão;
- `currentUserEmail`;
- perfil;
- `couple_id`;
- estado compartilhado em memória;
- mapping row ↔ domínio;
- CRUD;
- validação antes de gravar;
- `nook_version`;
- filas/serialização de mutações;
- proteção contra respostas atrasadas;
- Realtime;
- refresh em foreground/reconexão;
- Storage privado;
- signed URLs de fotos;
- cache temporário de URLs de fotos.

Os módulos não devem recriar CRUD Supabase quando o store já oferece a operação.

## `js/rules.js`

Contém lógica pura:

- datas;
- números;
- dinheiro em centavos;
- resumo financeiro;
- divisão proporcional;
- status de vencimento de despesas;
- validação de despesas/metas;
- normalização de listas/histórico de metas;
- progresso/forecast de metas;
- recálculo/undo do último lançamento de meta;
- dias juntos;
- whitelist canônica de reações;
- constantes de domínio simples (`OWNER`, `GOAL_TYPE`).

Constantes atuais:

```text
OWNER.P1 = IS
OWNER.P2 = VO
OWNER.COUPLE = Casal
GOAL_TYPE.FINANCIAL = financial
GOAL_TYPE.HABIT = habit
```

Essas constantes não representam migração de dados. Os valores persistidos continuam iguais.

Reações atuais:

```text
❤️
😘
☕
```

## `js/utils.js`

Helpers transversais de UI/navegador:

- escaping;
- formatação;
- avatar;
- bottom sheets;
- confirmação visual;
- proteção contra descarte de formulário;
- toast;
- haptic;
- `runAction`;
- `humanizeError`;
- autofocus opt-in em pointer fino/desktop;
- validação genérica de imagem;
- helpers de edição com conflito.

`runAction()` é o mecanismo atual para:

- evitar double submit;
- desabilitar submit durante gravação;
- manter o formulário aberto quando a operação falha;
- mostrar erro humano sem esconder o erro técnico do console.

A experiência normal não usa `alert()`, `confirm()` ou `prompt()` nativos.

## `js/modules/`

### `navigation.js`

- navegação entre views;
- render da view ativa;
- acesso a Ajustes;
- proteção de navegação durante loading/saving.

### `onboarding.js`

- nomes;
- data inicial;
- avatar por emoji/foto;
- upload privado de avatar.

### `home.js`

- hero/capa;
- dias juntos;
- humor;
- resumo do dia;
- memórias;
- viewer de memória;
- lazy loading das imagens da grid;
- cápsula temporal;
- mural de recados;
- reações;
- criação/edição/exclusão de recados.

### `lists.js`

- listas;
- itens;
- prioridades;
- filtros;
- drag-and-drop;
- roleta de decisão;
- pendentes/concluídas em seções separadas;
- concluídas recolhidas por padrão;
- limpar concluídas;
- renomear/excluir lista.

### `agenda.js`

- datas;
- visão semanal/mensal;
- compromissos;
- criação e edição pelo mesmo formulário;
- preservação da data selecionada ao criar;
- autoria via `created_by`;
- confirmação/ciente;
- exclusão.

### `goals.js`

- metas financeiras;
- hábitos;
- criação e edição pelo mesmo formulário;
- progresso;
- histórico;
- undo do último lançamento;
- separação entre ativas e concluídas;
- conclusão derivada de `current >= target`;
- forecast;
- milestones/confetti discreto ao concluir.

### `finances.js`

- modelo de divisão;
- despesas;
- pago/pendente;
- status de vencimento;
- resumo mensal;
- categorias;
- acerto entre o casal com copy explicativa.

### `settings.js`

- tema;
- estado do parceiro;
- código de convite;
- copiar convite;
- compartilhar convite;
- logout.

# 6. Fluxo de autenticação e entrada

```text
Abre app
↓
store.checkSession()
├─ sem sessão
│  └─ Login/Cadastro
│
└─ com sessão
   ↓
   store.fetchProfile()
   ├─ sem Nook
   │  └─ Criar Nook ou entrar por código
   │
   └─ com Nook
      ├─ approved = false
      │  └─ Aguardando seu parceiro
      │     ├─ copiar código
      │     ├─ compartilhar convite
      │     └─ verificar conexão
      │
      └─ approved = true
         ├─ perfil incompleto → Onboarding
         └─ perfil completo → Home + store.init() + Realtime
```

## Semântica atual de `approved`

No modelo atual, `approved` não representa aprovação manual por administrador.

A RPC `nook_join()` faz:

```text
p2_email = email do segundo usuário
approved = true
```

Logo:

```text
approved = false → parceiro ainda não entrou
approved = true  → segundo membro conectado
```

Se esse significado mudar no futuro, frontend e SQL devem ser redesenhados juntos.

# 7. Convite

O criador recebe `invite_code` ao criar o Nook.

Antes de P2 entrar:

- a tela principal de espera mostra o código;
- o código pode ser copiado;
- o convite pode ser compartilhado nativamente.

Compartilhamento:

```text
navigator.share disponível
→ abre share sheet nativo

não disponível / falha não-abort
→ fallback para clipboard
```

`AbortError` significa cancelamento voluntário e não é erro para o usuário.

Depois que P2 entra:

- `approved = true`;
- Ajustes mostra **Parceiro conectado ✓**;
- convite deixa de ser ação principal.

# 8. Onboarding

Após os dois membros estarem conectados, se o perfil ainda estiver incompleto:

```text
nomes
+ data inicial
+ avatar opcional
↓
store.setProfile()
↓
nook:profile-saved
↓
Home
```

Avatar pode ser:

- foto;
- emoji;
- iniciais como fallback.

Fotos novas usam Storage privado.

# 9. Persistência e concorrência

## Leitura

```text
store.init()
↓
fetchFinances + fetchRecords + fetchMoods
↓
Supabase
↓
row → domínio
↓
estado em memória
↓
render
```

## Escrita

```text
interação
↓
runAction()
↓
store.saveRecord()/deleteRecord()
↓
validação
↓
confirma couple_id/contexto
↓
Supabase
↓
registro confirmado
↓
estado local
↓
nook:data-updated
```

## Edição versionada

```text
captureEdit()
↓
snapshot + nook_version
↓
usuário edita
↓
saveEdit()/saveFormEdit()
↓
UPDATE por id + couple_id + nook_version
↓
conflito ou sucesso
```

O objetivo é impedir lost update silencioso entre dispositivos.

# 10. Realtime

Mudanças do banco são reconciliadas pelo store.

Fluxo:

```text
mudança Postgres
↓
Supabase Realtime
↓
store.subscribeRealtime()
↓
filtra contexto
↓
debounce/tabelas sujas
↓
refetch específico
↓
nook:data-updated
```

O primeiro `SUBSCRIBED` após a carga inicial não refaz imediatamente todas as consultas.

Reconexões posteriores podem disparar refresh.

Também há refresh ao voltar para foreground/online.

RLS continua sendo a camada de autorização real; filtro de frontend não substitui RLS.

# 11. Storage de fotos

Bucket:

```text
photos
```

Privado.

Paths atuais:

```text
<couple_id>/avatars/...
<couple_id>/covers/...
<couple_id>/memories/...
```

Persistência:

- banco guarda storage path;
- signed URL não é persistida;
- signed URL é resolvida apenas para renderização;
- cache de signed URL existe apenas em memória da sessão.

Helpers centrais:

- `store.uploadPhoto()`;
- `store.resolvePhotoUrl()`;
- `store.getPhotoDisplayUrl()`;
- `store.deletePhoto()`.

## Compressão de upload

`store.uploadPhoto()` comprime imagens antes do upload usando APIs nativas.

Contrato atual:

```text
maior lado: 1600 px
formato: WebP
qualidade: 0,82
```

JPEG/PNG/WebP passam pelo pipeline.

GIF permanece original para preservar animação.

Se a compressão falhar, o upload falha com feedback; o original não é enviado silenciosamente.

Compatibilidade:

- valores antigos começando com `http://` ou `https://` ainda podem ser exibidos;
- novas gravações não devem voltar ao modelo de URL pública.

# 12. Listas

Tipos:

- `standard`;
- `decision`.

Cada item possui:

- ID;
- texto;
- responsável;
- prioridade;
- estado concluído.

Responsáveis persistidos:

```text
IS
VO
Casal
```

Prioridades:

```text
none
urgent
casual
```

Funcionalidades atuais relevantes:

- criar lista;
- renomear com bottom sheet;
- excluir lista com confirmação visual;
- criar/editar/excluir item;
- concluir/desmarcar item;
- pendentes sempre visíveis;
- concluídas em seção recolhível por lista;
- contadores respeitam filtro ativo;
- limpar concluídas definitivamente;
- reordenar;
- filtrar;
- roleta de decisão para itens pendentes.

O estado aberto/recolhido das concluídas é apenas local de UI e não é persistido.

A implementação atual ainda cria DOM para itens de todas as listas e esconde os que não pertencem à lista ativa. Isso é aceitável no volume atual e permanece como P2 de performance, não como bug aberto.

# 13. Agenda

Compromissos possuem:

- título;
- data;
- hora;
- responsável;
- subtítulo opcional;
- `confirmed`;
- `created_by`;
- `nook_version`.

Funcionalidades atuais:

- criar compromisso;
- editar pelo mesmo formulário;
- edição versionada com `captureEdit()` + `saveFormEdit()`;
- preservar a data atualmente selecionada ao criar;
- mostrar `Criado por você` ou `Criado por <parceiro>` quando `created_by` existe;
- parceiro pode marcar **Ciente**;
- criador não precisa confirmar o próprio compromisso;
- `confirmed = true` significa **Ambos cientes**;
- excluir com confirmação visual.

Compromissos legados sem `created_by` não permitem inferir autoria com segurança.

# 14. Finanças

Modelos suportados:

```text
50/50
proportional
100-p1
100-p2
single
custom
```

Modos de acerto persistidos:

```text
transfer
next
```

Categorias:

```text
moradia
mercado
lazer
transporte
outros
```

Regra importante:

- **A pagar** é indicador global de pendências;
- **Resumo do mês** considera somente despesas cuja `date` pertence ao mês selecionado.

Cálculos monetários críticos usam centavos.

## Vencimento

Despesa pendente recebe status derivado por data:

```text
Vence hoje
Vence amanhã
Vence em N dias
Atrasada há N dias
```

Despesa paga não recebe copy de atraso.

A regra pura fica em `expenseDueStatus()` em `rules.js`.

## Acerto

A apresentação usa o mês selecionado e os nomes reais do casal.

Exemplo:

```text
Para equilibrar as contas de outubro de 2026:
Luis transfere R$ X para Ana
```

A matemática continua vindo de `financialSummary().balance`. Não existe segundo cálculo no módulo.

# 15. Metas

Tipos persistidos:

```text
financial
habit
```

Meta possui:

- título;
- ícone;
- responsável;
- alvo;
- atual;
- unidade;
- prazo opcional;
- histórico;
- `nook_version`.

Meta financeira usa normalização monetária.
Meta de hábito usa quantidades inteiras.

Constantes usadas por código novo:

```text
OWNER.P1 = IS
OWNER.P2 = VO
OWNER.COUPLE = Casal
GOAL_TYPE.FINANCIAL = financial
GOAL_TYPE.HABIT = habit
```

## Edição

O mesmo bottom sheet serve para criar e editar.

Edição usa `captureEdit()` + `saveFormEdit()` e altera somente:

- título;
- ícone;
- responsável;
- alvo;
- prazo;
- unidade quando aplicável.

Preserva:

- identidade;
- tipo;
- `current`;
- `history`;
- `created_at`;
- `nook_version`.

## Conclusão

Não existe flag `completed`.

Regra única:

```text
current >= target → concluída
current < target  → em andamento
```

Concluídas ficam em seção recolhível e não mostram CTA de contribuição, mas mantêm histórico, editar, excluir e undo.

## Histórico e undo

Cada contribuição/progresso grava entrada no `history`.

Ao desfazer:

```text
remove último item do history
→ recalcula current pelo history restante
→ salva registro versionado
```

O recalculo fica em regra pura (`calculateGoalCurrentFromHistory` / `undoLastGoalProgress`).

Uma meta pode voltar automaticamente de concluída para ativa após undo ou após edição do target.

# 16. Mood

Valores atuais:

```text
energia
cansado
lanche
apaixonado
estresse
feliz
```

O mood é diário.

Cada usuário:

- vê seu estado;
- recebe microcopy **Toque para alterar**;
- pode trocar o próprio mood a qualquer momento no dia.

Parceiro:

- é read-only;
- recebe microcopy **Somente leitura**;
- tentativa de interação gera toast, não diálogo bloqueante.

Persistência passa pela RPC `nook_set_mood`.

# 17. Memórias

Memória possui:

- título;
- data;
- nota opcional;
- foto opcional;
- `nook_version`.

Foto privada persiste como Storage path.

Funcionalidades atuais:

- grid compacta;
- `<img loading="lazy" decoding="async">`;
- viewer em bottom sheet com foto maior, data, título e nota;
- editar/excluir a partir do viewer;
- edição reaproveita fluxo existente;
- cápsula temporal para mesma data em ano anterior.

O viewer usa os dados já carregados.

Ao substituir/excluir foto, o store tenta remover o objeto privado anterior quando seguro.

# 18. Mural de recados

Recado possui:

- texto;
- cor;
- `owner` textual;
- data de criação;
- `expires_at` opcional;
- reações;
- `nook_version`.

## Duração

Opções da UI:

```text
24 horas
3 dias
7 dias
Até eu remover
```

`Até eu remover` persiste `expires_at = null`.

## Reações

Reações canônicas:

```text
❤️
😘
☕
```

## Edição

O autor pode editar:

- texto;
- duração.

Não altera:

- autor;
- data original;
- cor;
- reações.

Edição usa `captureEdit()` + `saveFormEdit()`.

## Limitação de autoria

A UI identifica autoria comparando `note.owner` com o nome retornado por `store.getAuthorName()`.

Isso é suficiente para o MVP pessoal atual, mas não constitui autorização forte.

Se a regra “somente o autor edita” precisar ser garantida no backend, deve existir migração futura para identificador de autor estável e policy/RPC correspondente.

# 19. Sistema de feedback e confirmação

A UI evita APIs bloqueantes nativas.

Estado atual:

```text
alert()   = 0
confirm() = 0
prompt()  = 0
```

Padrões:

- `showToast()` → feedback curto;
- `openConfirmSheet()` → ações relevantes/destrutivas;
- bottom sheets → formulários;
- proteção de formulário sujo → confirmação visual reutilizando o mesmo sistema.

# 20. Loading

Durante a hidratação inicial, existem skeletons para:

- Home;
- memórias dentro da Home;
- Finanças;
- Agenda.

Regras:

- nenhum timer artificial;
- conteúdo real aparece assim que dados chegam;
- animação é CSS;
- `prefers-reduced-motion` reduz animações/transições de forma global sem remover comportamento funcional.

# 21. PWA e Service Worker

`manifest.json` define instalação/ícones/aparência standalone.

`sw.js` cacheia:

- app shell;
- JS/CSS/HTML local;
- ícones;
- dependências CDN opcionais.

Não intercepta:

- Auth;
- Data API;
- Realtime;
- Storage privado.

Cache atual:

```text
nook-v1.13
```

Versões externas sincronizadas:

```text
Supabase JS 2.118.0
Phosphor Web 2.1.2
```

O PWA é **app-shell offline**, não offline-first de dados.

Não existe fila de mutações offline.

# 22. Eventos internos

Eventos principais:

- `nook:data-updated`;
- `nook:profile-saved`;
- `nook:sync-error`.

Servem para desacoplar store/boot/render sem introduzir framework de estado.

# 23. Convenções de projeto

- JavaScript simples e ES Modules.
- Mobile-first.
- Reusar módulos existentes.
- Regra pura em `rules.js`.
- Persistência em `store.js`.
- UI de domínio em `modules/`.
- Helper transversal em `utils.js`.
- Texto de usuário precisa de escaping quando inserido como HTML.
- Dinheiro calculado em centavos.
- Datas de domínio sem horário em `YYYY-MM-DD`.
- IDs internos não são substituídos por nomes de apresentação.
- Ação assíncrona prefere `runAction`.
- Edição versionada usa `captureEdit/saveFormEdit`.
- Update/delete preserva `couple_id`.
- Storage privado nunca usa `getPublicUrl()` para novas gravações.
- Bottom sheets/toasts substituem diálogos nativos.
- Alteração de asset exige revisão/incremento de `CACHE_NAME`.
- URLs CDN do Service Worker devem ser iguais às do HTML.

# 24. Backend esperado

## Tabelas

- `profiles`
- `agenda`
- `expenses`
- `finances`
- `goals`
- `lists`
- `memories`
- `moods`
- `notes`

## RPCs

### `nook_join(text)`

Entrada segura do segundo membro por código.

Atualiza `p2_email` e `approved` atomicamente.

### `nook_set_mood(text, date)`

Permite atualizar apenas o slot de mood pertencente ao usuário autenticado.

## RLS

Tabelas compartilhadas usam policies baseadas na participação do usuário no `couple_id`.

## `nook_version`

Usado por:

- agenda;
- expenses;
- finances;
- goals;
- lists;
- memories;
- notes.

Triggers incrementam versão em update.

# 25. Decisões arquiteturais atuais

## Vanilla JS em vez de framework

Mantido porque:

- escopo ainda cabe na arquitetura;
- não há build/deploy complexo;
- owner precisa conseguir entender/manter;
- migração agora adicionaria custo sem resolver uma dor concreta.

## Store centralizado

`store.js` concentra mais responsabilidades do que uma arquitetura enterprise recomendaria, mas reduz complexidade para o tamanho atual.

Só dividir quando houver dor real.

## Supabase como backend completo

Auth, Postgres, RLS, Realtime, Storage e RPCs ficam no mesmo serviço, reduzindo superfície operacional.

## Backend como fonte de verdade

Dados compartilhados não dependem de `localStorage`.

## `couple_id` como boundary

É a principal dimensão de isolamento multiusuário.

## Confirmed writes

A UI espera confirmação do banco antes de consolidar estado local.

## Optimistic concurrency

`nook_version` protege contra sobrescrita silenciosa.

## App shell offline

Mantém PWA simples. Offline completo de dados exigiria reconciliação muito mais complexa.

# 26. Pontos de atenção

## Smoke test real ainda é obrigatório

A implementação foi validada estaticamente, mas a baseline atual ainda precisa de teste completo com P1/P2 no Supabase real.

## Autoria de `notes`

É a principal limitação estrutural nova conhecida.

Não tentar “resolver” com mais comparação de nomes no frontend se a necessidade virar segurança real.

## Sem testes automatizados

`rules.js` já concentra regras puras de dinheiro, datas, finanças, listas e metas e é o melhor primeiro candidato.

## `store.js` grande

Monitorar, mas não dividir preventivamente.

## Chave/URL Supabase no cliente

A publishable key pode ficar no frontend quando RLS está correta. O problema maior é configuração de ambientes, não segredo.

## Realtime

A segurança real depende de RLS/authorization, não de filtro no cliente.

## Compromissos antigos sem `created_by`

A UI atual usa `created_by` para autoria/“Ciente”. Registros legados sem esse valor não devem receber autoria inferida.

## Renderização de Listas

Ainda cria DOM para todas as listas e esconde itens fora da lista ativa. Manter enquanto não houver evidência de problema; otimizar apenas por dor real.

## CDNs

A primeira carga ainda depende de rede/CDN; o Service Worker ajuda nas cargas posteriores.

# 27. Como adicionar uma funcionalidade

1. Leia `STATUS.md` e confirme que não está ignorando blocker atual.
2. Defina regra de negócio.
3. Verifique se exige mudança de schema/RLS/RPC.
4. Se regra for pura, use `rules.js`.
5. Persistência/estado em `store.js`.
6. UI no módulo existente mais próximo.
7. Markup em `index.html`.
8. Estilo em `style.css`.
9. Reutilize bottom sheets/toast/confirm existentes.
10. Garanta `couple_id` e concorrência.
11. Integre Realtime se necessário.
12. Se asset estático mudou, revise `sw.js` e incremente cache.
13. Teste com duas contas quando o dado for compartilhado.
14. Atualize documentação correspondente.

# 28. Glossário

- **Nook** — espaço privado do casal.
- **`couple_id`** — identificador do casal e principal fronteira de dados.
- **`p1` / `p2`** — slots dos dois membros.
- **`IS` / `VO` / `Casal`** — identificadores internos de responsabilidade.
- **Invite code** — código usado por P2 para entrar no Nook.
- **`approved`** — no fluxo atual, flag que se torna `true` quando P2 entra.
- **`nook_version`** — versão usada para detectar conflito de edição/exclusão.
- **Store** — objeto central de sessão, estado e Supabase.
- **Bottom sheet** — painel/modal inferior usado para formulários/ações.
- **Decision list** — lista com roleta para itens pendentes.
- **Settlement / acerto** — cálculo financeiro de compensação entre o casal.
- **Capsule memory** — memória antiga destacada no aniversário de dia/mês.
- **App shell** — arquivos estáticos necessários para abrir a interface.
- **RLS** — Row Level Security do Postgres/Supabase.
- **RPC** — função Postgres chamada pelo frontend.
- **Realtime** — sincronização de mudanças do backend com os clientes.
- **Signed URL** — URL temporária autorizada para leitura de arquivo privado.
