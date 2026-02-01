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
| CLI/Tooling | 2 |
| Documentation | 0 |
| Dashboard UI | 0 |
| API/SDK | 0 |
| Error Messages | 0 |

**Total Friction Points**: 2

---

*Last Updated: 2026-02-01*
