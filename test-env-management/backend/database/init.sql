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

-- Bookings/Reservations table
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    environment_id INT NOT NULL,
    user_id INT NOT NULL,
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
    INDEX idx_environment_time (environment_id, start_time, end_time),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
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
    entity_type ENUM('environment', 'booking', 'user', 'system') NOT NULL,
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
