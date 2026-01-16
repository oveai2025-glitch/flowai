# 🚀 FlowAtGenAi - Quick Start Guide

## Prerequisites

Before you begin, make sure you have installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm** (recommended) or npm - `npm install -g pnpm`
- **Docker & Docker Compose** - [Download](https://www.docker.com/)

## Step-by-Step Installation

### 1. Extract the ZIP and enter the directory

```bash
unzip flowatgenai-complete.zip
cd flowatgenai
```

### 2. Install dependencies

```bash
pnpm install
# OR
npm install
```

### 3. Set up environment variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env if needed (defaults work for development)
```

### 4. Start the database and services

```bash
# Start PostgreSQL, Redis, and Temporal
docker-compose up -d

# Wait a few seconds for services to start
sleep 10
```

### 5. Set up the database

```bash
# Generate Prisma client
pnpm db:generate
# OR
npx prisma generate

# Run database migrations
pnpm db:push
# OR
npx prisma db push
```

### 6. Start the development server

```bash
pnpm dev
# OR
npm run dev
```

### 7. Open in browser

Visit: **http://localhost:3000**

---

## 🎉 You're Done!

You should now see the FlowAtGenAi dashboard.

---

## Troubleshooting

### Error: "Module not found"
```bash
# Delete node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Error: "Database connection failed"
```bash
# Make sure Docker is running
docker-compose up -d

# Check if PostgreSQL is running
docker ps | grep postgres
```

### Error: "Prisma client not generated"
```bash
npx prisma generate
```

### Port 3000 already in use
```bash
# Use a different port
pnpm dev -- -p 3001
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

---

## Need Help?

- Check the full README.md for more documentation
- Open an issue on GitHub
