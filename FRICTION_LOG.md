# Friction Log - Cloudflare Developer Platform

This document tracks friction points encountered while building the NotebookLM Feedback Aggregator prototype using Cloudflare products.

---

## Friction Point #1: Workerd Doesn't Support Windows ARM64

**Product**: Cloudflare Workers / Wrangler CLI

**Title**: Local development runtime fails on Windows ARM64 devices

**Problem**:
When running `npm create cloudflare@latest`, the installation fails with the error:
```
Error: Unsupported platform: win32 arm64 LE
```
The `workerd` package (Cloudflare's local Workers runtime) does not support Windows ARM64 architecture. This completely blocks developers on ARM-based Windows devices (Surface Pro X, Windows Dev Kit 2023, Snapdragon laptops, etc.) from using local development mode.

The error occurs deep in the npm install process and provides no guidance on workarounds.

**Impact**:
- Cannot proceed with standard setup flow
- Blocks a growing segment of developers using ARM Windows devices
- Forces users to find workarounds on their own (WSL, remote mode)

**Suggestion**:
1. Add ARM64 Windows support to workerd (preferred long-term solution)
2. Detect unsupported platforms early in `npm create cloudflare` and show a helpful message with alternatives:
   - "Your platform (win32 arm64) doesn't support local development yet. You can:"
   - "1. Use `npx wrangler dev --remote` to develop on Cloudflare's servers"
   - "2. Use WSL (Windows Subsystem for Linux)"
3. Update documentation to mention ARM64 Windows limitations prominently in the "Getting Started" guide

---

## Friction Point #2: npm Cleanup Errors on Windows

**Product**: Cloudflare Workers / Wrangler CLI / npm create cloudflare

**Title**: File locking errors during failed installation cleanup

**Problem**:
After the initial ARM64 error, npm attempts to clean up but fails with multiple `EBUSY` (resource busy) and `EPERM` (operation not permitted) errors:
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

**Product**: Cloudflare Workers / Wrangler CLI / npx

**Title**: npx repeatedly prompts to install wrangler, never caches it

**Problem**:
Every time you run any `npx wrangler` command, it prompts:
```
Need to install the following packages:
wrangler@4.61.1
Ok to proceed? (y)
```

After pressing `y`, it installs, shows cleanup errors, then the next command asks to install again. This creates an infinite loop where wrangler never stays installed.

Combined with the ARM64/cleanup issues, this makes the CLI essentially unusable on affected systems.

**Impact**:
- Cannot run any wrangler commands
- Complete blocker for development
- Extremely frustrating user experience
- Wasted time re-downloading the same package repeatedly

**Suggestion**:
1. Fix the underlying caching issue so npx remembers installed packages
2. Recommend installing wrangler globally (`npm install -g wrangler`) in the getting started docs
3. Add a troubleshooting section for this common issue
4. Consider bundling wrangler differently to avoid npx caching problems

---

## Friction Point #4: Local Server Doesn't Update When I Change Code

**Product**: Wrangler CLI (local development server)

**Title**: Had to restart the server manually to see my code changes

**Problem**:
I edited my code to add new features, but when I tested them in the browser, they weren't there. The local development server was supposed to automatically detect my changes and reload, but it didn't. I spent time wondering if my code was broken before realizing the server just wasn't picking up the changes.

I had to manually stop the server and start it again to see my updates.

**Impact**:
- Wasted time debugging code that was actually fine
- Frustrating when you expect "save and refresh" to just work
- Breaks the development flow - you lose momentum stopping and restarting

**Suggestion**:
1. Make the auto-reload actually work when files change
2. Show a message in the terminal like "Detected changes, reloading..." so I know it's working
3. Add a keyboard shortcut (like pressing `r`) to manually trigger a reload without fully restarting
## Friction Point #4: Windows ARM64 Requires WSL Workaround

**Product**: Cloudflare Workers / Wrangler CLI / Developer Onboarding

**Title**: ARM64 Windows developers forced to use WSL with no official guidance

**Problem**:
The combination of issues #1-3 means that Windows ARM64 users cannot use Cloudflare Workers natively at all. The only workaround is to:
1. Install WSL (Windows Subsystem for Linux)
2. Set up a complete Linux environment inside Windows
3. Install Node.js again in WSL
4. Clone projects into WSL filesystem
5. Run all development from WSL terminal

This workaround is not documented anywhere in Cloudflare's getting started guides. Users must discover it through trial and error or external help.

**Impact**:
- 30+ minutes lost troubleshooting before discovering WSL is required
- Complete setup flow must be restarted in a different environment
- Beginners may give up entirely, thinking Cloudflare doesn't support their device
- Growing market segment (ARM laptops, Surface devices) effectively unsupported
- Poor first impression of Cloudflare developer experience

**Suggestion**:
1. Add platform detection at the START of `npm create cloudflare`:
   ```
   ⚠️  Windows ARM64 detected. Native support coming soon!

   For now, please use WSL (Windows Subsystem for Linux):
   1. Run: wsl --install
   2. Restart your computer
   3. Open Ubuntu and run this command again

   Learn more: https://developers.cloudflare.com/workers/wsl-setup
   ```
2. Create a dedicated "Windows ARM64 Setup Guide" in documentation
3. Prioritize ARM64 Windows support in workerd roadmap
4. Add ARM64 compatibility status to the Workers documentation homepage

---

## Friction Points To Document (Encountered Later)

<!-- Add more friction points as you encounter them during development -->

### Template for New Friction Points:

```markdown
## Friction Point #X: [Title]

**Product**: [Which Cloudflare product]

**Title**: [Concise name of the issue]

**Problem**:
[Describe what happened. Include error messages if applicable.]

**Impact**:
[How did it slow you down?]

**Suggestion**:
[How would you fix this as a PM?]
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| CLI/Tooling | 4 |
| Documentation | 0 |
| CLI/Tooling | 3 |
| Documentation | 1 |
| Dashboard UI | 0 |
| API/SDK | 0 |
| Error Messages | 0 |

**Total Friction Points**: 4

---

*Last Updated: 2026-02-01*
