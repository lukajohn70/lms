<?php

class Auth {
    // In a real app, store this in an environment variable
    private static $secret_key = "aroura_super_secret_key_123!";
    
    public static function generateJWT($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        
        $payload['exp'] = time() + (60 * 60 * 24); // 24 hours
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }
    
    public static function verifyJWT($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        $validSignature = hash_hmac('sha256', $header . "." . $payload, self::$secret_key, true);
        $validBase64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
        
        if (hash_equals($validBase64UrlSignature, $signature)) {
            $decodedPayload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
            if ($decodedPayload['exp'] >= time()) {
                return $decodedPayload;
            }
        }
        return false;
    }
    
    public static function getBearerToken() {
        $headers = null;

        // Check all possible locations the header might appear
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'Authorization', 'authorization'] as $key) {
            if (!empty($_SERVER[$key])) {
                $headers = trim($_SERVER[$key]);
                break;
            }
        }

        // Try apache_request_headers() as another fallback
        if (empty($headers) && function_exists('apache_request_headers')) {
            $reqHeaders = apache_request_headers();
            foreach ($reqHeaders as $k => $v) {
                if (strtolower($k) === 'authorization') {
                    $headers = trim($v);
                    break;
                }
            }
        }

        // Last resort: query param ?token=
        if (empty($headers) && !empty($_GET['token'])) {
            return trim($_GET['token']);
        }

        if (!empty($headers) && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public static function authenticate() {
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
    
    public static function requireRole($allowedRoles) {
        $user = self::authenticate();
        if (!in_array($user['role'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden. Insufficient permissions."]);
            exit;
        }
        return $user;
    }
}
