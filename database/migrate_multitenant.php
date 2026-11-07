<?php
/**
 * Aroura / DLHS LMS — Multi-Tenant Architecture Migration
 *
 * Transforms the single-tenant school results management platform into a multi-tenant SaaS architecture.
 * Existing records are preserved and mapped to the primary tenant (Deeper Life High School - Kaduna Campus).
 */

require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    die("Database connection failed.\n");
}

echo "=== Starting Multi-Tenant Architecture Migration ===\n";

// 1. Create `tenants` table
$conn->exec("
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    acronym VARCHAR(20) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NULL,
    custom_domain VARCHAR(255) UNIQUE NULL,
    motto VARCHAR(255) NULL,
    vision TEXT NULL,
    campus VARCHAR(100) NULL,
    address TEXT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    principal_name VARCHAR(150) NULL,
    director_name VARCHAR(150) NULL,
    logo_url VARCHAR(255) NULL,
    theme_primary VARCHAR(20) DEFAULT '#023047',
    theme_secondary VARCHAR(20) DEFAULT '#219ebc',
    theme_accent VARCHAR(20) DEFAULT '#ffb703',
    status ENUM('active', 'suspended', 'trial') DEFAULT 'active',
    subscription_tier ENUM('starter', 'standard', 'enterprise') DEFAULT 'enterprise',
    is_default TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "✓ `tenants` table verified/created.\n";

// 2. Seed Default Primary Tenant (Deeper Life High School) & Secondary Tenants
$tenantCount = $conn->query("SELECT COUNT(*) FROM tenants")->fetchColumn();
if ($tenantCount == 0) {
    $stmt = $conn->prepare("
        INSERT INTO tenants (
            uuid, name, slug, acronym, subdomain, custom_domain, motto, vision, campus, address, email, phone, principal_name, director_name, logo_url, theme_primary, theme_secondary, theme_accent, status, subscription_tier, is_default
        ) VALUES (
            :uuid, :name, :slug, :acronym, :subdomain, :custom_domain, :motto, :vision, :campus, :address, :email, :phone, :principal_name, :director_name, :logo_url, :theme_primary, :theme_secondary, :theme_accent, :status, :subscription_tier, :is_default
        )
    ");

    // Primary Tenant 1: DLHS Kaduna
    $stmt->execute([
        ':uuid' => 'ten_dlhs_kaduna_01',
        ':name' => 'Deeper Life High School',
        ':slug' => 'dlhs-kaduna',
        ':acronym' => 'DLHS',
        ':subdomain' => 'kaduna',
        ':custom_domain' => null,
        ':motto' => 'Leadership with Distinction',
        ':vision' => 'To transform the world by producing upright leaders of the future through high quality and sound education',
        ':campus' => 'Kaduna Campus',
        ':address' => 'KM 16, Eastern Bye-Pass, Maraba Rido, Kaduna State, Nigeria',
        ':email' => 'ictkaduna@deeperlifehighschool.org',
        ':phone' => '08158190115',
        ':principal_name' => 'Mrs. Bamishe Olumuyiwa',
        ':director_name' => 'Pastor (Dr.) W. F. Kumuyi',
        ':logo_url' => 'uploads/logos/dlhs_logo.webp',
        ':theme_primary' => '#023047',
        ':theme_secondary' => '#219ebc',
        ':theme_accent' => '#ffb703',
        ':status' => 'active',
        ':subscription_tier' => 'enterprise',
        ':is_default' => 1
    ]);

    // Tenant 2: Grace International Academy
    $stmt->execute([
        ':uuid' => 'ten_grace_academy_02',
        ':name' => 'Grace International Academy',
        ':slug' => 'grace-academy',
        ':acronym' => 'GIA',
        ':subdomain' => 'grace',
        ':custom_domain' => null,
        ':motto' => 'Knowledge, Character, and Excellence',
        ':vision' => 'Inspiring young leaders to excel globally through innovative curriculum and moral fortitude',
        ':campus' => 'Abuja Campus',
        ':address' => 'Plot 402, Gwarinpa Estate, FCT Abuja, Nigeria',
        ':email' => 'admissions@graceacademy.sch.ng',
        ':phone' => '08023456789',
        ':principal_name' => 'Dr. Emmanuel Alabi',
        ':director_name' => 'Engr. David Okoye',
        ':logo_url' => 'uploads/logos/default_school.png',
        ':theme_primary' => '#1B2299',
        ':theme_secondary' => '#0B132B',
        ':theme_accent' => '#E4306D',
        ':status' => 'active',
        ':subscription_tier' => 'standard',
        ':is_default' => 0
    ]);

    // Tenant 3: Kingsway College
    $stmt->execute([
        ':uuid' => 'ten_kingsway_03',
        ':name' => 'Kingsway College',
        ':slug' => 'kingsway',
        ':acronym' => 'KC',
        ':subdomain' => 'kingsway',
        ':custom_domain' => null,
        ':motto' => 'Strive for the Highest Peak',
        ':vision' => 'Developing critical thinkers and technical innovators',
        ':campus' => 'Lekki Campus',
        ':address' => '12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
        ':email' => 'info@kingswaycollege.edu.ng',
        ':phone' => '07011223344',
        ':principal_name' => 'Mrs. Folashade Adeleke',
        ':director_name' => 'Mr. Babatunde Adeleke',
        ':logo_url' => 'uploads/logos/default_school.png',
        ':theme_primary' => '#0F766E',
        ':theme_secondary' => '#134E4A',
        ':theme_accent' => '#F59E0B',
        ':status' => 'active',
        ':subscription_tier' => 'standard',
        ':is_default' => 0
    ]);

    echo "✓ Seeded 3 tenants: DLHS Kaduna (Default), Grace Academy, and Kingsway College.\n";
} else {
    echo "✓ Tenants already exist ({$tenantCount} records found).\n";
}

// 3. Add `tenant_id` to operational tables
$tablesToTenantize = [
    'users',
    'classes',
    'courses',
    'student_assessments',
    'grades',
    'admissions',
    'student_registrations',
    'fees',
    'fee_payments',
    'exams',
    'attendance',
    'system_settings',
    'messages',
    'materials'
];

foreach ($tablesToTenantize as $table) {
    try {
        $chkCol = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE 'tenant_id'")->fetchAll();
        if (empty($chkCol)) {
            $conn->exec("ALTER TABLE `{$table}` ADD COLUMN tenant_id INT DEFAULT 1");
            $conn->exec("ALTER TABLE `{$table}` ADD INDEX idx_{$table}_tenant (tenant_id)");
            echo "✓ Added `tenant_id` column and index to `{$table}`.\n";
        } else {
            echo "  `tenant_id` already exists on `{$table}`.\n";
        }

        // Backfill any NULLs to default tenant 1
        $conn->exec("UPDATE `{$table}` SET tenant_id = 1 WHERE tenant_id IS NULL");
    } catch (\Throwable $e) {
        echo "! Warning on table `{$table}`: " . $e->getMessage() . "\n";
    }
}

echo "=== Multi-Tenant Architecture Migration Successfully Completed ===\n";
