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

function criador_micro_dir(): string
{
    return dirname(__FILE__);
}

function criador_gerar_codigo(array $a): string
{
    $id = strtolower(trim((string)($a['id'] ?? '')));
    if ($id === '' || !preg_match('/^[a-z][a-z0-9]*$/', $id)) {
        throw new Exception("'id' inválido. Use apenas letras minúsculas e números, começando com letra (ex.: 'ftp', 'calc', 'email').");
    }
    $name = trim((string)($a['name'] ?? ''));
    if ($name === '') $name = ucfirst($id);
    $desc = trim((string)($a['description'] ?? ''));
    if ($desc === '') $desc = "Micro-MCP: $name";

    $tools = $a['tools'] ?? [];
    if (!is_array($tools) || count($tools) === 0) {
        throw new Exception("Defina ao menos uma tool em 'tools' (array com name, description, inputSchema).");
    }

    $toolsPhp = [];
    $callCases = [];
    foreach ($tools as $t) {
        if (!is_array($t) || empty($t['name'])) continue;
        $tn = (string)$t['name'];
        $td = (string)($t['description'] ?? '');
        $schema = $t['inputSchema'] ?? ['type' => 'object', 'properties' => []];
        $schemaStr = var_export($schema, true);
        $schemaStr = preg_replace('/array\s*\(\s*\)/', '[]', $schemaStr);
        $schemaStr = str_replace("array (", "[", $schemaStr);
        $schemaStr = preg_replace('/\)(\s*,?)/', ']$1', $schemaStr);
        $toolsPhp[] = "            ['name' => '$tn', 'description' => '$td', 'inputSchema' => $schemaStr],";

        $fnBody = $t['body'] ?? null;
        if ($fnBody === null) {
            $callCases[] = "        if (\$name === '$tn') {\n            return json_encode(['status' => 'ok', 'tool' => '$tn', 'args' => \$args]);\n        }";
        } else {
            $callCases[] = "        if (\$name === '$tn') {\n            $fnBody\n        }";
        }
    }

    $toolsBlock = implode("\n", $toolsPhp);
    $callBlock = implode("\n", $callCases);

    $code = <<<PHP
<?php
declare(strict_types=1);

if (!function_exists('json_out')) {
    function json_out(mixed \$v): string
    {
        return json_encode(\$v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

return [
    'id' => '$id',
    'name' => '$name',
    'description' => '$desc',
    'tools' => function (): array {
        return [
$toolsBlock
        ];
    },
    'call' => function (string \$name, array \$args): string {
$callBlock
        throw new Exception("Ferramenta desconhecida: \$name");
    },
];
PHP;

    return $code;
}

function criador_tool_gerar(array $a): string
{
    $code = criador_gerar_codigo($a);
    $id = strtolower(trim((string)($a['id'] ?? '')));
    $filename = "mcp-$id.php";
    $filepath = criador_micro_dir() . '/' . $filename;

    $salvar = !empty($a['salvar']) || $a['salvar'] === 'true' || $a['salvar'] === '1' || $a['salvar'] === 1;
    $sobrescrever = !empty($a['sobrescrever']) || $a['sobrescrever'] === 'true' || $a['sobrescrever'] === '1' || $a['sobrescrever'] === 1;
    if ($salvar) {
        if (file_exists($filepath) && !$sobrescrever) {
            throw new Exception("Arquivo $filename já existe. Use sobrescrever=true para substituir.");
        }
        $tmp = tempnam(sys_get_temp_dir(), 'mcpchk');
        file_put_contents($tmp, $code);
        $lint = null;
        if (function_exists('shell_exec') && strpos(ini_get('disable_functions'), 'shell_exec') === false) {
            $lint = shell_exec(PHP_BINARY . ' -l ' . escapeshellarg($tmp) . ' 2>&1');
        }
        @unlink($tmp);
        if ($lint !== null && stripos($lint, 'No syntax errors') === false) {
            throw new Exception('Erro de sintaxe no código gerado: ' . trim($lint));
        }
        $dir = dirname($filepath);
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $written = @file_put_contents($filepath, $code, LOCK_EX);
        if ($written === false) {
            throw new Exception('Falha ao salvar arquivo. Verifique permissões do diretório micro-mcp/.');
        }
    }

    return json_out([
        'gerado' => true,
        'salvo' => $salvar,
        'arquivo' => $filename,
        'id' => $id,
        'tools_count' => count($a['tools'] ?? []),
        'codigo' => $code,
    ]);
}

function criador_tool_validar(array $a): string
{
    $content = (string)($a['content'] ?? '');
    $file = (string)($a['file'] ?? '');

    if ($content === '' && $file !== '') {
        $filepath = criador_micro_dir() . '/' . basename($file);
        if (!file_exists($filepath)) throw new Exception("Arquivo não encontrado: $file");
        $content = file_get_contents($filepath);
    }
    if ($content === '') throw new Exception('Informe content ou file para validar.');

    $erros = [];

    if (strpos($content, '<?php') === false) {
        $erros[] = 'Falta abertura <?php';
    }
    if (strpos($content, 'return') === false) {
        $erros[] = 'Falta return do array de configuração';
    }

    foreach (['id', 'name', 'tools', 'call'] as $campo) {
        if (strpos($content, "'$campo'") === false && strpos($content, '"' . $campo . '"') === false) {
            $erros[] = "Campo obrigatório ausente: $campo";
        }
    }

    $tmp = tempnam(sys_get_temp_dir(), 'mcpval');
    file_put_contents($tmp, $content);
    $lint = null;
    if (function_exists('shell_exec') && strpos(ini_get('disable_functions'), 'shell_exec') === false) {
        $lint = shell_exec(PHP_BINARY . ' -l ' . escapeshellarg($tmp) . ' 2>&1');
    }
    $sintaxeOk = true;
    if ($lint !== null && stripos($lint, 'No syntax errors') === false) {
        $sintaxeOk = false;
        $erros[] = 'Erro de sintaxe: ' . trim($lint);
    }
    @unlink($tmp);

    if ($sintaxeOk && empty($erros)) {
        $mod = @eval('?>' . $content);
        if (!is_array($mod)) {
            $erros[] = 'O return não produz um array válido';
        } else {
            if (!is_callable($mod['tools'] ?? null)) $erros[] = "'tools' não é uma função callable";
            if (!is_callable($mod['call'] ?? null)) $erros[] = "'call' não é uma função callable";
            if (is_callable($mod['tools'] ?? null)) {
                $toolsList = $mod['tools']();
                if (!is_array($toolsList) || count($toolsList) === 0) {
                    $erros[] = 'tools() não retorna ferramentas';
                }
            }
        }
    }

    return json_out([
        'valido' => empty($erros),
        'sintaxe_ok' => $sintaxeOk,
        'erros' => $erros,
    ]);
}

function criador_tool_template(array $a): string
{
    $id = strtolower(trim((string)($a['id'] ?? 'exemplo')));
    $name = trim((string)($a['name'] ?? ucfirst($id)));
    $desc = trim((string)($a['description'] ?? "Micro-MCP: $name"));

    $template = <<<PHP
<?php
declare(strict_types=1);

if (!function_exists('json_out')) {
    function json_out(mixed \$v): string
    {
        return json_encode(\$v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

return [
    'id' => '$id',
    'name' => '$name',
    'description' => '$desc',
    'tools' => function (): array {
        return [
            ['name' => 'exemplo_tool', 'description' => 'Descrição da tool.', 'inputSchema' => ['type' => 'object', 'properties' => ['param' => ['type' => 'string', 'description' => 'Parâmetro de exemplo.']]]],
        ];
    },
    'call' => function (string \$name, array \$args): string {
        if (\$name === 'exemplo_tool') {
            return json_out(['resultado' => \$args['param'] ?? 'valor padrão']);
        }
        throw new Exception("Ferramenta desconhecida: \$name");
    },
];
PHP;

    return json_out([
        'template' => true,
        'id' => $id,
        'arquivo_sugerido' => "mcp-$id.php",
        'codigo' => $template,
        'instrucoes' => 'Salve este código em micro-mcp/mcp-' . $id . '.php ou use a tool criador_gerar com salvar=true.',
    ]);
}

function criador_tool_listar(array $a): string
{
    $dir = criador_micro_dir();
    $files = [];
    foreach (glob($dir . '/*.php') as $file) {
        $base = basename($file);
        if ($base === 'index.php' || $base === '_boot.php') continue;
        $files[] = [
            'file' => $base,
            'size' => filesize($file),
            'mtime' => date('c', filemtime($file)),
        ];
    }
    return json_out(['count' => count($files), 'files' => $files]);
}

return [
    'id' => 'criador',
    'name' => 'Criador de Micro-MCPs',
    'description' => 'Especialista em criar micro-MCPs: gera código PHP completo, valida estrutura, fornece templates e lista micro-MCPs existentes.',
    'tools' => function (): array {
        return [
            ['name' => 'gerar', 'description' => 'Gera o código PHP completo de um micro-MCP. Use salvar=true para gravar direto em micro-mcp/. Parâmetros: id (obrigatório), name, description, tools (array com name/description/inputSchema/body), salvar (bool), sobrescrever (bool).', 'inputSchema' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string', 'description' => 'ID do micro-MCP (letras minúsculas/números).'], 'name' => ['type' => 'string', 'description' => 'Nome de exibição.'], 'description' => ['type' => 'string', 'description' => 'Descrição do micro-MCP.'], 'tools' => ['type' => 'array', 'description' => 'Array de tools: [{name, description, inputSchema, body?}].'], 'salvar' => ['type' => 'boolean', 'description' => 'Se true, salva o arquivo em micro-mcp/.'], 'sobrescrever' => ['type' => 'boolean', 'description' => 'Se true, sobrescreve arquivo existente.']], 'required' => ['id', 'tools']]],
            ['name' => 'validar', 'description' => 'Valida se um código PHP segue o contrato micro-MCP (sintaxe, campos obrigatórios, tools/call callables). Informe content (código) ou file (nome do arquivo em micro-mcp/).', 'inputSchema' => ['type' => 'object', 'properties' => ['content' => ['type' => 'string', 'description' => 'Código PHP para validar.'], 'file' => ['type' => 'string', 'description' => 'Nome do arquivo em micro-mcp/ para validar.']]]],
            ['name' => 'template', 'description' => 'Retorna um template de micro-MCP pronto para usar, customizado com id/name/description fornecidos.', 'inputSchema' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string', 'description' => 'ID para o template.'], 'name' => ['type' => 'string', 'description' => 'Nome para o template.'], 'description' => ['type' => 'string', 'description' => 'Descrição para o template.']]]],
            ['name' => 'listar', 'description' => 'Lista todos os micro-MCPs existentes no diretório micro-mcp/.', 'inputSchema' => ['type' => 'object', 'properties' => []]],
        ];
    },
    'call' => function (string $name, array $args): string {
        switch ($name) {
            case 'gerar':   return criador_tool_gerar($args);
            case 'validar': return criador_tool_validar($args);
            case 'template': return criador_tool_template($args);
            case 'listar':  return criador_tool_listar($args);
            default: throw new Exception("Ferramenta desconhecida: $name");
        }
    },
];
