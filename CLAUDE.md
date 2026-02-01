# CLAUDE.md - AI Assistant Guide

## Project Overview

This repository contains a **Cloudflare Product Manager Intern Assignment (Summer 2026)**. The goal is to build a prototype tool that aggregates and analyzes customer feedback from multiple sources (support tickets, Discord, GitHub issues, email, social media, forums) to extract themes, urgency, value, and sentiment.

**Key Insight**: The prototype outcome is secondary to the insights gathered while building it. A broken prototype with brilliant product critique is valued over a perfect prototype with no feedback.

## Repository Structure

```
CloudflarePMAssignment/
├── CLAUDE.md                                    # This file - AI assistant guide
├── Product_Manager_Intern_Assignment_UK.pdf     # Assignment specification
└── [prototype code to be built]                 # Cloudflare Workers project
```

### Expected Structure After Setup

After running `npm create cloudflare@latest`, the project should include:

```
CloudflarePMAssignment/
├── src/
│   └── index.ts (or index.js)    # Main Worker entry point
├── wrangler.jsonc                 # Cloudflare Workers configuration & bindings
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration (if using TS)
├── node_modules/                  # Dependencies
└── ...
```

## Technology Stack

### Primary Platform
- **Cloudflare Workers** - Serverless computing platform for hosting

### Cloudflare Developer Platform Products (use 2-3)

| Product | Purpose | Use Case |
|---------|---------|----------|
| **Workers AI** | ML models (Llama 3) | Sentiment analysis, summarization |
| **D1 Database** | Serverless SQL | Store structured feedback entries |
| **Workflows** | Multi-step orchestration | Feedback pipeline (Receive → Analyze → Notify) |
| **AI Search** | RAG pipeline | Semantic search for similar complaints/themes |
| **KV Storage** | Key-value store | Cache, configuration, session data |
| **R2 Storage** | Object storage | Unstructured data (images, PDFs) |

### Development Tools
- **npm** - Package manager
- **wrangler** - Cloudflare CLI for deployment
- **Vibe-coding tools** - Claude Code, Windsurf, Cursor (recommended)

## Development Workflow

### Initial Setup
```bash
# Create new Cloudflare Workers project
npm create cloudflare@latest

# Navigate to project directory
cd <project-name>

# Install dependencies
npm install
```

### Local Development
```bash
# Start local development server
npx wrangler dev

# Run with specific bindings for local testing
npx wrangler dev --local
```

### Deployment
```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# View deployment logs
npx wrangler tail
```

### Database Operations (D1)
```bash
# Create a D1 database
npx wrangler d1 create <database-name>

# Run migrations
npx wrangler d1 execute <database-name> --file=./schema.sql

# Query database locally
npx wrangler d1 execute <database-name> --local --command="SELECT * FROM feedback"
```

## Configuration

### wrangler.jsonc Structure
```jsonc
{
  "name": "feedback-aggregator",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",

  // Bindings - connect to other Cloudflare products
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feedback-db",
      "database_id": "<your-database-id>"
    }
  ],

  "ai": {
    "binding": "AI"
  },

  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<your-kv-id>"
    }
  ]
}
```

## Key Conventions for AI Assistants

### Code Style
- Use TypeScript for type safety (preferred)
- Follow Cloudflare Workers patterns and best practices
- Keep functions small and focused
- Use async/await for all asynchronous operations

### Project Requirements
1. **Must deploy to Cloudflare Workers** - Use `npx wrangler deploy`
2. **Integrate 2-3 Cloudflare products** - Via bindings in wrangler.jsonc
3. **Mock data is acceptable** - No real third-party integrations required
4. **Document architecture decisions** - Explain which products used and why

### When Building the Prototype

1. **Start simple** - Get a basic Worker running first
2. **Add bindings incrementally** - One product at a time
3. **Use mock data** - Create realistic sample feedback data
4. **Focus on demonstrating capabilities** - Show aggregation, analysis, insights
5. **Document friction points** - Track issues for Part 2 of the assignment

### Feedback Analysis Features to Consider
- Sentiment analysis (positive/negative/neutral)
- Theme extraction and categorization
- Urgency classification
- Source aggregation (Discord, GitHub, email, etc.)
- Trend identification
- Summary generation

### Solution Approaches (pick one)
- **Dashboard** - Visual display of aggregated feedback
- **AI Agent** - Conversational interface for querying feedback
- **Workflow** - Automated pipeline sending summaries to Slack/Discord
- **API** - RESTful endpoints for feedback CRUD and analysis

## Assignment Deliverables

The final submission requires a PDF containing:

1. **Project Links**
   - Deployed Worker URL: `your-project.account.workers.dev`
   - GitHub repository link

2. **Cloudflare Product Insights** (3-5 friction points)
   - Title: Concise name of the issue
   - Problem: What happened, how it slowed you down
   - Suggestion: How to fix (UI change, docs, error message, feature)

3. **Architecture Overview**
   - Which Cloudflare products used
   - Why each was chosen
   - Screenshot of Workers Binding page (recommended)

4. **Vibe-coding Context** (optional)
   - Which AI coding tool used
   - Sample prompts that helped build the solution

## Friction Log Template

When encountering issues, document them using this format:

```markdown
### [Issue Title]
**Problem**: [Description of what happened or what was confusing]
**Suggestion**: [How you would improve this as a PM]
```

Areas to watch for friction:
- Onboarding and setup experience
- Documentation clarity and completeness
- UI/UX of the Cloudflare dashboard
- Error messages and debugging
- CLI tools and commands
- Configuration complexity

## Useful Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Workflows Docs](https://developers.cloudflare.com/workflows/)
- [Cloudflare Docs MCP Server](https://developers.cloudflare.com/mcp/) - For vibe-coding tools

## Quick Reference

| Action | Command |
|--------|---------|
| Create project | `npm create cloudflare@latest` |
| Local dev | `npx wrangler dev` |
| Deploy | `npx wrangler deploy` |
| View logs | `npx wrangler tail` |
| Create D1 DB | `npx wrangler d1 create <name>` |
| Run D1 migration | `npx wrangler d1 execute <name> --file=schema.sql` |

## Notes for Claude Code

- Connect to **Cloudflare Docs MCP server** for documentation retrieval
- Focus on rapid prototyping over perfection
- Keep track of all friction points encountered during development
- Test deployments early and often
- Use bindings correctly in wrangler.jsonc for product integrations
