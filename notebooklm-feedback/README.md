# NotebookLM Feedback Aggregator

A prototype tool that aggregates and analyzes feedback about NotebookLM from multiple sources using Cloudflare's developer platform.

## Cloudflare Products Used

| Product | Purpose |
|---------|---------|
| **Workers** | Hosting the API and dashboard |
| **D1** | Storing feedback entries |
| **Workers AI** | Sentiment analysis and theme extraction |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Login to Cloudflare
```bash
npx wrangler login
```

### 3. Run in development mode (remote)
```bash
npm run dev
```
This runs on Cloudflare's servers (required for Windows ARM64).

### 4. Deploy to production
```bash
npm run deploy
```

## Project Structure

```
notebooklm-feedback/
├── src/
│   └── index.ts      # Main Worker code
├── schema.sql        # D1 database schema
├── wrangler.jsonc    # Cloudflare configuration
├── package.json      # Dependencies and scripts
└── tsconfig.json     # TypeScript configuration
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard home page |
| GET | `/api/health` | Health check |
| GET | `/api/feedback` | List all feedback |
| POST | `/api/feedback` | Add new feedback |
| POST | `/api/analyze` | Trigger AI analysis |
| GET | `/api/themes` | Get aggregated themes |

## Setting Up D1 Database

```bash
# Create the database
npx wrangler d1 create notebooklm-feedback-db

# Copy the database_id from output and add to wrangler.jsonc

# Run the schema
npx wrangler d1 execute notebooklm-feedback-db --file=./schema.sql
```

## Development Notes

- Use `npm run dev` for remote development (recommended for ARM64 Windows)
- Use `npm run dev:local` for local development (requires supported platform)
- Check logs with `npx wrangler tail` after deploying
