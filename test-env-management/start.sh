#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Test Environment Management System                      ║"
echo "║   Starting Docker containers...                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "🔧 Building and starting containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ Application is starting!"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:5000"
echo "🗄️  MySQL:     localhost:3306"
echo ""
echo "👤 Demo Login:"
echo "   Email:    admin@testenv.com"
echo "   Password: Admin@123"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop:      docker-compose down"
echo ""
