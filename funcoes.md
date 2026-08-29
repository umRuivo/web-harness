# Web Harness — Funções do Projeto

Documento de referência das funções do projeto. A aplicação é um chat com suporte a MCP (Model Context Protocol), tema Windows XP, com backend PHP e frontend em JS puro (sem dependências).

## Visão Geral

- **Frontend**: `lama.html` (estrutura) + `lama.js` (lógica) + `lama.css` (tema XP Luna).
- **Backend**: `lama.php` (API principal / MCP server / auth / relay) e `mcp.php` (servidor MCP de arquivos).
- **Micro-MCPs**: módulos PHP em `micro-mcp/` que são carregados automaticamente e expõem ferramentas com prefixo `id_`.
- **Workspace**: diretório raiz dos arquivos servidos (padrão: `workspace/`, controlado por env `MCP_FS_ROOT`).
- **Execução**: servidor PHP embutido com `router.php` (ex.: `php -S 127.0.0.1:4000 router.php`).

---

## 1. `router.php` — Roteador do servidor embutido

- Serve `lama.php` na raiz (`/`), libera arquivos estáticos existentes e o restante passa pelo PHP.

---

## 2. `lama.php` — Backend principal (536 linhas)

### Constantes e configuração
| Constante | Valor | Descrição |
|---|---|---|
| `ROOT` | env `MCP_FS_ROOT` ou `__DIR__/workspace` | Raiz dos arquivos |
| `API_TOKEN` | env `LAMA_API_TOKEN` | Token para acesso via API (vazio = desativado) |
| `DEFAULT_MAX_CHARS` | 20000 | Leitura padrão de `fs_read` |
| `MAX_CHARS_LIMIT` | 100000 | Limite máximo de caracteres |
| `MAX_TREE_DEPTH` / `MAX_TREE_ENTRIES` | 5 / 500 | Limites de `fs_tree` |
| `MAX_LOGIN_ATTEMPTS` / `LOGIN_LOCKOUT_SECONDS` | 5 / 300 | Throttle de login |
| `AUTH_PASS` | env `LAMA_PASS` ou `mamonasazuis` | Senha de login |

### Helpers de arquivo/caminho
- `respond(array $data, int $code = 200)` — envia JSON e encerra.
- `fail(string $msg, int $code = 500)` — responde com erro JSON.
- `starts_with($hay, $needle)` / `ends_with($hay, $needle)` — comparações de string.
- `api_token_ok()` — valida token via `Authorization: Bearer` ou `X-Api-Key`.
- `root_normalized()` — raiz normalizada (sem barra final).
- `norm_path(string $p)` — normaliza caminho, impede `..` (retorna `false` se escapar).
- `resolve_path(string $rel)` — resolve caminho relativo à raiz; lança exceção se sair dela.
- `real_check(string $full)` — resolve `realpath` e bloqueia acesso fora da raiz.
- `rel_path(string $full)` — converte caminho absoluto em relativo à raiz.
- `is_root(string $full)` — verdadeiro se for a raiz.
- `is_utf8(string $s)` — detecta codificação UTF-8.
- `rrmdir(string $dir)` — remove diretório recursivamente.
- `rcopy(string $src, string $dst)` — copia diretório recursivamente.
- `tree_walk(...)` — percorre diretório montando árvore (com limites de profundidade/quantidade).
- `search_walk(...)` — busca recursiva por padrão glob.

### Ferramentas `fs_*` (MCP)
- `tool_fs_list(array $a)` — lista diretório (nome, tipo, tamanho, mtime).
- `tool_fs_read(array $a)` — lê arquivo; retorna texto ou base64 se não-UTF8; respeita `max_chars`.
- `tool_fs_write(array $a)` — escreve/sobrescreve ou anexa (`append=true`); cria diretórios pais.
- `tool_fs_mkdir(array $a)` — cria diretório (recursivo por padrão).
- `tool_fs_delete(array $a)` — remove arquivo/diretório (recursivo por padrão; proíbe raiz).
- `tool_fs_rename(array $a)` — renomeia/move (`source` → `target`).
- `tool_fs_copy(array $a)` — copia arquivo/diretório.
- `tool_fs_exists(array $a)` — verifica existência e tipo.
- `tool_fs_stat(array $a)` — metadados (tamanho, mtime, permissões, legível/gravável).
- `tool_fs_tree(array $a)` — lista recursiva em árvore.
- `tool_fs_search(array $a)` — busca por padrão glob.
- `tool_fs_read_json(array $a)` — lê e parseia arquivo JSON.
- `tool_fs_write_json(array $a)` — serializa dados em JSON e grava.
- `call_tool(string $name, array $args)` — despacha para a ferramenta `fs_*` ou micro-MCP.
- `tool_definitions()` — retorna definições de ferramentas (schemas) incl. micro-MCPs.

### Gestão de micro-MCPs
- `micro_disabled_file()` / `micro_disabled_list()` / `micro_disabled_save(array $list)` — arquivo `.disabled.json` que controla módulos desativados.
- `micro_file_path(string $name)` — valida nome `mcp-*.php` e devolve caminho.
- `micro_list_files()` — lista arquivos com id, nome, descrição, nº de tools e se ativo.
- Carregamento automático: inclui `micro-mcp/*.php` (exceto `index.php`/`_boot.php`) que retornem array `{id, name, description, tools, call}`.

### Sessão e autenticação
- `session_start(...)` — cookies HttpOnly/SameSite=Lax.
- `is_auth()` — verifica `$_SESSION['auth']`.
- `login_state_file()` / `login_state_get()` / `login_state_set()` — controle de tentativas por IP (arquivo em `/tmp`).
- Fluxo POST `?action=login`: valida senha, regenera sessão, aplica lockout após 5 tentativas.

### Relay de LLM
- `llm_host_is_private(string $host)` — bloqueia hosts privados/loopback.
- Rota `POST ?action=llm_relay` — encaminha requisição LLM via cURL (HTTP ou HTTPS, fora de hosts privados), repassa headers de autenticação e faz streaming da resposta. Bloqueia requisições a IPs privados. Útil para contornar conteúdo misto (página HTTPS chamando upstream HTTP).

### Router HTTP
- Servir estáticos (GET, sem auth): CSS/JS/PNG/etc.
- Login (POST) e página de login (GET) quando não autenticado.
- Endpoints MCP: JSON-RPC (`tools/list`, `tools/call`, `initialize`, `ping`), rotas por caminho (`/tools/list`, `/tools/call`, `/tools`) e por query (`?action=tools`, `?action=call`, `?action=micro_list`, `?action=micro_read`, `?action=micro_write`, `?action=micro_delete`, `?action=micro_toggle`).
- GET `/` ou `/lama.php` serve `lama.html`.
- Fallback: JSON com nome/versão/raiz/ferramentas.

---

## 3. `mcp.php` — Servidor MCP de arquivos independente (599 linhas)

Versão simplificada/sem login (usa `API_TOKEN` fixo vazio = acesso aberto ou token via env).

- Mesmos helpers: `respond`, `fail`, `starts_with`, `ends_with`, `api_token_ok`, `root_normalized`, `norm_path`, `resolve_path`, `real_check`, `rel_path`, `is_root`, `is_utf8`, `rrmdir`, `rcopy`, `tree_walk`, `search_walk`.
- Mesmas ferramentas `tool_fs_*` (13 ferramentas) e `call_tool`/`tool_definitions`.
- Sem micro-MCPs e sem auth por sessão.
- Endpoints: JSON-RPC (`tools/list`, `tools/call`), `/tools`, `/tools/list`, `/tools/call`.

---

## 4. `login.php` — Página de login (48 linhas)

- Template HTML do login (tema XP). Lê `$erro` do escopo do `lama.php` para exibir mensagens.
- Formulário POST para `?action=login` com campo `senha`.

---

## 5. `lama.html` — Estrutura do frontend (337 linhas)

- Layout: sidebar (seções de servidores, conversas, agentes, sub-agentes, skills, MCPs, orquestradores), área de chat, barra de ferramentas e modais (servidor, skill, agente, sub-agente, MCP, orquestrador, workspace, weditor, micro-MCP, import/export JSON).
- Elementos de UI consumidos pelo `lama.js` (inputs, listas, badges, botões).

---

## 6. `lama.js` — Lógica do frontend (2282 linhas)

### Estado inicial
- `servers`, `conversations`, `mcps`, `skills`, `agents`, `subAgents`, `orchestrators` — carregados do `localStorage` (chaves `llama_*`).
- `DEFAULT_AGENTS` (gamedev, escritor), `DEFAULT_SUBAGENTS` (critico, pesquisador, gramatical), `DEFAULT_SERVERS` (b.ai, sensenova), `DEFAULT_ORCHESTRATORS` (dev-completo, analise-full, autor).
- Seed automático: adiciona padrões ausentes ao `localStorage`.

### Estatísticas de tokens
- `updateStatsDisplay()`, `addStats(i,o,t)`, `resetStats()`, `formatNumber(n)`.

### Import/Export
- `catStore()`, `catStorageKey(cat)`, `renderAllSections()`.
- `openExportModal()`, `openImportModal()`, `downloadJSON(data,filename)`, `exportCat(cat)`, `importCat(cat)`, `handleImportCat(event)`.

### WCURL (requisições HTTP com fallback CORS)
- `buildProxyURL(proxyEntry, targetURL)`, `fetchWithCORFallback(url, opts, timeout)`.
- `executeWcurl(toolName, args)`, `wcurlFetch(args)`, `wcurlJSON(args)`, `wcurlDownload(args)`.
- `toggleWcurl()`, `openWcurlConfig()`.

### WCALC (matemática segura — parser próprio, sem `eval`)
- `wcalcTokenize(expr)`, `wcalcEval(expr)` (com `parseExpr`, `parseTerm`, `parseFactor`, `parseAtom`), `wcalcCall(name,args)`, `wcalcFormatResult(v)`.
- `executeWcalc(toolName,args)`, `wcalcExpression(args)`, `wcalcStats(args)`, `wcalcPercent(args)`.
- `toggleWcalc()`.

### WTIME (data e hora)
- `wtParse(v)`, `wtFmtDuration(ms)`, `wtISOWeek(d)`, `wtLocalStr(d,tz)`.
- `executeWtime(toolName,args)`, `wtimeNow(args)`, `wtimeAdd(args)`, `wtimeDiff(args)`, `wtimeInfo(args)`.
- `toggleWtime()`.

### WEDITOR (arquivos no workspace do servidor PHP via `fs_*`)
- `weditorBaseUrl()`, `openWeditorConfig()`, `toggleWeditor()`.
- `executeWeditor(toolName,args)` — mapeia `weditor_*` para `fs_*` e chama o backend.

### Micro-MCP integrado
- `mmcpBaseUrl()`, `refreshMicroMCPTools()`, `toggleMicroMCP()`, `executeMicroMCP(toolName,args)`.

### Gestão de micro-MCPs (criar/editar/excluir/alternar)
- `microMCPBase()`, `openMicroMCPManager()`, `microMCPRefresh()`, `microMCPNew()`, `microMCPEdit(file)`, `microMCPSave()`, `microMCPDelete(file)`, `microMCPToggle(file)`.

### WORKSPACE (arquivos no localStorage)
- `wsGetFiles()`, `wsSaveFiles(files)`, `wsNormalizePath(p)`, `wsParentDir(p)`, `wsFileType(name)`, `wsHumanSize(bytes)`.
- Ferramentas: `executeWorkspace(toolName,args)`, `wsList`, `wsRead`, `wsCreate`, `wsUpdate`, `wsDelete`, `wsRename`, `wsInfo`, `wsSearch`.
- Explorador: `openFileExplorer()`, `renderWorkspaceTree(filterPath)`, `wsNavigate(path)`, `wsPreviewFile(path)`, `wsToggleRender(path)`, `wsToggleImage(path)`, `wsFileIcon(type)`, `wsDownloadFile(path)`, `wsCopyContent(path)`, `wsDeleteFile(path)`.

### WEDITOR File Explorer (servidor PHP)
- `weParentDir(p)`, `weBasename(p)`, `weCall(fsName,args)`, `openWeditorExplorer()`, `renderWeditorTree(filterPath)`, `weNavigate(path)`.
- `weFullPath(name)`, `weditorNewFile()`, `weditorNewFolder()`, `weRename(path)`, `weDelete(path,isDir)`, `wePreviewFile(path)`, `weEditFile(path)`, `weSaveFile(path)`, `weDownloadFile(path)`, `weCopyServerContent(path)`.

### Livro → PDF
- `generateBookPDF()` — junta `livro1/*.md` em HTML imprimível.
- `mdToHTML(md)` — conversor Markdown→HTML simples.

### MCP Tools (agregação e execução)
- `getActiveMCPTools()` — concatena tools dos built-ins ativos + MCPs online.
- `executeMCPToolByIndex(mcpIndex, toolName, args)` — despacha para o built-in ou MCP remoto.
- `fetchMCPTools(index)` — busca ferramentas de um MCP remoto.

### MCP Status / Render / CRUD / JSON
- `checkMCPStatus(index)`, `checkAllMCPStatus()`, `toggleMCPEnabled(i)`.
- `renderMCPs()` — desenha lista (6 built-ins + MCPs remotos).
- `openWcurlConfig()`.
- `openMCPJSONModal()`, `previewMCPJSON()`, `parseMCPJSON(raw)`, `normalizeMCPEntry(name,cfg)`, `importMCPFromJSON()`.
- `openMCPModal()`, `editMCP(i)`, `cancelMCPModal()`, `saveMCP()`, `deleteMCP(i)`, `clearMCPForm()`, `addHeaderRow(key,val)`.

### Tarefas em segundo plano (sub-agentes)
- `addTask(name,saName)`, `updateTask(id,status,result,error)`, `addSubAgentResultMsg(subAgentName,result)`, `renderTasks()`, `toggleTaskResult(id)`, `addTaskMsg(text)`.
- `executeSubAgentTask(sa,task,taskId)` — chama o LLM com o prompt do sub-agente e stream.
- `parseSubAgentCommand(text)` — detecta comando `/nome tarefa`.

### Sub-Agentes / Agentes / Skills
- Render/CRUD: `renderSubAgents()`, `openSubAgentModal()`, `editSubAgent(i)`, `cancelSubAgentModal()`, `populateSubAgentSelects()`, `saveSubAgent()`, `deleteSubAgent(i)`, `clearSubAgentForm()`.
- `renderAgents()`, `openAgentModal()`, `editAgent(i)`, `cancelAgentModal()`, `populateAgentSelects()`, `saveAgent()`, `deleteAgent(i)`, `applyAgent(i)`, `updateAgentBadge()`, `clearAgentForm()`.
- `renderSkills()`, `openSkillModal()`, `editSkill(i)`, `cancelSkillModal()`, `saveSkill()`, `deleteSkill(i)`, `applySkill(i)`, `updateSkillBadge()`, `clearSkillForm()`.

### Parâmetros ativos
- `getActiveSystemPrompt()`, `getActiveTemperature()`, `getActiveMaxTokens()`, `getActiveTopP()`, `getActiveMaxMsgs()`.
- `serverHeaders(srv, extra)` — monta headers de auth (bearer/x-api-key/api-key).

### Relay CORS
- `LLM_RELAY` (URL `?action=llm_relay`), `llmUpstream(srv,path)`.
- `llmChatFetch(srv,body,opts)` — direto ou via relay se `srv.proxy`.
- `llmModelsFetch(srv,opts)` — busca modelos (direto ou via relay).
- `toggleSrvApiKey()`, `getSrvApiKeyType()`, `detectModelFromURL(u,srv)`.

### Orquestradores
- Render/CRUD: `renderOrchestrators()`, `openOrchModal()`, `editOrch(i)`, `cancelOrchModal()`, `populateOrchSelects()`, `renderOrchSteps(steps)`, `addOrchStep()`, `removeOrchStep(i)`, `orchStepTypeChanged(i,type)`, `getOrchStepsFromDOM()`, `saveOrch()`, `deleteOrch(i)`, `applyOrch(i)`, `updateOrchBadge()`, `clearOrchForm()`.
- `executeOrchestrator(o,userMessage)` — roda etapas (sequential/pipeline/parallel), com loop de tool_calls e `runStep(step,prevResult)`.

### Servidores
- `updateServerSelect()`, `renderServers()`, `selectServer(i)`.
- `toggleServerAdvanced()`, `applyServerAdvancedState()`.
- `openServerModal()`, `editServer(i)`, `cancelServerModal()`, `saveServer()` (valida URL duplicada).
- `checkServerOnline(s)`, `removeDuplicateServers()` (remove repetidos e offline), `deleteServer(i)`, `clearServerForm()`.
- Fallbacks: `populateServerFallbacks()`, `renderFallbackList()`, `srvFallbackToggle(idx,checked)`, `srvFallbackMove(pos,dir)`.
- `hideModelSelect()`, `pickDetectedModel(v)`, `fetchJSONWithCORFallback(url,opts,timeout)`, `detectModelsFromURL(u,srv)`, `autoFillModel()`.
- `openBatchServerModal()`, `saveBatchServers()`.

### Conversas e chat
- `renderConversations()`, `renameConv(i)`, `editConv(i)`, `newConversation()`, `selectConv(i)`, `deleteConv(i)`.
- `renderChat()` — renderiza mensagens (markdown, estatísticas, tool results, reasoning).
- `escapeHtml(t)`, `renderMarkdown(t)`.
- `explainFetchError(err,url)` — diagnóstica erros de fetch (CORS, misto, offline).
- `streamChatCompletion(srv, body, onDelta, signal)` — stream SSE com tool_calls e usage.
- `sendMessage()` — fluxo principal: comando `/`, orquestrador, ou chat com loop de ferramentas e fallback de servidores.
- `addToolMsg(text)`, `addToolResultMsg(fn,result)`, `stopGeneration()`, `addSystemMsg(text)`, `saveConversations()`.

### Input / menções e atalhos
- `handleKey(e)`, `hideMentionPopup()`, `getMentionQuery(text,caret)`, `getSlashQuery(text,caret)`, `wsMentionItems(query)`, `updateMentionPopup()`, `moveMention(delta)`, `pickMention(i)`.
- `toggleMarkdown()`, `toggleCLI()`.
- Fonte: `applyFontScale()`, `changeFontScale(delta)`.

### Import/Export completo e utilitários
- `exportAll()`, `importAll(event)` (restaura tudo e auto-detecta modelos).
- `handleAttach(event)` — anexa arquivo no input.
- `openModal(id)`, `closeModal(id)` + fechamento de modais por clique no overlay.
- `clearAll()` — apaga todos os dados do localStorage.

### Seções e sidebar
- `toggleSidebar()`, `toggleSection(sectionId,key)`, `applySectionStates()`.

---

## 7. `diag.php` — Diagnóstico do ambiente (110 linhas)

- Protegido por `DIAG_TOKEN` (via `?key=`).
- Funções de saída: `ok()`, `warn()`, `fail()`.
- Verifica: extensões (`ftp`, `curl`, `openssl`, `sockets`, `mbstring`, `json`), `ini`, DNS de `ftpupload.net`, teste TCP na porta 21, login FTP real (se `DIAG_FTP_USER`/`DIAG_FTP_PASS`), e HTTPS via cURL. Emite conclusão com bloqueios detectados.

---

## 8. `micro-mcp/` — Módulos MCP carregáveis

### `_boot.php` (51 linhas) — bootstrap comum
- `respond()`, `fail()`, `starts_with()`, `ends_with()`, `api_token_ok()` (env `MICRO_MCP_TOKEN`), `json_out()`.

### `index.php` (106 linhas) — endpoint MCP agregador
- `mcp_tools()` — agrega ferramentas de todos os módulos com prefixo `id_`.
- `mcp_call(string $name, array $args)` — roteia a chamada para o módulo correto.
- Router: JSON-RPC (`tools/list`, `tools/call`, `initialize`, `ping`), `/tools`, `/tools/list`, `/tools/call`; fallback com info dos módulos.

### `mcp-ftp.php` (341 linhas) — Ferramentas FTP (`id = ftp`)
- `ftp_local_root()`, `ftp_local_path(rel)` — resolução de caminho local seguro.
- `ftp_conn(array $a)` — conecta/autentica (host/user/pass/port via args ou env `MCP_FTP_*`); usa PASV.
- `ftp_mlsd_entries($conn, path)` — lista via MLSD com fallback.
- `ftp_is_utf8()`.
- Ferramentas: `ftp_tool_test`, `ftp_tool_list`, `ftp_tool_read`, `ftp_tool_put`, `ftp_tool_mkdir`, `ftp_tool_rmdir`, `ftp_tool_delete`, `ftp_tool_rename`, `ftp_tool_chmod`, `ftp_tool_size`, `ftp_tool_mdtm`.
- Exporta módulo com `id=ftp` e dispatch no `call`.

### `mcp-criador.php` (282 linhas) — Criador de micro-MCPs (`id = criador`)
- `criador_micro_dir()` — diretório dos micro-MCPs.
- `criador_gerar_codigo(array $a)` — gera código PHP completo de um módulo a partir de `{id, name, description, tools[]}`.
- `criador_tool_gerar(array $a)` — gera e opcionalmente salva (`salvar=true`, `sobrescrever=true`), com lint via `php -l`.
- `criador_tool_validar(array $a)` — valida sintaxe e contrato (campos, `tools`/`call` callables, `eval` do `return`).
- `criador_tool_template(array $a)` — retorna template pronto.
- `criador_tool_listar(array $a)` — lista arquivos em `micro-mcp/`.
- Exporta módulo com `id=criador` e dispatch.

### `mcp-ui.php` (14 linhas) — Módulo de exemplo (UI)
- Exporta `id=ui` com uma tool `ping` que responde `{"pong": true}`. (Atualmente desativado em `.disabled.json`.)

### `.disabled.json`
- Lista de módulos desativados (atualmente: `mcp-ftp.php`, `mcp-ui.php`, `mcp-criador.php`).

---

## 9. Variáveis de ambiente utilizadas

| Variável | Uso |
|---|---|
| `MCP_FS_ROOT` | Raiz dos arquivos do `fs_*` (default: `workspace/`) |
| `LAMA_API_TOKEN` | Token para autenticação via API |
| `LAMA_PASS` | Senha de login do painel (default: `mamonasazuis`) |
| `LAMA_CORS_ORIGIN` | Origem CORS permitida (default: `*`) |
| `MICRO_MCP_ROOT` | Raiz usada pelos micro-MCPs (default: `workspace/`) |
| `MICRO_MCP_TOKEN` | Token para o endpoint `micro-mcp/index.php` |
| `MCP_FTP_HOST` / `MCP_FTP_USER` / `MCP_FTP_PASS` / `MCP_FTP_PORT` | Credenciais FTP padrão |
| `DIAG_TOKEN`, `DIAG_FTP_USER`, `DIAG_FTP_PASS` | Diagnóstico FTP |

---

## 10. Endpoints HTTP (API)

| Rota | Método | Ação |
|---|---|---|
| `/` | GET | Página `lama.html` |
| `/lama.php` | GET | Página `lama.html` |
| `?action=login` | POST | Login (senha) |
| `?action=llm_relay` | POST | Relay de LLM via cURL |
| `?action=tools` | GET | Lista ferramentas |
| `?action=call&name=X&arguments=JSON` | GET | Executa ferramenta |
| `?action=micro_list` | GET | Lista micro-MCPs |
| `?action=micro_read&file=` | GET | Lê conteúdo de um micro-MCP |
| `?action=micro_write` | POST | Cria/edita micro-MCP (com lint) |
| `?action=micro_delete` | POST | Exclui micro-MCP |
| `?action=micro_toggle` | POST | Ativa/desativa micro-MCP |
| `/tools` | GET | Lista ferramentas |
| `/tools/list` | POST | Lista ferramentas |
| `/tools/call` | POST | Executa ferramenta |
| `POST` com `method` JSON-RPC | POST | `tools/list`, `tools/call`, `initialize`, `ping` |
| `/micro-mcp/index.php` | POST/GET | MCP agregador dos micro-MCPs |
| `/mcp.php` | POST/GET | MCP de arquivos independente |
| `/diag.php` | GET | Diagnóstico (`?key=DIAG_TOKEN`) |

> O frontend `lama.js` usa também os endpoints das ferramentas built-in (wcurl, wcalc, wtime, workspace, weditor) diretamente no navegador, sem passar pelo backend.
