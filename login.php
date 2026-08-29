<?php
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Web Harness — Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Verdana,'Segoe UI',sans-serif;font-size:14px;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#3a6ea5 0%,#2a5590 40%,#0c327d 100%);overflow:hidden}
.xp-login-panel{width:340px;background:#ece9d8;border:2px solid #0831d9;outline:3px solid rgba(255,255,255,.6);border-radius:8px 8px 4px 4px;box-shadow:4px 8px 24px rgba(0,20,60,.6);text-align:center;padding:0 0 14px;overflow:hidden}
.xp-login-brand{padding:8px 12px;font-size:1.05em;color:#fff;background:linear-gradient(180deg,#0997ff 0%,#0053ee 12%,#0050ee 45%,#0066ff 88%,#003dd0 100%);border-radius:6px 6px 0 0;text-shadow:1px 1px 2px rgba(0,0,60,.7);text-align:left}
.xp-login-usericon{font-size:52px;margin:18px 0 4px;text-align:center}
.xp-login-welcome{font-size:.85em;color:#0c327d;font-weight:bold;margin-bottom:14px;text-align:center}
.xp-login-fields{padding:0 22px;text-align:left}
.xp-login-label{display:block;font-size:.8em;color:#333;margin-bottom:3px;font-weight:bold}
.xp-login-input{width:100%;padding:5px 6px;border:1px solid #7f9db9;border-radius:2px;background:#fff;color:#000;font-size:.95em;font-family:inherit;box-shadow:inset 1px 1px 2px rgba(0,0,0,.08);margin-bottom:10px}
.xp-login-input:focus{outline:1px solid #3c7fb1;border-color:#3c7fb1}
.xp-login-error{font-size:.78em;color:#c00;min-height:1.1em;padding:0 22px;text-align:center;font-style:italic}
.xp-login-actions{display:flex;gap:8px;justify-content:center;margin-top:12px}
.xp-login-btn{padding:4px 18px;border:1px solid #003c74;border-radius:3px;background:linear-gradient(180deg,#fdfdfd 0%,#f2f1ea 45%,#e7e3d3 85%,#d8d0c4 100%);color:#000;cursor:pointer;font-size:.9em;font-family:inherit;box-shadow:inset 1px 1px 0 #fff}
.xp-login-btn:hover{background:linear-gradient(180deg,#fffdf5 0%,#fdf3d9 45%,#fbe7ad 85%,#f5c95e 100%);box-shadow:inset 1px 1px 0 #fff,inset 0 0 0 2px rgba(255,201,94,.65)}
.xp-login-btn:active{background:linear-gradient(180deg,#d8d0c4,#e7e3d3)}
</style>
</head>
<body>
<form method="POST" action="<?=htmlspecialchars($_SERVER['SCRIPT_NAME'])?>?action=login">
<div class="xp-login-panel">
  <div class="xp-login-brand">🪟 <strong>Web Harness</strong></div>
  <div class="xp-login-usericon">👤</div>
  <div class="xp-login-welcome">Bem-vindo ao Web Harness</div>
  <div class="xp-login-fields">
    <label class="xp-login-label">Usuário</label>
    <input type="text" name="usuario" class="xp-login-input" autocomplete="username" autofocus>
    <label class="xp-login-label">Senha</label>
    <input type="password" name="senha" class="xp-login-input" autocomplete="current-password">
  </div>
  <div class="xp-login-error"><?=htmlspecialchars($erro ?? '')?></div>
  <div class="xp-login-actions">
    <button type="submit" class="xp-login-btn">OK</button>
    <button type="reset" class="xp-login-btn" onclick="this.form.senha.value='';this.form.senha.focus()">Cancelar</button>
  </div>
</div>
</form>
</body>
</html>