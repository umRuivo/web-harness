<?php
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

$token = getenv('DIAG_TOKEN');
if ($token !== false && $token !== '' && ($_GET['key'] ?? '') !== $token) {
    http_response_code(401);
    echo "Não autorizado. Defina DIAG_TOKEN no servidor e acesse com ?key=TOKEN\n";
    exit;
}

$host = 'ftpupload.net';

function ok(string $s): string  { return "[OK]   $s\n"; }
function warn(string $s): string { return "[AVISO] $s\n"; }
function fail(string $s): string { return "[FALHA] $s\n"; }

$ftp_loaded = extension_loaded('ftp') || function_exists('ftp_connect');

echo "===== DIAGNÓSTICO PHP (micro-mcp ftp) =====\n";
echo 'Data  : ' . date('c') . "\n";
echo 'PHP   : ' . PHP_VERSION . ' (' . PHP_SAPI . ')' . "\n";
echo 'OS    : ' . PHP_OS . "\n";
echo 'Server: ' . ($_SERVER['SERVER_SOFTWARE'] ?? 'n/d') . "\n";
echo 'IP    : ' . ($_SERVER['SERVER_ADDR'] ?? 'n/d') . "\n";

echo "\n--- Extensões ---\n";
foreach (['ftp', 'curl', 'openssl', 'sockets', 'mbstring', 'json'] as $e) {
    echo extension_loaded($e) ? ok("extensão '$e' carregada") : fail("extensão '$e' NÃO carregada");
}
echo function_exists('ftp_connect') ? ok("ftp_connect existe") : fail("ftp_connect NÃO existe");
echo function_exists('ftp_ssl_connect') ? ok("ftp_ssl_connect existe (FTPS)") : warn("ftp_ssl_connect não existe (sem FTPS)");

echo "\n--- Configuração (ini) ---\n";
foreach (['allow_url_fopen', 'default_socket_timeout', 'max_execution_time'] as $k) {
    $v = ini_get($k);
    echo ok("ini $k = " . ($v === false ? 'n/d' : var_export($v, true)));
}
$df = ini_get('disable_functions');
echo ($df === false || trim($df) === '') ? ok("disable_functions vazio") : warn("disable_functions: $df");

echo "\n--- DNS ---\n";
$ips = gethostbynamel($host);
echo $ips === false ? fail("gethostbynamel($host) falhou") : ok("DNS $host -> " . implode(', ', $ips));

echo "\n--- Teste TCP outbound ($host:21) ---\n";
$conn = @stream_socket_client("tcp://$host:21", $errno, $errstr, 10);
if ($conn === false) {
    echo fail("stream_socket_client falhou: ($errno) $errstr");
} else {
    echo ok("conectou TCP em $host:21");
    stream_set_timeout($conn, 5);
    $banner = fgets($conn);
    echo is_string($banner) && $banner !== '' ? ok('banner FTP: ' . trim($banner)) : warn('sem banner');
    @fwrite($conn, "QUIT\r\n");
    fclose($conn);
}

echo "\n--- Teste com extensão ftp ---\n";
if (function_exists('ftp_connect')) {
    $c = @ftp_connect($host, 21, 10);
    if ($c === false) {
        echo fail("ftp_connect($host) falhou — porta 21 outbound bloqueada ou serviço indisponível");
        $ftp_connect_ok = false;
    } else {
        echo ok("ftp_connect OK");
        $ftp_connect_ok = true;
        $sys = @ftp_systype($c);
        echo is_string($sys) ? ok("systype: $sys") : warn('systype falhou');
        $u = getenv('DIAG_FTP_USER');
        $p = getenv('DIAG_FTP_PASS');
        if ($u !== false && $u !== '') {
            if (@ftp_login($c, $u, $p)) {
                echo ok("login OK como $u");
                $pwd = @ftp_pwd($c);
                echo is_string($pwd) ? ok("pwd: $pwd") : warn('pwd falhou');
            } else {
                echo fail("login FALHOU como $u (senha errada ou conta bloqueada)");
            }
        } else {
            echo warn('login não testado (defina DIAG_FTP_USER/DIAG_FTP_PASS)');
        }
        ftp_close($c);
    }
} else {
    echo fail('pulei teste ftp_connect (extensão ausente)');
}

echo "\n--- Teste HTTPS outbound (curl) ---\n";
if (function_exists('curl_init')) {
    $ch = curl_init('https://ftpupload.net/');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 15, CURLOPT_NOBODY => true]);
    $okc = @curl_exec($ch) !== false;
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    echo $okc ? ok("curl HTTPS -> HTTP $code") : fail('curl HTTPS falhou');
} else {
    echo fail('curl indisponível');
}

echo "\n--- Conclusão ---\n";
$issues = [];
if (!$ftp_loaded) $issues[] = 'extensão ftp ausente (necessária p/ micro-ftp)';
if (isset($ftp_connect_ok) && !$ftp_connect_ok) $issues[] = 'conexão TCP com ' . $host . ':21 bloqueada/sem resposta (firewall outbound?)';
if (!empty($issues)) {
    foreach ($issues as $i) echo "  - $i\n";
} else {
    echo "  Sem bloqueios detectados nas verificações básicas.\n";
    echo "  Se ftp_login ainda falhar no app, o problema é de credenciais/limite da conta, não do ambiente.\n";
}
