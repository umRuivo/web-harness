<?php
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

define('MICRO_MCP_TOKEN', getenv('MICRO_MCP_TOKEN') !== false && getenv('MICRO_MCP_TOKEN') !== '' ? (string)getenv('MICRO_MCP_TOKEN') : '');

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
    if (MICRO_MCP_TOKEN === '') return true;
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return hash_equals(MICRO_MCP_TOKEN, trim($m[1]));
    return hash_equals(MICRO_MCP_TOKEN, $_SERVER['HTTP_X_API_KEY'] ?? '');
}

function json_out(mixed $v): string
{
    return json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
