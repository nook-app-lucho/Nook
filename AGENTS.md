# AGENTS.md

Este arquivo define como qualquer agente de IA deve trabalhar no Nook. Ele complementa:

- `PROJECT.md`: contexto estrutural e permanente do sistema.
- `STATUS.md`: estado volátil, riscos e próxima tarefa.
- `setup.sql`: fonte de verdade versionada para o contrato atual do Supabase.

Antes de alterar código, leia estes arquivos nesta ordem:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. `setup.sql` quando a mudança tocar dados, Auth, RPC, RLS, Realtime ou Storage

# Princípios de trabalho

## 1. Prioridade: simplicidade e confiabilidade

Nook é um projeto pessoal e deve continuar fácil de entender e manter.

- Prefira a menor solução que resolva o problema corretamente.
- Não introduza framework, bundler, state manager, ORM ou nova dependência sem necessidade concreta.
- Não crie abstrações “para o futuro” sem uso atual.
- Evite refatorações amplas quando uma alteração localizada for suficiente.
- Preserve HTML/CSS/JavaScript ES Modules enquanto a arquitetura atual continuar adequada.

## 2. Não quebrar o contrato com Supabase

O frontend depende de um contrato forte com o backend.

Antes de alterar qualquer código relacionado a dados, confirme o impacto em:

- Auth;
- tabelas e colunas;
- `couple_id`;
- RLS;
- `nook_version`;
- RPCs;
- Realtime;
- Storage policies.

`setup.sql` deve ser tratado como baseline do contrato atual. Se o frontend e `setup.sql` divergirem, não afrouxe o backend silenciosamente: identifique a incompatibilidade e decida explicitamente qual lado deve mudar.

Nunca suponha que um filtro no JavaScript substitui autorização no banco.

## 3. `couple_id` é uma fronteira de segurança

Todo dado compartilhado deve pertencer ao casal atual.

Regras obrigatórias:

- Nunca fazer update/delete apenas por `id` quando o registro pertence a um casal.
- Preservar `.eq('couple_id', couple)` nas mutações.
- Preservar RLS no backend.
- Não confiar em dados de uma sessão anterior.
- Não permitir que uma resposta assíncrona atrasada de outro usuário/casal atualize o estado atual.

## 4. O banco é a fonte de verdade

- Não mover dados compartilhados para `localStorage` como atalho.
- Não aplicar optimistic update cego antes de confirmação do Supabase.
- Depois de uma escrita bem-sucedida, usar o registro retornado pelo banco como versão canônica.
- Ao recuperar conexão/foreground, preferir reconciliação com o backend.

## 5. Preservar proteção contra concorrência

Para entidades versionadas:

- não remover `nook_version`;
- não remover filtros por versão em update/delete;
- usar `captureEdit()` ao abrir formulários de edição;
- usar `saveEdit()` / `saveFormEdit()` para salvar edições concorrentes;
- tratar conflito como conflito, não como erro genérico nem overwrite silencioso.

Se uma alteração no schema remover `nook_version`, interrompa a implementação e alinhe primeiro o contrato do banco.

# Onde cada tipo de código deve ficar

## `js/app.js`

Use apenas para:

- boot da aplicação;
- sessão;
- roteamento de alto nível;
- inicialização global;
- eventos globais.

Não colocar regra de domínio específica aqui.

## `js/store.js`

Use para:

- Supabase Auth;
- leitura/escrita no banco;
- estado compartilhado em memória;
- mapeamento row ↔ objeto de domínio;
- Realtime;
- proteção de sessão/contexto;
- serialização de mutações;
- operações comuns de Storage privado;
- geração/validação de paths de foto;
- resolução e cache em memória de signed URLs.

Evite espalhar CRUD Supabase ou chamadas diretas de Storage pelos módulos. Avatar, capa e memórias devem usar os helpers existentes do `store` em vez de recriar upload, signed URL ou delete localmente.

## `js/rules.js`

Use para regras puras:

- validação;
- normalização;
- cálculos;
- lógica de domínio sem DOM e sem Supabase.

Uma função de `rules.js` deve, idealmente, poder ser testada apenas com argumentos e retorno.

## `js/utils.js`

Use para helpers transversais de UI/navegador, não para regra específica de um domínio.

Exemplos apropriados:

- escaping;
- formatação;
- modais;
- haptics;
- toasts;
- guardas genéricas de ação assíncrona;
- validação genérica de arquivo.

## `js/modules/*.js`

Use para comportamento da view/domínio correspondente.

Padrão esperado:

```text
estado local pequeno do módulo
→ renderX()
→ initX()
→ listeners chamam store/rules/utils
```

Não transformar módulos de UI em segunda camada de persistência.

# Convenções obrigatórias

## Segurança de HTML

Quando inserir texto do usuário por `innerHTML`, use `escapeHTML`.

Prefira `textContent` sempre que markup dinâmico não for necessário.

Para imagens/URLs, use as funções de sanitização existentes ou uma solução equivalente explicitamente segura.

## Datas

- Datas sem horário: `YYYY-MM-DD`.
- Use os helpers de `rules.js` para validação e comparação.
- Não depender de parsing implícito de timezone para regras de calendário.

## Dinheiro

- Não criar novos cálculos monetários com floats diretamente.
- Use `cents()`, `safeCentSum()` e helpers relacionados.
- Preserve centavos durante cálculos e só converta para unidade monetária para exibição/contrato já estabelecido.

## Responsáveis

Não substituir identificadores internos pelos nomes do usuário.

Valores válidos em domínios compartilhados:

- `IS`
- `VO`
- `Casal`

Os nomes reais são apenas apresentação.

## Ações assíncronas

Para ações disparadas pela UI, use `runAction` quando aplicável para:

- impedir repetição;
- sinalizar saving;
- tratar erro de forma consistente.

Não deixar botões dispararem gravações concorrentes idênticas por clique repetido.

## Inicialização

`initX()` deve ser chamado uma vez por ciclo de vida normal da página.

Não reexecutar inicializadores para “forçar render”, porque isso pode duplicar event listeners. Para atualizar tela, chame `renderX()` ou dispare o evento de estado apropriado.

# Regras para Supabase

## Auth

- Sempre derivar o usuário atual da sessão autenticada.
- Ao sair, limpar completamente estado do casal.
- Nunca reutilizar estado carregado antes da troca de sessão.

## RLS

Toda nova tabela compartilhada deve ter policies explícitas que restrinjam acesso aos membros do `couple_id`.

Não considerar uma feature pronta enquanto a policy equivalente não estiver definida.

## RPC

Use RPC quando uma operação precisa de autorização/atomicidade que não deve ficar sob controle direto do cliente.

Exemplos existentes:

- entrar no casal por convite;
- atualizar somente o próprio humor.

## Realtime

Se uma nova tabela precisa sincronizar entre o casal:

- incluir a tabela na configuração Realtime do backend;
- adicionar reader correspondente ao mapa em `subscribeRealtime()`;
- continuar filtrando contexto no frontend;
- garantir RLS/Realtime authorization no backend.

## Storage

Fotos do casal são dados privados.

Ao trabalhar em Storage:

- usar paths vinculados ao `couple_id`;
- não criar um bucket global público apenas para simplificar a UI;
- não persistir signed URLs com expiração como valor permanente;
- preferir persistir o storage path e resolver acesso autorizado no momento da leitura;
- manter policies coerentes com o formato de path.

Contrato atual:

```text
<couple_id>/avatars/...
<couple_id>/covers/...
<couple_id>/memories/...
```

Use `store.uploadPhoto`, `store.resolvePhotoUrl`/`store.getPhotoDisplayUrl` e `store.deletePhoto`. Não reintroduza `getPublicUrl()` para o bucket privado. URLs antigas `http://`/`https://` podem continuar sendo renderizadas apenas pela compatibilidade já existente; não persista novas URLs desse tipo.

# PWA e Service Worker

O Service Worker deve continuar simples.

- Cachear shell e dependências estáticas.
- Não interceptar Auth, Data API, Realtime ou endpoints de dados privados.
- Não criar fila offline de mutações sem um design explícito de reconciliação.
- Se alterar arquivos estáticos usados pelo app, incrementar `CACHE_NAME`.
- Se adicionar/remover arquivo essencial, atualizar `LOCAL_ASSETS`.
- Não usar `skipWaiting`/`clients.claim` sem analisar risco de misturar versões durante sessão ativa.

# Como implementar uma feature

Antes de escrever código:

1. Leia o `STATUS.md` e confirme que a nova feature não ignora um blocker atual.
2. Identifique a regra de domínio.
3. Identifique o contrato do banco e as policies necessárias.
4. Determine o menor módulo existente que deve receber a mudança.
5. Evite criar arquivo/pasta nova se a responsabilidade já pertence claramente a um módulo atual.

Durante a implementação:

1. Regras puras em `rules.js`.
2. Persistência/estado em `store.js`.
3. DOM no módulo da feature.
4. Markup em `index.html`.
5. Estilo em `style.css`.
6. Backend SQL/RLS/RPC versionado quando necessário.
7. Cache PWA revisado se houver alteração de assets.

Depois da implementação:

1. Execute validação de sintaxe dos JS.
2. Teste o fluxo feliz.
3. Teste reload após persistência.
4. Teste logout/login com outra conta.
5. Para dados compartilhados, teste P1 e P2.
6. Para edição, teste conflito entre dois clientes.
7. Para Realtime, teste mudança em um cliente refletindo no outro.
8. Para Storage, teste path por `couple_id`, autorização P1/P2, reload, substituição/exclusão e resolução novamente após URL temporária expirar.

# Testes mínimos antes de considerar uma mudança pronta

## Autenticação

- cadastro/login;
- sessão existente;
- logout;
- troca de conta no mesmo navegador.

## Isolamento

- P1/P2 do mesmo casal veem os mesmos dados;
- casal diferente não acessa dados do primeiro casal.

## CRUD

Para o domínio alterado:

- criar;
- reload;
- editar;
- reload;
- excluir;
- reload.

## Concorrência

Quando aplicável:

- abrir o mesmo registro em dois clientes;
- salvar no primeiro;
- tentar salvar no segundo;
- confirmar que o segundo recebe conflito em vez de sobrescrever.

## PWA

Se arquivos estáticos mudaram:

- confirmar novo `CACHE_NAME`;
- abrir após refresh;
- confirmar que não há mistura de versões;
- confirmar que API/Auth continuam fora do cache.

# O que evitar

- Não migrar para React/Vue/Svelte apenas por preferência do agente.
- Não adicionar TypeScript/build system como “melhoria automática”.
- Não criar Repository/Service/Controller layers artificiais para um projeto deste tamanho.
- Não duplicar regras entre módulos.
- Não mover cálculos financeiros para a UI.
- Não usar `innerHTML` com entrada de usuário sem escaping.
- Não afrouxar RLS para fazer uma query “funcionar”.
- Não tornar Storage público para contornar policies.
- Não remover filtros de `couple_id` ou `nook_version`.
- Não guardar dados compartilhados de usuário em chaves globais de `localStorage`.
- Não tratar erro de rede como “lista vazia”.
- Não capturar exceções críticas e seguir silenciosamente como se a operação tivesse funcionado.
- Não inicializar o mesmo módulo repetidamente para atualizar a tela.
- Não adicionar funcionalidade nova enquanto houver regressão de persistência/segurança no fluxo que ela depende.

# Política para mudanças grandes

Uma mudança é considerada grande se envolver qualquer um destes itens:

- novo framework/toolchain;
- novo serviço externo;
- alteração ampla do schema;
- mudança no modelo `couple_id`;
- mudança de Auth;
- reestruturação de `store.js`;
- novo modelo de offline sync;
- mudança do bucket/policies de Storage;
- remoção do versionamento de conflito.

Nesses casos, primeiro documente:

- problema concreto;
- solução proposta;
- alternativa mais simples;
- impacto no backend;
- impacto em dados existentes;
- estratégia de rollback;
- smoke tests necessários.

Só então implemente.

# Atualização da documentação

Após uma sessão relevante:

- Atualize `STATUS.md` com o estado real, arquivos alterados, bugs abertos e próxima ação.
- Atualize `PROJECT.md` apenas se mudou algo estrutural/permanente: stack, arquitetura, domínio, convenção ou decisão arquitetural.
- Atualize `AGENTS.md` apenas se mudou a forma como agentes devem trabalhar no projeto.

Nunca usar `PROJECT.md` como lista de tarefas.
Nunca usar `STATUS.md` como documentação arquitetural completa.
