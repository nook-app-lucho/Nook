# ROADMAP — Nook

**Atualizado em:** 27/10/2026  
**Baseline:** `Nook - 27 Out v2` + hardening de Auth/Mural/Listas/Agenda/Finanças/CSS

# 1. Visão de produto

Nook deve continuar parecendo pequeno mesmo ficando mais útil.

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
Vejo vários dashboards complexos
↓
Configuro filtros
↓
Gerencio um sistema pesado
```

O diferencial não é ter mais features. É juntar as pequenas coisas certas para um casal em uma experiência pessoal e simples.

# 2. Princípios do roadmap

## 2.1 Segurança e confiabilidade antes de expansão

Nenhuma feature vale regressão de:

- persistência;
- isolamento por casal;
- Storage privado;
- concorrência;
- Auth;
- Realtime.

## 2.2 Não criar novo módulo se a feature cabe em um atual

Preferir extensão de:

- Home;
- Listas;
- Agenda;
- Finanças;
- Metas;
- Ajustes.

## 2.3 Uma ação frequente deve exigir 1–2 interações

Evitar fluxos profundos e configuração excessiva.

## 2.4 Progressive disclosure

Mostrar primeiro:

- o que importa agora;
- o próximo passo;
- o resumo.

Detalhes ficam sob demanda.

## 2.5 Evitar dependências

Preferir:

- Web APIs;
- CSS;
- helpers locais;
- componentes existentes.

## 2.6 Não migrar de stack sem dor concreta

Vanilla JS + Supabase continua suficiente para o tamanho atual.

# 3. Legenda

- ✅ Concluído
- 🧪 Implementado, ainda requer validação real
- 🔜 Próximo
- ⏳ Backlog
- 🚫 Não priorizar agora

# 4. Estado atual resumido

## Base de confiabilidade

✅ P0 concluído:

- reações do mural alinhadas;
- limpar concluídas corrigido;
- Storage privado por casal;
- helpers de foto centralizados;
- backend versionado;
- resumo financeiro mensal corrigido;
- fetch duplicado removido;
- dependências externas fixadas.

## Simplificação de UX

✅ P1 concluído:

- bottom bar com 5 itens;
- Ajustes fora da bottom nav;
- confirmações visuais;
- renomear lista sem `prompt()`;
- exclusões principais sem dialogs nativos;
- estilos inline estruturais reduzidos;
- skeletons;
- toast;
- feedback não bloqueante.

## Convite, mood e mural

✅ P1.1 concluído:

- zero `alert/confirm/prompt` na experiência normal;
- Service Worker sincronizado com versões CDN;
- convite nativo + fallback clipboard;
- estado do parceiro claro;
- semântica correta de `approved`;
- affordance para trocar próprio mood;
- parceiro read-only;
- recado permanente;
- edição de recado com `nook_version`.

## Memórias, Listas, Agenda e Finanças

✅ P1.2 concluído:

- viewer de memória;
- lazy loading da grid;
- compressão central de fotos para WebP/1600 px;
- pendentes/concluídas separados nas listas;
- edição de compromisso;
- autoria + Ciente na Agenda;
- data selecionada preservada na criação;
- status de vencimento;
- copy explicativa do acerto mensal.

## Metas e UX transversal

✅ P1.3 concluído:

- editar meta;
- conclusão derivada de `current >= target`;
- metas ativas/concluídas separadas;
- undo do último lançamento pelo histórico;
- `OWNER` e `GOAL_TYPE` em `rules.js`;
- mensagens de erro mais humanas;
- autofocus seletivo;
- double submit continua protegido por `runAction()`;
- `prefers-reduced-motion` global;
- haptics reduzidos a ações relevantes.

# 5. Gate imediato — antes de nova feature grande

## 🔜 V1 pessoal confiável — smoke test de duas contas

**Prioridade:** máxima

Antes de crescer o produto, validar a baseline real em dois clientes.

### Fluxo obrigatório

```text
P1 cria Nook
→ compartilha convite
→ P2 entra
→ P1 verifica conexão
→ onboarding
→ avatar/capa/memória com foto
→ mood P1
→ mood P2
→ lista
→ agenda
→ finanças
→ meta
→ recado temporário
→ recado permanente
→ editar recado
→ reload nos dois clientes
→ confirmar Realtime
→ logout/login cruzado
```

### Também validar

- conflito de edição em duas janelas;
- reconexão após perda de rede;
- foreground após background;
- isolamento entre dois casais;
- Storage privado;
- cache `nook-v1.15`;
- URLs externas versionadas no Cache Storage.

### Definição de pronto

Nenhum fluxo principal:

- perde dados;
- herda dados de outra conta;
- sobrescreve conflito silenciosamente;
- expõe dado/foto de outro casal;
- fica preso em cache antigo.

# 6. Home

## 🔜 P1 — Home “Hoje primeiro”

**Impacto:** muito alto  
**Complexidade:** M

Reorganizar a Home para priorizar o presente.

Ordem sugerida:

### Identidade

- capa;
- nomes;
- dias juntos;
- Ajustes discreto.

### Como estamos

- meu mood;
- mood do parceiro.

### Hoje

Agregar apenas dados já existentes:

- próximo compromisso;
- tarefas pendentes relevantes;
- conta vencendo/atrasada;
- uma meta em destaque quando fizer sentido.

### Recado

Mostrar poucos recados atuais, não transformar Home em feed completo.

### Nós

Memórias recentes + cápsula quando houver.

### Objetivo

O usuário deve entender em menos de 10 segundos:

- como estamos;
- o que acontece hoje;
- o que exige atenção.

## 🔜 P1 — Quick Add

**Impacto:** muito alto  
**Complexidade:** S/M

Um único botão `+` na Home:

```text
Adicionar...
Tarefa
Conta
Compromisso
Recado
Memória
```

Reutilizar bottom sheets existentes.

Não duplicar formulários.

## ⏳ P2 — Resumo da semana

Gerar dinamicamente com dados existentes:

```text
Nossa semana
4 compromissos
7 tarefas abertas
R$ 820 em contas vencendo
Meta Viagem: 62%
```

Sem tabela nova.

## ⏳ P2 — “Uma coisa para nós”

Card leve baseado em regras determinísticas.

Exemplos:

- memória não registrada há muito tempo;
- meta chegou a marco;
- aniversário de memória;
- tarefa conjunta esquecida.

Não precisa IA.

# 7. Auth, convite e onboarding

## ✅ AUTH.1 — Esqueci minha senha

Fluxo completo com e-mail de recovery, `PASSWORD_RECOVERY` e atualização de senha; Redirect URL precisa estar autorizada no Supabase Auth.


## ✅ Compartilhar convite nativamente

Concluído.

- `navigator.share()` quando disponível;
- clipboard como fallback;
- cancelamento de share sem erro.

## ✅ Estado do parceiro

Concluído.

Antes da conexão:

```text
Esperando seu parceiro entrar
```

Depois:

```text
Parceiro conectado ✓
```

## ✅ Semântica de `approved`

Concluído no frontend/documentação.

No fluxo atual:

- `false` = P2 ainda não entrou;
- `true` = P2 entrou via `nook_join()`.

## ⏳ P2 — Melhorar onboarding visual

Somente depois do smoke test.

Possíveis melhorias:

- progresso simples em uma etapa;
- copy mais íntima;
- preview de avatar mais claro;
- reduzir texto operacional.

Não criar onboarding multi-step complexo sem necessidade.

# 8. Mood

## ✅ Trocar próprio mood com affordance clara

Concluído.

## ✅ Parceiro read-only + feedback não bloqueante

Concluído.

## 🚫 P3 — Histórico de mood

Não priorizar agora.

Exigiria mudar a modelagem para histórico e adicionaria analytics a uma feature que hoje funciona justamente por ser leve.

# 9. Mural de recados

## ✅ Reações canônicas

```text
❤️ 😘 ☕
```

## ✅ “Até eu remover”

Concluído com `expires_at = null`.

## ✅ Editar recado

Concluído para:

- texto;
- duração.

Usa edição versionada.

## ✅ P1 técnico — autoria estável de recado

Implementado com `notes.created_by = p1 | p2 | null`.

- novos recados gravam identidade estável;
- nome do perfil permanece apresentação;
- legacy ambíguo pode permanecer `NULL` e usar fallback compatível;
- RLS por autor continua fora do escopo.

## ⏳ P2 — Limitar preview de recados na Home

Quando Home for redesenhada, mostrar poucos recados recentes/atuais.

## 🚫 Não fazer agora

- threads;
- comentários;
- chat;
- status de leitura;
- anexos;
- push.

O mural não deve virar mensageiro.

# 10. Memórias

## ✅ Storage privado

Concluído.

## ✅ Signed URL em memória

Concluído.

## ✅ Viewer de foto/memória

Concluído.

Viewer atual mostra foto maior, data, título, nota e ações de editar/excluir reutilizando bottom sheets existentes.

## ✅ Lazy loading

Concluído na grid com `<img loading="lazy" decoding="async">`.

Signed URLs continuam sendo resolvidas pelo store; o browser controla o download lazy dos bytes da imagem.

## ✅ Compressão antes de upload

Concluído no helper central `store.uploadPhoto()`.

Contrato atual:

```text
maior lado: 1600 px
formato: WebP
qualidade: 0,82
GIF: preservado
```

## ⏳ P2 — Busca simples

Buscar por título/nota/data localmente sobre dados já carregados.

## ⏳ P2 — Cápsula aprimorada

Melhorar apresentação, não criar sistema de “time capsule” complexo.

# 11. Listas

## ✅ Renomear com bottom sheet

Concluído.

## ✅ Limpar concluídas com copy correta

Concluído.

## ✅ Exclusões sem confirm nativo

Concluído.

## ✅ Separar pendentes/concluídas visualmente

Concluído.

- pendentes sempre visíveis;
- concluídas em seção recolhida por padrão;
- contador acompanha filtros;
- marcar/desmarcar move o item entre seções;
- estado expandido é apenas local de UI.

## ✅ LIST.3 — Renderizar somente lista ativa

A navegação mantém todas as abas, mas o DOM de itens contém apenas `activeList.items`.

## 🔜 P1 — Duplicar lista

Útil para compras recorrentes/viagem/checklist.

Duplicar:

- nome com sufixo simples;
- itens;
- responsáveis/prioridades;
- todos como `completed = false`.

## 🔜 P1 — Templates simples

Poucos templates locais:

- mercado;
- viagem;
- casa;
- encontro/evento.

Não criar marketplace/configuração de templates.

## ⏳ P2 — Busca na lista ativa

Somente se listas reais ficarem grandes.

## ⏳ P2 — Melhorar drag mobile

Fazer apenas se uso real mostrar problema.

# 12. Agenda

## ✅ Editar compromisso

Concluído reutilizando o formulário atual, `captureEdit()`, `saveFormEdit()` e `nook_version`.

Campos editáveis:

- título;
- data;
- hora;
- responsável;
- subtítulo.

A data atualmente selecionada também é preservada ao criar novo compromisso.

## ✅ Autoria + “Ciente”

Eventos novos usam `created_by`.

- criador vê `Criado por você`;
- parceiro vê `Criado por <nome>`;
- somente parceiro recebe CTA **Ciente**;
- `confirmed = true` representa **Ambos cientes**.

Eventos legados sem `created_by` permanecem sem autoria inferida.

## 🔜 P1 — Próximo compromisso mais claro

Na Home, destacar:

- horário;
- título;
- responsável;
- proximidade.

## ⏳ P1 — Duplicar compromisso

Boa conveniência para eventos parecidos.

## ⏳ P2 — Repetição simples

Atalhos manuais:

- amanhã;
- próxima semana;
- próximo mês.

Não criar recorrência completa/RRULE agora.

## ✅ AGENDA.3 — Compromisso sem horário

`agenda.time = NULL` representa **Dia todo**; eventos de dia inteiro aparecem antes dos eventos com horário.

# 13. Finanças

## ✅ Escopo mensal corrigido

Concluído.

## ✅ Status de vencimento

Concluído para contas pendentes:

- vence hoje;
- vence amanhã;
- vence em N dias;
- atrasada há N dias.

Despesas pagas não recebem copy de atraso.

## 🔜 P1 — Separar visualmente pendentes e pagas

Reduzir ruído no histórico.

## 🔜 P1 — Duplicar para próximo mês

**Impacto:** muito alto  
**Complexidade:** S/M

Duplicar uma despesa mantendo:

- título;
- valor;
- categoria;
- pagador;

E avançando a data para o próximo mês.

Novo registro deve começar como pendente.

## ⏳ P1 — Filtro mensal real na lista

O resumo já respeita mês. Evoluir a lista quando fizer sentido.

## ✅ Explicar melhor o acerto

Concluído.

A copy usa mês selecionado e nomes reais do casal, enquanto a matemática continua vindo de `financialSummary().balance`.

## ✅ FIN.3 — Optimistic locking da configuração financeira

Configuração captura `nook_version` ao abrir e bloqueia overwrite silencioso de formulário stale.

## ⏳ P2 — Resumo mensal leve

Comparar sem analytics pesado.

# 14. Metas

## ✅ Editar meta

Concluído pelo mesmo formulário de criação e com controle de concorrência existente.

Editáveis:

- título;
- ícone;
- responsável;
- alvo;
- prazo;
- unidade quando aplicável.

Preservados:

- tipo;
- `current`;
- `history`;
- identidade;
- `nook_version`.

## ✅ Estado concluído

Concluído.

Regra única:

```text
current >= target
```

Não existe flag `completed`.

Card concluído mostra **Concluída 🎉**, esconde contribuição e mantém editar/histórico/excluir/undo.

## ✅ Separar ativas/concluídas

Concluído.

Concluídas ficam recolhidas por padrão e o estado aberto não é persistido.

## ✅ Desfazer último lançamento

Concluído.

Undo remove o último item de `history` e recalcula `current` pelo histórico restante.

Funciona para:

- depósito financeiro;
- `+1` de hábito;
- retorno automático de concluída para ativa.

## ✅ Constantes de domínio iniciais

`rules.js` possui:

```text
OWNER.P1 / OWNER.P2 / OWNER.COUPLE
GOAL_TYPE.FINANCIAL / GOAL_TYPE.HABIT
```

Sem migração de valores persistidos.

## ✅ GOAL.2 — Remover canvas-confetti

Partículas removidas; conclusão usa badge, haptic e microanimação CSS discreta com reduced motion.

## ⏳ P1 — Clarificar hábito

A UI já diferencia hábito/financeiro e hábito aceita prazo/forecast, mas ainda pode receber refinamento de copy se uso real mostrar dúvida.

## ⏳ P2 — Templates

Exemplos:

- reserva de emergência;
- viagem;
- leitura;
- treino.

# 15. Ajustes

## ✅ Fora da bottom navigation

Concluído.

## ✅ Convite/estado do parceiro

Concluído.

## ⏳ P1 — Organizar em grupos

Possível organização:

```text
Nosso Nook
Aparência
Dados e privacidade
Conta
```

Fazer somente se a tela crescer mais.

## ⏳ P2 — Exportar backup JSON

Pode ser útil para confiança pessoal antes de distribuição maior.

Exportar somente dados do casal atual.

Não incluir secrets/signed URLs.

## ⏳ P2 — Informações técnicas discretas

Versão/cache somente em área secundária, se necessário para suporte.

# 16. PWA / Offline

## ✅ Cache de shell

Concluído.

## ✅ URLs CDN sincronizadas

Concluído.

## ✅ `prefers-reduced-motion`

Concluído de forma global para animações/transições, mantendo comportamento funcional.

## 🔜 P1 — Banner offline explícito

Quando `navigator.onLine === false`:

- mostrar estado pequeno “Sem conexão”;
- manter o que já está renderizado;
- explicar que alterações exigem conexão.

Não criar fila offline.

## 🔜 P1 — Instalação

Melhorar descoberta de “Adicionar à tela inicial” apenas se necessário.

## ⏳ P1 — Safe areas

Revisar iPhone standalone:

- top inset;
- bottom nav;
- bottom sheets.

## ⏳ P2 — Nova versão disponível

Prompt leve de atualização somente quando houver dor real com cache/versionamento.

# 17. Acessibilidade

## 🔜 P1 — Revisão básica

- tap targets ~44px;
- `aria-label` para ícones;
- foco visível;
- contraste dark mode;
- teclado onde aplicável;
- não depender só de cor.

Já existe suporte parcial a `prefers-reduced-motion`.

# 18. Performance

## ✅ Fetch inicial duplicado removido

Concluído.

## ✅ Cache de signed URLs

Concluído.

## ✅ Lazy load de memórias

Concluído.

## ✅ Compressão de fotos

Concluído no helper central de upload.

## 🔜 P1 — Limitar render da Home

Conectar ao redesenho “Hoje primeiro”.

## ✅ LIST.3 — Renderizar só lista ativa

Concluído sem virtualização/paginação.

## ⏳ P2 — Selecionar menos colunas

Otimização futura, não antecipar sem métrica/dor.

# 19. Qualidade de código

## ✅ Constante única de reactions

Concluído.

## ✅ Helpers de Storage

Concluído.

## ✅ Confirmação reutilizável

Concluído.

## ✅ Diálogos nativos removidos

Concluído na experiência normal.

## ✅ Constantes de domínio iniciais

`OWNER` e `GOAL_TYPE` centralizados sem mega-refactor.

## ✅ Erros humanos + double submit

`humanizeError()` cobre categorias comuns e `runAction()` continua protegendo gravações duplicadas.

## 🔜 P1 — Testes das regras puras

Primeiro candidato a automação de testes:

- `cents`;
- datas;
- `financialSummary`;
- `financeShare`;
- `goalProgress`;
- `goalForecast`;
- `undoLastGoalProgress`;
- `expenseDueStatus`;
- normalização de listas;
- normalização de histórico.

Manter ferramenta de teste simples se for introduzida.

## ⏳ P2 — Dividir `home.js`

Somente quando o tamanho começar a impedir manutenção real.

Não criar arquitetura por antecipação.

## ⏳ P2 — Event delegation

Usar apenas onde houver ganho claro.

# 20. Segurança e privacidade

## ✅ RLS nas tabelas

Baseline em `setup.sql`.

## ✅ Storage privado

Concluído.

## ✅ RPC de join e mood

Baseline implementada.

## ✅ Limites/MIME no Storage

Baseline define contrato atual.

## ✅ MURAL.1 — Identidade estável de notes

Concluído com `created_by`; ownership enforcement no backend permanece separado.

## ⏳ P1 — Limpeza de arquivos órfãos

Hoje existe limpeza best-effort em substituições/exclusões.

Avaliar somente se Storage começar a acumular lixo real.

## ⏳ P2 — Exclusão de conta/Nook

Feature sensível.

Exige:

- UX clara;
- cascades;
- Storage;
- Auth;
- confirmação forte;
- teste de rollback/irreversibilidade.

# 21. Features transversais de uso diário

## 🔜 Quick Add

Ver Home.

## ⏳ Templates

Listas e Metas primeiro.

## ⏳ Resumo da semana

Somente com dados já existentes.

# 22. O que não priorizar agora

🚫 Chat do casal  
🚫 IA  
🚫 Feed social  
🚫 Gamificação/pontos  
🚫 Open Finance  
🚫 Push notifications  
🚫 Calendar sync externo  
🚫 Recorrência complexa  
🚫 Offline-first completo  
🚫 Migração de framework  
🚫 Múltiplos casais por conta  
🚫 Permissões familiares complexas

Esses itens aumentam arquitetura/operação muito mais do que o valor atual para o uso pessoal.

# 23. Releases

## Release A — Confiável

**Status:** 🧪 implementação concluída; validação real ainda pendente.

Inclui:

- P0 completo;
- backend versionado;
- Storage privado;
- concorrência;
- CDN fixada;
- PWA consistente.

Falta para fechar formalmente:

- smoke test completo em duas contas/dispositivos.

## Release B — Mais simples

**Status:** majoritariamente concluída.

✅ navegação com 5 itens  
✅ Ajustes fora da bottom bar  
✅ dialogs nativos removidos  
✅ toast/bottom sheets  
✅ skeletons  
✅ inline CSS reduzido  
✅ empty states contextuais em fluxos alterados  
🔜 Home “Hoje primeiro”  
🔜 offline banner  
🔜 revisão de acessibilidade

## Release C — Completo sem ficar pesado

**Status:** maior parte dos fluxos essenciais concluída.

✅ recado permanente  
✅ editar recado  
✅ editar compromisso  
✅ autoria/Ciente da Agenda  
✅ editar meta  
✅ estado concluído/undo de meta  
✅ status de vencimento  
✅ acerto financeiro explicativo  
✅ viewer de memória  
✅ lazy load/compressão de imagens  
✅ separar concluídas em Listas  
🔜 duplicar conta próximo mês  
🔜 duplicar lista

## Release D — Uso diário

**Status:** backlog.

- Quick Add;
- templates;
- resumo da semana;
- atalhos contextuais.

## Release E — Polimento técnico

**Status:** backlog.

- testes automatizados leves de `rules.js`;
- autoria estável de notes se necessária;
- export JSON;
- otimização baseada em dor real;
- refatorações pequenas orientadas por manutenção.

# 24. Ordem recomendada a partir de agora

1. **Rodar migration SQL da rodada de 27/10.**
2. Configurar Redirect URL do password recovery no Supabase Auth.
3. **Smoke test completo P1/P2 no Supabase real, incluindo recovery, Dia todo e conflito financeiro.**
4. Corrigir qualquer regressão encontrada.
5. Home “Hoje primeiro”.
6. Quick Add.
7. Duplicar conta para próximo mês.
8. Duplicar lista.
9. Testes automatizados leves de `rules.js`.
10. Offline banner + revisão básica de acessibilidade.
11. Templates simples de Listas/Metas.
12. Resumo da semana.

# 25. Filtro para qualquer nova ideia

Antes de adicionar uma feature, responder:

1. Isso resolve um problema recorrente do casal?
2. Já existe dado suficiente para resolver sem nova infraestrutura?
3. Cabe em uma tela/módulo atual?
4. Pode ser feito em 1–2 interações?
5. Aumenta manutenção de forma proporcional ao valor?
6. Introduz risco de privacidade/sincronização?
7. É melhor que executar uma das prioridades atuais?

Se a resposta não for claramente positiva, deixar no backlog.
