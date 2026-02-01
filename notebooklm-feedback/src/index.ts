/**
 * NotebookLM Feedback Aggregator
 *
 * A Cloudflare Worker that aggregates and analyzes feedback about NotebookLM
 * from various sources (Reddit, Twitter, Product Hunt, etc.)
 *
 * Cloudflare Products Used:
 * - Workers: Hosting and API
 * - D1: Database for storing feedback
 * - Workers AI: Sentiment analysis and theme extraction (coming soon)
 */

// Type definitions for our environment bindings
export interface Env {
  notebooklm_feedback_db: D1Database;
  // Workers AI - uncomment when configured
  // AI: Ai;
}

// Feedback entry type
interface FeedbackEntry {
  id?: number;
  source: string;
  content: string;
  author?: string;
  url?: string;
  sentiment?: string;
  themes?: string;
  urgency?: string;
  created_at?: string;
  analyzed_at?: string;
}

// Main Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Add CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Simple router
      switch (url.pathname) {
        case "/":
          return handleHome(request);

        case "/api/health":
          return handleHealth(corsHeaders);

        case "/api/feedback":
          if (request.method === "GET") {
            return handleGetFeedback(env, url, corsHeaders);
          } else if (request.method === "POST") {
            return handlePostFeedback(request, env, corsHeaders);
          }
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        case "/api/stats":
          return handleStats(env, corsHeaders);

        default:
          return new Response("Not Found", { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error("Error:", error);
      return Response.json(
        { error: "Internal server error", details: String(error) },
        { status: 500, headers: corsHeaders }
      );
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
      <code>GET /api/feedback - List all feedback</code>
      <code>GET /api/feedback?source=reddit - Filter by source</code>
      <code>POST /api/feedback - Add new feedback</code>
      <code>GET /api/stats - Get feedback statistics</code>
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
function handleHealth(corsHeaders: Record<string, string>): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "notebooklm-feedback",
    version: "1.0.0",
  }, { headers: corsHeaders });
}

// GET /api/feedback - List feedback with optional filtering
async function handleGetFeedback(
  env: Env,
  url: URL,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const source = url.searchParams.get("source");
  const sentiment = url.searchParams.get("sentiment");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let query = "SELECT * FROM feedback";
  const params: string[] = [];
  const conditions: string[] = [];

  if (source) {
    conditions.push("source = ?");
    params.push(source);
  }
  if (sentiment) {
    conditions.push("sentiment = ?");
    params.push(sentiment);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(String(limit));

  const result = await env.notebooklm_feedback_db.prepare(query).bind(...params).all();

  return Response.json({
    success: true,
    count: result.results.length,
    feedback: result.results,
  }, { headers: corsHeaders });
}

// POST /api/feedback - Add new feedback
async function handlePostFeedback(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await request.json() as FeedbackEntry;

  // Validate required fields
  if (!body.source || !body.content) {
    return Response.json(
      { success: false, error: "Missing required fields: source and content" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate source
  const validSources = ["reddit", "twitter", "producthunt", "appstore", "forums", "discord", "github", "email"];
  if (!validSources.includes(body.source.toLowerCase())) {
    return Response.json(
      { success: false, error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const result = await env.notebooklm_feedback_db
    .prepare(
      `INSERT INTO feedback (source, content, author, url, sentiment, themes, urgency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      body.source.toLowerCase(),
      body.content,
      body.author || null,
      body.url || null,
      body.sentiment || null,
      body.themes || null,
      body.urgency || "medium"
    )
    .run();

  return Response.json({
    success: true,
    message: "Feedback added successfully",
    id: result.meta.last_row_id,
  }, { status: 201, headers: corsHeaders });
}

// GET /api/stats - Get feedback statistics
async function handleStats(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Get counts by source
  const bySource = await env.notebooklm_feedback_db
    .prepare("SELECT source, COUNT(*) as count FROM feedback GROUP BY source")
    .all();

  // Get counts by sentiment
  const bySentiment = await env.notebooklm_feedback_db
    .prepare("SELECT sentiment, COUNT(*) as count FROM feedback GROUP BY sentiment")
    .all();

  // Get total count
  const total = await env.notebooklm_feedback_db
    .prepare("SELECT COUNT(*) as count FROM feedback")
    .first();

  return Response.json({
    success: true,
    stats: {
      total: total?.count || 0,
      bySource: bySource.results,
      bySentiment: bySentiment.results,
    },
  }, { headers: corsHeaders });
}
