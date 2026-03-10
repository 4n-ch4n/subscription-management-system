CREATE TABLE `users` (
  `id` CHAR(36) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` char(10),
  `is_active` bool DEFAULT true,
  `last_login` timestamp,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp
);

CREATE TABLE `user_organizations` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36),
  `company_id` char(24) NOT NULL,
  `rol_id` CHAR(36),
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `roles` (
  `id` CHAR(36) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `description` varchar(255)
);

CREATE TABLE `permissions` (
  `id` CHAR(36) PRIMARY KEY,
  `code` varchar(255) UNIQUE NOT NULL
);

CREATE TABLE `role_has_permissions` (
  `id` CHAR(36) PRIMARY KEY,
  `rol_id` CHAR(36),
  `permission_id` CHAR(36)
);

ALTER TABLE `user_organizations` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `user_organizations` ADD FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);

ALTER TABLE `role_has_permissions` ADD FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);

ALTER TABLE `role_has_permissions` ADD FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`);


INSERT INTO permissions (id, code) VALUES
('p1111111-1111-4444-8888-000000000001', 'user:create'),
('p1111111-1111-4444-8888-000000000002', 'user:edit'),
('p1111111-1111-4444-8888-000000000003', 'user:delete'),
('p1111111-1111-4444-8888-000000000004', 'company:edit'),
('p1111111-1111-4444-8888-000000000005', 'billing:view'),
('p1111111-1111-4444-8888-000000000006', 'billing:edit'),
('p1111111-1111-4444-8888-000000000007', 'reports:generate');

INSERT INTO roles (id, name, description) VALUES
('r2222222-2222-4444-8888-000000000001', 'OWNER', 'Full access to the company and billing settings.'),
('r2222222-2222-4444-8888-000000000002', 'ADMIN', 'Can manage users and company details but cannot delete the company.'),
('r2222222-2222-4444-8888-000000000003', 'EDITOR', 'Can edit content and generate reports.'),
('r2222222-2222-4444-8888-000000000004', 'VIEWER', 'Read-only access to company data.');

-- OWNER: Gets everything
INSERT INTO role_has_permissions (id, rol_id, permission_id) VALUES
('a0000001-0000-4444-8888-000000000001', 'r2222222-2222-4444-8888-000000000001', 'p1111111-1111-4444-8888-000000000001'), -- user:create
('a0000001-0000-4444-8888-000000000002', 'r2222222-2222-4444-8888-000000000001', 'p1111111-1111-4444-8888-000000000004'), -- company:edit
('a0000001-0000-4444-8888-000000000003', 'r2222222-2222-4444-8888-000000000001', 'p1111111-1111-4444-8888-000000000006'), -- billing:edit
('a0000001-0000-4444-8888-000000000004', 'r2222222-2222-4444-8888-000000000001', 'p1111111-1111-4444-8888-000000000007'); -- reports:generate

-- ADMIN: Can manage users but not billing
INSERT INTO role_has_permissions (id, rol_id, permission_id) VALUES
('a0000002-0000-4444-8888-000000000001', 'r2222222-2222-4444-8888-000000000002', 'p1111111-1111-4444-8888-000000000001'), -- user:create
('a0000002-0000-4444-8888-000000000002', 'r2222222-2222-4444-8888-000000000002', 'p1111111-1111-4444-8888-000000000002'), -- user:edit
('a0000002-0000-4444-8888-000000000003', 'r2222222-2222-4444-8888-000000000002', 'p1111111-1111-4444-8888-000000000007'); -- reports:generate

-- EDITOR: Can manage users and reports, but can only VIEW billing.
INSERT INTO role_has_permissions (id, rol_id, permission_id) VALUES
('a0000003-0000-4444-8888-000000000001', 'r2222222-2222-4444-8888-000000000003', 'p1111111-1111-4444-8888-000000000001'), -- user:create
('a0000003-0000-4444-8888-000000000002', 'r2222222-2222-4444-8888-000000000003', 'p1111111-1111-4444-8888-000000000002'), -- user:edit
('a0000003-0000-4444-8888-000000000003', 'r2222222-2222-4444-8888-000000000003', 'p1111111-1111-4444-8888-000000000007'), -- reports:generate
('a0000003-0000-4444-8888-000000000004', 'r2222222-2222-4444-8888-000000000003', 'p1111111-1111-4444-8888-000000000005'); -- billing:view

-- VIEWER: Only billing:view and reports:generate (read-only)
INSERT INTO role_has_permissions (id, rol_id, permission_id) VALUES
('a0000004-0000-4444-8888-000000000001', 'r2222222-2222-4444-8888-000000000004', 'p1111111-1111-4444-8888-000000000005'); -- billing:view
