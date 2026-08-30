<?php
if (php_sapi_name() === 'cli-server') {
    $url = parse_url($_SERVER['REQUEST_URI']);
    $path = $url['path'];
    
    if ($path === '/' || $path === '') {
        include 'lama.php';
        return false;
    }

    // Rotas do Chat Ollama (rotas_chat.md)
    if ($path === '/chat' || strpos($path, '/api/') === 0) {
        include 'chat.php';
        return true;
    }

    // Rotas de ferramentas/MCP do lama.php (by path suffix)
    if ($path === '/tools' || strpos($path, '/tools/') === 0) {
        include 'lama.php';
        return true;
    }
    
    if (file_exists(__DIR__ . $path)) {
        return false;
    }
    
    return false;
}
