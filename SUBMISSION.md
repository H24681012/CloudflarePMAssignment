# Product Manager Intern Assignment
## Cloudflare - Summer 2026

**Candidate**: Hamza Apeman
**Date**: February 1, 2026

---

# Project Links

| Resource | Link |
|----------|------|
| **Live Demo** | https://notebooklm-feedback.notebooklmfeedback.workers.dev |
| **GitHub Repository** | https://github.com/H24681012/CloudflarePMAssignment |

---

# Part 1: The Build Challenge

## Solution Overview

I built a **Feedback Aggregator Dashboard** that helps Product Managers make sense of scattered customer feedback. The prototype aggregates feedback from multiple sources (Reddit, Twitter, ProductHunt, App Store, forums, email) and uses AI to extract actionable insights.

### Key Features

1. **Overview Dashboard** - Visual summary showing sentiment distribution, urgency levels, and a "Pain Map" scatter plot that plots feedback by sentiment vs. urgency

2. **Feedback Feed** - A scrollable feed of all customer feedback with AI-generated sentiment and urgency scores displayed as visual indicators

3. **Semantic Clustering** - Interactive D3.js force-directed graph that groups similar feedback together using vector embeddings, revealing hidden patterns

4. **Jobs-to-be-Done Analysis** - AI-generated JTBD statements following Clay Christensen's framework, identifying the core jobs users are trying to accomplish

5. **Email Digest Preview** - Time-filtered summaries (24h, 7d, 90d) ready for stakeholder updates

### Design Philosophy

The prototype follows a clear separation between **inputs** and **outputs**:

- **Inputs (stored in database)**: Raw customer feedback text, source, author, timestamp
- **Outputs (computed by AI)**: Sentiment scores, urgency levels, themes, JTBD statements

This ensures that all insights are derived fresh from the source data, maintaining data integrity.

---

# Architecture Overview

## Cloudflare Products Used

I integrated **3 Cloudflare Developer Platform products** beyond Workers:

| Product | Binding | Purpose |
|---------|---------|---------|
| **D1 Database** | `env.DB` | Serverless SQL database storing feedback entries and extracted themes. Chosen for its native integration with Workers and SQL familiarity. |
| **Workers AI** | `env.AI` | Runs Llama 3.1-8b-instruct for sentiment analysis, urgency scoring, theme extraction, and JTBD generation. Also uses bge-base-en-v1.5 for generating embeddings. |
| **Vectorize** | `env.VECTORIZE` | Vector database storing embeddings for semantic similarity search. Enables clustering similar feedback even when they use different words. |

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                           │
│                   (Edge Runtime - Global)                        │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   D1 Database   │  │   Workers AI    │  │    Vectorize    │
│                 │  │                 │  │                 │
│ • Raw feedback  │  │ • Llama 3.1     │  │ • 768-dim       │
│ • Themes table  │  │   (analysis)    │  │   embeddings    │
│ • Timestamps    │  │ • bge-base      │  │ • Similarity    │
│                 │  │   (embeddings)  │  │   queries       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Why These Products?

**D1 Database**: I needed structured storage for feedback entries with SQL query capabilities. D1's serverless nature means zero connection management, and it's optimized for edge computing.

**Workers AI**: Instead of calling external APIs (OpenAI, etc.), Workers AI runs inference directly on Cloudflare's network with no cold starts. Llama 3.1 handles the NLP tasks well, and the embedding model enables semantic search.

**Vectorize**: Traditional keyword search would miss feedback that expresses the same pain point differently. Vectorize enables semantic similarity—"audio is terrible" clusters with "voices sound robotic" even though they share no keywords.

---

# Part 2: Cloudflare Product Insights

## Friction Log Summary

I documented **11 friction points** during development. Here are the **5 most impactful**:

---

### Insight #1: Windows ARM64 Developers Are Blocked

**Title**: Workerd doesn't support Windows ARM64 architecture

**Problem**: When running `npm create cloudflare@latest` on my Surface laptop, the installation failed with `Error: Unsupported platform: win32 arm64 LE`. The workerd package (local Workers runtime) doesn't support ARM-based Windows devices. There was no guidance on alternatives—I had to discover WSL as a workaround through trial and error.

**Suggestion**:
1. Add platform detection at the START of setup with a helpful message: "Windows ARM64 detected. For now, please use WSL. Run `wsl --install` to get started."
2. Create a dedicated "Windows ARM64 Setup Guide" in the documentation
3. Prioritize ARM64 Windows support in the workerd roadmap—this is a growing market segment

---

### Insight #2: Local vs Remote D1 Databases Cause Silent Failures

**Title**: Running migrations locally doesn't set up the remote database

**Problem**: I set up my database schema using `--local` mode and everything worked. When I deployed and tested remotely, I got "no such table: feedback". The local and remote D1 databases are completely separate, but there's no warning when switching modes. The error message didn't hint at the actual problem.

**Suggestion**:
1. Show a warning when switching modes: "Note: Local and remote databases are separate. Make sure you've run migrations on both."
2. Improve the error message: "Table 'feedback' not found. If you set up tables locally, run migrations with `--remote` flag."
3. Add a `wrangler d1 sync` command to copy schema between local and remote

---

### Insight #3: AI Binding Shows "Not Supported" Without Explanation

**Title**: Local dev mode shows AI as "not supported" without telling you what to do

**Problem**: When running `npx wrangler dev`, the terminal showed `env.AI - AI - not supported`. No explanation of WHY or what to do about it. I wasted time thinking my setup was broken before discovering I needed `--remote` flag.

**Suggestion**:
1. Change the message to: "AI binding requires remote mode. Run `npx wrangler dev --remote` to test AI features."
2. Add this prominently to the Workers AI documentation
3. Consider automatically using remote mode for AI calls while keeping other bindings local

---

### Insight #4: API Token Permissions Are Unclear

**Title**: Unclear which permission level (Read vs Edit) is needed for each product

**Problem**: When creating an API token for deployment, I didn't know that Vectorize needs **Edit** permission to call `upsert()`. I set it to "Read" and got a cryptic permission error. The "Edit Cloudflare Workers" template doesn't include Vectorize permissions at all.

**Suggestion**:
1. Add tooltips in the token creation UI explaining what each permission level allows
2. When permission errors occur, include which specific permission is needed
3. Update the "Edit Cloudflare Workers" template to include all common bindings (D1, AI, Vectorize, KV)

---

### Insight #5: 500 Errors Provide No Debug Information

**Title**: Worker errors return generic 500 with no stack trace or details

**Problem**: When my `/api/seed` endpoint failed, the browser showed a generic 500 error. The actual error was `D1_ERROR: no such column: job_to_be_done`—useful information that was completely hidden. I had to wrap everything in try-catch and use curl to see error details.

**Suggestion**:
1. In development mode, return full error details including stack traces
2. Add a `--verbose` flag to `wrangler dev` that shows detailed error responses
3. Provide a standard error response format: `{ error: string, code: string, stack?: string }`

---

## Additional Friction Points Documented

| # | Title | Product | Impact |
|---|-------|---------|--------|
| 6 | Dev server keeps disconnecting | Wrangler CLI | Confusing testing experience |
| 7 | No native outbound email | Workers | Couldn't build email digest feature |
| 8 | npx wrangler install loop | CLI | Blocker on affected systems |
| 9 | File cleanup errors on Windows | CLI | Corrupted project state |
| 10 | No AI rate limit guidance | Workers AI | Guesswork on batch sizes |
| 11 | Hot reload doesn't work | Wrangler CLI | Manual restarts required |

Full details available in the GitHub repository's `FRICTION_LOG.md`.

---

# Vibe-Coding Context

**Tool Used**: Claude Code (Anthropic's official CLI for Claude)

## How I Used It

Claude Code helped me rapidly iterate on the prototype. I described the features I wanted, and it generated the Worker code, D1 schema, and frontend HTML/CSS. When I encountered errors, it helped debug by reading error messages and suggesting fixes.

## Sample Prompts That Worked Well

1. **Initial Setup**: "Create a Cloudflare Worker that aggregates customer feedback with sentiment analysis using Workers AI and stores results in D1"

2. **Visualization**: "Add a D3.js force-directed graph to visualize feedback clusters based on Vectorize similarity scores"

3. **JTBD Framework**: "Implement Jobs-to-be-Done extraction following Clay Christensen's framework from First Round Capital - focus on circumstances and progress, not demographics"

4. **Bug Fixing**: "The pain map chart shows values going to 10.5 instead of staying within 0-10. Fix the axis clamping."

5. **Data Modeling**: "The JTBD should be computed on-demand by AI, never stored in the database. The database should only store raw feedback as inputs."

## What Worked Well

- Rapid prototyping—got a working dashboard in ~2 hours
- Debugging assistance when Cloudflare-specific errors occurred
- Iterating on UI/UX based on feedback
- Learning Cloudflare APIs through generated code examples

## Challenges

- Claude sometimes generated code that used deprecated Cloudflare APIs
- Had to manually verify that bindings were configured correctly in wrangler.jsonc
- Some AI-generated D1 queries needed optimization for edge runtime

---

# Conclusion

This prototype demonstrates how Cloudflare's developer platform can power AI-driven feedback analysis tools. The combination of D1, Workers AI, and Vectorize provides a complete stack for building intelligent applications at the edge.

The friction points I documented represent opportunities to improve the developer experience—particularly around Windows ARM64 support, error messaging, and the local/remote development gap. As a PM, I would prioritize the platform detection and helpful error messages as quick wins, while planning longer-term improvements to ARM64 support and AI binding documentation.

---

*Built with Claude Code • Deployed on Cloudflare Workers • February 2026*
