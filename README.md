# Test Environment Management System (TEMS)

A comprehensive enterprise-grade Test Environment Management System built with Node.js, Next.js, React, and MySQL, running in Docker containers.

## Features

### 1. Environment Orchestration
- Create, update, and manage multiple test environments (DEV, TEST, STAGING, UAT, PRODUCTION)
- Environment dependencies tracking
- Environment status management (Available, In-Use, Maintenance, Failed)
- Server details and configuration management

### 2. Real-Time Monitoring
- Live environment health metrics (CPU, Memory, Disk, Response Time, Uptime)
- Real-time dashboard with Socket.IO integration
- Environment status tracking
- Performance metrics visualization with charts
- Health scoring system with automated alerts

### 3. Conflict Detection & Scheduling
- Automated conflict detection for overlapping bookings
- Resource contention monitoring
- Dependency conflict checking
- Smart scheduling with availability calendar
- Booking approval workflow

### 4. Reporting and Analytics
- Environment utilization reports
- Booking trends analysis
- User activity reports
- Conflict statistics
- Deployment analytics
- Performance metrics reports
- Comprehensive custom date range reports

### 5. Collaboration and Communication
- Comments system for bookings
- Real-time notifications
- Activity logging
- User mentions and updates
- Booking status updates

### 6. Security and Access Control
- Role-based access control (Admin, Manager, Developer, Tester)
- JWT-based authentication
- Secure password hashing with bcrypt
- Activity audit logs
- IP tracking
- User session management

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   MySQL DB      │
│   (Next.js)     │     │   (Express.js)  │     │                 │
│   Port: 3000    │     │   Port: 5000    │     │   Port: 3306    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        └────────────────────────┘
         Socket.IO (Real-time)
```

## Technology Stack

### Backend
- **Node.js** with **Express.js** - REST API server
- **MySQL 8.0** - Relational database
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Node-cron** - Scheduled tasks for monitoring

### Frontend
- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Socket.IO Client** - Real-time updates
- **Axios** - HTTP client
- **Zustand** - State management

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Prerequisites

- Docker Desktop (includes Docker and Docker Compose)
- Git (optional, for cloning)

## Quick Start

### 1. Start the Application

```bash
# Navigate to project directory
cd test-environment-management-system

# Start all services
docker-compose up -d

# Check if containers are running
docker-compose ps
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MySQL**: localhost:3306

### 3. Default Login Credentials

```
Admin:
Email: admin@tems.com
Password: admin123

Manager:
Email: manager@tems.com
Password: admin123

Developer:
Email: dev@tems.com
Password: admin123

Tester:
Email: tester@tems.com
Password: admin123
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Environments
- `GET /api/environments` - List all environments
- `GET /api/environments/:id` - Get environment details
- `POST /api/environments` - Create environment (Admin/Manager)
- `PUT /api/environments/:id` - Update environment (Admin/Manager)
- `DELETE /api/environments/:id` - Delete environment (Admin)
- `GET /api/environments/:id/availability` - Check availability

### Bookings
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `POST /api/bookings/:id/approve` - Approve booking (Admin/Manager)
- `POST /api/bookings/:id/reject` - Reject booking (Admin/Manager)
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/extend` - Extend booking

### Monitoring
- `GET /api/monitoring/environments/:id/metrics` - Get environment metrics
- `GET /api/monitoring/environments/metrics/latest` - Latest metrics for all
- `GET /api/monitoring/environments/:id/health` - Environment health status
- `GET /api/monitoring/dashboard` - Dashboard overview

### Analytics
- `GET /api/analytics/utilization` - Environment utilization report
- `GET /api/analytics/booking-trends` - Booking trends
- `GET /api/analytics/user-activity` - User activity report
- `GET /api/analytics/conflicts` - Conflict statistics
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/deployments` - Deployment statistics
- `GET /api/analytics/report` - Comprehensive report

### Conflicts
- `GET /api/conflicts` - List conflicts
- `POST /api/conflicts/:id/resolve` - Resolve conflict (Admin/Manager)
- `POST /api/conflicts/:id/ignore` - Ignore conflict (Admin/Manager)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread/count` - Unread count

### Comments
- `GET /api/comments/booking/:bookingId` - Get booking comments
- `POST /api/comments` - Add comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Deployments
- `GET /api/deployments` - List deployments
- `POST /api/deployments` - Record deployment
- `PUT /api/deployments/:id` - Update deployment

### Activities
- `GET /api/activities` - Get activity logs (Admin/Manager)
- `GET /api/activities/me` - Get user's own activities

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USER=tems_user
DB_PASSWORD=tems_password
DB_NAME=tems_db
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Database Schema

The application uses 13 main tables:
- **users** - User accounts and roles
- **environments** - Test environment definitions
- **bookings** - Environment reservations
- **environment_metrics** - Performance metrics
- **conflicts** - Detected conflicts
- **activity_logs** - Audit trail
- **comments** - Collaboration comments
- **notifications** - User notifications
- **environment_dependencies** - Environment relationships
- **deployments** - Deployment history

## Scheduled Tasks

### Conflict Detection (Every 5 minutes)
- Scans for time overlaps between bookings
- Detects resource contention
- Checks dependency issues
- Sends notifications

### Metrics Update (Every minute)
- Updates environment performance metrics
- Monitors CPU, memory, disk usage
- Tracks uptime and response times
- Triggers alerts for critical issues

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Rebuild containers
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d

# Access MySQL shell
docker-compose exec mysql mysql -u tems_user -p tems_db
```

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Security Features

1. **Authentication**: JWT-based with 24-hour expiration
2. **Password Security**: Bcrypt hashing with salt rounds
3. **Role-Based Access**: Four user roles with granular permissions
4. **Audit Logging**: Complete activity trail
5. **Input Validation**: Express-validator for API inputs
6. **SQL Injection Prevention**: Parameterized queries
7. **CORS Protection**: Configured CORS middleware
8. **Helmet.js**: HTTP security headers

## Monitoring Features

1. **Real-time Metrics**: CPU, Memory, Disk, Response Time, Uptime
2. **Health Scoring**: 0-100 score based on multiple factors
3. **Automated Alerts**: Notifications for critical thresholds
4. **Historical Data**: 30-day metric retention
5. **Dashboard**: Comprehensive system overview
6. **Socket.IO**: Live metric updates

## Inspired By

This system implements best practices from enterprise tools like:
- **Planview**: Environment pipeline management and resource optimization
- **Enov8**: Environment booking, conflict detection, and release coordination

## Features Comparison

| Feature | Planview | Enov8 | TEMS |
|---------|----------|-------|------|
| Environment Management | ✓ | ✓ | ✓ |
| Real-time Monitoring | ✓ | ✓ | ✓ |
| Conflict Detection | ✓ | ✓ | ✓ |
| Booking System | ✓ | ✓ | ✓ |
| Analytics & Reports | ✓ | ✓ | ✓ |
| Role-based Access | ✓ | ✓ | ✓ |
| Real-time Updates | - | ✓ | ✓ |
| Open Source | - | - | ✓ |
| Self-hosted | - | - | ✓ |

## Troubleshooting

### Database Connection Issues
```bash
# Check MySQL container
docker-compose logs mysql

# Wait for MySQL to be ready
docker-compose exec mysql mysqladmin ping -h localhost
```

### Frontend Can't Connect to Backend
- Ensure backend is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Verify NEXT_PUBLIC_API_URL is correct

### Permission Issues
- Check user role in database
- Verify JWT token is valid
- Check activity logs for access denied entries

## Support

For issues and questions:
1. Check the logs: `docker-compose logs -f`
2. Review the API documentation above
3. Check database connectivity
4. Verify environment variables

## License

MIT License - Feel free to use and modify for your needs.

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

---

Built with ❤️ for DevOps and QA teams
