# STATUS — Nook

**Última atualização:** 27/10/2026  
**Baseline atual:** `Nook - 27 Out v2` + rodada de hardening atual  
**Estado:** MVP pessoal funcional. Fluxos centrais implementados; Auth recovery, autoria estável do Mural, Agenda Dia todo, locking financeiro, Listas active-only e remoção do confetti implementados no código; validação estática concluída; migration e smoke test real ainda precisam ser executados no Supabase.

# Fase atual do produto

O Nook já cobre o ciclo principal de uso de um casal em um único PWA:

- autenticação;
- criação do Nook;
- entrada do parceiro por convite;
- onboarding;
- Home;
- humor;
- listas;
- agenda;
- finanças;
- metas;
- memórias;
- mural de recados;
- ajustes/tema;
- PWA com app shell em cache.

As últimas rodadas completaram os fluxos essenciais dos módulos existentes. O foco imediato não deve ser abrir novas áreas do produto, e sim **validar a baseline de 27/10 em uso real com duas contas/dispositivos** e corrigir qualquer regressão observada antes de avançar para features de conveniência.

Prioridade:

> manter o Nook pequeno, íntimo e simples, mas confiável o suficiente para o uso diário do casal.

# Baseline técnica atual

## Frontend

Arquivos principais:

- `index.html`
- `style.css`
- `manifest.json`
- `sw.js`
- `js/app.js`
- `js/store.js`
- `js/rules.js`
- `js/utils.js`
- `js/modules/navigation.js`
- `js/modules/onboarding.js`
- `js/modules/home.js`
- `js/modules/lists.js`
- `js/modules/agenda.js`
- `js/modules/goals.js`
- `js/modules/finances.js`
- `js/modules/settings.js`

Arquitetura atual:

- HTML/CSS/JavaScript ES Modules;
- sem framework;
- sem bundler;
- sem `package.json`;
- sem state manager externo;
- sem suíte automatizada de testes.

## Backend

`setup.sql` na raiz continua sendo a baseline versionada do contrato Supabase.

Tabelas esperadas:

- `profiles`
- `finances`
- `moods`
- `expenses`
- `lists`
- `agenda`
- `goals`
- `memories`
- `notes`

RPCs:

- `nook_join(text)`
- `nook_set_mood(text, date)`

Infraestrutura relevante:

- RLS por `couple_id`;
- `nook_version` para registros editáveis/versionados;
- Realtime;
- bucket privado `photos`;
- paths de Storage iniciados por `couple_id`.

# Rodadas concluídas

## P0 — confiabilidade

Concluído:

- whitelist única das reações do mural: `❤️`, `😘`, `☕`;
- comportamento correto de **Limpar concluídas**;
- Storage de fotos privado e alinhado ao `setup.sql`;
- banco persiste storage path, não URL pública/signed URL;
- helpers de fotos centralizados no store;
- signed URLs temporárias com cache em memória;
- compatibilidade de leitura com URLs antigas `http://`/`https://`;
- resumo financeiro mensal separado do indicador global **A pagar**;
- fetch inicial duplicado de perfil removido;
- primeiro `SUBSCRIBED` do Realtime não dispara refetch redundante;
- dependências CDN fixadas;
- backend versionado em `setup.sql`.

## P1 — navegação, confirmações, CSS e loading

Concluído:

- bottom navigation com 5 itens: Início, Listas, Agenda, Finanças e Metas;
- Ajustes fora da bottom bar e acessível pela Home;
- bottom sheet reutilizável para confirmações;
- renomear lista sem `prompt()`;
- exclusões principais sem `confirm()` nativo;
- toast para feedback não bloqueante;
- mood/roleta sem `alert()`;
- redução de estilos inline estáticos;
- skeletons de Home, Memórias, Finanças e Agenda;
- loading sem timer artificial;
- suporte a `prefers-reduced-motion`.

## P1.1 — convite, mood e mural

Concluído:

- `alert() = 0`, `confirm() = 0`, `prompt() = 0` na experiência normal;
- descarte de formulário não salvo usa confirmação visual;
- `approved` representa conexão do segundo membro, não aprovação administrativa;
- tela **Aguardando seu parceiro**;
- copiar e compartilhar convite com `navigator.share()` + fallback clipboard;
- `AbortError` de share tratado como cancelamento normal;
- Ajustes mostra **Parceiro conectado ✓** após o join;
- próprio mood mostra **Toque para alterar**;
- mood do parceiro é read-only;
- recados suportam 24h, 3 dias, 7 dias e **Até eu remover**;
- recado permanente persiste `expires_at = null`;
- autor pode editar texto/duração do próprio recado;
- edição de recado usa `captureEdit()` + `saveFormEdit()`.

## P1.2 — Memórias, Listas, Agenda e Finanças

Concluído:

### Memórias

- viewer com foto maior, data, título, nota, editar e excluir;
- grid usa `<img loading="lazy" decoding="async">`;
- fotos novas passam por compressão central em `store.uploadPhoto()`;
- maior lado limitado a 1600 px;
- JPEG/PNG/WebP são convertidos para WebP qualidade 0,82;
- GIF permanece original para preservar animação;
- fotos antigas continuam compatíveis;
- nenhum novo fetch é necessário para abrir viewer.

### Listas

- pendentes e concluídas aparecem em seções separadas;
- concluídas começam recolhidas;
- estado expandido é apenas local de UI;
- contadores acompanham filtros;
- marcar/desmarcar move item entre seções;
- renomear continua usando bottom sheet;
- não existe campo `archived` novo.

### Agenda

- compromisso pode ser editado pelo mesmo formulário de criação;
- edição usa `captureEdit()` + `saveFormEdit()`;
- campos editáveis: título, data, hora, responsável e subtítulo;
- data selecionada é preservada ao abrir novo compromisso;
- `created_by` permite mostrar **Criado por você / Criado por X**;
- parceiro pode marcar **Ciente**;
- criador não precisa confirmar o próprio compromisso;
- `confirmed = true` representa **Ambos cientes**.

### Finanças

- despesas pendentes mostram status temporal: hoje, amanhã, em N dias ou atrasada;
- despesas pagas não recebem status de atraso;
- cálculo de vencimento usa regra pura por data;
- acerto financeiro usa o mês selecionado e os nomes reais do casal;
- copy do acerto foi humanizada sem criar um segundo cálculo;
- `financialSummary().balance` continua sendo a fonte da matemática.

## P1.3 — Metas e polimento de UX

Concluído:

### Metas

- editar meta pelo mesmo formulário de criação;
- edição preserva `current`, `history`, identidade e `nook_version`;
- tipo da meta não é alterado durante edição;
- campos editáveis: título, ícone, responsável, alvo, prazo e unidade quando aplicável;
- conclusão é derivada exclusivamente de `current >= target`;
- não existe coluna/flag `completed`;
- cards concluídos mostram **Concluída 🎉**;
- CTA de progresso some quando a meta está concluída;
- histórico, editar, excluir e undo continuam disponíveis;
- metas ativas e concluídas ficam em seções separadas;
- concluídas ficam recolhidas por padrão;
- undo remove o último item do histórico e recalcula `current` pelo histórico restante;
- meta pode voltar de concluída para ativa após undo ou edição do target;
- criação financeira com valor inicial registra esse valor também no histórico.

### Convenções internas

Constantes de domínio atuais em `rules.js`:

```text
OWNER.P1 = 'IS'
OWNER.P2 = 'VO'
OWNER.COUPLE = 'Casal'

GOAL_TYPE.FINANCIAL = 'financial'
GOAL_TYPE.HABIT = 'habit'
```

Os valores persistidos não foram migrados.

### UX transversal

- `runAction()` continua protegendo contra double submit;
- erros conhecidos recebem mensagens humanas via `humanizeError()`;
- erros técnicos continuam visíveis no console;
- formulários alterados permanecem abertos se a gravação falhar;
- autofocus é opt-in via `data-autofocus` e só dispara automaticamente em pointer fino/desktop;
- haptics foram reduzidos a ações mais significativas;
- `prefers-reduced-motion` agora também reduz transições/animações gerais;
- empty states alterados usam CTA contextual único quando aplicável.

## 27 Out — hardening técnico e consolidação

Implementado no código:

- recuperação de senha com Supabase Auth (`PASSWORD_RECOVERY`);
- `notes.created_by` como identidade estável para novos recados, com fallback legacy;
- Listas renderizam somente itens da lista ativa;
- Agenda aceita `time = null` e exibe **Dia todo**;
- configuração financeira usa optimistic locking com versão capturada ao abrir o sheet;
- `canvas-confetti` removido de HTML, JS e Service Worker;
- conclusão de meta usa microanimação CSS discreta;
- `style.css` consolidado de forma conservadora, preservando a ordem necessária ao visual atual.

Backend: a migration precisa ser executada para adicionar `notes.created_by` e tornar `agenda.time` nullable. `setup.sql` já representa o schema final.

# Estado atual do Service Worker

Cache atual:

```text
nook-v1.15
```

Dependências externas sincronizadas entre `index.html` e `sw.js`:

```text
Supabase JS: 2.118.0
Phosphor Web: 2.1.2
```

O Service Worker continua responsável apenas pelo app shell/assets estáticos. Não existe fila offline de mutações.

# Validação feita sobre a baseline de 27/10

## Checagens estáticas

Executadas sobre a cópia de trabalho derivada de `Nook - 27 Out v2.zip`:

- todos os arquivos JS e `sw.js` passam em `node --check`;
- nenhum ID duplicado em `index.html`;
- bottom bar possui exatamente 5 destinos;
- `alert()`, `confirm()` e `prompt()` não aparecem nos fluxos da aplicação;
- versões Supabase/Phosphor estão sincronizadas entre HTML e Service Worker;
- sintaxe JavaScript e Service Worker validada;
- regressão estática confirma que features anteriores permanecem presentes;
- migration separada preparada para `notes.created_by` e `agenda.time` nullable;
- consolidação CSS feita de forma conservadora, sem reordenação ampla de cascade.

## Regras de Metas testadas isoladamente

Casos exercitados:

```text
financeira: 350 → undo → 100
hábito: 3 → undo → 2
0,10 + 0,20 + 0,35 = 0,65
```

Também foi verificado que a edição versionada envia apenas os campos editáveis e preserva `current/history` no registro original.

# O que ainda precisa de validação real

A validação estática não substitui uso contra o Supabase implantado.

Smoke test prioritário:

```text
recovery de senha (solicitar link → trocar senha → login)
→ P1 cria Nook
→ compartilha convite
→ P2 entra
→ onboarding
→ avatar/capa/memória com foto
→ viewer de memória
→ recado temporário e permanente
→ edição do próprio recado
→ mood P1/P2
→ lista com pendentes/concluídos + troca entre 3 listas confirmando DOM active-only
→ agenda criada/editada + Ciente + evento Dia todo
→ finanças com vencimentos/acerto + conflito de configuração em dois navegadores
→ meta financeira e hábito
→ editar meta
→ concluir meta
→ undo de meta
→ reload
→ Realtime entre dois clientes
→ logout/login cruzado no mesmo navegador
```

Também validar:

- perda de rede e reconexão;
- retorno de background;
- conflito de edição em duas janelas;
- Storage privado entre P1/P2 do mesmo casal;
- acesso negado entre casais diferentes;
- cache `nook-v1.15` após deploy.

# Riscos abertos

## 1. Autorização de recados ainda é por casal

Após a migration, `notes.created_by` fornece identidade estável para novos recados; registros legacy ambíguos podem permanecer `NULL` e usar fallback textual.

A UI usa `created_by` prioritariamente para decidir autor/editar/excluir. Isso resolve identidade, mas não cria ownership enforcement no banco: a RLS continua por casal. Autorização forte por autor exigiria policy/RPC específica e permanece fora do escopo.

## 2. Compromissos legados podem não ter `created_by`

Eventos novos persistem `created_by = p1/p2`.

Eventos anteriores ao campo/fluxo podem não permitir identificar o criador. A UI não deve inventar autoria retroativa.

## 3. Sem suíte automatizada

`rules.js` já contém várias regras puras e é o melhor primeiro candidato para testes automatizados leves:

- datas;
- centavos;
- `financialSummary`;
- `financeShare`;
- `expenseDueStatus`;
- `goalProgress`;
- `goalForecast`;
- `undoLastGoalProgress`;
- normalização de listas/histórico.

## 4. Offline é app shell, não offline-first

Dados e gravações continuam dependentes do Supabase.

Isso é decisão consciente de simplicidade.

## 5. `store.js` concentra responsabilidades

Ainda é aceitável para o tamanho atual. Não dividir preventivamente.

## 6. Renderização de Listas

A área de itens agora renderiza somente a lista ativa; abas continuam representando todas as listas.

Não foi encontrada evidência objetiva de problema no volume atual. O P2 de renderizar somente a lista ativa permanece adiado.

# Próxima tarefa imediata

**Não iniciar uma grande feature antes do smoke test completo de duas contas.**

Ordem recomendada:

1. rodar a migration SQL desta rodada;
2. autorizar a URL de password recovery no Supabase Auth;
3. publicar/aplicar a baseline atual;
4. confirmar `nook-v1.15` em Cache Storage;
3. rodar o smoke test P1/P2;
4. registrar regressões reais;
5. corrigir regressões antes de ampliar o produto;
6. depois escolher o próximo item do `Nook-ROADMAP.md`.

# Próximo milestone

## V1 pessoal confiável

Critério de saída:

- P1 cria o Nook e convida P2 sem intervenção técnica;
- onboarding e fotos privadas sobrevivem a reload;
- dois membros veem o mesmo estado;
- Realtime sincroniza mudanças relevantes;
- edição versionada não sobrescreve conflito silenciosamente;
- Listas/Agenda/Finanças/Metas/Memórias/Mural funcionam após reload;
- logout/login não reaproveita dados do casal anterior;
- reconexão/foreground reconciliam estado;
- RLS/Storage bloqueiam leitura cruzada entre casais;
- Service Worker não mistura versões;
- existe uma bateria manual curta e repetível para releases.

Depois desse milestone, o Nook pode voltar a priorizar conveniência e frequência de uso.
