# NotebookLM Feedback Aggregator

**Product Manager Intern Assignment - Cloudflare (Summer 2026)**

## Project Links

- **Live Demo**: https://notebooklm-feedback.notebooklmfeedback.workers.dev
- **GitHub Repository**: https://github.com/H24681012/CloudflarePMAssignment

---

## What This Prototype Does

This prototype is a **Feedback Aggregator Dashboard** that helps Product Managers make sense of scattered customer feedback from multiple sources (Reddit, Twitter, ProductHunt, App Store, forums, email).

### Key Features

| Feature | Description |
|---------|-------------|
| **Overview Dashboard** | Visual summary with sentiment/urgency scores, pain map chart, and theme distribution |
| **Feedback Feed** | Twitter-style scrollable feed of all customer feedback with AI-generated sentiment/urgency scores |
| **Cluster Analysis** | D3.js force-directed graph showing semantically similar feedback using vector embeddings |
| **Jobs-to-be-Done** | AI-generated JTBD statements following Clay Christensen's framework |
| **Email Digest** | Preview of time-filtered summaries (24h, 7d, 90d) for stakeholder updates |

### How It Works

1. **Raw feedback** is stored in D1 Database (the INPUT)
2. **Workers AI (Llama 3.1)** analyzes each item for sentiment, urgency, and themes
3. **Vector embeddings** are generated and stored in Vectorize for semantic search
4. **JTBD statements** are computed on-demand (never stored - they're OUTPUT, not INPUT)

---

## Architecture Overview

### Cloudflare Products Used

| Product | Purpose | Why Chosen |
|---------|---------|------------|
| **Cloudflare Workers** | Hosting & API | Serverless compute with global edge deployment. Zero cold starts. |
| **D1 Database** | Data storage | Native serverless SQL for storing feedback entries and themes. Easy schema management. |
| **Workers AI** | Analysis | Llama 3.1-8b-instruct for sentiment analysis, theme extraction, urgency scoring, and JTBD generation. bge-base-en-v1.5 for embeddings. |
| **Vectorize** | Semantic search | Store and query vector embeddings to find similar feedback and create clusters. |

### Data Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Mock Feedback │ ──▶ │  D1 Database │ ──▶ │   Dashboard UI  │
│   (30 items)    │     │  (raw input) │     │                 │
└─────────────────┘     └──────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Workers AI     │
                    │  (Llama 3.1)     │
                    │  - Sentiment     │
                    │  - Urgency       │
                    │  - Themes        │
                    │  - JTBD          │
                    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │    Vectorize     │
                    │  (bge-base-en)   │
                    │  - Embeddings    │
                    │  - Similarity    │
                    └──────────────────┘
```

### Bindings Configuration (wrangler.jsonc)

```jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "notebooklm-feedback-db"
  }],
  "ai": {
    "binding": "AI"
  },
  "vectorize": [{
    "binding": "VECTORIZE",
    "index_name": "feedback-embeddings"
  }]
}
```

---

## Cloudflare Product Insights (Friction Log)

See **[FRICTION_LOG.md](./FRICTION_LOG.md)** for 11 detailed friction points encountered during development.

### Top 5 Friction Points Summary

| # | Issue | Impact | Suggested Fix |
|---|-------|--------|---------------|
| 1 | **Workerd doesn't support Windows ARM64** | Complete blocker for ARM Windows users | Add platform detection with WSL guidance |
| 2 | **Local vs Remote D1 confusion** | Deploy failures due to missing migrations | Warn when deploying if remote schema differs |
| 3 | **AI binding shows "not supported" locally** | Thought setup was broken | Show actionable message about `--remote` flag |
| 4 | **No native outbound email support** | Couldn't build email notification feature | Add `env.EMAIL.send()` binding |
| 5 | **Generic 500 errors with no debug info** | Significant debugging time wasted | Return detailed errors in dev mode |

---

## Vibe-Coding Context

**Tool Used**: Claude Code (Anthropic's CLI for Claude)

### Sample Prompts That Helped Build This

1. "Create a Cloudflare Worker that aggregates customer feedback with sentiment analysis using Workers AI"

2. "Add a D3.js force-directed graph to visualize feedback clusters based on Vectorize similarity scores"

3. "Implement Jobs-to-be-Done extraction following Clay Christensen's framework - focus on circumstances and progress, not demographics"

4. "The JTBD should follow the First Round Capital format: When I [circumstance], but [barrier], help me [progress], so I can [outcome]"

5. "Add varied timestamps to seed data so the digest page shows different data for 24h/7d/90d periods"

---

## Running Locally

```bash
cd notebooklm-feedback
npm install
npx wrangler dev --remote  # --remote required for AI binding
```

## Deploying

```bash
npx wrangler deploy
```

---

## File Structure

```
CloudflarePMAssignment/
├── README.md                 # This file (deliverable overview)
├── FRICTION_LOG.md           # 11 documented friction points
├── CLAUDE.md                 # AI assistant instructions
├── notebooklm-feedback/
│   ├── src/index.ts          # Main Worker code (~1400 lines)
│   ├── wrangler.jsonc        # Cloudflare bindings config
│   ├── schema.sql            # D1 database schema
│   └── package.json
└── Product_Manager_Intern_Assignment_UK.pdf
```

---

*Built with Claude Code • Deployed on Cloudflare Workers • February 2026*
