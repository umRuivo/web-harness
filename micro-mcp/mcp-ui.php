<?php
declare(strict_types=1);
return [
  'id' => 'ui',
  'name' => 'UI',
  'description' => 'Editado pela UI.',
  'tools' => function (): array {
    return [['name' => 'ping', 'description' => 'Ping.', 'inputSchema' => ['type' => 'object', 'properties' => []]]];
  },
  'call' => function (string $name, array $args): string {
    if ($name === 'ping') return json_encode(['pong' => true]);
    throw new Exception("Ferramenta desconhecida: $name");
  },
];
