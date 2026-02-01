# Product Manager Intern Assignment
## Cloudflare - Summer 2026

**Date**: February 1, 2026

---

# Project Links

**Live Demo**: https://notebooklm-feedback.notebooklmfeedback.workers.dev

**GitHub Repository**: https://github.com/H24681012/CloudflarePMAssignment

---

# Part 1: The Build Challenge

## Solution Overview

I built a **Feedback Aggregator Dashboard** that helps Product Managers make sense of scattered customer feedback. The prototype aggregates feedback from multiple sources (Reddit, Twitter, ProductHunt, App Store, forums, email) and uses AI to extract actionable insights.

### Key Features

**Overview Dashboard**: A visual summary showing sentiment distribution, urgency levels, and a "Pain Map" scatter plot that plots feedback by sentiment vs. urgency. This gives PMs an at-a-glance view of where the most critical issues lie.

**Feedback Feed**: A scrollable feed of all customer feedback styled like a social media timeline. Each item displays AI-generated sentiment and urgency scores as colored indicators, making it easy to scan for high-priority items.

**Semantic Clustering**: An interactive D3.js force-directed graph that groups similar feedback together using vector embeddings. This reveals hidden patterns—feedback that uses completely different words but expresses the same underlying pain point gets clustered together.

**Jobs-to-be-Done Analysis**: AI-generated JTBD statements following Clay Christensen's framework. Rather than showing feature requests, this identifies the core jobs users are trying to accomplish, helping PMs prioritize based on user needs rather than loudest voices.

**Email Digest Preview**: Time-filtered summaries (24h, 7d, 90d) formatted for stakeholder updates. While outbound email isn't supported natively by Workers, the digest content is ready to copy into any email tool.

### Design Philosophy

The prototype follows a clear separation between **inputs** and **outputs**:

- **Inputs (stored in database)**: Raw customer feedback text, source, author, timestamp
- **Outputs (computed by AI)**: Sentiment scores, urgency levels, themes, JTBD statements

This ensures that all insights are derived fresh from the source data, maintaining data integrity. The AI's only input is the raw feedback—nothing is pre-computed or cached that could bias the analysis.

---

# Architecture Overview

## Cloudflare Products Used

I integrated **3 Cloudflare Developer Platform products** beyond Workers:

**D1 Database** (`env.DB`): Cloudflare's serverless SQL database stores feedback entries and extracted themes. I chose D1 because it integrates natively with Workers, requires zero connection management, and supports familiar SQL syntax. The schema includes a `feedback` table for raw entries and a `themes` table for aggregated theme counts.

**Workers AI** (`env.AI`): Runs machine learning models directly on Cloudflare's edge network. I use two models:
- `@cf/meta/llama-3.1-8b-instruct` for sentiment analysis, urgency scoring, theme extraction, and JTBD generation
- `@cf/baai/bge-base-en-v1.5` for generating 768-dimensional embeddings that power semantic search

Workers AI was chosen over external APIs (like OpenAI) because it runs with no cold starts and keeps data within Cloudflare's network.

**Vectorize** (`env.VECTORIZE`): A vector database that stores embeddings and enables semantic similarity queries. When a user searches for "audio problems," Vectorize finds feedback about "voices sounding robotic" or "podcast quality issues" even though they share no keywords. This powers the clustering visualization and semantic search features.

## Data Flow

```
User Request → Cloudflare Workers (Edge Runtime)
                    ↓
         ┌─────────┼─────────┐
         ↓         ↓         ↓
    D1 Database  Workers AI  Vectorize
    (raw data)   (analysis)  (embeddings)
```

When feedback is added:
1. Raw text is stored in D1
2. Workers AI analyzes sentiment, urgency, and themes
3. An embedding is generated and stored in Vectorize
4. Theme counts are updated in the themes table

When the dashboard loads:
1. Feedback is fetched from D1
2. For the JTBD page, Workers AI generates job statements on-demand
3. For clustering, Vectorize finds similar feedback pairs

---

# Development Process

## How I Built This

### Step 1: Environment Setup

I started by running `npm create cloudflare@latest` to scaffold a new Workers project. On my Windows ARM64 laptop, this immediately failed—workerd doesn't support ARM Windows. I had to install WSL (Windows Subsystem for Linux) and restart the entire setup process in Ubuntu. This took about 30 minutes of troubleshooting before I discovered WSL was required.

### Step 2: Iterative Development with Claude Code

I used **Claude Code** (Anthropic's CLI tool) throughout development. Rather than writing code from scratch, I described what I wanted to build and iterated based on what was generated. The process was conversational:

- I'd describe a feature ("add a chart showing sentiment vs urgency")
- Claude Code would generate the implementation
- I'd test it, find issues, and describe what was wrong
- We'd iterate until it worked

This approach let me move fast—the core dashboard was functional within about 2 hours. When Cloudflare-specific errors occurred (like D1 query syntax issues or Workers AI response format problems), Claude Code helped debug by reading error messages and suggesting fixes.

### Step 3: Friction Logging

Throughout development, I kept notes on every friction point I encountered. Whenever something didn't work as expected, took longer than it should, or had confusing documentation, I documented:
- What I was trying to do
- What went wrong
- How long it took to resolve
- What would have helped

This turned into the 11 friction points documented below.

### Step 4: Architecture Decisions

Several key decisions shaped the final prototype:

**JTBD computed on-demand**: Early versions stored pre-computed JTBD statements in the database. I changed this so JTBDs are generated fresh by the AI each time the page loads. This ensures the AI's only input is raw feedback—the analysis is never stale or biased by cached results.

**Generalized jobs over individual jobs**: Instead of generating a JTBD for each feedback item (which produced 30 repetitive statements), I changed the approach to generate 2-3 high-level jobs that represent patterns across all feedback. This is more useful for PM decision-making.

**Semantic clustering via Vectorize**: I initially considered keyword-based clustering but realized customers express the same pain point in many different ways. Vector embeddings capture meaning, not just words, so "audio is terrible" clusters with "voices sound robotic."

### Step 5: Deployment and Testing

Deployment was straightforward with `npx wrangler deploy`. However, I discovered that my local D1 database didn't sync with the remote one—tables I created locally didn't exist in production. I had to re-run migrations with the `--remote` flag, which wasn't obvious from the documentation.

---

# Part 2: Cloudflare Product Insights

I documented **11 friction points** during development. Each represents a real obstacle I encountered and includes a suggestion for how Cloudflare could improve the developer experience.

---

## Friction Point #1: Workerd Doesn't Support Windows ARM64

**Product**: Cloudflare Workers / Wrangler CLI

**Problem**:

When I ran `npm create cloudflare@latest` on my Surface laptop, the installation failed with the error:

```
Error: Unsupported platform: win32 arm64 LE
```

The `workerd` package (Cloudflare's local Workers runtime) does not support Windows ARM64 architecture. This completely blocks developers on ARM-based Windows devices—Surface Pro X, Windows Dev Kit 2023, Snapdragon laptops, and the growing number of ARM Windows machines—from using local development mode.

The error occurred deep in the npm install process and provided no guidance on workarounds. I spent about 30 minutes trying different things before discovering through external research that WSL (Windows Subsystem for Linux) was required. This workaround is not mentioned anywhere in Cloudflare's getting started documentation.

**Impact**:
- Cannot proceed with the standard setup flow at all
- Blocks a growing segment of developers using ARM Windows devices
- Forces users to discover workarounds on their own through trial and error
- Poor first impression of the Cloudflare developer experience
- Beginners might give up entirely, thinking Cloudflare doesn't support their device

**Suggestion**:

1. Add platform detection at the very START of `npm create cloudflare`. When ARM64 Windows is detected, show a helpful message immediately:
   ```
   ⚠️  Windows ARM64 detected. Native support coming soon!

   For now, please use WSL (Windows Subsystem for Linux):
   1. Run: wsl --install
   2. Restart your computer
   3. Open Ubuntu and run this command again

   Learn more: https://developers.cloudflare.com/workers/wsl-setup
   ```

2. Create a dedicated "Windows ARM64 Setup Guide" in the documentation that's easy to find

3. Prioritize ARM64 Windows support in the workerd roadmap—this market segment is growing rapidly

4. Add ARM64 compatibility status to the Workers documentation homepage so developers know upfront

---

## Friction Point #2: npm Cleanup Errors Leave Broken State

**Product**: Cloudflare Workers / Wrangler CLI / npm create cloudflare

**Problem**:

After the initial ARM64 error, npm attempted to clean up the failed installation but failed with multiple errors:

```
npm warn cleanup [Error: EBUSY: resource busy or locked, rmdir '...node_modules\esbuild']
npm warn cleanup [Error: EPERM: operation not permitted, rmdir '...node_modules\workerd']
```

This left a corrupted, partial project folder that was difficult to remove. Windows wouldn't let me delete it normally because files were locked. When I tried to run the installation again, it failed because the corrupted folder already existed.

I had to use PowerShell with elevated permissions to force-delete the folder, then start over. This added another 10 minutes of frustration on top of the ARM64 issue.

**Impact**:
- Users are left with a broken project state that's hard to recover from
- Manual cleanup with special commands is required
- Very confusing for developers new to the platform
- Subsequent installation attempts fail without explanation

**Suggestion**:

1. Implement more graceful error handling that doesn't leave partial installations behind. If installation fails, clean up completely or not at all.

2. Add a `npx wrangler cleanup` command that helps users recover from failed installations by removing corrupted project folders safely.

3. Provide clear instructions in the error output: "Installation failed. To clean up, run: `Remove-Item -Recurse -Force <folder-name>` then try again."

---

## Friction Point #3: npx Wrangler Never Stays Installed

**Product**: Cloudflare Workers / Wrangler CLI / npx

**Problem**:

Every time I ran any `npx wrangler` command, it prompted me to install wrangler:

```
Need to install the following packages:
wrangler@4.61.1
Ok to proceed? (y)
```

After pressing `y`, it would install, show cleanup errors, then the very next command would ask to install again. This created an infinite loop where wrangler never actually stayed installed. Combined with the ARM64 and cleanup issues, this made the CLI essentially unusable.

I eventually worked around this by installing wrangler globally with `npm install -g wrangler`, but this isn't mentioned in the getting started documentation.

**Impact**:
- Cannot run any wrangler commands reliably
- Complete blocker for development on affected systems
- Extremely frustrating user experience—watching the same package download over and over
- Wasted time and bandwidth re-downloading the same 50MB+ package repeatedly

**Suggestion**:

1. Fix the underlying caching issue so npx remembers installed packages correctly

2. Recommend installing wrangler globally (`npm install -g wrangler`) prominently in the getting started docs as an alternative to npx

3. Add a troubleshooting section for this common issue in the documentation

4. Consider bundling wrangler differently to avoid npx caching problems entirely

---

## Friction Point #4: Local Development Server Doesn't Auto-Reload

**Product**: Wrangler CLI / Local Development Server

**Problem**:

I edited my code to add new features, saved the file, and refreshed the browser—but my changes weren't there. The local development server (`npx wrangler dev`) was supposed to automatically detect file changes and reload, but it didn't.

I spent several minutes wondering if my code was broken before realizing the server just wasn't picking up changes. I had to manually stop the server (Ctrl+C) and restart it to see my updates. This happened repeatedly throughout development.

**Impact**:
- Wasted time debugging code that was actually working fine
- Frustrating when you expect "save and refresh" to just work like every other dev server
- Breaks the development flow—you lose momentum stopping and starting the server
- Adds friction to the rapid iteration cycle that makes prototyping effective

**Suggestion**:

1. Make auto-reload actually work reliably when source files change

2. Show a visible message in the terminal when changes are detected: "File changed: src/index.ts - Reloading..." so developers know it's working

3. Add a keyboard shortcut (like pressing `r` in the terminal) to manually trigger a reload without fully restarting the server

4. If auto-reload can't work in certain situations, document why and provide the manual alternative prominently

---

## Friction Point #5: Local and Remote Databases Are Silently Separate

**Product**: D1 Database / Wrangler CLI

**Problem**:

I spent time setting up my database schema using `--local` mode, creating tables, and testing queries. Everything worked fine. Then when I deployed and switched to `--remote` mode to test with real Cloudflare services, I got a confusing error:

```
D1_ERROR: no such table: feedback
```

I was confused—I had just created that table and it was working moments ago. After significant debugging, I discovered that the local D1 database and the remote D1 database are completely separate instances. Any tables I created locally don't exist on the remote version.

There was no warning when switching between modes, and the error message didn't hint at this being a local/remote issue. It just said the table didn't exist.

**Impact**:
- Wasted 15+ minutes trying to figure out why my tables "disappeared"
- Had to re-run all my database setup commands with the `--remote` flag
- Really confusing for someone new to Cloudflare who doesn't know about this separation
- The mental model of "one database" is broken without any explanation

**Suggestion**:

1. When switching between local and remote modes, show a clear heads-up: "Note: Local and remote databases are separate. Make sure you've run your migrations on both."

2. Improve the error message: Instead of just "no such table: feedback", say something like "Table 'feedback' not found in the REMOTE database. If you created tables locally, you may need to run migrations with the --remote flag."

3. Add a `wrangler d1 sync` command that copies your local schema to remote (or vice versa) so developers don't have to manually re-run migrations

4. Document this local/remote separation prominently in the D1 getting started guide

---

## Friction Point #6: AI Binding Shows "Not Supported" Without Explanation

**Product**: Workers AI / Wrangler CLI

**Problem**:

When running `npx wrangler dev` (local development mode), the terminal showed my bindings:

```
env.DB                               D1 Database
env.VECTORIZE                        Vectorize Index
env.AI                               AI               not supported
```

The "not supported" message gave no explanation of WHY it's not supported or WHAT to do about it. I initially thought my AI binding was configured incorrectly and spent time checking my wrangler.jsonc file.

Eventually, through online searching, I discovered that you need to add the `--remote` flag to make AI work: `npx wrangler dev --remote`. But even this wasn't obvious—the documentation for Workers AI doesn't prominently mention this requirement.

**Impact**:
- Thought my AI setup was broken when it actually wasn't
- Wasted time debugging a non-existent configuration problem
- Had to search online to discover the `--remote` flag
- Frustrating user experience—being told something doesn't work without being told how to make it work

**Suggestion**:

1. Change the "not supported" message to something actionable: "AI binding requires remote mode. Run `npx wrangler dev --remote` to test AI features."

2. Better yet, automatically use remote mode for AI calls while keeping other bindings (like D1) local. This would give the best of both worlds.

3. Add a prominent note in the Workers AI documentation that local dev mode doesn't support AI inference and explain the --remote workaround

---

## Friction Point #7: Development Server Keeps Disconnecting

**Product**: Wrangler CLI / Local Development

**Problem**:

While running `npx wrangler dev --remote`, the server kept randomly showing:

```
Shutting down remote preview...
```

Then it would switch back and forth between local and remote modes for no apparent reason. The terminal would display the bindings table multiple times as it kept reconnecting. Sometimes it would stay disconnected for 30+ seconds.

This made testing really frustrating because I never knew if my requests were hitting the local database (which had my test data) or the remote database (which might be empty or have different data). Results were inconsistent and confusing.

**Impact**:
- Never sure if my code was actually running against real Cloudflare services
- Had to restart the dev server multiple times per session
- Made debugging extremely confusing—different results for the same code
- Killed the development flow with constant interruptions

**Suggestion**:

1. Make the remote connection more stable. If it disconnects, auto-reconnect silently in the background without disrupting the developer.

2. Show a persistent, clear indicator in the terminal of which mode you're currently in: `[REMOTE]` or `[LOCAL]` before each request log.

3. Add an option like `--remote-only` that refuses to fall back to local mode. This way, if the connection drops, you know immediately instead of silently getting local results.

---

## Friction Point #8: Workers Can't Send Outbound Emails

**Product**: Cloudflare Workers / Email

**Problem**:

I wanted to build a feature where the PM receives a weekly email digest of feedback insights—a summary of the top issues, sentiment trends, and urgent items delivered to their inbox every Monday morning.

I discovered that Cloudflare has "Email Workers" but that feature is only for RECEIVING inbound emails, not sending them. There's no built-in way to send outbound emails from a Worker.

To actually send emails, I would need to:
1. Sign up for a third-party service like SendGrid, Resend, or Mailchimp
2. Get API keys and configure the integration
3. Handle email deliverability, bounce management, etc.

That's a lot of extra work, cost, and complexity for what should be a basic feature.

**Impact**:
- Couldn't build the email notification feature I envisioned
- Had to settle for showing the digest as a web page instead of delivering it proactively
- Would need to add external dependencies and extra cost for real email functionality
- Limits what developers can build without integrating external services

**Suggestion**:

1. Add a native "Email Send" binding similar to how D1 or KV works: `env.EMAIL.send({ to: "pm@company.com", subject: "Weekly Digest", body: "..." })`

2. Or integrate with an existing email provider (Cloudflare has worked with Mailchannels before) and make it available as a first-party binding

3. At minimum, document this limitation clearly and prominently so developers know upfront they'll need a third-party service for outbound email. Don't let them discover it halfway through building a feature.

---

## Friction Point #9: API Token Permissions Are Confusing

**Product**: Cloudflare Dashboard / API Tokens

**Problem**:

When creating an API token for deployment, I had to choose permission levels for each product (Read vs Edit). It was not at all obvious which level each product actually needed:

- Vectorize requires **Edit** permission to call `upsert()` for storing embeddings, but this isn't documented anywhere. The word "Edit" suggests modifying settings, not inserting data.
- Workers AI only needs **Read** for running inference, but the permission labels don't make this clear
- The "Edit Cloudflare Workers" template—which sounds like it should cover everything you need—doesn't include Vectorize permissions at all

I initially set Vectorize to "Read" (thinking I was only reading similarity results) and got a cryptic permission denied error when trying to store embeddings. The error didn't say which permission was missing.

**Impact**:
- Wasted 10+ minutes debugging permission issues through trial and error
- Had to test different permission combinations until something worked
- No clear feedback on which specific permission was missing or needed
- The permission names don't match how developers think about their operations

**Suggestion**:

1. Add tooltips in the token creation UI explaining what each permission level allows: "Edit: Required for create, update, and delete operations including upsert()"

2. When a permission error occurs, include which specific permission is needed: "Error: Vectorize upsert requires 'Edit' permission. Your token only has 'Read'."

3. Update the "Edit Cloudflare Workers" template to include all common bindings (D1, AI, Vectorize, KV) with appropriate permissions

4. Consider renaming permissions to be more intuitive: "Read" vs "Read & Write" instead of "Read" vs "Edit"

---

## Friction Point #10: 500 Errors Provide No Debug Information

**Product**: Cloudflare Workers / Error Handling

**Problem**:

When my `/api/seed` endpoint failed, the browser just showed a generic 500 Internal Server Error with no details. No error message, no stack trace, nothing to indicate what went wrong.

To find the actual error, I had to:
1. Add try-catch blocks around everything
2. Manually stringify error objects and include them in the response
3. Use `curl` from the command line to see the JSON response (browsers often hide error response bodies)

The actual error turned out to be: `D1_ERROR: no such column: job_to_be_done`

This was useful, actionable information that was completely hidden behind a generic 500. I spent significant time adding verbose error handling throughout my codebase just to see what was going wrong.

**Impact**:
- Significant time spent debugging blind without any error information
- Had to add boilerplate error handling code everywhere
- Production errors would be nearly impossible to diagnose without extensive logging
- Very frustrating developer experience—you know something's wrong but not what

**Suggestion**:

1. In development mode (when running `wrangler dev`), automatically return full error details including the error message and stack trace. Only hide these in production.

2. Add a `--verbose` flag to `wrangler dev` that shows detailed error information in the terminal for every request.

3. Provide a standard error response format that Workers could use automatically:
   ```json
   {
     "error": "D1_ERROR: no such column: job_to_be_done",
     "code": "D1_ERROR",
     "stack": "at handleSeed (index.ts:245)..."
   }
   ```

4. Consider a debug mode that automatically catches unhandled errors and formats them helpfully instead of returning bare 500s.

---

## Friction Point #11: No Guidance on AI Rate Limits for Batch Operations

**Product**: Workers AI

**Problem**:

My seed function needed to call Workers AI for each of 30 feedback items—running sentiment analysis and generating embeddings for each one. This meant 60 AI inference calls in a single request.

I had no idea if this would work or hit limits. The documentation doesn't clearly explain:
- CPU time limits for Workers making AI calls
- Rate limits for Workers AI inference
- Request timeout limits
- Recommended batch sizes for multiple AI calls
- How to handle rate limiting gracefully if it occurs

I had to guess at what would work and hope for the best. The seed function sometimes timed out partway through, leaving the database in an inconsistent state with some items analyzed and others not.

**Impact**:
- Had to guess at safe batch sizes through trial and error
- Risk of partial data corruption when operations time out mid-way
- No way to know if I'm approaching limits until I actually hit them
- Uncertainty about whether my approach would work in production

**Suggestion**:

1. Document CPU time limits and rate limits clearly for Workers AI operations. A simple table showing "X inference calls per request" or "Y seconds of AI compute time per request" would help.

2. Provide a "batch processing" example in the Workers AI documentation showing how to safely process many items—maybe using Durable Objects, Queues, or chunked requests.

3. Add response headers showing remaining quota or rate limit status so developers can monitor usage.

4. Consider adding a native batch API: `env.AI.runBatch([...prompts])` that handles parallelization and rate limiting automatically.

---

# Vibe-Coding Context

**Tool Used**: Claude Code (Anthropic's official CLI for Claude)

## Development Approach

I used Claude Code throughout the entire development process, treating it as a collaborative coding partner rather than just a code generator. Here's how the process worked:

**Conversational Development**: Instead of writing code from scratch, I described what I wanted to build in plain English. Claude Code would generate an implementation, I'd test it, and we'd iterate based on what worked and what didn't. This was much faster than traditional development for a prototype.

**Continuous Context**: Claude Code maintained context throughout our session, so I could say things like "that's showing 0-10.5 on the chart instead of 0-10" without re-explaining the entire codebase. It remembered what we'd built and could make targeted fixes.

**Error Debugging**: When Cloudflare-specific errors occurred (like D1 query syntax issues or Workers AI response format problems), I'd paste the error message and Claude Code would help diagnose and fix the issue. This was especially helpful for platform-specific quirks that aren't in general programming knowledge.

**Friction Logging**: As we worked, I noted every obstacle and Claude Code helped document them in the friction log with proper formatting and actionable suggestions.

## What Worked Well

**Rapid Prototyping**: The core dashboard was functional within about 2 hours. Features that would have taken me a full day to research and implement (like D3.js force-directed graphs or Workers AI integration) were generated and working in minutes.

**Learning by Doing**: I learned Cloudflare's APIs by seeing working code examples generated for my specific use case, rather than reading abstract documentation.

**Iterative Refinement**: The conversational nature made it easy to refine features. "Make the JTBD follow Clay Christensen's framework" or "The chart bubbles are going outside the bounds" were natural requests that got immediate, targeted responses.

## Challenges

**Platform-Specific Knowledge**: Claude Code occasionally generated code patterns that didn't quite match Cloudflare's latest APIs. I had to verify bindings and configuration against the official docs.

**Configuration Files**: Getting wrangler.jsonc bindings exactly right required manual verification. The AI could generate plausible configurations, but subtle issues (like wrong binding names) needed human review.

---

# Conclusion

This prototype demonstrates how Cloudflare's developer platform can power AI-driven feedback analysis tools. The combination of D1, Workers AI, and Vectorize provides a complete stack for building intelligent applications at the edge—from data storage to ML inference to semantic search.

The 11 friction points I documented represent real opportunities to improve the developer experience. If I were a PM at Cloudflare, I would prioritize:

**Quick wins** (low effort, high impact):
- Better error messages that tell developers what to do, not just what went wrong
- Platform detection with helpful guidance for unsupported configurations
- Clearer documentation on local vs. remote mode differences

**Medium-term improvements**:
- Auto-reload that actually works reliably
- Stable remote dev connections
- API token UI improvements with tooltips and better templates

**Strategic investments**:
- Windows ARM64 support for workerd
- Native outbound email capability
- Batch AI operations API

The prototype outcome is secondary to these insights. A broken prototype with brilliant product critique reveals more about PM thinking than a perfect prototype with no feedback.

---

*Built with Claude Code • Deployed on Cloudflare Workers • February 2026*
