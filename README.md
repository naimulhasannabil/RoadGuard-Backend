# RoadGuard Backend

Real-Time Driver & Traveller Alert System - Backend API

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string and secrets
   ```

3. **Setup database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Create uploads folder**
   ```bash
   mkdir uploads
   ```

5. **Start server**
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:5000`

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/alerts | Get all alerts |
| POST | /api/alerts | Create alert |
| GET | /api/alerts/nearby | Get nearby alerts |
| POST | /api/votes/:alertId | Vote on alert |
| POST | /api/sos | Create SOS request |
| GET | /api/admin/dashboard | Admin stats |

## 🔌 WebSocket Events

- `new_alert` - New alert created
- `alert_updated` - Alert updated
- `alert_expired` - Alert expired
- `nearby_alert` - Alert near user
- `sos_nearby` - SOS request nearby
