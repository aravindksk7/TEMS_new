# Envify

A comprehensive, enterprise-grade Test Environment Management System built with Next.js, React, Node.js, Express, and MySQL, featuring real-time monitoring, conflict detection, analytics, and collaboration tools.

## 🎯 Features

### 1. **Environment Orchestration**
- Create, manage, and monitor test environments
- Support for multiple environment types (Dev, QA, Staging, UAT, Production, Demo)
- Environment status tracking (Available, In-Use, Maintenance, Provisioning, Decommissioned)
- Server configuration management
- Tag-based organization

### 2. **Real-Time Monitoring**
- Live environment status tracking
- Performance metrics (CPU, Memory, Disk, Network, Response Time)
- Health score calculation
- Critical alerts and notifications
- WebSocket-based real-time updates
- Automated metrics collection (simulated every 2 minutes)

### 3. **Intelligent Booking & Scheduling**
- Environment reservation system
- Automated conflict detection
- Time-based booking management
- Priority levels (Low, Medium, High, Critical)
- Approval workflow
- Auto-completion of expired bookings
- Booking reminders (30 minutes before start)

### 4. **Conflict Detection & Resolution**
- Automatic detection of time overlaps
- Conflict severity classification
- Resolution tracking
- Real-time conflict notifications
- Automated conflict scanning (every 5 minutes)

### 5. **Reporting & Analytics**
- Environment utilization reports
- User activity tracking
- Booking trends analysis
- Conflict analysis
- Performance metrics
- Export reports to CSV
- Comprehensive analytics dashboard

### 6. **Collaboration & Communication**
- Comment system for environments and bookings
- Real-time notifications
- Activity logging
- Team management
- User mentions and discussions

### 7. **Security & Access Control**
- JWT-based authentication
- Role-based access control (Admin, Manager, Developer, Tester)
- Environment-level permissions
- Audit logging
- Secure password hashing (bcrypt)
- Session management

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (React 18)
- Tailwind CSS
- Socket.io Client (Real-time updates)
- Axios (API communication)
- React Hot Toast (Notifications)
- Recharts (Data visualization)
- Lucide React (Icons)

**Backend:**
- Node.js & Express
- MySQL 8.0
- Socket.io (WebSocket server)
- JWT Authentication
- Node-cron (Scheduled tasks)
- Winston (Logging)
- Helmet (Security headers)

**Infrastructure:**
- Docker & Docker Compose
- Containerized deployment
- Health check monitoring
- Persistent data volumes

## 🚀 Getting Started

### Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0 or higher
- 4GB RAM minimum
- Ports 3000, 5000, and 3306 available

### Quick Start

1. **Clone or extract the project:**
```bash
cd test-env-management
```

2. **Start the application:**
```bash
docker-compose up --build
```

This will start all services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MySQL Database**: localhost:3306

3. **Access the application:**
   - Open your browser to http://localhost:3000
   - Login with demo credentials:
     - Email: `admin@testenv.com`
     - Password: `Admin@123`

### Additional Demo Users

```
Manager:
- Email: manager@testenv.com
- Password: Admin@123

Developer:
- Email: dev@testenv.com
- Password: Admin@123

Tester:
- Email: tester@testenv.com
- Password: Admin@123
```

## 📊 API Documentation

### Authentication Endpoints

```
POST   /api/auth/login          - User login
POST   /api/auth/register       - User registration
GET    /api/auth/me             - Get current user
```

### Environment Endpoints

```
GET    /api/environments                    - List all environments
GET    /api/environments/:id                - Get environment details
GET    /api/environments/:id/availability   - Check availability
GET    /api/environments/statistics         - Get statistics
POST   /api/environments                    - Create environment (Admin/Manager)
PUT    /api/environments/:id                - Update environment (Admin/Manager)
DELETE /api/environments/:id                - Delete environment (Admin)
```

### Booking Endpoints

```
GET    /api/bookings                - List all bookings
GET    /api/bookings/:id            - Get booking details
GET    /api/bookings/my-bookings    - Get user's bookings
GET    /api/bookings/statistics     - Get booking statistics
POST   /api/bookings                - Create booking
PATCH  /api/bookings/:id/status     - Update booking status (Admin/Manager)
```

### Monitoring Endpoints

```
GET    /api/monitoring/dashboard                    - Get monitoring dashboard
GET    /api/monitoring/metrics                      - Get all metrics
GET    /api/monitoring/environments/:id/metrics     - Get environment metrics
GET    /api/monitoring/environments/:id/health      - Get environment health
POST   /api/monitoring/metrics                      - Record metric (Admin/Manager)
```

### Analytics Endpoints

```
GET    /api/analytics/dashboard      - Analytics dashboard
GET    /api/analytics/utilization    - Environment utilization
GET    /api/analytics/user-activity  - User activity report
GET    /api/analytics/conflicts      - Conflict analysis
GET    /api/analytics/trends         - Booking trends
GET    /api/analytics/performance    - Performance metrics
GET    /api/analytics/export         - Export report (CSV)
```

### Notification & Collaboration Endpoints

```
GET    /api/notifications            - Get user notifications
PATCH  /api/notifications/:id/read   - Mark as read
PATCH  /api/notifications/read-all   - Mark all as read
DELETE /api/notifications/:id        - Delete notification

GET    /api/comments                 - Get comments
POST   /api/comments                 - Add comment
PUT    /api/comments/:id             - Update comment
DELETE /api/comments/:id             - Delete comment
```

## 🔄 Real-Time Features

The application uses Socket.io for real-time updates:

### WebSocket Events

**Client → Server:**
- `join_environment` - Subscribe to environment updates
- `leave_environment` - Unsubscribe from environment updates

**Server → Client:**
- `metric_update` - Environment metric updated
- `conflict_detected` - New conflict detected
- `booking_completed` - Booking completed

## ⚙️ Automated Tasks

The system runs several automated cron jobs:

1. **Conflict Detection** (Every 5 minutes)
   - Scans for booking time overlaps
   - Creates conflict records
   - Sends notifications

2. **Booking Status Updates** (Every minute)
   - Starts approved bookings
   - Completes expired bookings
   - Updates environment status

3. **Booking Reminders** (Every 5 minutes)
   - Sends notifications 30 minutes before booking starts

4. **Metrics Collection** (Every 2 minutes)
   - Simulates environment metrics (CPU, Memory, Response Time)
   - Triggers critical alerts when needed

## 🗄️ Database Schema

Key tables:
- **users** - User accounts and authentication
- **environments** - Test environment definitions
- **bookings** - Environment reservations
- **conflicts** - Detected booking conflicts
- **environment_metrics** - Performance metrics
- **activities** - Audit log
- **comments** - Collaboration comments
- **notifications** - User notifications
- **teams** - Team management
- **environment_permissions** - Access control

## 🛠️ Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=test_env_management
DB_USER=tem_user
DB_PASSWORD=tem_password
JWT_SECRET=your_secret_key
PORT=5000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📱 User Roles & Permissions

### Admin
- Full system access
- Create/delete environments
- Manage users
- Approve/reject bookings
- Access all analytics

### Manager
- Create environments
- Approve/reject bookings
- Access team analytics
- Manage team members

### Developer
- Create bookings
- View environments
- Comment on bookings
- View personal analytics

### Tester
- Create bookings
- View environments
- Comment on bookings
- View personal analytics

## 🔐 Security Features

- JWT-based authentication with 24-hour expiry
- bcrypt password hashing (10 rounds)
- Role-based access control (RBAC)
- Helmet.js security headers
- CORS protection
- SQL injection prevention (parameterized queries)
- XSS protection
- Rate limiting ready
- Audit logging

## 🐳 Docker Services

The application consists of three services:

### 1. MySQL Database
- Image: mysql:8.0
- Port: 3306
- Volume: Persistent data storage
- Health check: Automatic startup validation

### 2. Backend API
- Built from: ./backend/Dockerfile
- Port: 5000
- Dependencies: MySQL (health-dependent)
- WebSocket server included

### 3. Frontend
- Built from: ./frontend/Dockerfile
- Port: 3000
- Dependencies: Backend API

## 📈 Monitoring Dashboard

The dashboard displays:
- Total environments by status
- Active bookings count
- Unresolved conflicts
- System health percentage
- Environment type distribution
- Upcoming bookings (next 24 hours)
- Critical alerts
- Recent activities

## 🔧 Troubleshooting

### Application won't start:
```bash
docker-compose down -v
docker-compose up --build
```

### Database connection issues:
```bash
docker-compose logs mysql
```

### Frontend can't reach backend:
Check NEXT_PUBLIC_API_URL in frontend service

### Port conflicts:
Change ports in docker-compose.yml

## 📦 Project Structure

```
test-env-management/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API controllers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Authentication & validation
│   │   ├── config/           # Database config
│   │   └── server.js         # Main server file
│   ├── database/
│   │   └── init.sql          # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app directory
│   │   ├── components/       # React components
│   │   ├── lib/              # API & utilities
│   │   └── styles/           # CSS styles
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml         # Container orchestration
```

## 🎨 UI Components

- **Dashboard** - Overview with real-time metrics
- **Environments** - Environment list and management
- **Bookings** - Booking calendar and management
- **Monitoring** - Real-time health monitoring
- **Analytics** - Reports and insights
- **Settings** - User and system settings

## 🌟 Key Highlights

✅ **Enterprise-Ready**: Built following industry best practices
✅ **Scalable Architecture**: Containerized microservices
✅ **Real-Time Updates**: WebSocket integration
✅ **Intelligent Automation**: Conflict detection & resolution
✅ **Comprehensive Analytics**: Data-driven insights
✅ **Modern UI/UX**: Responsive, intuitive interface
✅ **Security First**: Multi-layer security implementation
✅ **Production-Ready**: Docker deployment ready

## 📞 Support

For issues, questions, or contributions:
1. Check the troubleshooting section
2. Review API documentation
3. Examine logs: `docker-compose logs [service-name]`

## 📝 License

MIT License - Feel free to use this for your projects!

---

**Built with ❤️ using Next.js, Node.js, and MySQL**
