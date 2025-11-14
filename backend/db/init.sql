-- Test Environment Management System Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'developer', 'tester') NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Environments table
CREATE TABLE IF NOT EXISTS environments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('dev', 'test', 'staging', 'uat', 'production') NOT NULL,
    status ENUM('available', 'in-use', 'maintenance', 'failed') DEFAULT 'available',
    description TEXT,
    url VARCHAR(500),
    database_name VARCHAR(255),
    database_host VARCHAR(255),
    server_details JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (type)
);

-- Bookings/Reservations table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment_id INT NOT NULL,
    user_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    purpose TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    approved_by INT,
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_env_time (environment_id, start_time, end_time),
    INDEX idx_status (status)
);

-- Environment monitoring metrics
CREATE TABLE IF NOT EXISTS environment_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment_id INT NOT NULL,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    response_time INT,
    uptime_percentage DECIMAL(5,2),
    active_connections INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    INDEX idx_env_time (environment_id, recorded_at)
);

-- Conflict detection logs
CREATE TABLE IF NOT EXISTS conflicts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment_id INT NOT NULL,
    booking_id_1 INT,
    booking_id_2 INT,
    conflict_type ENUM('time-overlap', 'resource-contention', 'dependency-issue') NOT NULL,
    description TEXT,
    status ENUM('detected', 'resolved', 'ignored') DEFAULT 'detected',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INT,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id_1) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id_2) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_entity (entity_type, entity_id)
);

-- Comments/Collaboration
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(50),
    related_entity_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
);

-- Environment dependencies
CREATE TABLE IF NOT EXISTS environment_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment_id INT NOT NULL,
    depends_on_environment_id INT NOT NULL,
    dependency_type ENUM('data', 'service', 'configuration') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_environment_id) REFERENCES environments(id) ON DELETE CASCADE
);

-- Deployment history
CREATE TABLE IF NOT EXISTS deployments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment_id INT NOT NULL,
    booking_id INT,
    version VARCHAR(100),
    deployed_by INT NOT NULL,
    status ENUM('success', 'failed', 'in-progress') NOT NULL,
    build_number VARCHAR(100),
    release_notes TEXT,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (deployed_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_env_time (environment_id, deployed_at)
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password, full_name, role, department) VALUES
('admin@tems.com', '$2b$10$X8qZ4HqQJ9YW6y/K7XU8XeHGqIE8MXQK3YvnGJlKl8mGP9YnPKHWa', 'Admin User', 'admin', 'IT'),
('manager@tems.com', '$2b$10$X8qZ4HqQJ9YW6y/K7XU8XeHGqIE8MXQK3YvnGJlKl8mGP9YnPKHWa', 'Manager User', 'manager', 'QA'),
('dev@tems.com', '$2b$10$X8qZ4HqQJ9YW6y/K7XU8XeHGqIE8MXQK3YvnGJlKl8mGP9YnPKHWa', 'Developer User', 'developer', 'Engineering'),
('tester@tems.com', '$2b$10$X8qZ4HqQJ9YW6y/K7XU8XeHGqIE8MXQK3YvnGJlKl8mGP9YnPKHWa', 'Tester User', 'tester', 'QA');

-- Insert sample environments
INSERT INTO environments (name, type, status, description, url, database_name, created_by) VALUES
('DEV-01', 'dev', 'available', 'Development environment for feature testing', 'https://dev01.example.com', 'dev01_db', 1),
('TEST-01', 'test', 'available', 'Primary testing environment', 'https://test01.example.com', 'test01_db', 1),
('TEST-02', 'test', 'in-use', 'Secondary testing environment', 'https://test02.example.com', 'test02_db', 1),
('STAGING-01', 'staging', 'available', 'Staging environment for UAT', 'https://staging01.example.com', 'staging01_db', 1),
('UAT-01', 'uat', 'available', 'User acceptance testing environment', 'https://uat01.example.com', 'uat01_db', 1);
