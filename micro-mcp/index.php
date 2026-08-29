<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (!api_token_ok()) {
    fail('Não autorizado', 401);
}

// ===== Descoberta de micro-MCPs (cada *.php na pasta exporta um módulo) =====
$modules = [];
foreach (glob(__DIR__ . '/*.php') as $file) {
    $base = basename($file);
    if ($base === 'index.php' || $base === '_boot.php') continue;
    $mod = require $file;
    if (!is_array($mod)) continue;
    $id = (string)($mod['id'] ?? str_replace('-', '_', pathinfo($base, PATHINFO_FILENAME)));
    if (!preg_match('/^[a-z][a-z0-9]*$/', $id)) continue;
    $mod['__file'] = $base;
    $modules[$id] = $mod;
}

function mcp_tools(): array
{
    global $modules;
    $tools = [];
    foreach ($modules as $id => $mod) {
        if (!is_callable($mod['tools'] ?? null)) continue;
        foreach ((array)$mod['tools']() as $t) {
            if (!is_array($t) || empty($t['name'])) continue;
            $t['name'] = $id . '_' . $t['name'];
            $t['description'] = '[' . $id . '] ' . ($t['description'] ?? '');
            $t['inputSchema'] = $t['inputSchema'] ?? ['type' => 'object', 'properties' => []];
            $tools[] = $t;
        }
    }
    return $tools;
}

function mcp_call(string $name, array $args): string
{
    global $modules;
    foreach ($modules as $id => $mod) {
        if (starts_with($name, $id . '_')) {
            $tool = substr($name, strlen($id) + 1);
            if (is_callable($mod['call'] ?? null)) {
                return (string)$mod['call']($tool, $args);
            }
        }
    }
    throw new Exception("Ferramenta desconhecida: $name");
}

// ===== Router =====
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$bodyRaw = file_get_contents('php://input');
$body = json_decode($bodyRaw ?: '', true);
if (!is_array($body)) $body = [];

if (isset($body['method'])) {
    $id = $body['id'] ?? null;
    try {
        switch ($body['method']) {
            case 'tools/list':
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['tools' => mcp_tools()]]);
            case 'tools/call':
                $params = is_array($body['params'] ?? null) ? $body['params'] : [];
                $out = mcp_call((string)($params['name'] ?? ''), is_array($params['arguments'] ?? null) ? $params['arguments'] : []);
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['content' => [['type' => 'text', 'text' => $out]]]]);
            case 'initialize':
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['protocolVersion' => '2025-03-26', 'capabilities' => ['tools' => new stdClass]]]);
            case 'ping':
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => new stdClass]);
            default:
                respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32601, 'message' => 'Método não encontrado: ' . $body['method']]], 400);
        }
    } catch (Throwable $e) {
        respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32000, 'message' => $e->getMessage()]], 400);
    }
}

if ($method === 'POST' && ends_with($uriPath, '/tools/list')) {
    respond(['tools' => mcp_tools()]);
}

if ($method === 'POST' && ends_with($uriPath, '/tools/call')) {
    $name = (string)($body['name'] ?? '');
    $args = is_array($body['arguments'] ?? null) ? $body['arguments'] : (is_array($body['params'] ?? null) ? $body['params'] : []);
    try {
        $out = mcp_call($name, $args);
        respond(['result' => $out, 'content' => [['type' => 'text', 'text' => $out]]]);
    } catch (Throwable $e) {
        respond(['error' => $e->getMessage()], 400);
    }
}

if ($method === 'GET' && ($uriPath === '/tools' || ends_with($uriPath, '/tools'))) {
    respond(['tools' => mcp_tools()]);
}

respond([
    'name' => 'micro-mcp',
    'version' => '1.0.0',
    'modules' => array_map(fn($m) => ['id' => array_search($m, $modules, true), 'name' => $m['name'] ?? '', 'description' => $m['description'] ?? '', 'file' => $m['__file'] ?? ''], $modules),
    'toolNames' => array_column(mcp_tools(), 'name'),
]);
