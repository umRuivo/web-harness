<?php
declare(strict_types=1);

if (!defined('MICRO_MCP_ROOT')) {
    define('MICRO_MCP_ROOT', getenv('MICRO_MCP_ROOT') !== false && getenv('MICRO_MCP_ROOT') !== '' ? rtrim(getenv('MICRO_MCP_ROOT'), '/') : dirname(__DIR__) . '/workspace');
}

if (!function_exists('starts_with')) {
    function starts_with(string $hay, string $needle): bool
    {
        return $needle !== '' && strpos($hay, $needle) === 0;
    }
}

if (!function_exists('json_out')) {
    function json_out(mixed $v): string
    {
        return json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

function ftp_local_root(): string
{
    return rtrim(str_replace('\\', '/', MICRO_MCP_ROOT), '/');
}

function ftp_local_path(string $rel): string
{
    if ($rel === '' || $rel === '.') return ftp_local_root();
    $rel = str_replace('\\', '/', $rel);
    $base = ftp_local_root();
    $full = $base . '/' . ltrim($rel, '/');
    $parts = [];
    foreach (explode('/', $full) as $seg) {
        if ($seg === '' || $seg === '.') continue;
        if ($seg === '..') {
            if (!$parts) throw new Exception('Acesso fora da raiz.');
            array_pop($parts);
        } else {
            $parts[] = $seg;
        }
    }
    $n = '/' . implode('/', $parts);
    if ($n === $base) return $base;
    if (!starts_with($n, $base . '/')) throw new Exception('Acesso fora da raiz.');
    return $n;
}

function ftp_conn(array $a)
{
    $host = trim((string)($a['host'] ?? ''));
    if ($host === '') $host = trim((string)(getenv('MCP_FTP_HOST') ?: ''));
    $user = trim((string)($a['user'] ?? ''));
    if ($user === '') $user = trim((string)(getenv('MCP_FTP_USER') ?: ''));
    $pass = (string)($a['pass'] ?? '');
    if ($pass === '') $pass = (string)(getenv('MCP_FTP_PASS') ?: '');
    $port = (int)($a['port'] ?? 0);
    if ($port <= 0) $port = (int)(getenv('MCP_FTP_PORT') ?: 0);
    if ($port <= 0) $port = 21;
    $timeout = (int)($a['timeout'] ?? 0);
    if ($timeout <= 0) $timeout = 30;
    if ($host === '') throw new Exception('Host FTP não informado (argumento host ou env MCP_FTP_HOST).');
    if ($user === '') $user = 'anonymous';
    $conn = @ftp_connect($host, $port, $timeout);
    if ($conn === false) throw new Exception('Falha ao conectar em ' . $host . ':' . $port);
    if (!@ftp_login($conn, $user, $pass)) {
        @ftp_close($conn);
        throw new Exception('Falha de login FTP (' . $user . ').');
    }
    @ftp_pasv($conn, true);
    return $conn;
}

function ftp_mlsd_entries($conn, string $path): ?array
{
    if (!function_exists('ftp_mlsd')) return null;
    $details = @ftp_mlsd($conn, $path);
    if (!is_array($details) || $details === []) return null;
    $entries = [];
    foreach ($details as $d) {
        $name = (string)($d['name'] ?? '');
        if ($name === '' || $name === '.' || $name === '..') continue;
        $t = null;
        if (!empty($d['modify'])) {
            $dt = \DateTime::createFromFormat('YmdHis', (string)$d['modify']);
            if ($dt !== false) $t = $dt->format('c');
        }
        $entries[] = [
            'name' => $name,
            'type' => (string)($d['type'] ?? 'file'),
            'size' => (int)($d['size'] ?? 0),
            'mtime' => $t,
            'perms' => (string)($d['perm'] ?? ''),
        ];
    }
    return $entries;
}

function ftp_is_utf8(string $s): bool
{
    if (function_exists('mb_check_encoding')) return mb_check_encoding($s, 'UTF-8');
    return preg_match('//u', $s) === 1;
}

function ftp_tool_test(array $a): string
{
    $conn = ftp_conn($a);
    $system = @ftp_systype($conn);
    $pwd = @ftp_pwd($conn);
    @ftp_close($conn);
    return json_out(['ok' => true, 'system' => is_string($system) ? $system : null, 'pwd' => is_string($pwd) ? $pwd : null]);
}

function ftp_tool_list(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '/');
    if ($path === '') $path = '/';
    $entries = ftp_mlsd_entries($conn, $path);
    if ($entries === null) {
        $names = @ftp_nlist($conn, $path);
        if ($names === false) {
            @ftp_close($conn);
            throw new Exception('Falha ao listar: ' . $path);
        }
        $entries = [];
        foreach ($names as $n) {
            $entries[] = ['name' => basename((string)$n), 'type' => 'unknown'];
        }
    }
    usort($entries, fn($x, $y) => strcmp($x['name'], $y['name']));
    @ftp_close($conn);
    return json_out(['path' => $path, 'count' => count($entries), 'entries' => $entries]);
}

function ftp_tool_read(array $a): string
{
    $conn = ftp_conn($a);
    $remote = (string)($a['remote'] ?? '');
    if ($remote === '') {
        @ftp_close($conn);
        throw new Exception('Caminho remoto não informado.');
    }
    $mode = !empty($a['binary']) ? FTP_BINARY : FTP_ASCII;
    $tmp = tempnam(sys_get_temp_dir(), 'mcpftp');
    if ($tmp === false || !@ftp_get($conn, $tmp, $remote, $mode)) {
        @ftp_close($conn);
        if ($tmp !== false) @unlink($tmp);
        throw new Exception('Falha ao baixar: ' . $remote);
    }
    @ftp_close($conn);
    $raw = @file_get_contents($tmp);
    @unlink($tmp);
    if ($raw === false) throw new Exception('Falha ao ler arquivo baixado.');
    $out = ['path' => $remote, 'size' => strlen($raw)];
    if (ftp_is_utf8($raw)) {
        $out['encoding'] = 'text';
        $out['content'] = $raw;
    } else {
        $out['encoding'] = 'base64';
        $out['note'] = 'Conteúdo não-UTF8 retornado em base64.';
        $out['content'] = base64_encode($raw);
    }
    return json_out($out);
}

function ftp_tool_put(array $a): string
{
    $conn = ftp_conn($a);
    $remote = (string)($a['remote'] ?? '');
    if ($remote === '') {
        @ftp_close($conn);
        throw new Exception('Caminho remoto não informado.');
    }
    $mode = !empty($a['binary']) ? FTP_BINARY : FTP_ASCII;
    $content = (string)($a['content'] ?? '');
    $tmp = null;
    if ($content !== '') {
        $tmp = tempnam(sys_get_temp_dir(), 'mcpftp');
        if ($tmp === false || file_put_contents($tmp, $content) === false) {
            @ftp_close($conn);
            if ($tmp !== false) @unlink($tmp);
            throw new Exception('Falha ao preparar conteúdo.');
        }
        $local = $tmp;
    } else {
        $local = ftp_local_path((string)($a['local'] ?? ''));
        if (!is_file($local)) {
            @ftp_close($conn);
            throw new Exception('Arquivo local não existe: ' . $local);
        }
    }
    $ok = @ftp_put($conn, $remote, $local, $mode);
    @ftp_close($conn);
    if ($tmp !== null) @unlink($tmp);
    if (!$ok) throw new Exception('Falha ao enviar: ' . $remote);
    return json_out(['uploaded' => true, 'remote' => $remote]);
}

function ftp_tool_mkdir(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '');
    if ($path === '') {
        @ftp_close($conn);
        throw new Exception('Caminho não informado.');
    }
    $ok = @ftp_mkdir($conn, $path);
    @ftp_close($conn);
    if ($ok === false) throw new Exception('Falha ao criar diretório: ' . $path);
    return json_out(['created' => true, 'path' => $path]);
}

function ftp_tool_rmdir(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '');
    if ($path === '') {
        @ftp_close($conn);
        throw new Exception('Caminho não informado.');
    }
    $ok = @ftp_rmdir($conn, $path);
    @ftp_close($conn);
    if ($ok === false) throw new Exception('Falha ao remover diretório: ' . $path);
    return json_out(['removed' => true, 'path' => $path]);
}

function ftp_tool_delete(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '');
    if ($path === '') {
        @ftp_close($conn);
        throw new Exception('Caminho não informado.');
    }
    $ok = @ftp_delete($conn, $path);
    @ftp_close($conn);
    if ($ok === false) throw new Exception('Falha ao apagar: ' . $path);
    return json_out(['deleted' => true, 'path' => $path]);
}

function ftp_tool_rename(array $a): string
{
    $conn = ftp_conn($a);
    $from = (string)($a['from'] ?? '');
    $to = (string)($a['to'] ?? '');
    if ($from === '' || $to === '') {
        @ftp_close($conn);
        throw new Exception('Campos from e to são obrigatórios.');
    }
    $ok = @ftp_rename($conn, $from, $to);
    @ftp_close($conn);
    if ($ok === false) throw new Exception('Falha ao renomear: ' . $from);
    return json_out(['renamed' => true, 'from' => $from, 'to' => $to]);
}

function ftp_tool_chmod(array $a): string
{
    $conn = ftp_conn($a);
    $mode = (int)($a['mode'] ?? 0);
    $path = (string)($a['path'] ?? '');
    if ($mode <= 0 || $path === '') {
        @ftp_close($conn);
        throw new Exception('mode (octal) e path são obrigatórios.');
    }
    $ok = @ftp_chmod($conn, $mode, $path);
    @ftp_close($conn);
    if ($ok === false) throw new Exception('Falha ao alterar permissões: ' . $path);
    return json_out(['chmod' => $ok, 'path' => $path]);
}

function ftp_tool_size(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '');
    if ($path === '') {
        @ftp_close($conn);
        throw new Exception('Caminho não informado.');
    }
    $size = @ftp_size($conn, $path);
    @ftp_close($conn);
    if ($size === -1) throw new Exception('Falha ao obter tamanho (ou diretório): ' . $path);
    return json_out(['path' => $path, 'size' => $size]);
}

function ftp_tool_mdtm(array $a): string
{
    $conn = ftp_conn($a);
    $path = (string)($a['path'] ?? '');
    if ($path === '') {
        @ftp_close($conn);
        throw new Exception('Caminho não informado.');
    }
    $ts = @ftp_mdtm($conn, $path);
    @ftp_close($conn);
    if ($ts === -1) throw new Exception('Falha ao obter data de modificação: ' . $path);
    return json_out(['path' => $path, 'mtime' => date('c', $ts)]);
}

return [
    'id' => 'ftp',
    'name' => 'FTP',
    'description' => 'Controle de servidor FTP: conectar, listar, ler, enviar, criar/apagar diretórios, renomear, permissões, tamanho e data.',
    'tools' => function (): array {
        $connProps = [
            'host' => ['type' => 'string', 'description' => 'Host do servidor FTP (padrão: env MCP_FTP_HOST).'],
            'user' => ['type' => 'string', 'description' => 'Usuário (padrão: env MCP_FTP_USER ou anonymous).'],
            'pass' => ['type' => 'string', 'description' => 'Senha (padrão: env MCP_FTP_PASS).'],
            'port' => ['type' => 'number', 'description' => 'Porta (padrão: 21 ou env MCP_FTP_PORT).'],
        ];
        return [
            ['name' => 'test', 'description' => 'Testa a conexão FTP (conecta, autentica e retorna sistema e diretório atual).', 'inputSchema' => ['type' => 'object', 'properties' => $connProps]],
            ['name' => 'list', 'description' => 'Lista um diretório remoto (nome, tipo, tamanho, mtime, permissões quando o servidor suporta MLSD).', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Diretório remoto (padrão: /).']]]],
            ['name' => 'read', 'description' => 'Baixa um arquivo remoto e retorna o conteúdo (texto ou base64 se binário).', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['remote' => ['type' => 'string', 'description' => 'Caminho remoto do arquivo.'], 'binary' => ['type' => 'boolean', 'description' => 'Modo binário (padrão: true).']], 'required' => ['remote']]],
            ['name' => 'put', 'description' => 'Envia um arquivo para o servidor remoto a partir de um caminho local (na raiz do workspace) ou do parâmetro content.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['remote' => ['type' => 'string', 'description' => 'Caminho remoto de destino.'], 'local' => ['type' => 'string', 'description' => 'Caminho local (relativo à raiz do micro-mcp).'], 'content' => ['type' => 'string', 'description' => 'Conteúdo textual a enviar (alternativa ao local).'], 'binary' => ['type' => 'boolean', 'description' => 'Modo binário (padrão: true).']], 'required' => ['remote']]],
            ['name' => 'mkdir', 'description' => 'Cria um diretório remoto.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Diretório remoto.']], 'required' => ['path']]],
            ['name' => 'rmdir', 'description' => 'Remove um diretório remoto (vazio).', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Diretório remoto.']], 'required' => ['path']]],
            ['name' => 'delete', 'description' => 'Apaga um arquivo remoto.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Arquivo remoto.']], 'required' => ['path']]],
            ['name' => 'rename', 'description' => 'Renomeia/move um arquivo ou diretório remoto.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['from' => ['type' => 'string', 'description' => 'Caminho de origem.'], 'to' => ['type' => 'string', 'description' => 'Caminho de destino.']], 'required' => ['from', 'to']]],
            ['name' => 'chmod', 'description' => 'Altera permissões de um arquivo remoto (modo octal, ex.: 0644).', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['mode' => ['type' => 'number', 'description' => 'Permissão octal.'], 'path' => ['type' => 'string', 'description' => 'Arquivo remoto.']], 'required' => ['mode', 'path']]],
            ['name' => 'size', 'description' => 'Retorna o tamanho em bytes de um arquivo remoto.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Arquivo remoto.']], 'required' => ['path']]],
            ['name' => 'mdtm', 'description' => 'Retorna a data de modificação de um arquivo remoto.', 'inputSchema' => ['type' => 'object', 'properties' => $connProps + ['path' => ['type' => 'string', 'description' => 'Arquivo remoto.']], 'required' => ['path']]],
        ];
    },
    'call' => function (string $name, array $args): string {
        switch ($name) {
            case 'test':    return ftp_tool_test($args);
            case 'list':    return ftp_tool_list($args);
            case 'read':    return ftp_tool_read($args);
            case 'put':     return ftp_tool_put($args);
            case 'mkdir':   return ftp_tool_mkdir($args);
            case 'rmdir':   return ftp_tool_rmdir($args);
            case 'delete':  return ftp_tool_delete($args);
            case 'rename':  return ftp_tool_rename($args);
            case 'chmod':   return ftp_tool_chmod($args);
            case 'size':    return ftp_tool_size($args);
            case 'mdtm':    return ftp_tool_mdtm($args);
            default: throw new Exception("Ferramenta FTP desconhecida: $name");
        }
    },
];
