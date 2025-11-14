# Test Environment Management System - Quick Start Guide

## 🚀 What You've Got

A complete, enterprise-grade Test Environment Management System with:

✅ **Real-time monitoring** of test environments
✅ **Intelligent conflict detection** for booking overlaps
✅ **Automated scheduling** with approval workflows
✅ **Analytics & reporting** with exportable data
✅ **Collaboration tools** (comments, notifications)
✅ **Role-based access control** (Admin, Manager, Developer, Tester)
✅ **WebSocket real-time updates**
✅ **Dockerized deployment** - runs anywhere!

## 📦 What's Included

```
test-env-management/
├── 🐳 docker-compose.yml      # One command to run everything
├── 📖 README.md               # Complete documentation
├── 🚀 start.sh                # Easy startup script
│
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── controllers/       # 6 feature controllers
│   │   ├── routes/            # RESTful API routes
│   │   ├── middleware/        # Auth & security
│   │   └── server.js          # WebSocket + Cron jobs
│   └── database/init.sql      # Complete schema + demo data
│
└── frontend/                  # Next.js + React UI
    ├── src/
    │   ├── app/              # Next.js 14 App Router
    │   ├── components/       # 8 feature components
    │   └── lib/              # API client + Socket.io
    └── Dockerfile
```

## 🎯 Features Breakdown

### 1. Environment Orchestration
- Create and manage test environments (Dev, QA, Staging, UAT, etc.)
- Track status: Available, In-Use, Maintenance, Provisioning
- Server configuration and metadata
- Tag-based organization

### 2. Real-Time Monitoring
- Live environment health tracking
- Metrics: CPU, Memory, Disk, Network, Response Time
- Automated alerts for critical issues
- WebSocket-powered live updates
- Health score calculation

### 3. Conflict Detection & Scheduling
- Automatic detection of booking overlaps
- Intelligent conflict resolution tracking
- Priority-based booking (Low → Critical)
- Approval workflow for managers
- Automated reminders 30 minutes before bookings

### 4. Reporting & Analytics
- Environment utilization reports
- User activity tracking
- Booking trends over time
- Conflict analysis
- Performance metrics
- CSV export functionality

### 5. Collaboration & Communication
- Comment system on environments and bookings
- Real-time notifications
- Activity audit logs
- Team management
- User @mentions

### 6. Security & Access Control
- JWT authentication (24-hour tokens)
- Role-based permissions:
  * **Admin**: Full system access
  * **Manager**: Approve bookings, create environments
  * **Developer/Tester**: Create bookings, view data
- Bcrypt password hashing
- SQL injection protection
- XSS prevention

## 🏃 Running the Application

### Option 1: Using the Start Script (Easiest!)

```bash
./start.sh
```

That's it! The script will:
- Check Docker is running
- Build all containers
- Start all services
- Show you the access URLs

### Option 2: Manual Docker Compose

```bash
docker-compose up --build
```

### Access the Application

1. Open browser to **http://localhost:3000**
2. Login with:
   - **Email**: admin@testenv.com
   - **Password**: Admin@123

## 👥 Demo User Accounts

| Role      | Email                  | Password  | Capabilities                    |
|-----------|------------------------|-----------|----------------------------------|
| Admin     | admin@testenv.com      | Admin@123 | Full system access              |
| Manager   | manager@testenv.com    | Admin@123 | Approve bookings, manage envs   |
| Developer | dev@testenv.com        | Admin@123 | Create bookings, view data      |
| Tester    | tester@testenv.com     | Admin@123 | Create bookings, collaborate    |

## 🎮 Using the Application

### Dashboard
- Overview of system health
- Environment status distribution
- Active bookings and conflicts
- Upcoming bookings (next 24 hours)
- Recent activity feed
- Critical alerts

### Environments Page
- View all test environments
- Filter by status or type
- Search by name
- See current bookings
- Create new environments (Admin/Manager)

### Bookings Page
- View your bookings
- Create new reservations
- See approval status
- Track conflicts
- Priority management

### Monitoring Page
- Real-time metrics dashboard
- Environment health scores
- Performance graphs
- Critical alerts
- Live updates via WebSocket

### Analytics Page
- Utilization reports
- Booking trends
- Conflict analysis
- Performance metrics
- Export to CSV

## 🔄 Automated Tasks

The system runs these background jobs automatically:

1. **Every 5 minutes**: Scan for booking conflicts
2. **Every minute**: Update booking statuses (start/complete)
3. **Every 5 minutes**: Send booking reminders
4. **Every 2 minutes**: Collect environment metrics (demo simulation)

## 🌐 API Endpoints

**Base URL**: http://localhost:5000/api

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - New user registration
- `GET /auth/me` - Current user info

### Environments
- `GET /environments` - List all
- `GET /environments/:id` - Get details
- `POST /environments` - Create (Admin/Manager)
- `PUT /environments/:id` - Update (Admin/Manager)
- `DELETE /environments/:id` - Delete (Admin)

### Bookings
- `GET /bookings` - List all bookings
- `GET /bookings/my-bookings` - Your bookings
- `POST /bookings` - Create booking
- `PATCH /bookings/:id/status` - Approve/Reject (Manager)

### Monitoring
- `GET /monitoring/dashboard` - Live dashboard data
- `GET /monitoring/metrics` - All metrics
- `GET /monitoring/environments/:id/health` - Health status

### Analytics
- `GET /analytics/dashboard` - Analytics overview
- `GET /analytics/utilization` - Utilization report
- `GET /analytics/trends` - Booking trends
- `GET /analytics/export` - Export CSV

## 🔌 Real-Time Features

The app uses **Socket.io** for live updates:

### Events You'll See
- `metric_update` - Environment metrics updated
- `conflict_detected` - New conflict found
- `booking_completed` - Booking finished

### How It Works
1. Connect to WebSocket on page load
2. Join environment-specific rooms
3. Receive real-time updates
4. UI updates automatically

## 🛠️ Tech Stack Details

### Frontend
- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Utility-first styling
- **Socket.io Client**: Real-time connections
- **Axios**: HTTP client
- **Recharts**: Data visualization
- **React Hot Toast**: Notifications

### Backend
- **Node.js + Express**: REST API server
- **MySQL 8.0**: Relational database
- **Socket.io**: WebSocket server
- **JWT**: Authentication tokens
- **Node-cron**: Scheduled jobs
- **Bcrypt**: Password hashing

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Health Checks**: Automatic service monitoring

## 📊 Database Schema Highlights

- **12 tables** covering all features
- **Foreign key relationships** for data integrity
- **Indexes** on frequently queried fields
- **JSON columns** for flexible metadata
- **Timestamps** on all records
- **Cascading deletes** where appropriate

## 🎨 UI Components

All components are responsive and modern:
- Login page with registration
- Sidebar navigation
- Header with notifications bell
- Dashboard with live widgets
- Environment cards with status badges
- Booking table with filters
- Monitoring graphs
- Analytics charts
- Settings panels

## 🔐 Security Features

- JWT tokens (24-hour expiry)
- Bcrypt password hashing (10 rounds)
- Role-based access control
- Helmet.js security headers
- CORS protection
- Parameterized SQL queries
- Input validation
- Audit logging

## 📈 Performance Features

- Database connection pooling
- Efficient queries with proper indexes
- Real-time updates only when needed
- Lazy loading of components
- Optimized Docker images
- Health check endpoints

## 🐛 Troubleshooting

### App won't start?
```bash
docker-compose down -v
docker-compose up --build
```

### Can't connect to MySQL?
```bash
docker-compose logs mysql
```

### Frontend can't reach backend?
Check that backend is running on port 5000

### Port already in use?
Edit `docker-compose.yml` and change the ports

### See all logs?
```bash
docker-compose logs -f
```

## 🎯 Next Steps

1. **Explore the dashboard** - See real-time data
2. **Create a booking** - Test the conflict detection
3. **Check notifications** - See automated alerts
4. **View analytics** - Explore the reports
5. **Test different roles** - Login as different users
6. **Watch real-time updates** - See WebSocket in action

## 📚 Additional Resources

- **Full README.md**: Complete documentation
- **API Documentation**: All endpoints documented
- **Database Schema**: See init.sql for structure
- **Code Comments**: Well-documented codebase

## 💡 Pro Tips

1. Open browser DevTools to see WebSocket messages
2. Watch Docker logs to see cron jobs running
3. Try creating overlapping bookings to see conflict detection
4. Check notifications bell for real-time alerts
5. Use different user accounts to test permissions

## 🎉 You're All Set!

Your Test Environment Management System is ready to use. Start by:
1. Running `./start.sh` or `docker-compose up`
2. Opening http://localhost:3000
3. Logging in as admin@testenv.com
4. Exploring the features!

**Enjoy managing your test environments! 🚀**
