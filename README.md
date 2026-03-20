# Ticketing System

Full-stack ticket management system built with a Django REST + WebSocket backend and a Vue 3 frontend.

## Tech Stack

- Backend: Django, Django REST Framework, Channels, PostgreSQL
- Frontend: Vue 3, TypeScript, Vite, Pinia, PrimeVue
- Realtime: WebSockets (ticket messages and assignment notifications)

## Repository Layout

```text
.
├── backend/      # Django API + realtime server
├── frontend/     # Vue client app
└── docker-compose.yml
```

## Prerequisites

- Docker + Docker Compose (for containerized setup)
- Node.js 20+ and npm (for frontend local dev)
- Python 3.12+ and PostgreSQL (for backend local dev without Docker)

## Quick Start (Recommended)

This project ships a Docker setup for API + database. Run frontend locally.

1. Start backend and database:

   ```bash
   docker compose up --build
   ```

2. In a second terminal, start frontend:

   ```bash
   cd frontend
   npm install
   echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env.local # optional for dev but required for prod
   npm run dev
   ```

3. Open:
   - Frontend: `http://localhost:5173`

## Default Seeded Users

On first backend startup, initial users are created automatically (if the users table is empty):

- Admin: `admin@paylik.local` / `Admin@12345`
- Agent: `agent@paylik.local` / `Agent@12345`
- Customer: `customer@paylik.local` / `Customer@12345`

These values can be overridden with environment variables in `docker-compose.yml`.

## Stop Services

If using Docker Compose:

```bash
docker compose down
```

To also remove the PostgreSQL volume:

```bash
docker compose down -v
```

## Improvements To Be Done

- Add backend automated tests for authentication, ticket lifecycle, permissions, and realtime notification flows.
- Add frontend unit/component tests (Vitest) for stores, services, and key views.
