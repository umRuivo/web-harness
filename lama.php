<?php
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

$envRoot = getenv('MCP_FS_ROOT');
define('ROOT', $envRoot !== false && $envRoot !== '' ? rtrim($envRoot, '/') : __DIR__ . '/workspace');
define('API_TOKEN', getenv('LAMA_API_TOKEN') !== false && getenv('LAMA_API_TOKEN') !== '' ? (string)getenv('LAMA_API_TOKEN') : '');
const DEFAULT_MAX_CHARS = 20000;
const MAX_CHARS_LIMIT = 100000;
const MAX_TREE_DEPTH = 5;
const MAX_TREE_ENTRIES = 500;

if (!is_dir(ROOT)) @mkdir(ROOT, 0777, true);

// ===== Helpers (mcp.php) =====
function respond(array $data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $msg, int $code = 500): void { respond(['error' => $msg], $code); }
function starts_with(string $hay, string $needle): bool { return $needle !== '' && strpos($hay, $needle) === 0; }
function ends_with(string $hay, string $needle): bool { return $needle !== '' && substr($hay, -strlen($needle)) === $needle; }
function api_token_ok(): bool { if (API_TOKEN === '') return false; $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''; if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return hash_equals(API_TOKEN, trim($m[1])); return hash_equals(API_TOKEN, $_SERVER['HTTP_X_API_KEY'] ?? ''); }
function root_normalized(): string { return rtrim(str_replace('\\', '/', ROOT), '/'); }
function norm_path(string $p): string|false { $parts = []; foreach (explode('/', $p) as $seg) { if ($seg === '' || $seg === '.') continue; if ($seg === '..') { if (!$parts) return false; array_pop($parts); } else $parts[] = $seg; } return '/' . implode('/', $parts); }
function resolve_path(string $rel): string { if ($rel === '' || $rel === '.' || $rel === '/') return root_normalized(); if (strpos($rel, "\0") !== false) throw new Exception('Caminho inválido.'); $rel = str_replace('\\', '/', $rel); $base = root_normalized(); $full = $base . '/' . ltrim($rel, '/'); $n = norm_path($full); if ($n === false || !starts_with($n, $base . '/')) throw new Exception('Acesso fora do diretório raiz.'); return $n; }
function real_check(string $full): string { $rp = realpath($full); if ($rp !== false) { $rp = str_replace('\\', '/', $rp); if (!starts_with($rp, root_normalized())) throw new Exception('Acesso bloqueado (fora da raiz).'); return $rp; } return $full; }
function rel_path(string $full): string { $base = root_normalized(); if ($full === $base) return '/'; return substr($full, strlen($base)); }
function is_root(string $full): bool { return $full === root_normalized(); }
function is_utf8(string $s): bool { if (function_exists('mb_check_encoding')) return mb_check_encoding($s, 'UTF-8'); return preg_match('//u', $s) === 1; }
function rrmdir(string $dir): void { $items = @scandir($dir); if ($items === false) return; foreach ($items as $it) { if ($it === '.' || $it === '..') continue; $p = $dir . '/' . $it; if (is_dir($p) && !is_link($p)) rrmdir($p); else @unlink($p); } @rmdir($dir); }
function rcopy(string $src, string $dst): bool { @mkdir($dst, 0777, true); $items = @scandir($src); if ($items === false) return false; foreach ($items as $it) { if ($it === '.' || $it === '..') continue; $s = $src . '/' . $it; $d = $dst . '/' . $it; if (is_dir($s) && !is_link($s)) { if (!rcopy($s, $d)) return false; } elseif (!copy($s, $d)) return false; } return true; }
function tree_walk(string $dir, array &$node, int $maxDepth, int $curDepth, int $limit): void { if ($curDepth >= $maxDepth || count($node['children'] ?? []) >= $limit) return; $items = @scandir($dir); if ($items === false) return; foreach ($items as $it) { if ($it === '.' || $it === '..') continue; if (count($node['children'] ?? []) >= $limit) { $node['truncated'] = true; break; } $p = $dir . '/' . $it; $isDir = is_dir($p) && !is_link($p); $child = ['name' => $it, 'path' => rel_path($p), 'type' => $isDir ? 'dir' : 'file']; if (!$isDir) $child['size'] = is_file($p) ? filesize($p) : null; else $child['children'] = []; $node['children'][] = $child; if ($isDir) tree_walk($p, $node['children'][count($node['children']) - 1], $maxDepth, $curDepth + 1, $limit); } }
function search_walk(string $dir, string $pattern, bool $rec, int $maxD, int $d, int $limit, array &$hits): void { if (count($hits) >= $limit) return; $items = @scandir($dir); if ($items === false) return; foreach ($items as $it) { if ($it === '.' || $it === '..') continue; if (count($hits) >= $limit) return; $p = $dir . '/' . $it; $isDir = is_dir($p) && !is_link($p); if (fnmatch($pattern, $it)) $hits[] = ['name' => $it, 'path' => rel_path($p), 'type' => $isDir ? 'dir' : 'file']; if ($rec && $isDir && $d < $maxD) search_walk($p, $pattern, $rec, $maxD, $d + 1, $limit, $hits); } }

// ===== Session (secure cookies) =====
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'cookie_samesite' => 'Lax',
]);

// ===== Tool functions =====
function tool_fs_list(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? ''));
  if (!is_dir($path)) throw new Exception('Não é um diretório.');
  $items = scandir($path); if ($items === false) throw new Exception('Não foi possível ler o diretório.');
  $entries = [];
  foreach ($items as $item) { if ($item === '.' || $item === '..') continue; $fp = $path . '/' . $item; $isDir = is_dir($fp); $entries[] = ['name' => $item, 'path' => rel_path($fp), 'type' => $isDir ? 'dir' : 'file', 'size' => ($isDir || !is_file($fp)) ? null : filesize($fp), 'mtime' => file_exists($fp) ? date('c', filemtime($fp)) : null]; }
  usort($entries, fn($a, $b) => strcmp($a['name'], $b['name']));
  return json_encode(['path' => rel_path($path), 'count' => count($entries), 'entries' => $entries], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_read(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? ''));
  if (!is_file($path)) throw new Exception('Não é um arquivo.');
  if (!is_readable($path)) throw new Exception('Arquivo sem permissão de leitura.');
  $max = intval($a['max_chars'] ?? DEFAULT_MAX_CHARS) ?: DEFAULT_MAX_CHARS; $max = min($max, MAX_CHARS_LIMIT);
  $content = file_get_contents($path); if ($content === false) throw new Exception('Falha ao ler arquivo.');
  $truncated = strlen($content) > $max; $part = $truncated ? substr($content, 0, $max) : $content;
  $out = ['path' => rel_path($path), 'size' => strlen($content), 'truncated' => $truncated];
  if (is_utf8($part)) { $out['encoding'] = 'text'; $out['content'] = $part; }
  else { $out['encoding'] = 'base64'; $out['note'] = 'Conteúdo não-UTF8 retornado em base64.'; $out['content'] = base64_encode($part); }
  return json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_write(array $a): string {
  $path = resolve_path($a['path'] ?? ''); $content = (string)($a['content'] ?? ''); $append = !empty($a['append']);
  $dir = dirname($path); if (!is_dir($dir)) @mkdir($dir, 0777, true);
  $bytes = file_put_contents($path, $content, LOCK_EX | ($append ? FILE_APPEND : 0));
  if ($bytes === false) throw new Exception('Falha ao escrever arquivo.');
  return json_encode(['written' => $bytes, 'path' => rel_path($path), 'append' => $append], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_mkdir(array $a): string {
  $path = resolve_path($a['path'] ?? ''); if (file_exists($path)) throw new Exception('Já existe.');
  $recursive = $a['recursive'] ?? true; if (!mkdir($path, 0777, (bool)$recursive)) throw new Exception('Falha ao criar diretório.');
  return json_encode(['created' => true, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_delete(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? '')); if (!file_exists($path)) throw new Exception('Não existe.'); if (is_root($path)) throw new Exception('Não é possível remover a raiz.');
  $recursive = $a['recursive'] ?? true;
  if (is_dir($path) && !is_link($path)) { if ($recursive) rrmdir($path); elseif (!rmdir($path)) throw new Exception('Falha ao remover diretório (não vazio?).'); }
  else { if (!unlink($path)) throw new Exception('Falha ao remover arquivo.'); }
  return json_encode(['deleted' => true, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_rename(array $a): string {
  $src = real_check(resolve_path($a['source'] ?? '')); $dst = resolve_path($a['target'] ?? '');
  if (!file_exists($src)) throw new Exception('Origem não existe.'); $dir = dirname($dst); if (!is_dir($dir)) throw new Exception('Diretório alvo não existe.');
  if (!rename($src, $dst)) throw new Exception('Falha ao renomear/mover.');
  return json_encode(['renamed' => true, 'from' => rel_path($src), 'to' => rel_path($dst)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_copy(array $a): string {
  $src = real_check(resolve_path($a['source'] ?? '')); $dst = resolve_path($a['target'] ?? '');
  if (!file_exists($src)) throw new Exception('Origem não existe.'); $dir = dirname($dst); if (!is_dir($dir)) @mkdir($dir, 0777, true);
  if (is_dir($src) && !is_link($src)) { if (!rcopy($src, $dst)) throw new Exception('Falha ao copiar diretório.'); }
  else { if (!copy($src, $dst)) throw new Exception('Falha ao copiar arquivo.'); }
  return json_encode(['copied' => true, 'from' => rel_path($src), 'to' => rel_path($dst)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_exists(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? '')); $exists = file_exists($path); $type = $exists ? (is_dir($path) ? 'dir' : 'file') : null;
  return json_encode(['exists' => $exists, 'type' => $type, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_stat(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? '')); if (!file_exists($path)) throw new Exception('Não existe.');
  return json_encode(['path' => rel_path($path), 'type' => is_dir($path) ? 'dir' : 'file', 'size' => is_file($path) ? filesize($path) : null, 'mtime' => date('c', filemtime($path)), 'readable' => is_readable($path), 'writable' => is_writable($path), 'permissions' => substr(sprintf('%o', fileperms($path)), -4)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_tree(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? '')); if (!is_dir($path)) throw new Exception('Não é um diretório.');
  $depth = intval($a['depth'] ?? 3) ?: 3; $depth = min($depth, MAX_TREE_DEPTH);
  $node = ['name' => basename($path) ?: '/', 'path' => rel_path($path), 'type' => 'dir', 'children' => []];
  tree_walk($path, $node, $depth, 0, MAX_TREE_ENTRIES);
  return json_encode($node, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_search(array $a): string {
  $root = real_check(resolve_path($a['root'] ?? '')); if (!is_dir($root)) throw new Exception('Raiz de busca não é um diretório.');
  $pattern = trim($a['pattern'] ?? '*'); if ($pattern === '') $pattern = '*'; $recursive = $a['recursive'] ?? true;
  $depth = min(intval($a['depth'] ?? 5) ?: 5, 10); $limit = min(intval($a['limit'] ?? 200) ?: 200, 1000);
  $hits = []; search_walk($root, $pattern, (bool)$recursive, $depth, 0, $limit, $hits);
  usort($hits, fn($a, $b) => strcmp($a['path'], $b['path']));
  return json_encode(['pattern' => $pattern, 'count' => count($hits), 'truncated' => count($hits) >= $limit, 'matches' => $hits], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_read_json(array $a): string {
  $path = real_check(resolve_path($a['path'] ?? '')); if (!is_file($path)) throw new Exception('Não é um arquivo.');
  $raw = file_get_contents($path); if ($raw === false) throw new Exception('Falha ao ler arquivo.');
  $data = json_decode($raw, true); if (json_last_error() !== JSON_ERROR_NONE) throw new Exception('JSON inválido: ' . json_last_error_msg());
  return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function tool_fs_write_json(array $a): string {
  $path = resolve_path($a['path'] ?? ''); $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (!empty($a['pretty']) ? JSON_PRETTY_PRINT : 0);
  $json = json_encode($a['data'] ?? null, $flags); if ($json === false) throw new Exception('Falha ao serializar JSON.');
  $dir = dirname($path); if (!is_dir($dir)) @mkdir($dir, 0777, true);
  $bytes = file_put_contents($path, $json, LOCK_EX); if ($bytes === false) throw new Exception('Falha ao escrever arquivo.');
  return json_encode(['written' => $bytes, 'path' => rel_path($path)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function call_tool(string $name, array $args): string {
  switch ($name) {
    case 'fs_list': return tool_fs_list($args); case 'fs_read': return tool_fs_read($args);
    case 'fs_write': return tool_fs_write($args); case 'fs_mkdir': return tool_fs_mkdir($args);
    case 'fs_delete': return tool_fs_delete($args); case 'fs_rename': return tool_fs_rename($args);
    case 'fs_copy': return tool_fs_copy($args); case 'fs_exists': return tool_fs_exists($args);
    case 'fs_stat': return tool_fs_stat($args); case 'fs_tree': return tool_fs_tree($args);
    case 'fs_search': return tool_fs_search($args); case 'fs_read_json': return tool_fs_read_json($args);
    case 'fs_write_json': return tool_fs_write_json($args);
    default:
      global $microMcpModules;
      foreach ($microMcpModules as $id => $mod) {
        if (starts_with($name, $id . '_')) {
          $tool = substr($name, strlen($id) + 1);
          if (is_callable($mod['call'] ?? null)) return (string)$mod['call']($tool, $args);
        }
      }
      throw new Exception("Ferramenta desconhecida: $name");
  }
}
function tool_definitions(): array {
  $tools = [
    ['name' => 'fs_list','description' => 'Lista o conteúdo de um diretório (arquivos e subdiretórios com tamanho e data de modificação).','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz (ou "/" para a raiz).']]]],
    ['name' => 'fs_read','description' => 'Lê o conteúdo de um arquivo de texto.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'max_chars' => ['type' => 'number','description' => 'Máx. caracteres a retornar (padrão: 20000, máx: 100000).']],'required' => ['path']]],
    ['name' => 'fs_write','description' => 'Escreve conteúdo em um arquivo. Cria diretórios pais automaticamente. Use append=true para acrescentar.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'content' => ['type' => 'string','description' => 'Conteúdo a escrever.'],'append' => ['type' => 'boolean','description' => 'Se true, acrescenta ao final em vez de sobrescrever.']],'required' => ['path','content']]],
    ['name' => 'fs_mkdir','description' => 'Cria um diretório (recursivo por padrão).','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'recursive' => ['type' => 'boolean','description' => 'Criar diretórios pais (padrão: true).']],'required' => ['path']]],
    ['name' => 'fs_delete','description' => 'Remove um arquivo ou diretório.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'recursive' => ['type' => 'boolean','description' => 'Remover diretório recursivamente (padrão: true).']],'required' => ['path']]],
    ['name' => 'fs_rename','description' => 'Renomeia ou move um arquivo/diretório (source -> target).','inputSchema' => ['type' => 'object','properties' => ['source' => ['type' => 'string','description' => 'Caminho de origem.'],'target' => ['type' => 'string','description' => 'Caminho de destino.']],'required' => ['source','target']]],
    ['name' => 'fs_copy','description' => 'Copia um arquivo ou diretório.','inputSchema' => ['type' => 'object','properties' => ['source' => ['type' => 'string','description' => 'Caminho de origem.'],'target' => ['type' => 'string','description' => 'Caminho de destino.']],'required' => ['source','target']]],
    ['name' => 'fs_exists','description' => 'Verifica se um caminho existe e retorna o tipo (file/dir).','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.']],'required' => ['path']]],
    ['name' => 'fs_stat','description' => 'Retorna informações de um arquivo/diretório.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.']],'required' => ['path']]],
    ['name' => 'fs_tree','description' => 'Lista recursiva de um diretório em formato de árvore.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'depth' => ['type' => 'number','description' => 'Profundidade máxima (padrão: 3, máx: 5).']]]],
    ['name' => 'fs_search','description' => 'Busca arquivos/diretórios por padrão de nome (glob).','inputSchema' => ['type' => 'object','properties' => ['root' => ['type' => 'string','description' => 'Diretório onde buscar (padrão: raiz).'],'pattern' => ['type' => 'string','description' => 'Padrão de nome (glob).'],'recursive' => ['type' => 'boolean','description' => 'Buscar em subdiretórios (padrão: true).'],'depth' => ['type' => 'number','description' => 'Profundidade máxima da busca.'],'limit' => ['type' => 'number','description' => 'Máx. de resultados (padrão: 200).']],'required' => ['pattern']]],
    ['name' => 'fs_read_json','description' => 'Lê um arquivo JSON e retorna o conteúdo parseado.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.']],'required' => ['path']]],
    ['name' => 'fs_write_json','description' => 'Serializa dados como JSON e escreve em um arquivo.','inputSchema' => ['type' => 'object','properties' => ['path' => ['type' => 'string','description' => 'Caminho relativo à raiz.'],'data' => ['description' => 'Dados a serializar (objeto/array/string/número/bool).'],'pretty' => ['type' => 'boolean','description' => 'Formatar com indentação (padrão: true).']],'required' => ['path','data']]],
  ];
  global $microMcpModules;
  foreach ($microMcpModules as $id => $mod) {
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

// ===== Carrega micro-MCPs (include automático de micro-mcp/*.php) =====
function micro_disabled_file(): string { return __DIR__ . '/micro-mcp/.disabled.json'; }
function micro_disabled_list(): array {
  $raw = @file_get_contents(micro_disabled_file());
  $data = $raw !== false ? json_decode($raw, true) : null;
  return is_array($data) ? array_values(array_filter($data, 'is_string')) : [];
}
function micro_disabled_save(array $list): void {
  @file_put_contents(micro_disabled_file(), json_encode(array_values($list)), LOCK_EX);
}
$microMcpModules = [];
$microMcpDir = __DIR__ . '/micro-mcp';
$microMcpDisabled = micro_disabled_list();
if (is_dir($microMcpDir)) {
  if (!defined('MICRO_MCP_ROOT')) {
    define('MICRO_MCP_ROOT', rtrim(str_replace('\\', '/', getenv('MICRO_MCP_ROOT') !== false && getenv('MICRO_MCP_ROOT') !== '' ? (string)getenv('MICRO_MCP_ROOT') : __DIR__ . '/workspace'), '/'));
  }
  foreach (glob($microMcpDir . '/*.php') as $file) {
    $base = basename($file);
    if ($base === 'index.php' || $base === '_boot.php') continue;
    if (in_array($base, $microMcpDisabled, true)) continue;
    $mod = require $file;
    if (!is_array($mod)) continue;
    $id = (string)($mod['id'] ?? str_replace('-', '_', pathinfo($base, PATHINFO_FILENAME)));
    if (!preg_match('/^[a-z][a-z0-9]*$/', $id)) continue;
    $mod['__file'] = $base;
    $microMcpModules[$id] = $mod;
  }
}

function micro_file_path(string $name): string {
  if (!preg_match('/^mcp-[a-z0-9_-]+\.php$/i', $name)) throw new Exception('Nome inválido. Use o formato mcp-nome.php.');
  return __DIR__ . '/micro-mcp/' . $name;
}

function micro_list_files(): array {
  global $microMcpModules;
  $disabled = micro_disabled_list();
  $out = [];
  foreach (glob(__DIR__ . '/micro-mcp/*.php') as $file) {
    $base = basename($file);
    if ($base === 'index.php' || $base === '_boot.php') continue;
    $item = ['file' => $base, 'size' => filesize($file), 'mtime' => date('c', filemtime($file)), 'id' => null, 'name' => null, 'description' => null, 'tools' => 0, 'enabled' => !in_array($base, $disabled, true)];
    foreach ($microMcpModules as $id => $mod) {
      if (($mod['__file'] ?? '') === $base) {
        $item['id'] = $id;
        $item['name'] = $mod['name'] ?? null;
        $item['description'] = $mod['description'] ?? null;
        if (is_callable($mod['tools'] ?? null)) $item['tools'] = count((array)$mod['tools']());
        break;
      }
    }
    $out[] = $item;
  }
  return $out;
}

// ===== Router =====
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 300;
define('AUTH_USER', getenv('LAMA_USER') !== false && getenv('LAMA_USER') !== '' ? (string)getenv('LAMA_USER') : 'web');
define('AUTH_PASS', getenv('LAMA_PASS') !== false && getenv('LAMA_PASS') !== '' ? (string)getenv('LAMA_PASS') : 'harness');
function is_auth(): bool { return !empty($_SESSION['auth']); }

// Serve arquivos estáticos (sempre, sem auth)
if ($reqMethod === 'GET') {
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $rel = $uriPath;
    if ($scriptDir !== '' && strpos($uriPath, $scriptDir) === 0) $rel = substr($uriPath, strlen($scriptDir));
    $map = __DIR__ . $rel;
    $rp = realpath($map);
    $baseDir = str_replace('\\', '/', __DIR__);
    if ($rp === false || !starts_with(str_replace('\\', '/', $rp), $baseDir . '/')) {
        // arquivo inexistente ou fora do diretório do script: não serve
    } elseif ($uriPath !== '/' && $rel !== '' && is_file($rp) && !ends_with($rp, '.php')) {
        $map = $rp;
        $ext = strtolower(pathinfo($map, PATHINFO_EXTENSION));
        $types = ['css' => 'text/css', 'js' => 'application/javascript', 'json' => 'application/json', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'webp' => 'image/webp', 'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2', 'ttf' => 'font/ttf', 'txt' => 'text/plain', 'md' => 'text/markdown'];
        if (isset($types[$ext])) header('Content-Type: ' . $types[$ext]);
        else header('Content-Type: application/octet-stream');
        readfile($map);
        exit;
    }
}

// Throttle de login por IP (estado em arquivo no temp)
function login_state_file(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return sys_get_temp_dir() . '/.lama_login_' . hash('sha256', $ip);
}
function login_state_get(): array {
    $raw = @file_get_contents(login_state_file());
    $data = is_string($raw) ? @json_decode($raw, true) : null;
    return is_array($data) ? $data : ['count' => 0, 'lock_until' => 0];
}
function login_state_set(array $data): void {
    @file_put_contents(login_state_file(), json_encode($data), LOCK_EX);
}

// Login POST via formulário
if ($reqMethod === 'POST' && ($_GET['action'] ?? '') === 'login') {
    $now = time();
    $state = login_state_get();
    if (($state['lock_until'] ?? 0) > $now) {
        $erro = 'Muitas tentativas. Tente novamente em ' . (($state['lock_until'] ?? 0) - $now) . 's.';
        require __DIR__ . '/login.php';
        exit;
    }
    $user = $_POST['usuario'] ?? '';
    $pass = $_POST['senha'] ?? '';
    if (hash_equals(AUTH_USER, $user) && hash_equals(AUTH_PASS, $pass)) {
        login_state_set(['count' => 0, 'lock_until' => 0]);
        $_SESSION['auth'] = true;
        session_regenerate_id(true);
        header('Location: ' . $_SERVER['SCRIPT_NAME']);
        exit;
    }
    $state['count'] = (int)($state['count'] ?? 0) + 1;
    if ($state['count'] >= MAX_LOGIN_ATTEMPTS) {
        $state['lock_until'] = $now + LOGIN_LOCKOUT_SECONDS;
        $state['count'] = 0;
        login_state_set($state);
        $erro = 'Muitas tentativas incorretas. Bloqueado por ' . LOGIN_LOCKOUT_SECONDS . 's.';
    } else {
        login_state_set($state);
        $erro = 'A senha está incorreta. Tente novamente.';
    }
    require __DIR__ . '/login.php';
    exit;
}

if ($reqMethod === 'POST' && ($_GET['action'] ?? '') === 'logout') {
    $_SESSION = [];
    if (session_id()) @session_destroy();
    respond(['ok' => true]);
}

// Se não autenticado (nem sessão, nem token de API), mostra login no navegador ou 401 na API
if (!is_auth() && !api_token_ok()) {
    $hasToken = ($_SERVER['HTTP_AUTHORIZATION'] ?? '') !== '' || ($_SERVER['HTTP_X_API_KEY'] ?? '') !== '';
    if ($reqMethod === 'GET' && !$hasToken) {
        $erro = '';
        require __DIR__ . '/login.php';
        exit;
    }
    fail('Não autorizado', 401);
}

// ===== Relay de LLM (contorna CORS / preflight quebrado de alguns providers) =====
function llm_host_is_private(string $host): bool {
    $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : @gethostbyname($host);
    if ($ip === false || $ip === $host && strpos($host, '.') === false) return true;
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return true;
    return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}
if ($reqMethod === 'POST' && ($_GET['action'] ?? '') === 'llm_relay') {
    if (!function_exists('curl_init')) fail('curl indisponível no servidor', 500);
    $req = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($req) || !isset($req['upstream']) || !is_string($req['upstream'])) fail('Requisição inválida', 400);
    $upstream = $req['upstream'];
    $p = parse_url($upstream);
    $scheme = strtolower($p['scheme'] ?? '');
    if ($scheme !== 'https' && $scheme !== 'http') fail('Apenas HTTP/HTTPS permitido no relay', 400);
    if (llm_host_is_private($p['host'] ?? '')) fail('Host de destino não permitido', 400);
    $method = strtoupper((string)($req['method'] ?? 'POST'));
    $apiKey = (string)($req['apiKey'] ?? '');
    $apiKeyType = (string)($req['apiKeyType'] ?? 'bearer');
    $payload = $req['payload'] ?? [];
    $postBody = is_array($payload) || is_object($payload) ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$payload;
    if ($postBody === false || $postBody === '') fail('Falha ao montar o corpo da requisição (JSON inválido)', 400);
    $hdrs = ['Content-Type: application/json', 'Content-Length: ' . strlen($postBody)];
    if ($apiKey !== '') {
        if ($apiKeyType === 'x-api-key') $hdrs[] = 'x-api-key: ' . $apiKey;
        elseif ($apiKeyType === 'api-key') $hdrs[] = 'api-key: ' . $apiKey;
        else $hdrs[] = 'Authorization: Bearer ' . $apiKey;
    }
    $ch = curl_init($upstream);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => $method === 'GET' ? null : $postBody,
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 600,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HEADER => false,
        CURLOPT_RETURNTRANSFER => false,
    ]);
    $ctDone = false;
    $sse = false;
    $buf = '';
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $h) use (&$ctDone, &$sse) {
        $trim = rtrim($h, "\r\n");
        if (preg_match('/^content-type:/i', $trim)) {
            if (preg_match('/event-stream/i', $trim)) $sse = true;
            header($trim);
            $ctDone = true;
        }
        return strlen($h);
    });
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) use (&$buf, &$sse) {
        if ($sse) { echo $data; flush(); return strlen($data); }
        $buf .= $data;
        return strlen($data);
    });
    if (!@curl_exec($ch)) {
        $err = curl_error($ch);
        if (!$ctDone) header('Content-Type: application/json; charset=utf-8');
        http_response_code(502);
        echo json_encode(['error' => 'Falha no relay: ' . $err]);
    } else {
        if (!$sse) {
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $dec = @json_decode($buf, true);
            if (is_array($dec) && isset($dec['error'])) {
                http_response_code($status >= 400 ? $status : 400);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'error' => $dec['error'],
                    'sent_body' => $postBody,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                curl_close($ch);
                exit;
            }
            if (!$ctDone) header('Content-Type: application/json; charset=utf-8');
            http_response_code($status);
            echo $buf;
        }
    }
    curl_close($ch);
    exit;
}

// ===== Autenticado — dispatchers normais =====
header('Content-Type: application/json; charset=utf-8');
$corsOrigin = getenv('LAMA_CORS_ORIGIN') !== false && getenv('LAMA_CORS_ORIGIN') !== '' ? (string)getenv('LAMA_CORS_ORIGIN') : '*';
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');
header('Vary: Origin');

if ($reqMethod === 'OPTIONS') { http_response_code(204); exit; }

$bodyRaw = file_get_contents('php://input');
$body = json_decode($bodyRaw ?: '', true);
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

// ===== Gestão de micro-MCPs (POST) =====
if ($reqMethod === 'POST') {
    $microAction = $_GET['action'] ?? '';
    if ($microAction === 'micro_write') {
        try {
            $file = micro_file_path((string)($body['file'] ?? ''));
            $content = (string)($body['content'] ?? '');
            if ($content === '') fail('Conteúdo vazio.', 400);
            if (!is_dir(__DIR__ . '/micro-mcp')) @mkdir(__DIR__ . '/micro-mcp', 0777, true);
            if (function_exists('shell_exec') && strpos(ini_get('disable_functions'), 'shell_exec') === false) {
                $tmp = tempnam(sys_get_temp_dir(), 'mcpchk');
                file_put_contents($tmp, $content);
                $lint = shell_exec(PHP_BINARY . ' -l ' . escapeshellarg($tmp) . ' 2>&1');
                @unlink($tmp);
                if ($lint !== null && stripos($lint, 'No syntax errors') === false) {
                    fail('Erro de sintaxe PHP: ' . trim($lint), 400);
                }
            }
            $written = file_put_contents($file, $content, LOCK_EX);
            if ($written === false) fail('Falha ao escrever arquivo.', 500);
            respond(['written' => true, 'file' => basename($file), 'bytes' => $written]);
        } catch (Throwable $e) {
            fail($e->getMessage(), 400);
        }
    }
    if ($microAction === 'micro_delete') {
        try {
            $file = micro_file_path((string)($body['file'] ?? ''));
            if (!file_exists($file)) fail('Arquivo não existe.', 404);
            if (!unlink($file)) fail('Falha ao excluir arquivo.', 500);
            respond(['deleted' => true, 'file' => basename($file)]);
        } catch (Throwable $e) {
            fail($e->getMessage(), 400);
        }
    }
    if ($microAction === 'micro_toggle') {
        try {
            $name = (string)($body['file'] ?? '');
            micro_file_path($name);
            $list = micro_disabled_list();
            $idx = array_search($name, $list, true);
            if ($idx !== false) {
                unset($list[$idx]);
                $enabled = true;
            } else {
                $list[] = $name;
                $enabled = false;
            }
            micro_disabled_save(array_values($list));
            respond(['file' => $name, 'enabled' => $enabled]);
        } catch (Throwable $e) {
            fail($e->getMessage(), 400);
        }
    }
}

// JSON-RPC POST (fetchMCPTools endpoint 3, executeMCPToolByIndex endpoint 2)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && is_array($body) && isset($body['method'])) {
    $id = $body['id'] ?? null;
    try {
        switch ($body['method']) {
            case 'tools/list':
                respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['tools' => tool_definitions()]]);
            case 'tools/call':
                $params = is_array($body['params'] ?? null) ? $body['params'] : [];
                $out = call_tool((string)($params['name'] ?? ''), is_array($params['arguments'] ?? null) ? $params['arguments'] : []);
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

// POST /tools/list and POST /tools/call by path
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (ends_with($uriPath, '/tools/list')) {
        respond(['tools' => tool_definitions()]);
    }
    if (ends_with($uriPath, '/tools/call')) {
        $name = (string)($body['name'] ?? '');
        $args = is_array($body['arguments'] ?? null) ? $body['arguments'] : (is_array($body['params'] ?? null) ? $body['params'] : []);
        try {
            $out = call_tool($name, $args);
            respond(['result' => $out, 'content' => [['type' => 'text', 'text' => $out]]]);
        } catch (Throwable $e) {
            respond(['error' => $e->getMessage()], 400);
        }
    }
}

// GET /tools by path
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ends_with($uriPath, '/tools')) {
    respond(['tools' => tool_definitions()]);
}

// GET ?action=...
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'tools') {
        respond(['tools' => tool_definitions()]);
    }
    if ($action === 'micro_list') {
      respond(['files' => micro_list_files()]);
    }
    if ($action === 'micro_read') {
      try {
        $file = micro_file_path((string)($_GET['file'] ?? ''));
        if (!file_exists($file)) fail('Arquivo não existe.', 404);
        respond(['file' => basename($file), 'content' => file_get_contents($file)]);
      } catch (Throwable $e) {
        fail($e->getMessage(), 400);
      }
    }
    if ($action === 'call') {
        $name = $_GET['name'] ?? '';
        $args = [];
        if (isset($_GET['arguments'])) $args = json_decode($_GET['arguments'], true) ?? [];
        try {
            $out = call_tool($name, $args);
            respond(['result' => $out, 'content' => [['type' => 'text', 'text' => $out]]]);
        } catch (Throwable $e) {
            respond(['error' => $e->getMessage()], 400);
        }
    }
    // Default GET: MCP info
    if ($uriPath === '/' || ends_with($uriPath, '/lama.php')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile(__DIR__ . '/lama.html');
        exit;
    }
}

// Fallback: MCP info
header('Content-Type: application/json; charset=utf-8');
respond([
    'name' => 'lama-mcp',
    'version' => '1.0.0',
    'root' => ROOT,
    'toolNames' => array_column(tool_definitions(), 'name'),
]);