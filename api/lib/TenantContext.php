<?php
/**
 * Aroura / DLHS LMS — Tenant Context & Multi-Tenancy Scoping Engine
 *
 * Resolves the active school tenant dynamically via headers, subdomains, query parameters,
 * or authenticated user JWT claims. Enforces data isolation across institutions.
 */

require_once __DIR__ . '/../config/Database.php';

class TenantContext {
    private static ?array $currentTenant = null;
    private static ?PDO $conn = null;
    private static array $tenantSettingsCache = [];

    /**
     * Initialize tenant context
     */
    public static function init(?PDO $conn = null): array {
        if (self::$currentTenant !== null) {
            return self::$currentTenant;
        }

        if ($conn) {
            self::$conn = $conn;
        } else {
            $db = new Database();
            self::$conn = $db->getConnection();
        }

        self::$currentTenant = self::resolveTenant();
        return self::$currentTenant;
    }

    /**
     * Resolve the active tenant from request signals
     */
    private static function resolveTenant(): array {
        $conn = self::$conn;
        $tenant = null;

        // 1. Check HTTP Headers (X-Tenant-ID or X-Tenant-Slug)
        $tenantIdHeader = $_SERVER['HTTP_X_TENANT_ID'] ?? null;
        $tenantSlugHeader = $_SERVER['HTTP_X_TENANT_SLUG'] ?? ($_SERVER['HTTP_X_SCHOOL_SLUG'] ?? null);

        if ($tenantIdHeader && is_numeric($tenantIdHeader)) {
            $stmt = $conn->prepare("SELECT * FROM tenants WHERE id = ? AND status = 'active' LIMIT 1");
            $stmt->execute([(int)$tenantIdHeader]);
            $tenant = $stmt->fetch();
        } elseif ($tenantSlugHeader) {
            $stmt = $conn->prepare("SELECT * FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1");
            $stmt->execute([trim($tenantSlugHeader)]);
            $tenant = $stmt->fetch();
        }

        // 2. Check Query Parameter (?tenant=slug or ?school=slug)
        if (!$tenant) {
            $queryParam = $_GET['tenant'] ?? ($_GET['school'] ?? null);
            if ($queryParam) {
                if (is_numeric($queryParam)) {
                    $stmt = $conn->prepare("SELECT * FROM tenants WHERE id = ? AND status = 'active' LIMIT 1");
                    $stmt->execute([(int)$queryParam]);
                } else {
                    $stmt = $conn->prepare("SELECT * FROM tenants WHERE slug = ? OR subdomain = ? AND status = 'active' LIMIT 1");
                    $stmt->execute([trim($queryParam), trim($queryParam)]);
                }
                $tenant = $stmt->fetch();
            }
        }

        // 3. Check Subdomain (e.g. kaduna.lms.jlm.com.ng -> subdomain = 'kaduna')
        if (!$tenant && !empty($_SERVER['HTTP_HOST'])) {
            $host = strtolower(explode(':', $_SERVER['HTTP_HOST'])[0]);
            $parts = explode('.', $host);
            if (count($parts) > 2 && $parts[0] !== 'www' && $parts[0] !== 'localhost') {
                $sub = $parts[0];
                $stmt = $conn->prepare("SELECT * FROM tenants WHERE subdomain = ? AND status = 'active' LIMIT 1");
                $stmt->execute([$sub]);
                $tenant = $stmt->fetch();
            }
        }

        // 4. Fallback: Default Primary Tenant (DLHS Kaduna)
        if (!$tenant) {
            $stmt = $conn->query("SELECT * FROM tenants WHERE is_default = 1 AND status = 'active' LIMIT 1");
            $tenant = $stmt->fetch();
        }

        // 5. Ultimate Fallback: First active record
        if (!$tenant) {
            $stmt = $conn->query("SELECT * FROM tenants ORDER BY id ASC LIMIT 1");
            $tenant = $stmt->fetch();
        }

        if (!$tenant) {
            // Failsafe minimal tenant structure if table is empty
            $tenant = [
                'id' => 1,
                'name' => 'Deeper Life High School',
                'slug' => 'dlhs-kaduna',
                'acronym' => 'DLHS',
                'motto' => 'Leadership with Distinction',
                'campus' => 'Kaduna Campus',
                'theme_primary' => '#023047',
                'theme_secondary' => '#219ebc',
                'theme_accent' => '#ffb703',
                'is_default' => 1
            ];
        }

        return $tenant;
    }

    /**
     * Get the active Tenant ID
     */
    public static function getTenantId(): int {
        $t = self::init();
        return (int)($t['id'] ?? 1);
    }

    /**
     * Get the full active Tenant record
     */
    public static function getTenant(): array {
        return self::init();
    }

    /**
     * Override tenant (useful for super-admin operations or testing)
     */
    public static function setTenant(array $tenant): void {
        self::$currentTenant = $tenant;
        self::$tenantSettingsCache = [];
    }

    /**
     * Get a setting scoped to the current tenant, falling back to global system settings
     */
    public static function getSetting(string $key, $default = null) {
        $tenantId = self::getTenantId();
        $cacheKey = "{$tenantId}_{$key}";

        if (array_key_exists($cacheKey, self::$tenantSettingsCache)) {
            return self::$tenantSettingsCache[$cacheKey];
        }

        $conn = self::$conn;
        if (!$conn) {
            $db = new Database();
            $conn = $db->getConnection();
            self::$conn = $conn;
        }

        // 1. Check tenant specific setting in system_settings
        $stmt = $conn->prepare("SELECT setting_value FROM system_settings WHERE tenant_id = ? AND setting_key = ? LIMIT 1");
        $stmt->execute([$tenantId, $key]);
        $val = $stmt->fetchColumn();

        if ($val !== false && $val !== null) {
            self::$tenantSettingsCache[$cacheKey] = $val;
            return $val;
        }

        // 2. Check tenant record properties
        $current = self::getTenant();
        $propertyMap = [
            'school_name'     => 'name',
            'school_acronym'  => 'acronym',
            'school_motto'    => 'motto',
            'school_vision'   => 'vision',
            'school_campus'   => 'campus',
            'school_address'  => 'address',
            'school_email'    => 'email',
            'school_phone'    => 'phone',
            'school_principal'=> 'principal_name',
            'school_director' => 'director_name',
            'school_logo_path'=> 'logo_url',
        ];

        if (isset($propertyMap[$key]) && !empty($current[$propertyMap[$key]])) {
            $val = $current[$propertyMap[$key]];
            self::$tenantSettingsCache[$cacheKey] = $val;
            return $val;
        }

        // 3. Fallback to default setting (tenant_id = 1 or default)
        $stmtDef = $conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1");
        $stmtDef->execute([$key]);
        $defVal = $stmtDef->fetchColumn();

        $result = ($defVal !== false && $defVal !== null) ? $defVal : $default;
        self::$tenantSettingsCache[$cacheKey] = $result;
        return $result;
    }

    /**
     * Returns all active tenants for institution selection
     */
    public static function getAllTenants(): array {
        self::init();
        $stmt = self::$conn->query("
            SELECT id, uuid, name, slug, acronym, subdomain, campus, motto, logo_url, 
                   theme_primary, theme_secondary, theme_accent, is_default, status, subscription_tier 
            FROM tenants 
            WHERE status = 'active' 
            ORDER BY is_default DESC, name ASC
        ");
        return $stmt->fetchAll();
    }
}
