# Rotas do Chat Ollama

## Rotas de Página

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/chat` | Página de chat interativo |

## Rotas de API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/servers` | Listar servidores cadastrados |
| GET | `/api/models/:id` | Listar modelos do servidor (proxy `/api/tags`) |
| POST | `/api/chat/:id` | Chat com streaming (proxy `/api/chat`) |

## Detalhamento

### `GET /chat`
Renderiza a página `views/chat.html` com interface de chat estilo mensagens, suporte a imagens e streaming.

### `POST /api/chat/:id`
Proxy para `/api/chat` do servidor Ollama identificado por `:id`.

**Body (JSON):**
```json
{
  "model": "nome-do-modelo",
  "messages": [
    { "role": "user", "content": "mensagem" }
  ],
  "stream": true
}
```

**Comportamento:**
- Faz streaming da resposta em linhas JSON (NDJSON)
- Timeout de 60 segundos
- CORS habilitado para todos origins
- Passa headers, status code e body diretamente do servidor Ollama

## Fluxo do Chat (Frontend)

1. `GET /api/servers` carrega servidores no `<select>`
2. Ao selecionar servidor, `GET /api/models/:id` carrega modelos
3. Usuário digita mensagem e clica Enviar
4. `POST /api/chat/:id` com `stream: true` envia requisição
5. Resposta é lida com `ReadableStream` e exibida progressivamente
6. Histórico de mensagens é mantido em `messageHistory[]`
7. Ao trocar servidor/modelo, histórico é resetado
