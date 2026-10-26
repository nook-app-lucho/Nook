# Fase atual do produto

Nook está em fase de **MVP pessoal funcional + hardening de confiabilidade do PWA/backend**.

O produto já possui os principais fluxos de uso do casal — autenticação, criação/entrada no Nook, onboarding, Home, listas, agenda, finanças, metas, memórias, recados, humor, tema e PWA — e o foco recente deixou de ser adicionar telas para atacar riscos de sincronização, troca de sessão e integridade de dados.

A prioridade declarada é deixar o **PWA perfeito e confiável para uso pessoal** antes de pensar em Android/iOS ou ampliar escopo.

Este STATUS corresponde ao snapshot `Nook - 20 Out.zip` analisado em **24/10/2026** e ao contexto da sessão de desenvolvimento de 20–21/10/2026.

# O que foi concluído recentemente

- A arquitetura do frontend foi mantida simples: HTML/CSS/JS modular sem framework.
- `js/store.js` foi endurecido para evitar contaminação de estado entre sessões/casais:
  - `resetData()` limpa perfil, `couple_id`, usuário, coleções, finanças, humor e assinatura Realtime;
  - `_generation` invalida respostas assíncronas antigas depois de logout/troca de contexto;
  - `fetchProfile()` foi consolidado em uma consulta com `.or(...)` para localizar `p1_email` ou `p2_email`;
  - leituras descartam respostas se geração/revisão/casal já mudaram;
  - mutações em fila confirmam novamente a geração e o `couple_id` antes de gravar.
- Foi adicionada serialização de mutações por entidade via `_serialized(...)`.
- Edições e exclusões passaram a depender de `nook_version`, reduzindo risco de lost update entre os dois usuários/dispositivos.
- `captureEdit()` / `saveEdit()` protegem formulários abertos contra sobrescrita de registro alterado no meio da edição.
- O frontend atualiza o estado local somente depois que o Supabase confirma a escrita.
- Realtime foi consolidado com debounce de aproximadamente 300 ms e refetch apenas das tabelas marcadas como alteradas.
- Foi adicionado refresh quando a assinatura Realtime volta a `SUBSCRIBED`, quando o navegador volta para foreground e quando a conexão retorna.
- Logout limpa o estado compartilhado e recarrega a aplicação.
- `rules.js` contém validações defensivas para valores, datas, finanças, itens de lista e histórico de metas.
- Itens/históricos inválidos são isolados sem perda silenciosa do valor bruto.
- O Service Worker está na versão de cache `nook-v1.07` e não intercepta endpoints de Auth/Data API/Realtime do Supabase.
- Na sessão anterior foi preparado/reconstruído o backend Supabase com as tabelas esperadas, RLS, versionamento, RPCs `nook_join` e `nook_set_mood`, Storage e Realtime. Esse SQL não está incluído no ZIP atual, portanto o estado implantado do banco não pode ser comprovado apenas por este snapshot.
- Na revisão atual, todos os arquivos JavaScript do snapshot passaram em `node --check` sem erro de sintaxe.
- Não foram encontrados IDs HTML duplicados em `index.html`.

# Estado exato do código

## Frontend presente no snapshot

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

Não há `package.json`, framework, toolchain ou suíte de testes automatizados neste snapshot.

## Estado funcional esperado

O boot atual segue:

```text
sessão
→ perfil
→ criar/entrar no Nook se necessário
→ aprovação
→ carregamento dos dados
→ onboarding se perfil incompleto
→ Home + módulos
```

O frontend espera estas tabelas no Supabase:

- `profiles`
- `finances`
- `moods`
- `expenses`
- `lists`
- `agenda`
- `goals`
- `memories`
- `notes`

E estas RPCs:

- `nook_join`
- `nook_set_mood`

Os registros editáveis esperam a coluna/trigger de `nook_version` no banco.

## Ponto aberto mais importante: Storage de fotos

Existe uma inconsistência entre o hardening de backend definido na sessão anterior e o código deste snapshot.

O backend planejado/recriado adotou bucket `photos` privado com policies baseadas em caminho por casal, no formato aproximado:

```text
<COUPLE_UUID>/avatars/...
<COUPLE_UUID>/covers/...
<COUPLE_UUID>/memories/...
```

Porém o frontend atual ainda faz upload assim:

```text
avatars/<arquivo>
covers/<arquivo>
memories/<arquivo>
```

E depois chama `getPublicUrl(...)`.

Isso precisa ser reconciliado. Se o bucket implantado estiver privado e as policies exigirem o prefixo do `couple_id`, os uploads atuais podem falhar e `getPublicUrl` não é um mecanismo válido para exibir conteúdo privado.

Arquivos afetados:

- `js/modules/onboarding.js`
- `js/modules/home.js`
- possivelmente `js/utils.js`/`js/store.js` para criar um helper central de Storage.

## Backend não versionado no ZIP

O frontend contém mensagens que orientam consultar `INSTRUCOES.md`, mas esse arquivo não existe no snapshot. Também não existe um arquivo SQL com o schema/RLS/RPCs/triggers/Storage policies.

Consequência: uma IA ou humano não consegue reconstruir o backend somente a partir do repositório atual.

## Segurança e isolamento

O frontend aplica filtros por `couple_id` e protege mudanças de contexto, mas o isolamento real depende das policies RLS do Supabase.

A subscription Realtime escuta mudanças do schema `public` e descarta no cliente eventos cujo `couple_id` não corresponde ao atual. Esse filtro é útil para lógica de UI, mas não pode ser considerado uma barreira de segurança; o backend precisa garantir que o cliente só receba dados autorizados.

A URL e a publishable key do Supabase estão hardcoded em `js/store.js`. Uma publishable key pode estar no cliente, mas ela só é segura se RLS/Storage policies estiverem corretas.

## Outros pontos ainda não comprovados

- O snapshot foi validado estaticamente, mas não há evidência nesta sessão de um smoke test completo contra o Supabase real após o reset/reconstrução.
- Não foi validado em dois usuários/dispositivos simultaneamente neste snapshot.
- Não foi validado o comportamento real após queda de internet/background/reconexão.
- Não há testes automatizados para `rules.js` ou para o contrato do `store`.
- Fotos não são comprimidas antes do upload.
- O app shell tem cache offline, mas os dados não possuem fila/reconciliação offline; isso é intencional por enquanto.

# Próxima tarefa imediata

**Primeira tarefa da próxima sessão: alinhar o contrato de Supabase Storage antes de adicionar qualquer nova feature.**

A sequência deve ser:

1. Confirmar no Supabase que o bucket `photos` está privado e que as policies implantadas exigem o primeiro segmento do path como `couple_id`.
2. Centralizar a geração de path de upload, evitando strings independentes nos módulos. O contrato deve ser:

```text
${store.requireCouple()}/avatars/<uuid>.<ext>
${store.requireCouple()}/covers/<uuid>.<ext>
${store.requireCouple()}/memories/<uuid>.<ext>
```

3. Remover a suposição de URL pública permanente (`getPublicUrl`) se o bucket for privado.
4. Definir e implementar um único modelo para fotos privadas:
   - persistir o **storage path** no banco;
   - resolver esse path para uma URL temporária/autorizada apenas na leitura;
   - não persistir signed URL expirada como dado definitivo.
5. Adaptar `onboarding.js` e `home.js` para usar o helper comum.
6. Executar o primeiro smoke test obrigatório:

```text
login P1
→ abrir Nook aprovado
→ upload avatar
→ upload capa
→ criar memória com foto
→ reload
→ confirmar que todas as imagens continuam visíveis
→ login P2
→ confirmar que P2 vê as imagens do mesmo couple_id
→ confirmar que outro usuário/casal não consegue ler o path
```

Só depois desse teste seguir para novos recursos.

# Blockers e dependências pendentes

- **Schema/backend não versionado no repositório.** O SQL usado para reconstruir o Supabase precisa ser salvo no projeto para que o ambiente seja reproduzível.
- **Contrato de Storage possivelmente incompatível com o frontend atual.** É o blocker técnico mais direto encontrado no snapshot.
- **Estado real das policies/RPCs no Supabase não pode ser inferido pelo ZIP.** O frontend depende de `nook_join`, `nook_set_mood`, RLS e `nook_version`.
- **`INSTRUCOES.md` ausente.** `store.js` referencia esse documento em mensagens de erro.
- **Validação pós-reset não comprovada.** Ainda falta executar uma bateria real de login → hidratação → CRUD → reload → realtime em duas contas.
- **Sem testes automatizados.** Não bloqueia o uso pessoal, mas aumenta o risco ao continuar mexendo em `store.js`/`rules.js`.
- **Sem ambiente/configuração separada.** URL e chave publishable estão diretamente em `store.js`.

# Decisões tomadas na última sessão

- Manter o Nook como **PWA primeiro**; Android/iOS ficam para depois.
- Manter a solução simples e sem framework enquanto o tamanho atual permitir.
- Tratar o Supabase como fonte de verdade dos dados compartilhados.
- Não persistir carteira/estado do casal em `localStorage`; apenas o tema permanece local.
- Priorizar segurança de contexto: logout/troca de usuário deve invalidar respostas e operações antigas.
- Preferir mutações confirmadas pelo banco a optimistic updates cegos.
- Usar `nook_version` para proteger edições/exclusões concorrentes.
- Recarregar dados após reconexão/foreground em vez de assumir que Realtime permaneceu perfeito durante suspensão.
- Isolar dados estruturalmente por `couple_id` e exigir que RLS seja a barreira de segurança real.
- O backend de fotos foi direcionado para Storage privado e paths vinculados ao casal; o frontend ainda precisa terminar essa migração.
- O Service Worker deve cachear apenas o app shell/dependências estáticas, nunca Auth/Data API/Realtime.
- Toda alteração relevante de assets estáticos deve aumentar a versão do cache para evitar mistura de código antigo e novo.

# Próximo milestone

O próximo milestone é uma **V1 pessoal confiável em dois dispositivos**.

Critério de saída sugerido para esse milestone:

- P1 e P2 conseguem criar/entrar no mesmo Nook sem intervenção técnica durante o uso normal.
- Onboarding e fotos funcionam com Storage privado.
- Home, listas, agenda, finanças, metas, memórias, recados e humor persistem após reload.
- Alterações feitas por um usuário aparecem no outro sem corrupção ou sobrescrita silenciosa.
- Conflitos de edição são recusados de forma compreensível.
- Logout/login de outra conta no mesmo navegador não herda dados do casal anterior.
- Voltar do background ou recuperar conexão reconcilia o estado corretamente.
- RLS impede acesso cruzado entre casais.
- O schema/RLS/RPCs/Storage policies estão versionados no repositório.
- Existe uma bateria curta de smoke tests repetível antes de cada release.

Depois de alcançar essa V1 pessoal estável, o produto pode voltar a priorizar novas funcionalidades ou preparação para distribuição mais ampla.
