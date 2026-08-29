<?php
if (php_sapi_name() === 'cli-server') {
    $url = parse_url($_SERVER['REQUEST_URI']);
    $path = $url['path'];
    
    if ($path === '/' || $path === '') {
        include 'lama.php';
        return false;
    }
    
    if (file_exists(__DIR__ . $path)) {
        return false;
    }
    
    return false;
}
