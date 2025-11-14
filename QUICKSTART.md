# TEMS Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- 8GB RAM minimum
- Ports 3000, 5000, 3306 available

## Installation (2 minutes)

### Option 1: Using Setup Script (Recommended)

```bash
# Make setup script executable (Linux/Mac)
chmod +x setup.sh

# Run setup
./setup.sh
```

### Option 2: Manual Setup

```bash
# Start all containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Access the Application

Once containers are running:

1. **Frontend (Web UI)**: http://localhost:3000
2. **Backend API**: http://localhost:5000
3. **Health Check**: http://localhost:5000/health

## Login Credentials

### Admin Account
- **Email**: admin@tems.com
- **Password**: admin123
- **Permissions**: Full system access

### Manager Account
- **Email**: manager@tems.com
- **Password**: admin123
- **Permissions**: Manage environments, approve bookings

### Developer Account
- **Email**: dev@tems.com
- **Password**: admin123
- **Permissions**: Create bookings, deploy

### Tester Account
- **Email**: tester@tems.com
- **Password**: admin123
- **Permissions**: Create bookings, view environments

## First Steps

### 1. View Dashboard (Admin/Manager)
```
Login → Dashboard → View system overview
- Active environments
- Pending approvals
- Recent conflicts
- Health alerts
```

### 2. Browse Environments
```
Navigate to Environments → See available test environments
- DEV-01, TEST-01, TEST-02, STAGING-01, UAT-01 (pre-loaded)
```

### 3. Create a Booking
```
Environments → Select environment → Book
- Choose project name
- Set start and end time
- Select priority
- Submit for approval
```

### 4. Monitor Environment Health
```
Dashboard → Environment Metrics
- Real-time CPU, Memory, Disk usage
- Response time tracking
- Uptime monitoring
```

### 5. View Analytics
```
Analytics → Choose report type
- Utilization reports
- Booking trends
- Conflict statistics
- Performance metrics
```

## Common Tasks

### Create a New Environment (Admin/Manager)
```
POST /api/environments
{
  "name": "DEV-02",
  "type": "dev",
  "description": "Development environment for feature X",
  "url": "https://dev02.example.com"
}
```

### Approve a Booking (Admin/Manager)
```
Bookings → Pending → Select booking → Approve
```

### View Conflicts
```
Dashboard → Conflicts tab → See detected conflicts
- Time overlaps
- Resource contention
- Dependency issues
```

### Export Reports
```
Analytics → Select date range → Generate report
```

## API Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tems.com","password":"admin123"}'
```

### Get All Environments
```bash
TOKEN="your-jwt-token"
curl http://localhost:5000/api/environments \
  -H "Authorization: Bearer $TOKEN"
```

### Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment_id": 1,
    "project_name": "Feature Release 2.0",
    "purpose": "Integration testing",
    "start_time": "2024-12-01T09:00:00Z",
    "end_time": "2024-12-01T17:00:00Z",
    "priority": "high"
  }'
```

## Real-Time Features

The system uses WebSocket (Socket.IO) for real-time updates:

### Automatic Updates
- New bookings appear instantly
- Conflict detection alerts
- Environment metric changes
- Notifications

### Connect to WebSocket (Optional)
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('environment-updated', (data) => {
  console.log('Environment updated:', data);
});

socket.on('conflict-detected', (data) => {
  console.log('Conflict detected:', data);
});
```

## Monitoring Features

### Automated Tasks

1. **Conflict Detection** (Every 5 minutes)
   - Scans for booking overlaps
   - Checks resource availability
   - Validates dependencies

2. **Metrics Collection** (Every minute)
   - Updates CPU, memory, disk metrics
   - Monitors response times
   - Tracks uptime
   - Sends critical alerts

### Health Thresholds

- **Critical**: CPU/Memory/Disk > 90%, Uptime < 95%
- **Warning**: CPU/Memory/Disk > 75%, Uptime < 98%
- **Healthy**: All metrics within normal range

## Troubleshooting

### Containers Won't Start
```bash
# Check Docker is running
docker info

# View detailed logs
docker-compose logs -f mysql
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart
```

### Database Connection Failed
```bash
# Wait for MySQL to initialize (first startup takes ~30 seconds)
docker-compose logs mysql | grep "ready for connections"

# Test database connection
docker-compose exec mysql mysql -u tems_user -ptems_password -e "SELECT 1"
```

### Can't Login
```bash
# Verify database has users
docker-compose exec mysql mysql -u tems_user -ptems_password tems_db -e "SELECT email FROM users"

# Check backend logs
docker-compose logs backend | grep -i error
```

### Port Already in Use
```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :5000  # Backend
lsof -i :3306  # MySQL

# Stop conflicting services or change ports in docker-compose.yml
```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

## Performance Tips

1. **Allocate enough resources to Docker**
   - Minimum: 4GB RAM, 2 CPU cores
   - Recommended: 8GB RAM, 4 CPU cores

2. **Database Optimization**
   - Metrics are auto-cleaned after 30 days
   - Indexes are pre-configured
   - Connection pooling enabled

3. **Real-time Updates**
   - Socket.IO connections are managed efficiently
   - Automatic reconnection on disconnect

## Next Steps

1. ✅ System is running
2. ✅ You can login
3. 📝 Create your first environment
4. 📅 Make a booking
5. 📊 Explore analytics
6. 🔔 Set up notifications
7. 👥 Invite team members

## Getting Help

### Check Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Database Access
```bash
# Access MySQL shell
docker-compose exec mysql mysql -u tems_user -ptems_password tems_db

# Run queries
mysql> SELECT * FROM users;
mysql> SELECT * FROM environments;
mysql> SELECT * FROM bookings;
```

### API Documentation
- Full API docs in README.md
- Swagger/OpenAPI: Coming soon
- Postman collection: Available on request

## Support

For issues:
1. Check logs first
2. Review README.md
3. Verify all containers are running
4. Test API endpoints directly

---

**Ready to start managing your test environments!** 🚀
