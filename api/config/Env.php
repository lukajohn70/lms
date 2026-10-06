<?php

// ── PHP 7.4 Polyfills for PHP 8 string functions ──────────────────────────────
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        return $needle === '' || substr($haystack, -strlen($needle)) === $needle;
    }
}
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

/**
 * Env — Lightweight .env file loader.
 *
 * Reads key=value pairs from api/.env and populates $_ENV / getenv().
 * Must be loaded before any other class that needs configuration.
 */
class Env {
    private static bool $loaded = false;

    /**
     * Load the .env file from the given path.
     * Silently skips if already loaded.
     */
    public static function load(string $path): void {
        if (self::$loaded) return;

        if (!file_exists($path)) {
            // In production, env vars must be set at the server level.
            // We only warn in development mode.
            if (getenv('APP_ENV') !== 'production') {
                error_log("Env::load() — .env file not found at: {$path}");
            }
            self::$loaded = true;
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);

            // Skip comments and blank lines
            if ($line === '' || substr($line, 0, 1) === '#') continue;

            // Split on the first '=' only
            $eqPos = strpos($line, '=');
            if ($eqPos === false) continue;

            $key   = trim(substr($line, 0, $eqPos));
            $value = trim(substr($line, $eqPos + 1));

            // Strip surrounding quotes (single or double)
            if (preg_match('/^([\'"])(.*)\1$/', $value, $m)) {
                $value = $m[2];
            }

            // Only set if not already defined at the server/system level
            if (!array_key_exists($key, $_ENV) && getenv($key) === false) {
                $_ENV[$key]     = $value;
                putenv("{$key}={$value}");
            }
        }

        self::$loaded = true;
    }

    /**
     * Get an environment variable with an optional default.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null) {
        $val = $_ENV[$key] ?? getenv($key);
        return ($val !== false && $val !== null) ? $val : $default;
    }
}
