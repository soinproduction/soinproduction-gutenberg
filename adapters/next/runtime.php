<?php
namespace SiteTheme\Kit;
defined('ABSPATH') || exit;

/** A local Next process advertises its actual port; public deployments use the configured URL. */
function frontend_origin(?string $configured = null, ?string $runtime_file = null): string {
    $configured = rtrim($configured ?? (defined('SITE_FRONTEND_URL') ? SITE_FRONTEND_URL : ''), '/');
    $local = ['127.0.0.1', 'localhost', '[::1]', '::1'];
    if (!in_array(parse_url($configured, PHP_URL_HOST), $local, true)) return $configured;
    $root = dirname(__DIR__, 3);
    $config_file = $root . '/kit.config.json';
    $config = is_readable($config_file) ? json_decode((string)file_get_contents($config_file), true) : [];
    $relative = $config['runtime']['file'] ?? 'build/next-server.json';
    if ($runtime_file === null && (!is_string($relative) || str_starts_with($relative, '/') || in_array('..', explode('/', str_replace('\\', '/', $relative)), true))) return $configured;
    $file = $runtime_file ?? $root . '/' . $relative;
    $runtime = is_readable($file) ? json_decode((string)file_get_contents($file), true) : null;
    if (!is_array($runtime) || !is_string($runtime['origin'] ?? null) || !is_int($runtime['pid'] ?? null) || $runtime['pid'] < 1) return $configured;
    $url = parse_url($runtime['origin']);
    if (!is_array($url) || !in_array($url['scheme'] ?? '', ['http', 'https'], true)
        || !in_array($url['host'] ?? '', $local, true) || empty($url['port'])
        || $url['port'] < 1 || $url['port'] > 65535 || isset($url['user']) || isset($url['pass'])
        || isset($url['query']) || isset($url['fragment']) || !empty($url['path'])) return $configured;
    if (function_exists('posix_kill') && !@posix_kill((int)$runtime['pid'], 0) && posix_get_last_error() === 3) return $configured;
    return rtrim($runtime['origin'], '/');
}
