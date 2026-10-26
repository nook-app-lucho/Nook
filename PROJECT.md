# Objetivo do projeto

Nook é uma aplicação web progressiva (PWA) privada para organizar a vida de um casal em um único espaço compartilhado. O produto centraliza atividades, compromissos, finanças da casa, metas, memórias, recados e check-ins de humor, com sincronização entre as duas pessoas.

O produto foi desenhado primeiro para uso pessoal e mobile-first. A prioridade arquitetural atual é manter uma base simples, compreensível e confiável: frontend estático em HTML/CSS/JavaScript, Supabase como backend e poucos níveis de abstração.

Cada instalação lógica do produto gira em torno de um **Nook**, identificado por `couple_id`, ao qual podem pertencer duas contas autenticadas (`p1` e `p2`). O banco é a fonte de verdade dos dados compartilhados; o frontend mantém apenas estado em memória e uma preferência local de tema.

# Stack tecnológica

## Frontend

- **HTML5** em `index.html`, contendo as views e bottom sheets da SPA.
- **CSS puro** em `style.css`, com layout mobile-first, variáveis visuais, light/dark mode e componentes próprios.
- **JavaScript ES Modules** sem framework e sem etapa de build.
- **Web APIs do navegador**: `crypto.randomUUID`, `CustomEvent`, `navigator.clipboard`, `navigator.vibrate`, Service Worker, Cache API, File API e `matchMedia`.

## Backend e dados

- **Supabase Auth** para cadastro, login, sessão e logout.
- **Supabase Postgres** para persistência dos dados do casal.
- **Supabase Realtime** para sincronização entre os dois usuários/dispositivos.
- **Supabase Storage** para fotos de avatar, capa e memórias.
- **Postgres RPCs** esperadas pelo frontend:
  - `nook_join`
  - `nook_set_mood`
- O modelo de segurança depende de **Row Level Security (RLS)** no Supabase para isolar cada casal por `couple_id`.

## Bibliotecas externas carregadas por CDN

- `@supabase/supabase-js@2.118.0`: cliente Supabase.
- `@phosphor-icons/web@2.1.2`: ícones.
- `mobile-drag-drop@2.3.0-rc.2`: suporte a drag-and-drop em mobile para listas.
- `canvas-confetti@1.6.0`: feedback visual ao atingir marcos de metas e ao usar a roleta de decisão.
- **Unsplash**: imagens pré-definidas de capa do dashboard.

## PWA

- `manifest.json` define instalação, ícones, orientação e aparência standalone.
- `sw.js` implementa cache do app shell e das dependências CDN opcionais.
- O Service Worker deliberadamente não intercepta Auth, Data API, Realtime ou conteúdo remoto do Supabase.

# Arquitetura

A aplicação é uma **SPA sem framework**. A navegação troca a view ativa no DOM; não existe roteador por URL.

A arquitetura se divide em quatro camadas práticas:

1. **Shell e composição visual** — `index.html` e `style.css`.
2. **Bootstrap e roteamento de estado** — `js/app.js` e `js/modules/navigation.js`.
3. **Estado, sessão e persistência** — `js/store.js`.
4. **Regras puras e módulos de domínio/UI** — `js/rules.js`, `js/utils.js` e `js/modules/*.js`.

## `index.html`

Contém todas as views principais da aplicação e seus bottom sheets. As telas principais são:

- login/cadastro;
- criação ou entrada em um Nook;
- acesso aguardando aprovação;
- onboarding do casal;
- Home;
- Listas;
- Finanças;
- Agenda;
- Metas;
- Configurações.

A aplicação não gera templates em servidor. Cada módulo encontra elementos pelo `id`, preenche conteúdo e associa listeners.

## `js/app.js`

É o ponto de entrada do frontend. Suas responsabilidades são:

- registrar o Service Worker;
- verificar sessão;
- decidir qual view deve aparecer;
- inicializar os módulos uma única vez;
- alternar login e cadastro;
- criar ou entrar em um Nook;
- reagir a eventos globais de sincronização e perfil.

## `js/store.js`

É o principal boundary de dados do frontend. Centraliza:

- cliente Supabase;
- sessão e identificação do usuário atual;
- perfil e `couple_id` atual;
- coleções compartilhadas em memória;
- conversão banco ↔ domínio;
- validação antes de persistir;
- CRUD das tabelas compartilhadas;
- proteção contra respostas antigas e troca de sessão;
- serialização de mutações concorrentes;
- optimistic concurrency por `nook_version`;
- Realtime e refresh ao voltar para foreground/reconectar;
- operações de fotos privadas (`uploadPhoto`, `resolvePhotoUrl`, `deletePhoto`);
- geração de paths por `couple_id`;
- cache em memória de signed URLs.

Os módulos de UI não devem conversar diretamente com as tabelas Postgres nem conhecer detalhes de Supabase Storage para operações comuns. O contrato de persistência e Storage fica centralizado em `store.js`.

## `js/rules.js`

Contém regras puras, sem DOM, sessão ou chamadas de rede. É responsável por:

- validação de números e datas;
- cálculo monetário em centavos;
- resumo financeiro;
- cálculo de divisão proporcional;
- normalização de itens de listas e histórico de metas;
- validação de contas e metas;
- progresso e forecast de metas;
- cálculo de dias juntos;
- conjunto canônico de reações do mural (`❤️`, `😘`, `☕`).

Essa separação é importante porque mantém regras críticas independentes da UI.

## `js/utils.js`

Agrupa utilidades transversais de UI e segurança, incluindo:

- escaping de HTML;
- tratamento de imagens;
- formatação monetária;
- avatares;
- controle de bottom sheets;
- prevenção de fechamento com edição não salva;
- feedback háptico;
- toast;
- `runAction` para controlar ações assíncronas;
- validação de arquivo de imagem;
- helpers para edição com conflito.

## `js/modules/`

Cada arquivo representa um domínio visual/funcional:

- `navigation.js`: troca das views principais.
- `onboarding.js`: nomes, data do relacionamento e avatares.
- `home.js`: dashboard, humor, memórias, recados e capa.
- `lists.js`: listas, tarefas, prioridades, filtros, reordenação e decisão aleatória.
- `agenda.js`: calendário semanal/mensal e compromissos.
- `goals.js`: metas financeiras e hábitos.
- `finances.js`: modelo de divisão, contas, pagamentos, histórico e acerto.
- `settings.js`: tema, código de convite e logout.

# Fluxos principais

## 1. Inicialização e autenticação

```text
Navegador
↓
index.html
↓
js/app.js
↓
store.checkSession()
├─ sem sessão → Login/Cadastro
└─ com sessão → store.fetchProfile()
                ↓
                existe Nook?
                ├─ não → Criar ou entrar por convite
                └─ sim → approved?
                         ├─ não → Tela de acesso pendente
                         └─ sim → store.init()
                                  ↓
                                  carrega dados + Realtime
                                  ↓
                                  perfil completo?
                                  ├─ não → Onboarding
                                  └─ sim → Home
```

## 2. Criação de um Nook

```text
Usuário autenticado sem perfil
↓
Criar novo Nook
↓
store.createNewNook()
↓
Gera invite_code aleatório
↓
INSERT em profiles com p1_email
↓
Perfil fica associado ao casal
↓
Fluxo de aprovação/liberação
```

## 3. Entrada por convite

```text
Usuário autenticado sem Nook
↓
Informa invite_code
↓
store.joinNook(code)
↓
RPC nook_join
↓
Backend valida convite e associação
↓
store.fetchProfile()
↓
Usuário passa a pertencer ao mesmo couple_id
```

## 4. Onboarding do casal

```text
Perfil aprovado, porém incompleto
↓
Nomes + data inicial + avatar opcional
↓
Upload privado via `store.uploadPhoto('avatars', ...)`, se necessário
↓
Banco recebe apenas o storage path
↓
store.setProfile()
↓
UPDATE profiles
↓
nook:profile-saved
↓
Roteamento para Home
```

## 5. Leitura de dados compartilhados

```text
store.init()
↓
fetchFinances + fetchRecords + fetchMoods
↓
Supabase/Postgres filtrado por couple_id
↓
Conversão de rows para objetos do domínio
↓
Estado em memória do store
↓
Módulos renderizam a UI
```

## 6. Mutação de registros

```text
Interação do usuário
↓
Módulo funcional
↓
runAction()
↓
store.saveRecord() / store.deleteRecord()
↓
Validação de domínio
↓
Confirma couple_id e geração da sessão
↓
Serializa mutação da mesma entidade
↓
Supabase CRUD com couple_id e nook_version
↓
Banco confirma operação
↓
Atualiza estado local
↓
Evento nook:data-updated
↓
Re-render da view ativa
```

## 7. Edição com proteção contra conflito

```text
Abrir edição
↓
store.captureEdit()
↓
Snapshot + fingerprint + nook_version
↓
Usuário edita
↓
store.saveEdit()
↓
Confere se registro local mudou
↓
UPDATE ... WHERE id + couple_id + nook_version
↓
Banco atualiza ou sinaliza conflito
```

O objetivo é impedir sobrescrita cega quando o parceiro ou outro dispositivo alterou o mesmo registro.

## 8. Sincronização Realtime

```text
Mudança no Postgres
↓
Supabase Realtime
↓
store.subscribeRealtime()
↓
Ignora eventos de outro couple_id
↓
Agrupa tabelas alteradas por ~300 ms
↓
Refaz leitura apenas das tabelas sujas
↓
nook:data-updated
↓
UI ativa re-renderiza
```

Ao retornar para foreground ou recuperar conexão, `store.refreshData()` também reconcilia o estado com o banco.

## 9. Listas e tarefas

```text
Listas
↓
Seleciona/cria lista
↓
Itens com responsável + prioridade + concluído
↓
Reordenação / edição / conclusão
↓
Lista inteira é persistida com items em estrutura composta
```

Listas do tipo `decision` habilitam uma roleta que escolhe aleatoriamente um item pendente e pode marcá-lo como concluído.

## 10. Agenda

```text
Agenda
↓
Seleciona data / visão
↓
Cria compromisso
↓
Responsável + data + hora + confirmação
↓
Registro em agenda
↓
Home também exibe compromissos do dia
```

## 11. Metas

```text
Nova meta
├─ Financeira → alvo monetário + saldo + prazo opcional
└─ Hábito → alvo inteiro + unidade
↓
Atualização de progresso
↓
Novo lançamento no histórico
↓
Marcos 25/50/75/100%
↓
Feedback háptico/confetti
```

## 12. Finanças

```text
Configura regra de divisão
↓
50/50 | proporcional | 100% P1 | 100% P2 | conta conjunta | customizado
↓
Cadastra contas
↓
Descrição + valor + categoria + vencimento + pagador
↓
Marca como paga
↓
Resumo financeiro e histórico mensal
↓
Quando aplicável, calcula acerto entre o casal
```

## 13. Humor

```text
Usuário autenticado
↓
Seleciona o próprio humor do dia
↓
store.setMood()
↓
RPC nook_set_mood
↓
Tabela moods
↓
Realtime atualiza o parceiro
```

Cada pessoa só deve atualizar o próprio humor.

## 14. Memórias e recados

```text
Home
├─ Memória → título + data + nota + foto opcional
│            ↓
│            store.uploadPhoto('memories', ...) + tabela memories
│            banco persiste somente o storage path
│
└─ Recado → texto + cor + duração
             ↓
             tabela notes com expires_at
             ↓
             reações limitadas
```

Memórias antigas que completam aniversário na data atual podem aparecer como cápsula temporal.

## 15. PWA e offline do shell

```text
Primeira carga
↓
Service Worker instala
↓
Cache do HTML/CSS/JS/ícones + CDNs opcionais
↓
Próximas cargas podem abrir o shell pelo cache
↓
Dados compartilhados continuam dependendo do Supabase
```

O cache é intencionalmente voltado ao **app shell**, não a uma base de dados offline.

# Regras de negócio

## Casal, identidade e acesso

- Cada espaço compartilhado é identificado por `couple_id`.
- As duas posições lógicas do casal são `p1` e `p2`.
- O vínculo do usuário autenticado com `p1`/`p2` é determinado pelo e-mail do Supabase Auth comparado a `p1_email` e `p2_email` do perfil.
- O aplicativo só libera dados quando existe perfil, `couple_id`, usuário vinculado e `approved === true`.
- Um usuário que já participa de um Nook não pode criar outro pelo fluxo atual.
- O criador não pode usar o próprio código de convite para entrar novamente no mesmo Nook.
- Códigos recebidos pelo fluxo de convite aceitam 6–12 caracteres alfanuméricos; códigos novos são gerados com 8 caracteres maiúsculos.

## Perfil

- O casal precisa ter nome para `p1`, nome para `p2` e data inicial para completar o onboarding.
- A data inicial precisa ser válida, a partir de 1900, e não pode estar no futuro.
- Avatar pode ser foto, emoji ou fallback de iniciais.
- Fotos privadas persistem como storage path; signed URL é apenas um detalhe temporário de renderização.
- O tema é preferência local do navegador e pode ser `system`, `light` ou `dark`.

## Responsáveis

Vários domínios usam os valores internos:

- `IS`: primeira pessoa (`p1`).
- `VO`: segunda pessoa (`p2`).
- `Casal`: responsabilidade conjunta.

A UI converte esses identificadores para os nomes reais do perfil.

## Humor

- Humores aceitos: `energia`, `cansado`, `lanche`, `apaixonado`, `estresse`, `feliz`.
- O humor é diário.
- O usuário só deve conseguir alterar o próprio humor.

## Listas

- Tipos atuais: `standard` e `decision`.
- Cada item precisa de ID único dentro da lista, texto não vazio, responsável válido e `completed` booleano.
- Prioridades aceitas: `none`, `urgent`, `casual`.
- Itens inválidos são isolados na leitura e o conteúdo bruto é preservado para evitar perda silenciosa.
- Uma lista com itens inválidos não deve ser sobrescrita até os dados serem revisados.
- A roleta de decisão considera apenas itens ainda não concluídos.

## Agenda

- Todo compromisso precisa de título, data válida e horário em formato válido.
- Compromissos são atribuídos a um responsável.
- Eventos do dia aparecem também na Home.

## Finanças

- Uma conta precisa de descrição, valor maior que zero, vencimento válido e pagador válido.
- Valores monetários críticos são convertidos para centavos durante cálculos para reduzir erros de ponto flutuante.
- Categorias atuais: `moradia`, `mercado`, `lazer`, `transporte`, `outros`.
- Modelos de divisão aceitos: `50/50`, `proportional`, `100-p1`, `100-p2`, `single`, `custom`.
- No modelo proporcional, se as duas rendas forem zero, o fallback é 50/50.
- Modos de acerto usados pela UI: `transfer` e `prioritize`.
- O card de acerto entre as pessoas só é exibido para modelos em que esse cálculo faz sentido na UI atual.
- Dados financeiros inválidos devem ser excluídos dos cálculos e sinalizados ao usuário, em vez de quebrar silenciosamente o resumo.
- O indicador global **A pagar** pode considerar pendências fora do mês selecionado.
- O **resumo/gráfico do mês selecionado** considera apenas despesas cuja `date` pertença àquele mês.

## Metas

- Tipos atuais: `financial` e `habit`.
- Toda meta precisa de título e alvo positivo.
- Meta de hábito aceita apenas quantidades inteiras.
- Meta financeira é normalizada monetariamente.
- Prazo é opcional, mas, quando informado, precisa ser uma data válida.
- Cada contribuição guarda data, nome do autor, `personId` e valor.
- Histórico inválido é isolado e impede alterações destrutivas até revisão.
- Progresso visual é limitado a 100%; antes de concluir, usa no máximo 99%.

## Memórias

- Título é obrigatório.
- Data precisa ser válida.
- Foto é opcional.
- Foto privada é persistida como path `<couple_id>/memories/...`; a UI resolve uma signed URL em memória.
- Uma memória de anos anteriores com mesmo mês/dia da data atual pode ser destacada como cápsula temporal.

## Recados

- Texto é obrigatório.
- Durações criadas pela UI: 24, 72 ou 168 horas.
- Reações aceitas: `❤️`, `😘`, `☕`.
- Datas de criação/expiração precisam ser parseáveis.

## Concorrência e integridade

- Operações sobre a mesma entidade são serializadas no frontend.
- Escritas aguardando fila são canceladas se sessão/casal mudarem.
- Edições e exclusões exigem `nook_version`.
- Uma edição deve falhar se a versão do registro mudou desde que o formulário foi aberto.
- O estado local só é atualizado após confirmação do banco.
- Respostas atrasadas de uma sessão/casal antigo não podem poluir o estado atual.

# Padrões utilizados

## Store centralizado

`store.js` funciona simultaneamente como store de estado, service de sessão e camada de acesso a dados. Para o tamanho atual do projeto, isso reduz complexidade e evita múltiplas abstrações.

## Módulos por domínio

Cada domínio possui um módulo de UI próprio com funções `init...` e `render...`. A inicialização instala listeners; o render lê o `store` e atualiza o DOM.

## Regras puras

Cálculos e validações relevantes ficam em `rules.js`, separados de DOM e rede.

## Event-driven UI

Eventos customizados desacoplam parte do fluxo:

- `nook:data-updated`
- `nook:profile-saved`
- `nook:sync-error`

## Pessimistic/confirmed writes

O frontend espera confirmação do Supabase antes de consolidar a mutação no estado local. Isso privilegia confiabilidade sobre sensação de instantaneidade.

## Optimistic concurrency control

Apesar das escritas confirmadas, a concorrência entre clientes é tratada com `nook_version`: updates/deletes só afetam a versão que o usuário abriu.

## Normalização defensiva

Estruturas compostas vindas do banco, como `lists.items` e `goals.history`, são normalizadas. Entradas inválidas são separadas sem apagar o valor bruto original.

## Progressive enhancement de PWA

O app funciona como site e adiciona instalação/cache quando Service Worker está disponível.

# Convenções do projeto

- Manter **JavaScript simples, ES Modules e sem framework** enquanto a complexidade não justificar migração.
- Evitar novas dependências quando Web APIs ou helpers locais resolvem o problema.
- Centralizar acesso a tabelas Supabase em `store.js` sempre que possível.
- Colocar regras puras/validação em `rules.js`, não dentro do DOM handler.
- Usar `utils.js` somente para comportamento transversal e reutilizável.
- Cada domínio visual deve permanecer em `js/modules/<dominio>.js`.
- Funções de inicialização seguem o padrão `initX`; renderização segue `renderX`.
- IDs internos `IS`, `VO` e `Casal` não devem ser trocados pelos nomes visíveis do casal no banco.
- Datas de domínio são armazenadas como `YYYY-MM-DD`; data/hora de recados usa ISO.
- Valores monetários devem ser calculados via helpers de centavos, evitando aritmética financeira direta com floats.
- Toda saída de texto de usuário inserida em HTML deve passar por `escapeHTML` quando não for atribuída via `textContent`.
- URLs/imagens devem passar pelas funções seguras existentes antes de serem usadas em CSS/HTML.
- Fotos do bucket `photos` devem usar helpers do `store`, path iniciado por `couple_id` e nunca persistir signed URL.
- Ações assíncronas iniciadas por UI devem preferir `runAction` para evitar duplo clique e padronizar erro/estado de saving.
- Formulários de edição devem usar `captureEdit`/`saveFormEdit` quando a entidade suporta controle de versão.
- Nunca atualizar ou excluir um registro apenas por `id`; preservar o filtro por `couple_id` e, para entidades versionadas, por `nook_version`.
- Não fazer update otimista cego em memória antes do banco confirmar a gravação.
- Ao mudar arquivos estáticos servidos pelo Service Worker, incrementar `CACHE_NAME` em `sw.js` para evitar mistura de versões.
- Não adicionar API/Auth/Realtime do Supabase ao cache do Service Worker.
- Preservar mobile-first e o padrão de bottom sheets para ações secundárias/formulários.

# Dependências importantes

## Supabase Auth

Responsável pela identidade. O e-mail autenticado é usado para mapear a conta ao slot `p1` ou `p2` do perfil.

## Supabase Postgres

Tabelas esperadas pelo frontend:

- `profiles`
- `finances`
- `moods`
- `expenses`
- `lists`
- `agenda`
- `goals`
- `memories`
- `notes`

As tabelas compartilhadas dependem de `couple_id`; as coleções editáveis também dependem do contrato de `nook_version` criado no banco.

## Supabase RPC

### `nook_join`

Realiza o ingresso seguro do segundo usuário por código de convite. Essa operação não deve ser substituída por update direto do perfil pelo cliente sem preservar as regras de autorização do backend.

### `nook_set_mood`

Atualiza o humor da pessoa autenticada, permitindo ao backend decidir qual coluna (`p1`/`p2`) pode ser alterada.

## Supabase Realtime

Mantém os dois clientes sincronizados. O frontend escuta alterações e refaz a leitura das tabelas impactadas.

## Supabase Storage

Armazena imagens privadas do casal no bucket `photos`. O contrato atual é:

```text
<couple_id>/avatars/...
<couple_id>/covers/...
<couple_id>/memories/...
```

O banco persiste o **storage path**. `store.resolvePhotoUrl()` gera signed URL temporária para exibição e mantém um cache somente em memória. URLs antigas `http://`/`https://` ainda são aceitas temporariamente para compatibilidade, sem migração automática. O bucket possui limite de 8 MB e MIME types permitidos definidos em `setup.sql`.

## CDN de terceiros

Supabase JS `2.118.0`, Phosphor Icons Web `2.1.2`, mobile-drag-drop `2.3.0-rc.2` e canvas-confetti `1.6.0` são carregados da rede com versões explícitas. O Service Worker tenta cacheá-los como assets opcionais, mas a indisponibilidade de uma CDN na primeira carga pode degradar funcionalidades associadas.

# Estrutura resumida

```text
Nook/
├── index.html
├── style.css
├── manifest.json
├── sw.js
├── setup.sql
├── AGENTS.md
├── PROJECT.md
├── STATUS.md
├── Nook-ROADMAP.md
├── img/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── js/
    ├── app.js
    ├── store.js
    ├── rules.js
    ├── utils.js
    └── modules/
        ├── navigation.js
        ├── onboarding.js
        ├── home.js
        ├── lists.js
        ├── agenda.js
        ├── goals.js
        ├── finances.js
        └── settings.js
```

# Arquivos essenciais

- `index.html` — define o shell da SPA, views, formulários, navegação e bottom sheets.
- `style.css` — concentra o design system e os estilos responsivos/light-dark do produto.
- `js/app.js` — bootstrap, autenticação e roteamento principal de estado.
- `js/store.js` — contrato central de sessão, estado, Supabase, CRUD, concorrência e Realtime.
- `js/rules.js` — regras puras, validações e cálculos de negócio.
- `js/utils.js` — helpers de UI, segurança de saída, modais e ações assíncronas.
- `js/modules/home.js` — composição do dashboard e domínios de humor, memórias, recados e capa.
- `js/modules/lists.js` — lógica completa de listas/tarefas e decisão rápida.
- `js/modules/finances.js` — contas, divisão e acerto financeiro.
- `js/modules/agenda.js` — compromissos e navegação temporal.
- `js/modules/goals.js` — metas, histórico e progresso.
- `js/modules/onboarding.js` — configuração inicial do casal e avatares.
- `sw.js` — estratégia de cache/versão da PWA.
- `manifest.json` — metadados de instalação da PWA.
- `setup.sql` — baseline versionado do contrato Supabase: schema, RLS, RPCs, Realtime e Storage.
- `AGENTS.md` — instruções permanentes para agentes que alterarem o projeto.
- `STATUS.md` — estado atual, riscos, validação pendente e próxima ação.
- `Nook-ROADMAP.md` — prioridades de produto/engenharia e histórico de itens planejados/concluídos.

# Decisões arquiteturais

## Vanilla JS em vez de framework

A aplicação é pequena e pessoal. HTML/CSS/JS puro reduz toolchain, dependências, configuração e curva de manutenção. O custo é maior disciplina manual para estado, listeners, renderização e consistência do DOM conforme o app crescer.

## Supabase como backend completo

Auth, banco, Realtime, RPC e Storage ficam no mesmo serviço. Isso acelera o desenvolvimento e reduz infraestrutura própria. Em troca, o frontend depende fortemente do schema, policies, functions e configuração do projeto Supabase.

## Estado em memória + backend como fonte de verdade

Dados de negócio não são persistidos em `localStorage`. Isso evita herança de dados entre contas no mesmo navegador e simplifica o modelo de consistência. O custo é que o app não oferece edição offline real; apenas o shell pode abrir sem rede.

## `couple_id` como boundary multiusuário

Toda informação compartilhada pertence a um casal. Esse desenho simplifica sincronização e consultas, mas torna RLS e constraints do banco essenciais: falhas nas policies podem causar vazamento entre casais.

## Versionamento para conflito

`nook_version` evita lost updates quando os dois usuários alteram o mesmo registro. O custo é exigir triggers/colunas corretos no banco e tratamento explícito de conflito no frontend.

## Registros compostos em JSON para listas/histórico

Itens de lista e histórico de metas são armazenados dentro do registro pai. Isso deixa o MVP simples e reduz tabelas/joins, mas aumenta o tamanho de updates e cria conflitos no nível do registro inteiro, mesmo quando pessoas alteram itens diferentes.

## App shell offline, dados online

O Service Worker cacheia a interface, mas não tenta ser uma base de dados offline. Isso evita reconciliação complexa, ao custo de funcionalidade reduzida sem conexão.

# Pontos de atenção

- **O backend está versionado como baseline em `setup.sql`.** Isso torna o contrato atual reconstruível, mas futuras mudanças incompatíveis de schema ainda devem usar SQL explícito de migração; `CREATE TABLE IF NOT EXISTS` não evolui tabelas antigas automaticamente.
- **O contrato de Storage privado está alinhado no código e em `setup.sql`.** Ainda é necessário validar o ambiente Supabase implantado com smoke test real e manter compatibilidade temporária com URLs antigas já salvas.
- **A chave publishable e a URL do Supabase estão hardcoded em `store.js`.** Isso é aceitável para uma chave pública quando RLS está correta, mas dificulta ambientes distintos e troca de projeto.
- **`store.js` concentra muitas responsabilidades.** É adequado ao tamanho atual, mas pode virar gargalo se o produto crescer muito.
- **Listeners são instalados por inicialização única.** Novas chamadas repetidas a `initX` devem ser evitadas para não duplicar handlers.
- **Grande parte da UI depende de IDs do DOM.** Renomear elementos em `index.html` exige revisar os módulos associados.
- **Listas e históricos compostos são atualizados como um bloco.** Há risco de conflito mais frequente em uso simultâneo.
- **Não há suíte de testes automatizados nem configuração de build/lint no snapshot.** As regras puras são boas candidatas para testes futuros.
- **CDNs são dependências de runtime.** O cache ajuda depois da primeira carga, mas não elimina a dependência inicial.
- **Realtime assina mudanças de todo o schema `public` e filtra `couple_id` no cliente.** A confidencialidade não pode depender desse filtro; deve depender de RLS/Realtime authorization no backend.
- **Algumas mensagens de erro ainda citam `INSTRUCOES.md`, mas esse arquivo não existe.** Como `setup.sql` virou a referência real do backend, essas mensagens devem ser atualizadas futuramente.

# Como adicionar uma nova funcionalidade

Em alto nível:

1. **Defina a regra de negócio.** Se houver validação ou cálculo independente de UI, adicione em `js/rules.js`.
2. **Defina o contrato de dados.** Se precisar de nova tabela/coluna/RPC, atualize primeiro o schema/RLS do Supabase e versione esse SQL no projeto.
3. **Atualize `store.js`.** Adicione mapeamento de campos, validação, fetch e método de persistência quando a feature tiver dados próprios.
4. **Crie ou estenda um módulo em `js/modules/`.** Mantenha DOM/render/listeners dentro do domínio correspondente.
5. **Adicione o markup necessário em `index.html`.** Reutilize os padrões existentes de cards, views e bottom sheets.
6. **Adicione estilos em `style.css`.** Preserve tokens/variáveis e comportamento mobile-first.
7. **Integre a renderização/navegação.** Se for uma nova view principal, atualize `navigation.js` e a barra de navegação. Se for parte de uma view existente, prefira manter no módulo atual.
8. **Garanta isolamento por casal e concorrência.** Toda nova persistência compartilhada deve respeitar `couple_id`, RLS e estratégia equivalente de versionamento se houver edição concorrente.
9. **Verifique sincronização.** Inclua a nova tabela no mapa de Realtime se ela precisar aparecer no dispositivo do parceiro imediatamente.
10. **Atualize o cache da PWA.** Se novos arquivos estáticos forem adicionados ou o shell for alterado, revise `LOCAL_ASSETS` e incremente `CACHE_NAME`.
11. **Faça smoke test em dois usuários/dispositivos.** Valide criação, reload, edição simultânea, logout/login e sincronização.

# Glossário

- **Nook** — o espaço digital privado compartilhado pelo casal.
- **`couple_id`** — identificador do casal e principal chave de isolamento de dados.
- **`p1` / `p2`** — slots das duas pessoas no perfil.
- **`IS` / `VO` / `Casal`** — identificadores internos usados como responsáveis em vários domínios; a UI os traduz para nomes do perfil.
- **Invite code** — código que permite ao segundo usuário entrar no mesmo Nook.
- **`approved`** — flag de liberação do perfil antes de permitir acesso ao app compartilhado.
- **`nook_version`** — versão do registro usada para detectar conflito de edição/exclusão.
- **Store** — objeto central em `js/store.js` que mantém sessão, estado em memória e comunicação com Supabase.
- **Bottom sheet** — painel/modal que sobe da parte inferior da tela e concentra formulários e ações secundárias.
- **Decision list** — lista com roleta aleatória para escolher um dos itens pendentes.
- **Settlement / acerto** — cálculo de quem deve compensar quem após pagamentos compartilhados.
- **Capsule memory** — memória de ano anterior destacada quando o mês/dia coincide com a data atual.
- **App shell** — HTML/CSS/JS/ícones necessários para abrir a interface da PWA, independentemente dos dados remotos.
- **RLS** — Row Level Security do Postgres/Supabase; principal camada de autorização dos dados por casal.
- **RPC** — função Postgres exposta pelo Supabase para executar uma operação controlada no backend.
- **Realtime** — canal do Supabase que avisa o cliente sobre mudanças no banco para sincronizar o parceiro.
