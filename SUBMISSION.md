# Product Manager Intern Assignment
## Cloudflare - Summer 2026

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

I documented **11 friction points** during development. Here is the complete list:

---

## Friction Point #1: Windows ARM64 Developers Are Blocked

**Title**: Workerd doesn't support Windows ARM64 architecture

**Problem**: When running `npm create cloudflare@latest` on my Surface laptop, the installation failed with:
```
Error: Unsupported platform: win32 arm64 LE
```
The workerd package (Cloudflare's local Workers runtime) doesn't support ARM-based Windows devices (Surface Pro X, Windows Dev Kit 2023, Snapdragon laptops). The error occurs deep in the npm install process and provides no guidance on workarounds. I had to discover WSL as a workaround through trial and error.

**Impact**:
- Cannot proceed with standard setup flow
- Blocks a growing segment of developers using ARM Windows devices
- Forces users to find workarounds on their own

**Suggestion**:
1. Add platform detection at the START of `npm create cloudflare` with a helpful message: "Windows ARM64 detected. For now, please use WSL. Run `wsl --install` to get started."
2. Create a dedicated "Windows ARM64 Setup Guide" in the documentation
3. Prioritize ARM64 Windows support in the workerd roadmap

---

## Friction Point #2: npm Cleanup Errors on Windows

**Title**: File locking errors during failed installation cleanup

**Problem**: After the initial ARM64 error, npm attempts to clean up but fails with multiple errors:
```
npm warn cleanup [Error: EBUSY: resource busy or locked, rmdir '...node_modules\esbuild']
npm warn cleanup [Error: EPERM: operation not permitted, rmdir '...node_modules\workerd']
```
This leaves a corrupted/partial project folder that's difficult to remove and causes subsequent installation attempts to fail.

**Impact**:
- Users left with broken project state
- Manual cleanup required
- Confusing for developers new to the platform

**Suggestion**:
1. Implement more graceful error handling that doesn't leave partial installations
2. Add a `npx wrangler cleanup` command to help users recover from failed installs
3. Provide clear instructions in error output: "Installation failed. Run `Remove-Item -Recurse -Force <folder>` and try again"

---

## Friction Point #3: npx Wrangler Install Loop

**Title**: npx repeatedly prompts to install wrangler, never caches it

**Problem**: Every time you run any `npx wrangler` command, it prompts:
```
Need to install the following packages:
wrangler@4.61.1
Ok to proceed? (y)
```
After pressing `y`, it installs, shows cleanup errors, then the next command asks to install again. This creates an infinite loop where wrangler never stays installed.

**Impact**:
- Cannot run any wrangler commands reliably
- Complete blocker for development on affected systems
- Extremely frustrating user experience

**Suggestion**:
1. Fix the underlying caching issue so npx remembers installed packages
2. Recommend installing wrangler globally (`npm install -g wrangler`) in the getting started docs
3. Add a troubleshooting section for this common issue

---

## Friction Point #4: Local Server Doesn't Auto-Reload

**Title**: Had to restart the server manually to see code changes

**Problem**: I edited my code to add new features, but when I tested them in the browser, they weren't there. The local development server was supposed to automatically detect my changes and reload, but it didn't. I spent time wondering if my code was broken before realizing the server just wasn't picking up the changes.

**Impact**:
- Wasted time debugging code that was actually fine
- Frustrating when you expect "save and refresh" to just work
- Breaks the development flow

**Suggestion**:
1. Make the auto-reload actually work when files change
2. Show a message in the terminal like "Detected changes, reloading..." so developers know it's working
3. Add a keyboard shortcut (like pressing `r`) to manually trigger a reload without fully restarting

---

## Friction Point #5: Local and Remote Databases Are Silently Separate

**Title**: Running migrations locally doesn't set up the remote database

**Problem**: I spent time setting up my database schema using `--local` mode, and everything worked fine. Then when I switched to `--remote` mode to test with real Cloudflare services, I got a confusing error: "no such table: feedback".

Turns out, the local D1 database and the remote D1 database are completely separate. Any tables I created locally don't exist on the remote version. There's no warning when you switch modes, and the error message doesn't hint at what's actually wrong.

**Impact**:
- Wasted 15+ minutes trying to figure out why my tables disappeared
- Had to re-run all my database setup commands with the `--remote` flag
- Really confusing for someone new to Cloudflare

**Suggestion**:
1. When switching between local and remote modes, show a heads-up: "Note: Local and remote databases are separate. Make sure you've run your migrations on both."
2. Better error message: Instead of just "no such table", say "Table 'feedback' not found. If you set up tables locally, you may need to run migrations with --remote too."
3. Add a `wrangler d1 sync` command that copies your local schema to remote

---

## Friction Point #6: AI Binding Shows "Not Supported" Without Explanation

**Title**: Local dev mode shows AI as "not supported" without telling you what to do

**Problem**: When running `npx wrangler dev`, the terminal shows:
```
env.AI                               AI               not supported
```
There's no explanation of WHY it's not supported or HOW to actually test AI features. I had to figure out on my own that you need to add `--remote` to the command to make AI work.

**Impact**:
- Thought my AI setup was broken when it wasn't
- Wasted time debugging something that wasn't actually an error
- Had to search online to discover the `--remote` flag

**Suggestion**:
1. Change the message to: "AI binding requires remote mode. Run `npx wrangler dev --remote` to test AI features."
2. Or better yet, automatically use remote mode for AI calls while keeping everything else local
3. Add a note in the Workers AI docs that local dev doesn't support AI

---

## Friction Point #7: Dev Server Keeps Disconnecting

**Title**: Remote preview randomly shuts down mid-session

**Problem**: While running `npx wrangler dev --remote`, the server kept showing:
```
Shutting down remote preview...
```
And then switching back and forth between local and remote modes for no apparent reason. The terminal would show the bindings table multiple times as it kept reconnecting. This made testing really frustrating because I never knew if I was hitting the local or remote database.

**Impact**:
- Never sure if my code was actually running against real Cloudflare services
- Had to restart the dev server multiple times
- Made debugging really confusing

**Suggestion**:
1. Make the remote connection more stable - if it disconnects, auto-reconnect silently
2. Show a clearer indicator in the terminal of which mode you're currently in
3. Add an option like `--remote-only` that refuses to fall back to local mode

---

## Friction Point #8: Workers Can't Send Emails

**Title**: No native way to send outbound emails from Workers

**Problem**: I wanted to build a feature where the PM receives a weekly email digest of feedback insights. Cloudflare has "Email Workers" but that's only for RECEIVING emails, not sending them. There's no built-in way to send outbound emails from a Worker.

To actually send emails, I'd have to sign up for a third-party service like SendGrid, Resend, or Mailchimp, get API keys, and integrate that. That's a lot of extra work for a basic feature.

**Impact**:
- Couldn't build the email notification feature I wanted
- Had to settle for just showing the digest on the website
- Would add extra cost and complexity if I wanted real email functionality

**Suggestion**:
1. Add a native "Email Send" binding similar to how D1 or KV works - `env.EMAIL.send(to, subject, body)`
2. Or integrate with an existing email provider and make it available as a binding
3. At minimum, document this limitation clearly so developers know upfront they need a third-party service

---

## Friction Point #9: API Token Permissions Are Confusing

**Title**: Unclear which permission level (Read vs Edit) is needed for each product

**Problem**: When creating an API token for deployment, it's not obvious which permission level each product needs:
- Vectorize requires **Edit** to call `upsert()`, but this isn't documented
- Workers AI only needs **Read** for inference, but it's not clear from the UI
- The "Edit Cloudflare Workers" template doesn't include Vectorize permissions at all

I set up Vectorize with "Read" permission and got a cryptic permission denied error when trying to store embeddings.

**Impact**:
- Wasted 10+ minutes debugging permission issues
- Had to trial-and-error different permission combinations
- No clear feedback on which specific permission was missing

**Suggestion**:
1. Add tooltips in the token creation UI explaining what each permission level allows
2. When a permission error occurs, include which permission is needed in the error message
3. Update the "Edit Cloudflare Workers" template to include all common bindings (D1, AI, Vectorize, KV)

---

## Friction Point #10: 500 Errors Provide No Debug Information

**Title**: Worker errors return generic 500 with no stack trace or details

**Problem**: When my `/api/seed` endpoint failed, the browser just showed a 500 error with no details. I had to:
1. Wrap everything in try-catch
2. Manually stringify errors
3. Use `curl` to see the actual JSON error response

The actual error was "D1_ERROR: no such column: job_to_be_done" - useful information that was hidden behind a generic 500.

**Impact**:
- Significant time spent debugging blind
- Had to add verbose error handling throughout the codebase
- Production errors would be impossible to diagnose without extensive logging

**Suggestion**:
1. In development mode, return full error details including stack traces
2. Add a `--verbose` flag to `wrangler dev` that shows detailed error responses
3. Provide a standard error response format: `{ error: string, code: string, stack?: string }`

---

## Friction Point #11: No Guidance on AI Rate Limits

**Title**: Seeding data with multiple AI calls risks timeout without clear limits

**Problem**: My seed function calls Workers AI for each of 30 feedback items (sentiment analysis + embedding). This could easily hit:
- CPU time limits
- AI rate limits
- Request timeout limits

There's no documentation on best practices for batch AI operations, recommended batch sizes, or how to handle rate limiting gracefully.

**Impact**:
- Had to guess at safe batch sizes
- Risk of partial data corruption if seed times out mid-way
- No way to know if I'm approaching limits until I hit them

**Suggestion**:
1. Document CPU/rate limits clearly for Workers AI operations
2. Provide a "batch processing" example in the Workers AI docs
3. Add response headers showing remaining quota/rate limits
4. Consider a native batch API: `env.AI.runBatch([...prompts])`

---

## Friction Points Summary

| Category | Count |
|----------|-------|
| CLI/Tooling | 5 |
| D1 Database | 1 |
| Workers AI | 2 |
| Email/Workers | 1 |
| Dashboard/API Tokens | 1 |
| Error Handling | 1 |

**Total Friction Points**: 11

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

---

# Conclusion

This prototype demonstrates how Cloudflare's developer platform can power AI-driven feedback analysis tools. The combination of D1, Workers AI, and Vectorize provides a complete stack for building intelligent applications at the edge.

The friction points I documented represent opportunities to improve the developer experience—particularly around Windows ARM64 support, error messaging, and the local/remote development gap. As a PM, I would prioritize the platform detection and helpful error messages as quick wins, while planning longer-term improvements to ARM64 support and AI binding documentation.

---

*Built with Claude Code • Deployed on Cloudflare Workers • February 2026*
