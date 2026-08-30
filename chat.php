<?php
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ===== Chat Ollama — rotas (ver rotas_chat.md) =====
//   GET  /chat                 -> página views/chat.html
//   GET  /api/servers          -> lista servidores cadastrados
//   GET  /api/models/:id       -> proxy GET <server>/api/tags (lista modelos)
//   POST /api/chat/:id         -> proxy POST <server>/api/chat (stream NDJSON)
//   POST /api/servers          -> cadastra servidor (gestão)
//   DELETE /api/servers/:id    -> remove servidor (gestão)
//
// Servidores ficam num arquivo JSON ao lado deste script (servers.json).

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$reqMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

const CHAT_SERVERS_FILE = __DIR__ . '/servers.json';
const CHAT_VIEW = __DIR__ . '/views/chat.html';
const CHAT_TIMEOUT = 60; // segundos

// ===== CORS (habilitado para todos origins) =====
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');
header('Vary: Origin');
if ($reqMethod === 'OPTIONS') { http_response_code(204); exit; }

// ===== Helpers =====
function chat_respond(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function chat_fail(string $msg, int $code = 500): void { chat_respond(['error' => $msg], $code); }

function chat_servers_load(): array {
    $raw = @file_get_contents(CHAT_SERVERS_FILE);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) return [];
    return array_values(array_filter($data, 'is_array'));
}
function chat_servers_save(array $list): void {
    @file_put_contents(CHAT_SERVERS_FILE, json_encode(array_values($list), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}
function chat_server_find(int $id): ?array {
    foreach (chat_servers_load() as $s) {
        if ((int)($s['id'] ?? 0) === $id) return $s;
    }
    return null;
}
// Normaliza a URL base do Ollama (remove "/api" se o usuário digitou com sufixo)
function chat_base_url(array $srv): string {
    $u = rtrim((string)($srv['url'] ?? ''), '/');
    if (substr($u, -4) === '/api') $u = substr($u, 0, -4);
    return $u;
}
function chat_json_body(): array {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw ?: '', true);
    return is_array($d) ? $d : [];
}

// ===== Auth opcional (igual ao lama.php: token Bearer ou X-Api-Key) =====
$apiToken = getenv('LAMA_API_TOKEN') !== false && getenv('LAMA_API_TOKEN') !== '' ? (string)getenv('LAMA_API_TOKEN') : '';
if ($apiToken !== '') {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    $tok = preg_match('/Bearer\s+(.+)/i', $h, $m) ? trim($m[1]) : ($_SERVER['HTTP_X_API_KEY'] ?? '');
    if (!hash_equals($apiToken, $tok)) chat_fail('Não autorizado', 401);
}

// ===== ROTAS =====

// GET /chat — página
if ($reqMethod === 'GET' && $uriPath === '/chat') {
    if (!file_exists(CHAT_VIEW)) chat_fail('Página views/chat.html não encontrada', 500);
    header('Content-Type: text/html; charset=utf-8');
    readfile(CHAT_VIEW);
    exit;
}

// GET /api/servers — listar servidores
if ($reqMethod === 'GET' && $uriPath === '/api/servers') {
    chat_respond(['servers' => chat_servers_load()]);
}

// POST /api/servers — cadastrar servidor
if ($reqMethod === 'POST' && $uriPath === '/api/servers') {
    $b = chat_json_body();
    $name = trim((string)($b['name'] ?? ''));
    $url = trim((string)($b['url'] ?? ''));
    if ($name === '' || $url === '') chat_fail('Campos "name" e "url" são obrigatórios', 400);
    if (!preg_match('#^https?://#i', $url)) chat_fail('URL deve começar com http:// ou https://', 400);
    $list = chat_servers_load();
    $id = 1;
    foreach ($list as $s) $id = max($id, (int)($s['id'] ?? 0) + 1);
    $srv = ['id' => $id, 'name' => $name, 'url' => $url];
    if (isset($b['model']) && is_string($b['model']) && trim($b['model']) !== '') $srv['model'] = trim($b['model']);
    $list[] = $srv;
    chat_servers_save($list);
    chat_respond(['server' => $srv], 201);
}

// DELETE /api/servers/:id — remover servidor
if ($reqMethod === 'DELETE' && preg_match('#^/api/servers/(\d+)$#', $uriPath, $m)) {
    $id = (int)$m[1];
    $list = chat_servers_load();
    $new = array_values(array_filter($list, fn($s) => (int)($s['id'] ?? 0) !== $id));
    if (count($new) === count($list)) chat_fail('Servidor não encontrado', 404);
    chat_servers_save($new);
    chat_respond(['deleted' => true, 'id' => $id]);
}

// GET /api/models/:id — lista modelos do servidor (proxy /api/tags)
if ($reqMethod === 'GET' && preg_match('#^/api/models/(\d+)$#', $uriPath, $m)) {
    if (!function_exists('curl_init')) chat_fail('curl indisponível no servidor', 500);
    $srv = chat_server_find((int)$m[1]);
    if (!$srv) chat_fail('Servidor não encontrado', 404);
    $ch = curl_init(chat_base_url($srv) . '/api/tags');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false) chat_fail('Falha ao conectar com o servidor: ' . $err, 502);
    $data = json_decode((string)$resp, true);
    if ($status >= 400 || !is_array($data)) chat_fail('Servidor respondeu HTTP ' . $status, 502);
    $models = [];
    foreach (($data['models'] ?? []) as $mm) {
        if (!is_array($mm) || !isset($mm['name'])) continue;
        $models[] = [
            'name' => (string)$mm['name'],
            'model' => isset($mm['model']) ? (string)$mm['model'] : null,
            'size' => isset($mm['size']) ? (int)$mm['size'] : null,
            'modified_at' => isset($mm['modified_at']) ? (string)$mm['modified_at'] : null,
        ];
    }
    chat_respond(['server' => $srv, 'models' => $models]);
}

// POST /api/chat/:id — chat com streaming (proxy /api/chat)
if ($reqMethod === 'POST' && preg_match('#^/api/chat/(\d+)$#', $uriPath, $m)) {
    if (!function_exists('curl_init')) chat_fail('curl indisponível no servidor', 500);
    $srv = chat_server_find((int)$m[1]);
    if (!$srv) chat_fail('Servidor não encontrado', 404);
    $req = chat_json_body();
    if (!isset($req['model']) || !is_string($req['model']) || $req['model'] === '') chat_fail('Campo "model" é obrigatório', 400);
    if (!isset($req['messages']) || !is_array($req['messages'])) chat_fail('Campo "messages" é obrigatório', 400);

    $payload = json_encode($req, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false || $payload === '') chat_fail('Falha ao serializar o corpo (JSON inválido)', 400);

    // desativa buffers de saída para streaming em tempo real
    @ini_set('zlib.output_compression', '0');
    while (ob_get_level()) ob_end_flush();

    $hdrs = ['Content-Type: application/json', 'Content-Length: ' . strlen($payload)];
    $ch = curl_init(chat_base_url($srv) . '/api/chat');
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => CHAT_TIMEOUT,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HEADER => false,
        CURLOPT_RETURNTRANSFER => false,
    ]);
    $ctDone = false;
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $h) use (&$ctDone) {
        $trim = rtrim($h, "\r\n");
        if (preg_match('#^HTTP/\S+\s+(\d+)#i', $trim, $mm)) { http_response_code((int)$mm[1]); return strlen($h); }
        if (preg_match('/^content-type:/i', $trim)) { header($trim); $ctDone = true; }
        return strlen($h);
    });
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
        echo $data;
        flush();
        return strlen($data);
    });
    if (!@curl_exec($ch)) {
        $err = curl_error($ch);
        if (!$ctDone) header('Content-Type: application/json; charset=utf-8');
        http_response_code(502);
        echo json_encode(['error' => 'Falha no proxy: ' . $err]);
    }
    curl_close($ch);
    exit;
}

// Fallback
chat_respond([
    'name' => 'chat-ollama',
    'version' => '1.0.0',
    'routes' => ['GET /chat', 'GET /api/servers', 'POST /api/servers', 'DELETE /api/servers/:id', 'GET /api/models/:id', 'POST /api/chat/:id'],
]);
