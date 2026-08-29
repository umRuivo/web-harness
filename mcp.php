<?php
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

$envRoot = getenv('MCP_FS_ROOT');
define('ROOT', $envRoot !== false && $envRoot !== '' ? rtrim($envRoot, '/') : __DIR__ . '/workspace');
const API_TOKEN = '';
const DEFAULT_MAX_CHARS = 20000;
const MAX_CHARS_LIMIT = 100000;
const MAX_TREE_DEPTH = 5;
const MAX_TREE_ENTRIES = 500;

if (!is_dir(ROOT)) {
    @mkdir(ROOT, 0777, true);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $code = 500): void
{
    respond(['error' => $msg], $code);
}

function starts_with(string $hay, string $needle): bool
{
    return $needle !== '' && strpos($hay, $needle) === 0;
}

function ends_with(string $hay, string $needle): bool
{
    return $needle !== '' && substr($hay, -strlen($needle)) === $needle;
}

function api_token_ok(): bool
{
    if (API_TOKEN === '') return true;
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return hash_equals(API_TOKEN, trim($m[1]));
    return hash_equals(API_TOKEN, $_SERVER['HTTP_X_API_KEY'] ?? '');
}

if (!api_token_ok()) {
    fail('Não autorizado', 401);
}

function root_normalized(): string
{
    return rtrim(str_replace('\\', '/', ROOT), '/');
}

function norm_path(string $p): string|false
{
    $parts = [];
    foreach (explode('/', $p) as $seg) {
        if ($seg === '' || $seg === '.') continue;
        if ($seg === '..') {
            if (!$parts) return false;
            array_pop($parts);
        } else {
            $parts[] = $seg;
        }
    }
    return '/' . implode('/', $parts);
}

function resolve_path(string $rel): string
{
    if ($rel === '' || $rel === '.' || $rel === '/') return root_normalized();
    if (strpos($rel, "\0") !== false) throw new Exception('Caminho inválido.');
    $rel = str_replace('\\', '/', $rel);
    $base = root_normalized();
    $full = $base . '/' . ltrim($rel, '/');
    $n = norm_path($full);
    if ($n === false || !starts_with($n, $base . '/')) {
        throw new Exception('Acesso fora do diretório raiz.');
    }
    return $n;
}

function real_check(string $full): string
{
    $rp = realpath($full);
    if ($rp !== false) {
        $rp = str_replace('\\', '/', $rp);
        if (!starts_with($rp, root_normalized())) {
            throw new Exception('Acesso bloqueado (fora da raiz).');
        }
        return $rp;
    }
    return $full;
}

function rel_path(string $full): string
{
    $base = root_normalized();
    if ($full === $base) return '/';
    return substr($full, strlen($base));
}

function is_root(string $full): bool
{
    return $full === root_normalized();
}

function is_utf8(string $s): bool
{
    if (function_exists('mb_check_encoding')) return mb_check_encoding($s, 'UTF-8');
    return preg_match('//u', $s) === 1;
}

function tool_fs_list(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!is_dir($path)) throw new Exception('Não é um diretório.');
    $items = scandir($path);
    if ($items === false) throw new Exception('Não foi possível ler o diretório.');
    $entries = [];
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $fp = $path . '/' . $item;
        $isDir = is_dir($fp);
        $entries[] = [
            'name' => $item,
            'path' => rel_path($fp),
            'type' => $isDir ? 'dir' : 'file',
            'size' => ($isDir || !is_file($fp)) ? null : filesize($fp),
            'mtime' => file_exists($fp) ? date('c', filemtime($fp)) : null,
        ];
    }
    usort($entries, fn($a, $b) => strcmp($a['name'], $b['name']));
    return json_encode(['path' => rel_path($path), 'count' => count($entries), 'entries' => $entries], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_read(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!is_file($path)) throw new Exception('Não é um arquivo.');
    if (!is_readable($path)) throw new Exception('Arquivo sem permissão de leitura.');
    $max = intval($a['max_chars'] ?? DEFAULT_MAX_CHARS) ?: DEFAULT_MAX_CHARS;
    $max = min($max, MAX_CHARS_LIMIT);
    $content = file_get_contents($path);
    if ($content === false) throw new Exception('Falha ao ler arquivo.');
    $truncated = strlen($content) > $max;
    $part = $truncated ? substr($content, 0, $max) : $content;
    $out = ['path' => rel_path($path), 'size' => strlen($content), 'truncated' => $truncated];
    if (is_utf8($part)) {
        $out['encoding'] = 'text';
        $out['content'] = $part;
    } else {
        $out['encoding'] = 'base64';
        $out['note'] = 'Conteúdo não-UTF8 retornado em base64.';
        $out['content'] = base64_encode($part);
    }
    return json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_write(array $a): string
{
    $path = resolve_path($a['path'] ?? '');
    $content = (string)($a['content'] ?? '');
    $append = !empty($a['append']);
    $dir = dirname($path);
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $bytes = file_put_contents($path, $content, LOCK_EX | ($append ? FILE_APPEND : 0));
    if ($bytes === false) throw new Exception('Falha ao escrever arquivo.');
    return json_encode(['written' => $bytes, 'path' => rel_path($path), 'append' => $append], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_mkdir(array $a): string
{
    $path = resolve_path($a['path'] ?? '');
    if (file_exists($path)) throw new Exception('Já existe.');
    $recursive = $a['recursive'] ?? true;
    if (!mkdir($path, 0777, (bool)$recursive)) throw new Exception('Falha ao criar diretório.');
    return json_encode(['created' => true, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function rrmdir(string $dir): void
{
    $items = @scandir($dir);
    if ($items === false) return;
    foreach ($items as $it) {
        if ($it === '.' || $it === '..') continue;
        $p = $dir . '/' . $it;
        if (is_dir($p) && !is_link($p)) rrmdir($p); else @unlink($p);
    }
    @rmdir($dir);
}

function tool_fs_delete(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!file_exists($path)) throw new Exception('Não existe.');
    if (is_root($path)) throw new Exception('Não é possível remover a raiz.');
    $recursive = $a['recursive'] ?? true;
    if (is_dir($path) && !is_link($path)) {
        if ($recursive) rrmdir($path);
        elseif (!rmdir($path)) throw new Exception('Falha ao remover diretório (não vazio?).');
    } else {
        if (!unlink($path)) throw new Exception('Falha ao remover arquivo.');
    }
    return json_encode(['deleted' => true, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_rename(array $a): string
{
    $src = real_check(resolve_path($a['source'] ?? ''));
    $dst = resolve_path($a['target'] ?? '');
    if (!file_exists($src)) throw new Exception('Origem não existe.');
    $dir = dirname($dst);
    if (!is_dir($dir)) throw new Exception('Diretório alvo não existe.');
    if (!rename($src, $dst)) throw new Exception('Falha ao renomear/mover.');
    return json_encode(['renamed' => true, 'from' => rel_path($src), 'to' => rel_path($dst)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function rcopy(string $src, string $dst): bool
{
    @mkdir($dst, 0777, true);
    $items = @scandir($src);
    if ($items === false) return false;
    foreach ($items as $it) {
        if ($it === '.' || $it === '..') continue;
        $s = $src . '/' . $it;
        $d = $dst . '/' . $it;
        if (is_dir($s) && !is_link($s)) {
            if (!rcopy($s, $d)) return false;
        } elseif (!copy($s, $d)) {
            return false;
        }
    }
    return true;
}

function tool_fs_copy(array $a): string
{
    $src = real_check(resolve_path($a['source'] ?? ''));
    $dst = resolve_path($a['target'] ?? '');
    if (!file_exists($src)) throw new Exception('Origem não existe.');
    $dir = dirname($dst);
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    if (is_dir($src) && !is_link($src)) {
        if (!rcopy($src, $dst)) throw new Exception('Falha ao copiar diretório.');
    } else {
        if (!copy($src, $dst)) throw new Exception('Falha ao copiar arquivo.');
    }
    return json_encode(['copied' => true, 'from' => rel_path($src), 'to' => rel_path($dst)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_exists(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    $exists = file_exists($path);
    $type = $exists ? (is_dir($path) ? 'dir' : 'file') : null;
    return json_encode(['exists' => $exists, 'type' => $type, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_stat(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!file_exists($path)) throw new Exception('Não existe.');
    return json_encode([
        'path' => rel_path($path),
        'type' => is_dir($path) ? 'dir' : 'file',
        'size' => is_file($path) ? filesize($path) : null,
        'mtime' => date('c', filemtime($path)),
        'readable' => is_readable($path),
        'writable' => is_writable($path),
        'permissions' => substr(sprintf('%o', fileperms($path)), -4),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tree_walk(string $dir, array &$node, int $maxDepth, int $curDepth, int $limit): void
{
    if ($curDepth >= $maxDepth || count($node['children'] ?? []) >= $limit) return;
    $items = @scandir($dir);
    if ($items === false) return;
    foreach ($items as $it) {
        if ($it === '.' || $it === '..') continue;
        if (count($node['children'] ?? []) >= $limit) {
            $node['truncated'] = true;
            break;
        }
        $p = $dir . '/' . $it;
        $isDir = is_dir($p) && !is_link($p);
        $child = ['name' => $it, 'path' => rel_path($p), 'type' => $isDir ? 'dir' : 'file'];
        if (!$isDir) {
            $child['size'] = is_file($p) ? filesize($p) : null;
        } else {
            $child['children'] = [];
        }
        $node['children'][] = $child;
        if ($isDir) tree_walk($p, $node['children'][count($node['children']) - 1], $maxDepth, $curDepth + 1, $limit);
    }
}

function tool_fs_tree(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!is_dir($path)) throw new Exception('Não é um diretório.');
    $depth = intval($a['depth'] ?? 3) ?: 3;
    $depth = min($depth, MAX_TREE_DEPTH);
    $node = ['name' => basename($path) ?: '/', 'path' => rel_path($path), 'type' => 'dir', 'children' => []];
    tree_walk($path, $node, $depth, 0, MAX_TREE_ENTRIES);
    return json_encode($node, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function search_walk(string $dir, string $pattern, bool $rec, int $maxD, int $d, int $limit, array &$hits): void
{
    if (count($hits) >= $limit) return;
    $items = @scandir($dir);
    if ($items === false) return;
    foreach ($items as $it) {
        if ($it === '.' || $it === '..') continue;
        if (count($hits) >= $limit) return;
        $p = $dir . '/' . $it;
        $isDir = is_dir($p) && !is_link($p);
        if (fnmatch($pattern, $it)) {
            $hits[] = ['name' => $it, 'path' => rel_path($p), 'type' => $isDir ? 'dir' : 'file'];
        }
        if ($rec && $isDir && $d < $maxD) search_walk($p, $pattern, $rec, $maxD, $d + 1, $limit, $hits);
    }
}

function tool_fs_search(array $a): string
{
    $root = real_check(resolve_path($a['root'] ?? ''));
    if (!is_dir($root)) throw new Exception('Raiz de busca não é um diretório.');
    $pattern = trim($a['pattern'] ?? '*');
    if ($pattern === '') $pattern = '*';
    $recursive = $a['recursive'] ?? true;
    $depth = min(intval($a['depth'] ?? 5) ?: 5, 10);
    $limit = min(intval($a['limit'] ?? 200) ?: 200, 1000);
    $hits = [];
    search_walk($root, $pattern, (bool)$recursive, $depth, 0, $limit, $hits);
    usort($hits, fn($a, $b) => strcmp($a['path'], $b['path']));
    return json_encode(['pattern' => $pattern, 'count' => count($hits), 'truncated' => count($hits) >= $limit, 'matches' => $hits], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_read_json(array $a): string
{
    $path = real_check(resolve_path($a['path'] ?? ''));
    if (!is_file($path)) throw new Exception('Não é um arquivo.');
    $raw = file_get_contents($path);
    if ($raw === false) throw new Exception('Falha ao ler arquivo.');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception('JSON inválido: ' . json_last_error_msg());
    return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tool_fs_write_json(array $a): string
{
    $path = resolve_path($a['path'] ?? '');
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (!empty($a['pretty']) ? JSON_PRETTY_PRINT : 0);
    $json = json_encode($a['data'] ?? null, $flags);
    if ($json === false) throw new Exception('Falha ao serializar JSON.');
    $dir = dirname($path);
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $bytes = file_put_contents($path, $json, LOCK_EX);
    if ($bytes === false) throw new Exception('Falha ao escrever arquivo.');
    return json_encode(['written' => $bytes, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function call_tool(string $name, array $args): string
{
    switch ($name) {
        case 'fs_list':     return tool_fs_list($args);
        case 'fs_read':     return tool_fs_read($args);
        case 'fs_write':    return tool_fs_write($args);
        case 'fs_mkdir':    return tool_fs_mkdir($args);
        case 'fs_delete':   return tool_fs_delete($args);
        case 'fs_rename':   return tool_fs_rename($args);
        case 'fs_copy':     return tool_fs_copy($args);
        case 'fs_exists':   return tool_fs_exists($args);
        case 'fs_stat':     return tool_fs_stat($args);
        case 'fs_tree':     return tool_fs_tree($args);
        case 'fs_search':   return tool_fs_search($args);
        case 'fs_read_json': return tool_fs_read_json($args);
        case 'fs_write_json': return tool_fs_write_json($args);
        default: throw new Exception("Ferramenta desconhecida: $name");
    }
}

function tool_definitions(): array
{
    return [
        ['name' => 'fs_list',
            'description' => 'Lista o conteúdo de um diretório (arquivos e subdiretórios com tamanho e data de modificação).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz (ou "/" para a raiz).']],
            ],
        ],
        ['name' => 'fs_read',
            'description' => 'Lê o conteúdo de um arquivo de texto. Retorna os primeiros max_chars caracteres se o arquivo for maior.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'max_chars' => ['type' => 'number', 'description' => 'Máx. caracteres a retornar (padrão: 20000, máx: 100000).'],
                ],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_write',
            'description' => 'Escreve conteúdo em um arquivo. Cria diretórios pais automaticamente. Use append=true para acrescentar.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'content' => ['type' => 'string', 'description' => 'Conteúdo a escrever.'],
                    'append' => ['type' => 'boolean', 'description' => 'Se true, acrescenta ao final em vez de sobrescrever.'],
                ],
                'required' => ['path', 'content'],
            ],
        ],
        [
            'name' => 'fs_mkdir',
            'description' => 'Cria um diretório (recursivo por padrão).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'recursive' => ['type' => 'boolean', 'description' => 'Criar diretórios pais (padrão: true).'],
                ],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_delete',
            'description' => 'Remove um arquivo ou diretório. Diretórios são removidos recursivamente por padrão.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'recursive' => ['type' => 'boolean', 'description' => 'Remover diretório recursivamente (padrão: true).'],
                ],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_rename',
            'description' => 'Renomeia ou move um arquivo/diretório (source -> target).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'source' => ['type' => 'string', 'description' => 'Caminho de origem.'],
                    'target' => ['type' => 'string', 'description' => 'Caminho de destino.'],
                ],
                'required' => ['source', 'target'],
            ],
        ],
        [
            'name' => 'fs_copy',
            'description' => 'Copia um arquivo ou diretório (recursivo para diretórios).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'source' => ['type' => 'string', 'description' => 'Caminho de origem.'],
                    'target' => ['type' => 'string', 'description' => 'Caminho de destino.'],
                ],
                'required' => ['source', 'target'],
            ],
        ],
        [
            'name' => 'fs_exists',
            'description' => 'Verifica se um caminho existe e retorna o tipo (file/dir).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.']],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_stat',
            'description' => 'Retorna informações de um arquivo/diretório: tamanho, mtime, permissões, legível/gravável.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.']],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_tree',
            'description' => 'Lista recursiva de um diretório em formato de árvore (limitada em profundidade e quantidade).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'depth' => ['type' => 'number', 'description' => 'Profundidade máxima (padrão: 3, máx: 5).'],
                ],
            ],
        ],
        [
            'name' => 'fs_search',
            'description' => 'Busca arquivos/diretórios por padrão de nome (glob, ex.: *.php, index.*). Busca recursiva por padrão.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'root' => ['type' => 'string', 'description' => 'Diretório onde buscar (padrão: raiz).'],
                    'pattern' => ['type' => 'string', 'description' => 'Padrão de nome (glob).'],
                    'recursive' => ['type' => 'boolean', 'description' => 'Buscar em subdiretórios (padrão: true).'],
                    'depth' => ['type' => 'number', 'description' => 'Profundidade máxima da busca.'],
                    'limit' => ['type' => 'number', 'description' => 'Máx. de resultados (padrão: 200).'],
                ],
                'required' => ['pattern'],
            ],
        ],
        [
            'name' => 'fs_read_json',
            'description' => 'Lê um arquivo JSON e retorna o conteúdo parseado.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.']],
                'required' => ['path'],
            ],
        ],
        [
            'name' => 'fs_write_json',
            'description' => 'Serializa dados como JSON e escreve em um arquivo.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Caminho relativo à raiz.'],
                    'data' => ['description' => 'Dados a serializar (objeto/array/string/número/bool).'],
                    'pretty' => ['type' => 'boolean', 'description' => 'Formatar com indentação (padrão: true).'],
                ],
                'required' => ['path', 'data'],
            ],
        ],
    ];
}

$bodyRaw = file_get_contents('php://input');
$body = json_decode($bodyRaw ?: '', true);
if (!is_array($body)) $body = [];

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (isset($body['method'])) {
    $id = $body['id'] ?? null;
    try {
        switch ($body['method']) {
            case 'tools/list':
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['tools' => tool_definitions()]]);
            case 'tools/call':
                $params = is_array($body['params'] ?? null) ? $body['params'] : [];
                $out = call_tool((string)($params['name'] ?? ''), is_array($params['arguments'] ?? null) ? $params['arguments'] : []);
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['content' => [['type' => 'text', 'text' => $out]]]]);
            default:
                respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32601, 'message' => 'Método não encontrado: ' . $body['method']]], 400);
        }
    } catch (Throwable $e) {
        respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32000, 'message' => $e->getMessage()]], 400);
    }
}

if ($method === 'GET' && ($uriPath === '/tools' || ends_with($uriPath, '/tools'))) {
    respond(['tools' => tool_definitions()]);
}

if ($method === 'POST' && ends_with($uriPath, '/tools/list')) {
    respond(['tools' => tool_definitions()]);
}

if ($method === 'POST' && ends_with($uriPath, '/tools/call')) {
    $name = (string)($body['name'] ?? '');
    $args = is_array($body['arguments'] ?? null) ? $body['arguments'] : (is_array($body['params'] ?? null) ? $body['params'] : []);
    try {
        $out = call_tool($name, $args);
        respond(['result' => $out, 'content' => [['type' => 'text', 'text' => $out]]]);
    } catch (Throwable $e) {
        respond(['error' => $e->getMessage()], 400);
    }
}

respond([
    'name' => 'mcp-fs-php',
    'version' => '1.0.0',
    'root' => ROOT,
    'toolNames' => array_column(tool_definitions(), 'name'),
]);
