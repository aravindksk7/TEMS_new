-- Test Environment Management System Database Schema

CREATE DATABASE IF NOT EXISTS test_env_management;
USE test_env_management;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'manager', 'developer', 'tester') DEFAULT 'tester',
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Environments table
CREATE TABLE environments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('dev', 'qa', 'staging', 'uat', 'production', 'demo') NOT NULL,
    status ENUM('available', 'in-use', 'maintenance', 'provisioning', 'decommissioned') DEFAULT 'available',
    description TEXT,
    url VARCHAR(255),
    server_details JSON,
    configuration JSON,
    tags JSON,
    capacity INT DEFAULT 1,
    current_usage INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_type (type)
);

-- Components table
CREATE TABLE components (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('application', 'service', 'database', 'cache', 'queue', 'api', 'frontend', 'backend', 'middleware', 'other') NOT NULL,
    version VARCHAR(50),
    status ENUM('active', 'inactive', 'deprecated', 'maintenance') DEFAULT 'active',
    description TEXT,
    repository_url VARCHAR(255),
    documentation_url VARCHAR(255),
    health_check_url VARCHAR(255),
    configuration JSON,
    metadata JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_name (name),
    INDEX idx_type (type),
    INDEX idx_status (status)
);

-- Environment-Component junction table (many-to-many)
CREATE TABLE environment_components (
    id INT PRIMARY KEY AUTO_INCREMENT,
    environment_id INT NOT NULL,
    component_id INT NOT NULL,
    deployment_status ENUM('deployed', 'pending', 'failed', 'stopped') DEFAULT 'deployed',
    port INT,
    endpoint VARCHAR(255),
    configuration_override JSON,
    deployment_notes TEXT,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployed_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (deployed_by) REFERENCES users(id),
    UNIQUE KEY unique_env_component (environment_id, component_id),
    INDEX idx_environment (environment_id),
    INDEX idx_component (component_id),
    INDEX idx_status (deployment_status)
);

-- Releases table (must be before bookings table due to foreign key)
CREATE TABLE releases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    release_type ENUM('major', 'minor', 'patch', 'hotfix') DEFAULT 'minor',
    status ENUM('planned', 'in-progress', 'testing', 'ready', 'deployed', 'completed', 'cancelled') DEFAULT 'planned',
    description TEXT,
    release_notes TEXT,
    target_date DATE,
    actual_release_date DATE NULL,
    release_manager_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (release_manager_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_target_date (target_date),
    INDEX idx_version (version)
);

-- Bookings/Reservations table
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    environment_id INT NOT NULL,
    user_id INT NOT NULL,
    release_id INT NULL,
    project_name VARCHAR(100),
    purpose TEXT,
    status ENUM('pending', 'approved', 'active', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    actual_start_time DATETIME NULL,
    actual_end_time DATETIME NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    auto_extend BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL,
    INDEX idx_environment_time (environment_id, start_time, end_time),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    INDEX idx_release (release_id)
);

-- Conflicts table
CREATE TABLE conflicts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id_1 INT NOT NULL,
    booking_id_2 INT NOT NULL,
    conflict_type ENUM('time_overlap', 'resource_contention', 'dependency') DEFAULT 'time_overlap',
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    resolution_status ENUM('unresolved', 'resolved', 'ignored') DEFAULT 'unresolved',
    resolution_notes TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    FOREIGN KEY (booking_id_1) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id_2) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_status (resolution_status)
);

-- Environment Monitoring table
CREATE TABLE environment_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    environment_id INT NOT NULL,
    metric_type ENUM('cpu', 'memory', 'disk', 'network', 'response_time', 'availability') NOT NULL,
    metric_value DECIMAL(10, 2),
    unit VARCHAR(20),
    status ENUM('normal', 'warning', 'critical') DEFAULT 'normal',
    metadata JSON,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    INDEX idx_environment_time (environment_id, recorded_at),
    INDEX idx_metric_type (metric_type)
);

-- Activities/Audit Log table
CREATE TABLE activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    entity_type ENUM('environment', 'booking', 'user', 'system', 'component', 'release') NOT NULL,
    entity_id INT,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_entity (entity_type, entity_id)
);

-- Comments/Collaboration table
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    entity_type ENUM('environment', 'booking', 'conflict') NOT NULL,
    entity_id INT NOT NULL,
    comment TEXT NOT NULL,
    parent_comment_id INT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user (user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('booking_reminder', 'conflict_alert', 'environment_status', 'approval_request', 'system') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created (created_at)
);

-- Teams table
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    INDEX idx_name (name)
);

-- Team Members junction table
CREATE TABLE team_members (
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member', 'lead') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Environment Access Control table
CREATE TABLE environment_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    environment_id INT NOT NULL,
    user_id INT NULL,
    team_id INT NULL,
    permission_level ENUM('view', 'book', 'manage', 'admin') DEFAULT 'view',
    granted_by INT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    INDEX idx_environment (environment_id),
    CHECK (user_id IS NOT NULL OR team_id IS NOT NULL)
);

-- Release-Environment junction table
CREATE TABLE release_environments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    release_id INT NOT NULL,
    environment_id INT NOT NULL,
    test_phase ENUM('unit', 'integration', 'system', 'uat', 'regression', 'performance', 'security') NOT NULL,
    status ENUM('pending', 'in-progress', 'passed', 'failed', 'blocked', 'skipped') DEFAULT 'pending',
    deployment_status ENUM('pending', 'deploying', 'deployed', 'successful', 'failed', 'rolled_back') DEFAULT 'pending',
    deployed_at TIMESTAMP NULL,
    deployed_by INT NULL,
    use_case TEXT,
    configuration JSON,
    test_start_date DATETIME NULL,
    test_end_date DATETIME NULL,
    assigned_to INT,
    test_results TEXT,
    defects_found INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (deployed_by) REFERENCES users(id),
    UNIQUE KEY unique_release_env_phase (release_id, environment_id, test_phase),
    INDEX idx_release (release_id),
    INDEX idx_environment (environment_id),
    INDEX idx_status (status)
);

-- Release Components (tracking which components are part of the release)
CREATE TABLE release_components (
    id INT PRIMARY KEY AUTO_INCREMENT,
    release_id INT NOT NULL,
    component_id INT NOT NULL,
    version VARCHAR(50),
    change_type ENUM('new', 'modified', 'deprecated', 'removed') DEFAULT 'modified',
    change_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    UNIQUE KEY unique_release_component (release_id, component_id),
    INDEX idx_release (release_id),
    INDEX idx_component (component_id)
);

-- Integration Settings table
CREATE TABLE integration_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    integration_type ENUM('jira', 'gitlab', 'github', 'slack') NOT NULL,
    settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_integration (user_id, integration_type),
    INDEX idx_user (user_id),
    INDEX idx_type (integration_type)
);

-- Insert default admin user (password: Admin@123)
INSERT INTO users (username, email, password_hash, full_name, role, department) VALUES
('admin', 'admin@testenv.com', '$2a$10$CSg9ZD1fba0ITbOfKP3ya.XKvMUDp7dym9WCWByEjdK2EEYHByWiK', 'System Administrator', 'admin', 'IT'),
('manager1', 'manager@testenv.com', '$2a$10$CSg9ZD1fba0ITbOfKP3ya.XKvMUDp7dym9WCWByEjdK2EEYHByWiK', 'Test Manager', 'manager', 'QA'),
('developer1', 'dev@testenv.com', '$2a$10$CSg9ZD1fba0ITbOfKP3ya.XKvMUDp7dym9WCWByEjdK2EEYHByWiK', 'John Developer', 'developer', 'Engineering'),
('tester1', 'tester@testenv.com', '$2a$10$CSg9ZD1fba0ITbOfKP3ya.XKvMUDp7dym9WCWByEjdK2EEYHByWiK', 'Jane Tester', 'tester', 'QA');

-- Insert sample environments
INSERT INTO environments (name, type, status, description, url, created_by) VALUES
('DEV-Environment-01', 'dev', 'available', 'Development environment for backend services', 'https://dev01.testenv.com', 1),
('QA-Environment-01', 'qa', 'in-use', 'QA environment for integration testing', 'https://qa01.testenv.com', 1),
('QA-Environment-02', 'qa', 'available', 'QA environment for regression testing', 'https://qa02.testenv.com', 1),
('STAGING-Environment-01', 'staging', 'available', 'Staging environment for pre-production testing', 'https://staging01.testenv.com', 1),
('UAT-Environment-01', 'uat', 'maintenance', 'User Acceptance Testing environment', 'https://uat01.testenv.com', 1),
('DEMO-Environment-01', 'demo', 'available', 'Demo environment for client presentations', 'https://demo01.testenv.com', 1);

-- Insert sample components
INSERT INTO components (name, type, version, status, description, created_by) VALUES
('Auth Service', 'service', '2.1.0', 'active', 'Authentication and authorization microservice', 1),
('User API', 'api', '1.5.2', 'active', 'User management REST API', 1),
('Payment Gateway', 'service', '3.0.1', 'active', 'Payment processing service', 1),
('MySQL Database', 'database', '8.0', 'active', 'Primary relational database', 1),
('Redis Cache', 'cache', '6.2', 'active', 'In-memory cache for session management', 1),
('RabbitMQ', 'queue', '3.9', 'active', 'Message queue for async processing', 1),
('Admin Dashboard', 'frontend', '2.0.0', 'active', 'Administrative web interface', 1),
('Customer Portal', 'frontend', '1.8.5', 'active', 'Customer-facing web application', 1),
('API Gateway', 'middleware', '1.2.0', 'active', 'API gateway and load balancer', 1),
('Notification Service', 'service', '1.3.0', 'active', 'Email and SMS notification service', 1);

-- Insert environment-component relationships
INSERT INTO environment_components (environment_id, component_id, deployment_status, port, deployed_by) VALUES
-- DEV-Environment-01
(1, 1, 'deployed', 8001, 1), -- Auth Service
(1, 2, 'deployed', 8002, 1), -- User API
(1, 4, 'deployed', 3306, 1), -- MySQL
(1, 5, 'deployed', 6379, 1), -- Redis
(1, 7, 'deployed', 3000, 1), -- Admin Dashboard
-- QA-Environment-01
(2, 1, 'deployed', 8001, 1), -- Auth Service
(2, 2, 'deployed', 8002, 1), -- User API
(2, 3, 'deployed', 8003, 1), -- Payment Gateway
(2, 4, 'deployed', 3306, 1), -- MySQL
(2, 5, 'deployed', 6379, 1), -- Redis
(2, 6, 'deployed', 5672, 1), -- RabbitMQ
(2, 7, 'deployed', 3000, 1), -- Admin Dashboard
(2, 8, 'deployed', 3001, 1), -- Customer Portal
-- QA-Environment-02
(3, 1, 'deployed', 8001, 1), -- Auth Service
(3, 2, 'deployed', 8002, 1), -- User API
(3, 4, 'deployed', 3306, 1), -- MySQL
(3, 7, 'deployed', 3000, 1), -- Admin Dashboard
-- STAGING
(4, 1, 'deployed', 8001, 1), -- Auth Service
(4, 2, 'deployed', 8002, 1), -- User API
(4, 3, 'deployed', 8003, 1), -- Payment Gateway
(4, 4, 'deployed', 3306, 1), -- MySQL
(4, 5, 'deployed', 6379, 1), -- Redis
(4, 6, 'deployed', 5672, 1), -- RabbitMQ
(4, 9, 'deployed', 8080, 1), -- API Gateway
(4, 7, 'deployed', 3000, 1), -- Admin Dashboard
(4, 8, 'deployed', 3001, 1), -- Customer Portal
(4, 10, 'deployed', 8004, 1); -- Notification Service

-- Insert sample bookings
INSERT INTO bookings (environment_id, user_id, project_name, purpose, status, start_time, end_time, priority) VALUES
(2, 3, 'Project Alpha', 'Integration testing for release 2.0', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 'high'),
(1, 3, 'Project Beta', 'Feature development', 'approved', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), 'medium'),
(4, 4, 'Project Gamma', 'Pre-production validation', 'pending', DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY), 'high');

-- Insert sample teams
INSERT INTO teams (name, description, manager_id) VALUES
('Backend Team', 'Backend development team', 2),
('QA Team', 'Quality Assurance team', 2),
('DevOps Team', 'DevOps and Infrastructure team', 1);

-- Insert team members
INSERT INTO team_members (team_id, user_id, role) VALUES
(1, 3, 'member'),
(2, 4, 'member'),
(3, 1, 'lead');

-- Insert sample releases
INSERT INTO releases (name, version, release_type, status, description, target_date, release_manager_id, created_by) VALUES
('Summer Release 2025', '3.0.0', 'major', 'testing', 'Major release with new payment features and UI overhaul', '2025-12-15', 2, 1),
('Q4 Hotfix', '2.5.1', 'hotfix', 'in-progress', 'Critical security patches and bug fixes', '2025-11-30', 2, 1),
('Winter Release 2026', '3.1.0', 'minor', 'planned', 'Performance improvements and new reporting features', '2026-02-01', 2, 1);

-- Insert release-environment associations
INSERT INTO release_environments (release_id, environment_id, test_phase, status, use_case, test_start_date, assigned_to) VALUES
-- Summer Release 3.0.0
(1, 1, 'unit', 'passed', 'Unit testing of payment gateway integration', '2025-11-01 09:00:00', 3),
(1, 2, 'integration', 'in-progress', 'Integration testing across all services', '2025-11-15 09:00:00', 4),
(1, 3, 'regression', 'pending', 'Full regression testing suite', NULL, 4),
(1, 4, 'uat', 'pending', 'User acceptance testing with stakeholders', NULL, 2),
-- Q4 Hotfix 2.5.1
(2, 2, 'integration', 'passed', 'Verify security patches do not break existing functionality', '2025-11-20 10:00:00', 4),
(2, 4, 'uat', 'in-progress', 'Quick UAT for hotfix validation', '2025-11-23 14:00:00', 2),
-- Winter Release 3.1.0
(3, 1, 'unit', 'pending', 'Unit testing of new reporting features', NULL, 3);

-- Insert release components
INSERT INTO release_components (release_id, component_id, version, change_type, change_description) VALUES
-- Summer Release 3.0.0
(1, 3, '3.1.0', 'modified', 'Added support for new payment providers'),
(1, 7, '2.1.0', 'modified', 'Complete UI redesign with new dashboard'),
(1, 8, '1.9.0', 'modified', 'Enhanced customer portal with payment history'),
(1, 10, '1.4.0', 'modified', 'Added SMS notifications for payment confirmations'),
-- Q4 Hotfix 2.5.1
(2, 1, '2.1.1', 'modified', 'Security patch for authentication vulnerability'),
(2, 2, '1.5.3', 'modified', 'Fixed user profile update bug'),
-- Winter Release 3.1.0
(3, 7, '2.2.0', 'new', 'New advanced reporting module'),
(3, 2, '1.6.0', 'modified', 'Performance optimization for user queries');

