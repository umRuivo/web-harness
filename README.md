# Web Harness

![Web Harness](screenshot.png)

**Web Harness** é uma interface web de chat com LLMs (compatível com a API OpenAI) pensada para rodar no navegador e orquestrar modelos, agentes e ferramentas de forma simples. Tudo é servido por um backend PHP leve com autenticação de sessão — sem dependências de frameworks pesados.

## Por que existe

Modelos de chat expostos via API costumam travar em três pontos no navegador: **CORS**, **mixed-content** (quando o site é HTTPS e o modelo é HTTP) e **esquemas de tool-calling** malformados. O Web Harness resolve isso com um *relay* server-side e uma camada de sanitização de schemas, permitindo usar tanto provedores na nuvem (ex.: Ollama Cloud) quanto instâncias Ollama locais.

## Funcionalidades

- **Chat com qualquer LLM OpenAI-compatible** — basta apontar a URL base e a chave (Bearer).
- **Relay CORS** — `lama.php?action=llm_relay` faz o proxy server-side das chamadas, contornando bloqueios de origem e HTTP/HTTPS.
- **Ferramentas MCP** — integra ferramentas como:
  - `Weditor` (leitura/edição de arquivos no servidor),
  - `Workspace` (listar/ler arquivos da área de trabalho),
  - `Wcalc` (cálculos),
  - `Wcurl` (requisições HTTP),
  - `Memória` (ler/salvar pontos importantes, compartilhar entre conversas).
- **Orquestração** — agentes, sub-agentes, skills e orquestradores configuráveis, com temperatura e prompt próprios.
- **Mestre** — escolha um servidor para ser o mestre: ele recebe uma tarefa (`! tarefa`, modal *Nova tarefa* ou modo mestre ativo) e pode criar/escolher skills, sub-agentes, agentes, memórias e conversas para cumpri-la, além de delegar execução e usar as MCPs ativas.
- **Memórias persistentes** — memória global compartilhável + memória individual por conversa, em `.md`, injetadas no prompt e acessíveis ao LLM via tools.
- **Visão multimodal** — anexe imagens; o app monta o conteúdo no formato `image_url` aceito pelos modelos.
- **Sanitização de schema (Ollama)** — converte propriedades `type: array` em `string` e remove `items`/`prefixItems` que quebram o parser do Ollama, garantindo tool-calling funcional.
- **Autenticação backend** — tela de login (`login.php`) com usuário e senha; o *relay* e todas as ações exigem sessão autenticada (cookie `HttpOnly` + `Secure` + `SameSite=Lax`).
- **Logoff** — encerra a sessão no servidor e retorna à tela de login.

## Mestre

Na sidebar, seção **Mestre**, escolha um servidor para ser o mestre. Ele recebe uma tarefa de três formas:

- **Modal**: botão *Nova tarefa* (servidor + descrição + opção de criar nova conversa);
- **Modo mestre**: botão *Ativar modo* — tudo que você enviar vira tarefa do mestre (badge `Mestre: nome` na topbar);
- **Avulso**: prefixo `! tarefa` no chat, mesmo com o modo desligado.

O mestre roda um loop de até 12 iterações de tool-calling com tools próprias (`master_*`, visíveis só durante a execução), somadas às MCPs ativas:

- **Listar/escolher o existente**: `master_list_skills`, `master_list_subagents`, `master_list_agents`, `master_list_memories`, `master_list_conversations` + `master_use_skill`, `master_use_agent`, `master_append_memory`;
- **Criar o que faltar**: `master_create_skill`, `master_create_subagent`, `master_create_agent`, `master_create_memory_global` (já vinculada à conversa atual), `master_create_conversation`;
- **Delegar execução** via chamada LLM real com o prompt do especialista: `master_run_subagent`, `master_run_agent`.

A regra do system prompt é reutilizar antes de criar (criar duplicata retorna erro orientando a escolher o existente). Cada ação aparece no chat como `Mestre: tool(...)` e, ao final, o mestre posta **Mestre concluiu** com resumo do que criou/escolheu e onde está. A config do mestre (`llama_master`) vai junto no backup JSON e o servidor mestre é marcado com `[mestre]` na lista de servidores.

## Memórias

Pontos importantes em `.md`, salvos no `localStorage` e enviados ao LLM como bloco `# Memórias` no system prompt (vale para chat e orquestradores):

- **Global** — criada na seção *Memórias*, pode ser vinculada a uma ou mais conversas (checkbox por conversa), ativada/desativada e importada/exportada via JSON.
- **Individual** — uma por conversa, editada no botão de memória da conversa (com resumo automático via LLM: *Resumir conversa na memória*). Badges indicam o que está ativo.
- **Compartilhar** — copia a memória individual de uma conversa para outra(s) (anexar ou substituir, com ou sem as globais vinculadas). Vale marcar os destinos e clicar em *Compartilhar* ou *Salvar*; cada cópia vira independente e o destino recebe um recibo visível no chat.
- **Tools do LLM** — `memory_get` (lê as ativas, identificando `[conversa #i "título"]`), `memory_append_conv`, `memory_append_global` e `memory_share_conv`, então o próprio modelo pode salvar e mover pontos importantes.
- O estado sincroniza entre abas abertas e a persistência da cópia é verificada (falha de quota do navegador gera alerta explícito em vez de perda silenciosa).

## Arquitetura

```
lama.php        → backend único: relay de LLM, auth (login/logout) e ações da API
login.php       → tela de login (usuário/senha)
lama.html/js/css→ frontend (carregado pelo backend quando autenticado)
mcp.php         → micro-servidor MCP
micro-mcp/      → ferramentas MCP (editor, ftp, ui, criador...)
router.php      → roteamento auxiliar
funcoes.md      → documentação de funções/relay
```

O fluxo é: o navegador abre `lama.php` → se não autenticado, recebe `login.php` → após o login, o backend serve `lama.html` e o `lama.js` passa a chamar o *relay* `?action=llm_relay`, que por sua vez fala com o LLM escolhido.

## Autenticação

As credenciais padrão (definidas em `lama.php`) são:

- **Usuário:** `web`
- **Senha:** `harness`

Para alterar sem mexer no código, defina as variáveis de ambiente no servidor:

```bash
export LAMA_USER="seu_usuario"
export LAMA_PASS="sua_senha"
```

A sessão é mantida em `PHP_SESSION` com cookie seguro; a senha é validada no servidor via comparação *timing-safe* (`hash_equals`).

## Como usar

1. Suba os arquivos PHP em um servidor com PHP + cURL (ex.: InfinityFree, Apache, Nginx).
2. Acesse pela entrada que passa por `lama.php` (por exemplo `https://seudominio/lama.php` ou o índice que encaminha para ele).
   - **Não** abra o `lama.html` diretamente — ele não tem o *gate* de autenticação.
3. Faça login com `web` / `harness` (ou as credenciais de ambiente).
4. Configure a URL base do LLM e a chave (ex.: Ollama Cloud `https://ollama.com/v1`).
5. Converse, use tools/MCP, anexe imagens e orquestre agentes.

## Sandbox no localStorage

Todo o estado do app — servidores/configurações de LLM, skills, agentes, sub-agentes, orquestradores, conversas, memórias e estatísticas — é persistido no `localStorage` do navegador. Isso funciona como uma **sandbox client-side**: cada usuário tem seu próprio ambiente isolado, sem precisar de armazenamento no servidor nem de arquivos compartilhados.

- As configurações ficam restritas ao navegador/dispositivo (e ao perfil do navegador) de quem usa.
- É útil para criar e experimentar "arquivos" de configuração, prompts, skills e agentes no próprio navegador, sem mexer no backend — uma forma de *sandbox* leve e portátil.
- Para "limpar" o sandbox, basta limpar os dados do site no navegador; a sessão de autenticação (server-side) é independente disso.

Essa abordagem mantém o servidor enxuto (só relay + auth) e deixa a experimentação por conta do cliente.

## Observações

- O app é voltado para **uso pessoal/educacional**; revise as permissões de arquivos expostas pelas ferramentas MCP antes de disponibilizá-lo publicamente.
- Conexões a Ollama locais podem ser bloqueadas por *firewall* de hospedagem (egress) — nesse caso, use um provedor na nuvem.
- O diretório `.playwright-mcp/` (gravações de teste) fica fora do versionamento (`.gitignore`); o `workspace/` é versionado.
