# 🚀 START HERE - TEMS Quick Launch

## ⚡ 3-Minute Quick Start

### Step 1: Navigate to Project
```bash
cd tems-app
```

### Step 2: Start Everything
```bash
docker-compose up --build
```

### Step 3: Access Application
```
Browser: http://localhost:3000
Username: admin
Password: Admin@123
```

**Done! You're running TEMS!** 🎉

---

## 📚 Documentation Map

```
├── 🌟 PROJECT_INDEX.md          ← Overview of everything
├── 🎯 DEPLOYMENT_GUIDE.md       ← Complete deployment guide  
├── 📖 README.md                 ← Full technical docs
├── 🎓 GETTING_STARTED.md        ← User guide & tutorials
└── 🏗️  ARCHITECTURE.md           ← System architecture
```

**Start with: [PROJECT_INDEX.md](./tems-app/PROJECT_INDEX.md)**

---

## ✨ What You Have

✅ Full-stack web application  
✅ Real-time monitoring with WebSocket  
✅ 26+ REST API endpoints  
✅ 9 database tables  
✅ 3,427 lines of code  
✅ Docker containerized  
✅ Production ready  

---

## 🎯 Key Features

1. **Environment Management** - Track and manage test environments
2. **Real-Time Monitoring** - Live status updates every 30 seconds
3. **Conflict Detection** - Automatic booking conflict detection
4. **Scheduling System** - Book and reserve environments
5. **Analytics & Reports** - Utilization and health reports
6. **Team Collaboration** - Comments and notifications

---

## 🔑 Default Credentials

| User | Password | Role |
|------|----------|------|
| admin | Admin@123 | Administrator |
| john.manager | Admin@123 | Manager |
| sarah.dev | Admin@123 | Developer |
| mike.tester | Admin@123 | Tester |

---

## 🐳 Docker Commands

```bash
# Start application
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Reset everything (including data)
docker-compose down -v
```

---

## 🌐 Access Points

- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:3001
- **WebSocket**: ws://localhost:3001
- **MySQL**: localhost:3306

---

## 📱 Application Pages

1. **Dashboard** (`/dashboard`) - Overview and real-time metrics
2. **Environments** (`/environments`) - Manage test environments
3. **Bookings** (`/bookings`) - Schedule reservations
4. **Reports** (`/reports`) - Analytics and insights

---

## 🛠️ Technology Stack

**Backend**: Node.js + Express + Socket.IO + MySQL  
**Frontend**: Next.js + React + Tailwind CSS  
**Container**: Docker + Docker Compose  

---

## 📖 Read Next

1. **[PROJECT_INDEX.md](./tems-app/PROJECT_INDEX.md)** - Complete overview
2. **[DEPLOYMENT_GUIDE.md](./tems-app/DEPLOYMENT_GUIDE.md)** - Detailed setup
3. **[GETTING_STARTED.md](./tems-app/GETTING_STARTED.md)** - User guide

---

## 🎓 Features Walkthrough

### Create Environment
1. Go to Environments page
2. Click "Add Environment"
3. Fill in details
4. Click Create

### Book Environment
1. Go to Bookings page
2. Click "New Booking"
3. Select environment and times
4. Click Create Booking

### View Reports
1. Go to Reports page
2. Select date range
3. View analytics

---

## ✅ Quick Health Check

After starting, verify:

- [ ] Containers running: `docker-compose ps`
- [ ] Can access web: http://localhost:3000
- [ ] Can login with admin credentials
- [ ] Dashboard loads with data
- [ ] Environments page shows 5 sample environments

---

## 🐛 Quick Troubleshooting

**Can't access application?**
- Wait 20 seconds for database initialization
- Check: `docker-compose logs app`

**Database errors?**
- Restart: `docker-compose restart`
- Check: `docker-compose logs mysql`

**Port already in use?**
- Stop other services on ports 3000, 3001, 3306
- Or edit `docker-compose.yml` to use different ports

---

## 🚀 You're Ready!

Run this command and start exploring:

```bash
cd tems-app && docker-compose up --build
```

Open http://localhost:3000 and login with `admin` / `Admin@123`

**Enjoy your Test Environment Management System!** 🎉
