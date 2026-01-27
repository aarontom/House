# Prediction Market MVP

A sleek prediction market application where users can create markets, trade YES/NO positions, and see transparent auto-resolution with proof pages.

## Features

- **Market Creation** - Create prediction markets from templates (crypto, sports, weather, custom)
- **Trading** - Buy and sell YES/NO positions using an AMM pricing model
- **Auto-Resolution** - Markets automatically resolve using authoritative data sources
- **Proof Pages** - Transparent resolution with links to data sources and calculation steps
- **Modern UI** - Dark theme with real-time probability displays

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (zero config, file-based)
- **Scheduling**: node-cron for auto-resolution

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start backend (runs on port 3001)
cd backend
npm run dev

# Terminal 2: Start frontend (runs on port 5173)
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the application.

## Project Structure

```
prediction_cursor/
├── frontend/          # React + Vite frontend
├── backend/           # Express API backend
├── shared/            # Shared TypeScript types
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/markets` | List all markets |
| GET | `/api/markets/:id` | Get market details |
| POST | `/api/markets` | Create new market |
| GET | `/api/templates` | List market templates |
| POST | `/api/trading/quote` | Get trade price quote |
| POST | `/api/trading/buy` | Execute buy order |
| POST | `/api/trading/sell` | Execute sell order |
| GET | `/api/users/:id/positions` | Get user positions |
| GET | `/api/resolutions/:marketId` | Get resolution proof |

## Default User

For demo purposes, a default user is created:
- **Username**: demo
- **Email**: demo@example.com
- **Password**: demo123
- **Starting Balance**: $1,000 virtual currency
