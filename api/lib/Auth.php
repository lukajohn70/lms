<?php
require_once __DIR__ . '/../config/Env.php';
Env::load(__DIR__ . '/../.env');

class Auth {

    private static function getSecret(): string {
        $secret = Env::get('JWT_SECRET');
        if (!$secret || strlen($secret) < 32) {
            // Fatal — a missing/weak secret must never silently fall back.
            error_log('FATAL: JWT_SECRET is not set or is too short. Set a strong secret in your .env file.');
            http_response_code(500);
            echo json_encode(["error" => "Server misconfiguration. Contact administrator."]);
            exit;
        }
        return $secret;
    }

    public static function generateJWT(array $payload): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));

        $payload['exp'] = time() + (60 * 60 * 24); // 24 hours
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * @param string $token
     * @return array|false
     */
    public static function verifyJWT(string $token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        [$header, $payload, $signature] = $parts;

        $validSignature = hash_hmac('sha256', $header . "." . $payload, self::getSecret(), true);
        $validBase64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

        if (hash_equals($validBase64UrlSignature, $signature)) {
            $decodedPayload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
            if (isset($decodedPayload['exp']) && $decodedPayload['exp'] >= time()) {
                return $decodedPayload;
            }
        }
        return false;
    }

    public static function getBearerToken(): ?string {
        // Check all common locations for the Authorization header
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'Authorization', 'authorization'] as $key) {
            if (!empty($_SERVER[$key])) {
                $headers = trim($_SERVER[$key]);
                if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                    return $matches[1];
                }
            }
        }

        // Fallback: apache_request_headers()
        if (function_exists('apache_request_headers')) {
            $reqHeaders = apache_request_headers();
            foreach ($reqHeaders as $k => $v) {
                if (strtolower($k) === 'authorization') {
                    if (preg_match('/Bearer\s(\S+)/', trim($v), $matches)) {
                        return $matches[1];
                    }
                }
            }
        }

        // Fallback: Query parameter for browser window.open navigations (print views, exports)
        if (!empty($_GET['token'])) {
            return trim($_GET['token']);
        }

        return null;
    }

    public static function authenticate(): array {
        $token = self::getBearerToken();
        if (!$token) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized. Token missing."]);
            exit;
        }
        $payload = self::verifyJWT($token);
        if (!$payload) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized. Invalid or expired token."]);
            exit;
        }
        return $payload;
    }

    public static function requireRole(array $allowedRoles): array {
        $user = self::authenticate();
        if (!in_array($user['role'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden. Insufficient permissions."]);
            exit;
        }
        return $user;
    }
}
