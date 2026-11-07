<?php
/**
 * Aroura / DLHS LMS — Tenant & Multi-School SaaS Management Controller
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/TenantContext.php';

class TenantController {
    private PDO $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
        TenantContext::init($this->conn);
    }

    /**
     * Public: List all active school tenants for school switcher / portal access
     * GET /api/tenants
     */
    public function index(): void {
        try {
            $tenants = TenantContext::getAllTenants();
            echo json_encode([
                'success' => true,
                'tenants' => $tenants,
                'current' => TenantContext::getTenant()
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to load school tenants: ' . $e->getMessage()]);
        }
    }

    /**
     * Public/Auth: Get the active resolved school profile
     * GET /api/tenants/current
     */
    public function current(): void {
        try {
            $tenant = TenantContext::getTenant();
            echo json_encode([
                'success' => true,
                'tenant' => $tenant
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to resolve current tenant']);
        }
    }

    /**
     * Admin: Create a new school tenant (SaaS Onboarding)
     * POST /api/admin/tenants/create
     */
    public function create(): void {
        Auth::requireRole(['admin']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['name']) || empty($data['slug'])) {
            http_response_code(400);
            echo json_encode(['error' => 'School name and slug are required']);
            return;
        }

        $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower(trim($data['slug'])));
        $name = trim($data['name']);
        $acronym = strtoupper(trim($data['acronym'] ?? substr($name, 0, 4)));
        $subdomain = trim($data['subdomain'] ?? $slug);

        try {
            // Check for existing slug
            $chk = $this->conn->prepare("SELECT id FROM tenants WHERE slug = ? OR subdomain = ?");
            $chk->execute([$slug, $subdomain]);
            if ($chk->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'A school with this slug or subdomain already exists']);
                return;
            }

            $uuid = 'ten_' . $slug . '_' . substr(uniqid(), -6);

            $stmt = $this->conn->prepare("
                INSERT INTO tenants (
                    uuid, name, slug, acronym, subdomain, campus, motto, vision, address, email, phone, principal_name, logo_url, theme_primary, theme_secondary, theme_accent, status, subscription_tier, is_default
                ) VALUES (
                    :uuid, :name, :slug, :acronym, :subdomain, :campus, :motto, :vision, :address, :email, :phone, :principal_name, :logo_url, :theme_primary, :theme_secondary, :theme_accent, 'active', :tier, 0
                )
            ");

            $stmt->execute([
                ':uuid'             => $uuid,
                ':name'             => $name,
                ':slug'             => $slug,
                ':acronym'          => $acronym,
                ':subdomain'        => $subdomain ?: null,
                ':campus'           => trim($data['campus'] ?? 'Main Campus'),
                ':motto'            => trim($data['motto'] ?? ''),
                ':vision'           => trim($data['vision'] ?? ''),
                ':address'          => trim($data['address'] ?? ''),
                ':email'            => trim($data['email'] ?? ''),
                ':phone'            => trim($data['phone'] ?? ''),
                ':principal_name'   => trim($data['principal_name'] ?? ''),
                ':logo_url'         => trim($data['logo_url'] ?? 'uploads/logos/default_school.png'),
                ':theme_primary'    => $data['theme_primary'] ?? '#023047',
                ':theme_secondary'  => $data['theme_secondary'] ?? '#219ebc',
                ':theme_accent'     => $data['theme_accent'] ?? '#ffb703',
                ':tier'             => $data['subscription_tier'] ?? 'standard'
            ]);

            $tenantId = (int)$this->conn->lastInsertId();

            // If admin credentials supplied, create school principal/admin account
            if (!empty($data['admin_email']) && !empty($data['admin_password'])) {
                $hash = password_hash($data['admin_password'], PASSWORD_DEFAULT);
                $uStmt = $this->conn->prepare("
                    INSERT INTO users (email, password_hash, role, first_name, last_name, tenant_id)
                    VALUES (?, ?, 'admin', ?, ?, ?)
                ");
                $uStmt->execute([
                    strtolower(trim($data['admin_email'])),
                    $hash,
                    trim($data['admin_first_name'] ?? 'Principal'),
                    trim($data['admin_last_name'] ?? $acronym),
                    $tenantId
                ]);
            }

            echo json_encode([
                'success' => true,
                'message' => "School '{$name}' created successfully in the multi-tenant registry.",
                'tenant_id' => $tenantId,
                'slug' => $slug
            ]);

        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create tenant: ' . $e->getMessage()]);
        }
    }

    /**
     * Admin: Update active tenant school details & branding
     * POST /api/admin/tenants/update
     */
    public function update(): void {
        Auth::requireRole(['admin']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $tenantId = (int)($data['id'] ?? TenantContext::getTenantId());

        try {
            $stmt = $this->conn->prepare("
                UPDATE tenants SET
                    name = COALESCE(:name, name),
                    acronym = COALESCE(:acronym, acronym),
                    campus = COALESCE(:campus, campus),
                    motto = COALESCE(:motto, motto),
                    vision = COALESCE(:vision, vision),
                    address = COALESCE(:address, address),
                    email = COALESCE(:email, email),
                    phone = COALESCE(:phone, phone),
                    principal_name = COALESCE(:principal_name, principal_name),
                    director_name = COALESCE(:director_name, director_name),
                    logo_url = COALESCE(:logo_url, logo_url),
                    theme_primary = COALESCE(:theme_primary, theme_primary),
                    theme_secondary = COALESCE(:theme_secondary, theme_secondary),
                    theme_accent = COALESCE(:theme_accent, theme_accent)
                WHERE id = :id
            ");

            $stmt->execute([
                ':name'             => isset($data['name']) ? trim($data['name']) : null,
                ':acronym'          => isset($data['acronym']) ? trim($data['acronym']) : null,
                ':campus'           => isset($data['campus']) ? trim($data['campus']) : null,
                ':motto'            => isset($data['motto']) ? trim($data['motto']) : null,
                ':vision'           => isset($data['vision']) ? trim($data['vision']) : null,
                ':address'          => isset($data['address']) ? trim($data['address']) : null,
                ':email'            => isset($data['email']) ? trim($data['email']) : null,
                ':phone'            => isset($data['phone']) ? trim($data['phone']) : null,
                ':principal_name'   => isset($data['principal_name']) ? trim($data['principal_name']) : null,
                ':director_name'    => isset($data['director_name']) ? trim($data['director_name']) : null,
                ':logo_url'         => isset($data['logo_url']) ? trim($data['logo_url']) : null,
                ':theme_primary'    => $data['theme_primary'] ?? null,
                ':theme_secondary'  => $data['theme_secondary'] ?? null,
                ':theme_accent'     => $data['theme_accent'] ?? null,
                ':id'               => $tenantId
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'School profile and branding updated successfully.'
            ]);

        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update tenant: ' . $e->getMessage()]);
        }
    }

    /**
     * Admin: Get statistics for current school tenant
     * GET /api/admin/tenants/stats
     */
    public function stats(): void {
        Auth::requireRole(['admin']);
        $tenantId = TenantContext::getTenantId();

        try {
            $studentCount = $this->conn->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND (tenant_id = {$tenantId} OR tenant_id IS NULL)")->fetchColumn();
            $teacherCount = $this->conn->query("SELECT COUNT(*) FROM users WHERE role = 'teacher' AND (tenant_id = {$tenantId} OR tenant_id IS NULL)")->fetchColumn();
            $classCount = $this->conn->query("SELECT COUNT(*) FROM classes WHERE (tenant_id = {$tenantId} OR tenant_id IS NULL)")->fetchColumn();
            $gradesCount = $this->conn->query("SELECT COUNT(*) FROM grades WHERE (tenant_id = {$tenantId} OR tenant_id IS NULL)")->fetchColumn();

            echo json_encode([
                'success' => true,
                'stats' => [
                    'tenant' => TenantContext::getTenant(),
                    'students' => (int)$studentCount,
                    'teachers' => (int)$teacherCount,
                    'classes' => (int)$classCount,
                    'assessment_records' => (int)$gradesCount,
                ]
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to load stats: ' . $e->getMessage()]);
        }
    }
}
