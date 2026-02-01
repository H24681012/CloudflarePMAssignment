/**
 * NotebookLM Feedback Aggregator
 *
 * A Cloudflare Worker that aggregates and analyzes feedback about NotebookLM
 * from various sources (Reddit, Twitter, Product Hunt, etc.)
 *
 * Cloudflare Products Used:
 * - Workers: Hosting and API
 * - D1: Database for storing feedback
 * - Workers AI: Sentiment analysis and theme extraction
 */

// Type definitions for our environment bindings
export interface Env {
  // D1 Database - uncomment when configured
  // DB: D1Database;

  // Workers AI - uncomment when configured
  // AI: Ai;
}

// Main Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Simple router
    switch (url.pathname) {
      case "/":
        return handleHome(request);

      case "/api/health":
        return handleHealth();

      // Future endpoints:
      // case "/api/feedback":
      //   return handleFeedback(request, env);
      // case "/api/analyze":
      //   return handleAnalyze(request, env);
      // case "/api/themes":
      //   return handleThemes(request, env);

      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};

// Home page - simple HTML response
function handleHome(request: Request): Response {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotebookLM Feedback Aggregator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 600px;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem; }
    .status {
      background: rgba(255,255,255,0.2);
      padding: 1rem 2rem;
      border-radius: 8px;
      display: inline-block;
    }
    .status-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #4ade80;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .endpoints {
      margin-top: 2rem;
      text-align: left;
      background: rgba(255,255,255,0.1);
      padding: 1.5rem;
      border-radius: 8px;
    }
    .endpoints h3 { margin-bottom: 1rem; }
    .endpoints code {
      display: block;
      padding: 0.5rem;
      margin: 0.5rem 0;
      background: rgba(0,0,0,0.2);
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NotebookLM Feedback Aggregator</h1>
    <p>Aggregate and analyze user feedback from multiple sources using AI</p>
    <div class="status">
      <span class="status-dot"></span>
      Worker is running on Cloudflare
    </div>
    <div class="endpoints">
      <h3>Available Endpoints:</h3>
      <code>GET / - This page</code>
      <code>GET /api/health - Health check</code>
      <code>GET /api/feedback - List feedback (coming soon)</code>
      <code>POST /api/feedback - Add feedback (coming soon)</code>
      <code>POST /api/analyze - Analyze with AI (coming soon)</code>
    </div>
  </div>
</body>
</html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// Health check endpoint
function handleHealth(): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "notebooklm-feedback",
    version: "1.0.0",
  });
}
