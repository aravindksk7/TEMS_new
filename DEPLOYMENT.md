# TEMS Deployment Guide

## What You've Received

A complete, containerized Test Environment Management System with:

### ✅ Backend (Node.js/Express)
- RESTful API with 40+ endpoints
- Real-time WebSocket support
- Automated conflict detection
- Environment monitoring service
- JWT authentication
- Role-based access control

### ✅ Frontend (Next.js/React)
- Modern responsive UI
- Real-time updates
- Dashboard with analytics
- Environment management interface
- Booking system
- TypeScript for type safety

### ✅ Database (MySQL)
- Pre-configured schema with 13 tables
- Sample data included
- Optimized indexes
- Automated cleanup jobs

### ✅ Docker Setup
- Multi-container orchestration
- Health checks
- Volume persistence
- Network isolation

## File Structure

```
test-environment-management-system/
├── docker-compose.yml          # Container orchestration
├── setup.sh                    # Quick setup script
├── README.md                   # Comprehensive documentation
├── QUICKSTART.md              # Quick start guide
├── .env.example               # Environment variables template
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # Main server entry
│   ├── config/
│   │   └── database.js        # DB connection
│   ├── middleware/
│   │   └── auth.js            # Authentication
│   ├── routes/
│   │   ├── auth.js            # Login/register
│   │   ├── environments.js    # Environment CRUD
│   │   ├── bookings.js        # Booking management
│   │   ├── monitoring.js      # Real-time metrics
│   │   ├── analytics.js       # Reports
│   │   ├── conflicts.js       # Conflict resolution
│   │   ├── notifications.js   # User notifications
│   │   ├── comments.js        # Collaboration
│   │   ├── deployments.js     # Deployment tracking
│   │   └── activities.js      # Audit logs
│   ├── services/
│   │   ├── conflictService.js # Conflict detection
│   │   └── monitoringService.js # Metrics collection
│   └── db/
│       └── init.sql           # Database schema
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── app/
    │   ├── layout.tsx         # Root layout
    │   ├── page.tsx           # Homepage
    │   └── globals.css        # Global styles
    └── lib/
        └── api.ts             # API utilities
```

## Deployment Options

### Option 1: Local Development (Recommended for Testing)

```bash
# 1. Extract the files
tar -xzf tems-application.tar.gz
cd test-environment-management-system

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Option 2: Production Deployment

#### Prerequisites
- Linux server with Docker installed
- Domain name (optional)
- SSL certificate (recommended)
- Reverse proxy (Nginx/Traefik)

#### Steps

1. **Prepare Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Upload Application**
```bash
# Upload files to server
scp tems-application.tar.gz user@server:/opt/

# Extract on server
ssh user@server
cd /opt
tar -xzf tems-application.tar.gz
cd test-environment-management-system
```

3. **Configure for Production**
```bash
# Update environment variables
nano docker-compose.yml

# Change these values:
# - JWT_SECRET: Use strong random string
# - DB_PASSWORD: Use strong password
# - Expose backend on internal port only if using reverse proxy
```

4. **Setup Reverse Proxy (Nginx Example)**
```nginx
# /etc/nginx/sites-available/tems

server {
    listen 80;
    server_name tems.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

5. **Enable SSL (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tems.yourdomain.com
```

6. **Start Application**
```bash
./setup.sh

# Or manually
docker-compose up -d

# Enable auto-restart
docker update --restart=always tems_mysql tems_backend tems_frontend
```

7. **Setup Monitoring (Optional)**
```bash
# Add to crontab for health checks
crontab -e

# Add this line to check every 5 minutes
*/5 * * * * curl -f http://localhost:5000/health || docker-compose restart
```

### Option 3: Cloud Deployment (AWS/Azure/GCP)

#### AWS EC2 Example

1. **Launch EC2 Instance**
   - Ubuntu Server 22.04 LTS
   - t3.medium or larger (2 vCPU, 4GB RAM minimum)
   - 20GB+ storage
   - Security Group: Open ports 80, 443, 22

2. **Configure Instance**
```bash
# Connect to instance
ssh -i your-key.pem ubuntu@ec2-ip-address

# Follow production deployment steps above
```

3. **Use RDS for Database (Recommended)**
```bash
# Update docker-compose.yml to use RDS endpoint
# Remove MySQL container
# Update DB_HOST to RDS endpoint
```

4. **Setup Auto Scaling (Optional)**
   - Create AMI from configured instance
   - Setup Auto Scaling Group
   - Configure Load Balancer

## Configuration

### Environment Variables

#### Backend
```env
NODE_ENV=production
DB_HOST=mysql                    # Change to RDS endpoint in production
DB_PORT=3306
DB_USER=tems_user
DB_PASSWORD=CHANGE_THIS         # Use strong password
DB_NAME=tems_db
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING  # Use strong secret
PORT=5000
```

#### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:5000  # Change to your domain
```

### Security Considerations

1. **Change Default Passwords**
```sql
-- Update default user passwords
UPDATE users SET password = '$2b$10$YourHashedPassword' WHERE email = 'admin@tems.com';
```

2. **Restrict Database Access**
   - Use firewall rules
   - Only allow backend container to access MySQL
   - Use strong passwords

3. **Enable HTTPS**
   - Always use SSL in production
   - Redirect HTTP to HTTPS
   - Use HSTS headers

4. **Regular Backups**
```bash
# Backup database
docker-compose exec mysql mysqldump -u tems_user -p tems_db > backup.sql

# Backup volumes
docker run --rm --volumes-from tems_mysql -v $(pwd):/backup ubuntu tar cvf /backup/backup.tar /var/lib/mysql
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:5000/health

# Check containers
docker-compose ps

# View logs
docker-compose logs -f
```

### Database Maintenance
```bash
# Access database
docker-compose exec mysql mysql -u tems_user -p tems_db

# Check table sizes
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) as Size_MB
FROM information_schema.TABLES
WHERE table_schema = 'tems_db';

# Optimize tables
OPTIMIZE TABLE environment_metrics;
```

### Log Rotation
```bash
# Setup logrotate
sudo nano /etc/logrotate.d/docker-tems

# Add configuration
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
```

## Scaling

### Horizontal Scaling
- Use multiple backend instances behind load balancer
- Shared MySQL/RDS database
- Redis for session management (add to stack)
- Sticky sessions for WebSocket

### Vertical Scaling
- Increase Docker memory limits
- Upgrade database instance
- Add more CPU cores

## Troubleshooting

See QUICKSTART.md for common issues and solutions.

## Updates

### Updating the Application
```bash
# Pull new code
git pull  # or upload new files

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### Database Migrations
```bash
# Backup first!
docker-compose exec mysql mysqldump -u tems_user -p tems_db > backup.sql

# Run migration
docker-compose exec mysql mysql -u tems_user -p tems_db < migration.sql
```

## Support

- 📚 Documentation: README.md
- 🚀 Quick Start: QUICKSTART.md
- 🐛 Issues: Check logs with `docker-compose logs`
- 💬 API Docs: Available in README.md

---

**Your Test Environment Management System is ready to deploy!** 🎉
