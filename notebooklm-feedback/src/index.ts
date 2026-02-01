/**
 * NotebookLM Feedback Aggregator
 *
 * Cloudflare Products Used:
 * - Workers: Hosting and API endpoints
 * - D1 Database: Store feedback and analysis results
 * - Workers AI (Llama 3.1): Sentiment analysis, theme extraction, urgency scoring
 */

export interface Env {
  DB: D1Database;
  AI: Ai;
}

interface FeedbackEntry {
  id?: number;
  source: string;
  content: string;
  author: string;
  url: string;
  sentiment?: string;
  themes?: string;
  urgency?: string;
  job_to_be_done?: string;
  created_at?: string;
  analyzed_at?: string;
}

interface AIAnalysis {
  sentiment: number;
  urgency: number;
  themes: string[];
  job_to_be_done: string;
}

// Raw mock feedback data - AI will analyze these
const MOCK_FEEDBACK = [
  { source: "reddit", content: "NotebookLM is absolutely game-changing for research! I uploaded 20 papers and it instantly found connections I'd missed after months of reading.", author: "u/PhD_Survivor", url: "https://reddit.com/r/NotebookLM/abc123" },
  { source: "reddit", content: "The audio overview feature is incredible. I listen to my research notes while commuting now. It's like having a personal podcast about my own work!", author: "u/AudioLearner42", url: "https://reddit.com/r/NotebookLM/def456" },
  { source: "reddit", content: "Why is there a 50 source limit?? I have 200+ papers for my thesis and I need them all in one notebook. This is a dealbreaker.", author: "u/ThesisStruggles", url: "https://reddit.com/r/NotebookLM/jkl012" },
  { source: "reddit", content: "Keeps timing out when I upload large PDFs. Tried 3 times with my 500-page textbook, nothing works. Super frustrating.", author: "u/BigBookProblems", url: "https://reddit.com/r/NotebookLM/mno345" },
  { source: "reddit", content: "Audio overview is great but WHY can't I choose the voice? The default voices are so generic.", author: "u/VoiceMatters", url: "https://reddit.com/r/NotebookLM/pqr678" },
  { source: "reddit", content: "Citations are sometimes wrong - it cited paragraph 3 but the info was actually in paragraph 7. Had to double-check everything.", author: "u/FactChecker99", url: "https://reddit.com/r/NotebookLM/stu901" },
  { source: "twitter", content: "Just discovered @NotebookLM and my mind is BLOWN. Uploaded my entire course syllabus and it created a study guide in seconds.", author: "@StudentLife2024", url: "https://twitter.com/status/123456" },
  { source: "twitter", content: "NotebookLM audio summaries are my new favorite thing. Turned my boring meeting notes into an engaging 5-min podcast.", author: "@ProductManager_J", url: "https://twitter.com/status/234567" },
  { source: "twitter", content: "@NotebookLM please add team collaboration!! I want to share notebooks with my research group but there's no way to do it.", author: "@CollabNeeded", url: "https://twitter.com/status/345678" },
  { source: "twitter", content: "Is anyone else's NotebookLM super slow today? Taking 2+ minutes to generate responses. Usually it's instant.", author: "@TechUserAnna", url: "https://twitter.com/status/456789" },
  { source: "twitter", content: "Hot take: NotebookLM > ChatGPT for research because it actually stays grounded in YOUR sources. No hallucinations.", author: "@AIResearcher", url: "https://twitter.com/status/567890" },
  { source: "producthunt", content: "This is the best AI product I've used all year. As a lawyer, I can upload case files and get instant summaries. Saves me hours.", author: "LegalEagle", url: "https://producthunt.com/reviews/123" },
  { source: "producthunt", content: "Love the concept but needs mobile app badly. The web experience on mobile is clunky.", author: "MobileFirst_Dev", url: "https://producthunt.com/reviews/456" },
  { source: "producthunt", content: "4/5 stars - Great for personal use but enterprise features are missing. No SSO, no admin controls.", author: "EnterpriseBuyer", url: "https://producthunt.com/reviews/789" },
  { source: "producthunt", content: "The audio overview hosts have so much personality! It actually makes learning fun. My kids ask to listen to their homework summaries.", author: "HomeschoolMom", url: "https://producthunt.com/reviews/101" },
  { source: "appstore", content: "Would be 5 stars but it doesn't work offline. I travel a lot and need access on planes. Please add offline mode!", author: "FrequentFlyer", url: "https://apps.apple.com/review/111" },
  { source: "appstore", content: "Perfect for medical school. I upload lecture slides and quiz myself using the chat. Helped me ace my boards!", author: "MedStudent2025", url: "https://apps.apple.com/review/222" },
  { source: "appstore", content: "Audio quality is tinny and robotic. The content is good but I can't listen for more than 5 minutes.", author: "AudiophileUser", url: "https://apps.apple.com/review/333" },
  { source: "appstore", content: "Crashes every time I try to upload more than 10 sources. iPhone 12. Please fix!", author: "BugReporter_iOS", url: "https://apps.apple.com/review/444" },
  { source: "forum", content: "Has anyone figured out how to export notebooks? I'm worried about vendor lock-in.", author: "DataPortability", url: "https://forum.example.com/555" },
  { source: "forum", content: "Pro tip: Use NotebookLM for meeting prep! Upload attendee's LinkedIn profiles and recent emails. Creates amazing talking points.", author: "SalesHacker", url: "https://forum.example.com/666" },
  { source: "forum", content: "Been using this for 3 months and just realized there's no search across notebooks. Finding things is impossible now.", author: "OrganizationFreak", url: "https://forum.example.com/888" },
  { source: "email", content: "Your product deleted my notebook without warning! I had 6 months of research in there. This is unacceptable.", author: "support_ticket_1001", url: "internal://ticket/1001" },
  { source: "email", content: "I love NotebookLM but my university blocks Google services. Any plans for an alternative domain?", author: "support_ticket_1002", url: "internal://ticket/1002" },
  { source: "email", content: "Feature request: Can you add support for YouTube videos as sources?", author: "support_ticket_1003", url: "internal://ticket/1003" },
  { source: "email", content: "The notebook shared with me shows 'no access' even though my colleague sent the link. Permissions seem broken.", author: "support_ticket_1004", url: "internal://ticket/1004" },
  { source: "reddit", content: "NotebookLM is great but I wish it could handle tables better. My data gets mangled.", author: "u/DataAnalyst_Jane", url: "https://reddit.com/r/NotebookLM/tbl999" },
  { source: "twitter", content: "Accessibility issue: @NotebookLM audio player has no keyboard shortcuts. Hard for those who rely on keyboard navigation.", author: "@A11yAdvocate", url: "https://twitter.com/status/678901" },
  { source: "producthunt", content: "Game changer for language learning! I upload books in Spanish and chat about them in English.", author: "PolyglotPatty", url: "https://producthunt.com/reviews/202" },
  { source: "forum", content: "Does NotebookLM work with handwritten notes? The text recognition seems hit or miss.", author: "AnalogMeetsDigital", url: "https://forum.example.com/999" },
];

// Main Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case "/":
          return handleDashboard(env, "overview");
        case "/feedback":
          return handleDashboard(env, "feedback");
        case "/insights":
          return handleDashboard(env, "insights");
        case "/api/health":
          return Response.json({ status: "ok", timestamp: new Date().toISOString() });
        case "/api/seed":
          return handleSeed(env, corsHeaders);
        case "/api/analyze":
          return handleAnalyze(env, corsHeaders);
        case "/api/feedback":
          return handleFeedbackAPI(env, corsHeaders);
        case "/api/stats":
          return handleStats(env, corsHeaders);
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Error:", error);
      return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
    }
  },
};

// Use Workers AI (Llama 3.1) to analyze feedback
async function analyzeWithAI(env: Env, content: string): Promise<AIAnalysis> {
  const prompt = `Analyze this customer feedback about NotebookLM (a document analysis AI tool).

Feedback: "${content}"

Respond with ONLY valid JSON in this exact format (no other text):
{
  "sentiment": <number 0-10 where 0=very negative, 5=neutral, 10=very positive>,
  "urgency": <number 0-10 where 0=not urgent, 10=critical/blocking issue>,
  "themes": [<array of 2-3 keyword themes like "audio-quality", "source-limit", "collaboration">],
  "job_to_be_done": "<one sentence: Help me [action] so I can [outcome]>"
}`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a product feedback analyst. Always respond with valid JSON only, no other text." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
    });

    // Parse the AI response
    const text = (response as any).response || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: Math.min(10, Math.max(0, Number(parsed.sentiment) || 5)),
        urgency: Math.min(10, Math.max(0, Number(parsed.urgency) || 5)),
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3) : ["general"],
        job_to_be_done: parsed.job_to_be_done || "Help me use the product better"
      };
    }
  } catch (e) {
    console.error("AI analysis error:", e);
  }

  // Fallback if AI fails
  return { sentiment: 5, urgency: 5, themes: ["general"], job_to_be_done: "Help me use the product better" };
}

// Seed database AND automatically analyze with Workers AI
async function handleSeed(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    await env.DB.prepare("DELETE FROM feedback").run();
    await env.DB.prepare("DELETE FROM themes").run();

    let inserted = 0;
    let analyzed = 0;
    const themeCounts: Record<string, number> = {};

    for (const f of MOCK_FEEDBACK) {
      // Insert raw feedback
      const result = await env.DB.prepare(
        "INSERT INTO feedback (source, content, author, url) VALUES (?, ?, ?, ?) RETURNING id"
      ).bind(f.source, f.content, f.author, f.url).first() as { id: number };
      inserted++;

      // Automatically analyze with Workers AI (Llama 3.1)
      const analysis = await analyzeWithAI(env, f.content);

      // Update with AI analysis results
      await env.DB.prepare(
        `UPDATE feedback SET
          sentiment = ?, themes = ?, urgency = ?, job_to_be_done = ?, analyzed_at = datetime('now')
         WHERE id = ?`
      ).bind(
        String(analysis.sentiment),
        JSON.stringify(analysis.themes),
        String(analysis.urgency),
        analysis.job_to_be_done,
        result.id
      ).run();
      analyzed++;

      // Count themes for aggregation
      analysis.themes.forEach(t => {
        themeCounts[t.toLowerCase()] = (themeCounts[t.toLowerCase()] || 0) + 1;
      });
    }

    // Store theme counts
    for (const [name, count] of Object.entries(themeCounts)) {
      await env.DB.prepare(
        `INSERT INTO themes (name, count, last_seen) VALUES (?, ?, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET count = ?, last_seen = datetime('now')`
      ).bind(name, count, count).run();
    }

    return Response.json({
      success: true,
      message: `Loaded and analyzed ${analyzed} feedback entries using Workers AI (Llama 3.1)`,
      inserted,
      analyzed,
      ai_model: "@cf/meta/llama-3.1-8b-instruct",
      themes_extracted: Object.keys(themeCounts).length
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

// Run AI analysis on all unanalyzed feedback
async function handleAnalyze(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Get unanalyzed feedback
    const result = await env.DB.prepare(
      "SELECT * FROM feedback WHERE analyzed_at IS NULL LIMIT 10"
    ).all();

    if (result.results.length === 0) {
      return Response.json({
        success: true,
        message: "No unanalyzed feedback found. All feedback has been analyzed.",
        analyzed: 0
      }, { headers: corsHeaders });
    }

    const themeCounts: Record<string, number> = {};
    let analyzed = 0;

    for (const feedback of result.results as FeedbackEntry[]) {
      // Call Workers AI for analysis
      const analysis = await analyzeWithAI(env, feedback.content);

      // Update the database with AI results
      await env.DB.prepare(
        `UPDATE feedback SET
          sentiment = ?, themes = ?, urgency = ?, job_to_be_done = ?, analyzed_at = datetime('now')
         WHERE id = ?`
      ).bind(
        String(analysis.sentiment),
        JSON.stringify(analysis.themes),
        String(analysis.urgency),
        analysis.job_to_be_done,
        feedback.id
      ).run();

      // Count themes
      analysis.themes.forEach(t => {
        themeCounts[t.toLowerCase()] = (themeCounts[t.toLowerCase()] || 0) + 1;
      });

      analyzed++;
    }

    // Update themes table
    for (const [name, count] of Object.entries(themeCounts)) {
      await env.DB.prepare(
        `INSERT INTO themes (name, count, last_seen) VALUES (?, ?, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET count = count + ?, last_seen = datetime('now')`
      ).bind(name, count, count).run();
    }

    // Check if more need analysis
    const remaining = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM feedback WHERE analyzed_at IS NULL"
    ).first() as { count: number };

    return Response.json({
      success: true,
      message: `Analyzed ${analyzed} feedback entries using Workers AI (Llama 3.1)`,
      analyzed,
      remaining: remaining.count,
      note: remaining.count > 0 ? "Call /api/analyze again to analyze more" : "All done!"
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

// API: Get feedback
async function handleFeedbackAPI(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
  return Response.json({ success: true, count: result.results.length, feedback: result.results }, { headers: corsHeaders });
}

// API: Get stats
async function handleStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const feedback = await env.DB.prepare("SELECT sentiment, source, urgency FROM feedback WHERE analyzed_at IS NOT NULL").all();
  const themes = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 20").all();

  let sentSum = 0, urgSum = 0;
  const bySource: Record<string, number> = {};
  feedback.results.forEach((f: any) => {
    sentSum += parseInt(f.sentiment) || 5;
    urgSum += parseInt(f.urgency) || 5;
    bySource[f.source] = (bySource[f.source] || 0) + 1;
  });

  return Response.json({
    total: feedback.results.length,
    avgSentiment: feedback.results.length > 0 ? (sentSum / feedback.results.length).toFixed(1) : 0,
    avgUrgency: feedback.results.length > 0 ? (urgSum / feedback.results.length).toFixed(1) : 0,
    bySource,
    topThemes: themes.results
  }, { headers: corsHeaders });
}

// Shared styles
function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .nav { background: #1e293b; border-bottom: 1px solid #334155; padding: 1rem 2rem; display: flex; gap: 2rem; align-items: center; }
    .nav-brand { font-size: 1.25rem; font-weight: bold; color: #8b5cf6; }
    .nav-links { display: flex; gap: 1rem; }
    .nav-link { color: #94a3b8; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: all 0.2s; }
    .nav-link:hover, .nav-link.active { background: #334155; color: #e2e8f0; }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .page-title { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .page-subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .card h2 { font-size: 0.9rem; color: #94a3b8; margin-bottom: 1rem; text-transform: uppercase; }
    .stat-number { font-size: 2.5rem; font-weight: bold; }
    .stat-label { color: #64748b; font-size: 0.85rem; }
    .chart-container { height: 350px; }
    .full-width { grid-column: 1 / -1; }
    .feedback-item { background: #0f172a; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px; border-left: 4px solid #334155; }
    .feedback-content { margin-bottom: 0.75rem; line-height: 1.5; }
    .feedback-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .badge-source { background: #334155; }
    .sentiment-good { border-left-color: #22c55e; }
    .sentiment-ok { border-left-color: #eab308; }
    .sentiment-bad { border-left-color: #ef4444; }
    .score-high { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .score-mid { background: rgba(234, 179, 8, 0.2); color: #eab308; }
    .score-low { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .jtbd-card { background: #0f172a; padding: 1.25rem; border-radius: 12px; border: 1px solid #334155; }
    .jtbd-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .jtbd-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .jtbd-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }
    .theme-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .theme-name { width: 150px; font-size: 0.85rem; }
    .theme-bar-bg { flex: 1; height: 24px; background: #0f172a; border-radius: 4px; overflow: hidden; }
    .theme-bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
    .scroll-container { max-height: 600px; overflow-y: auto; }
    .setup-box { background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; }
    .setup-step { background: #0f172a; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; font-family: monospace; }
    .btn { background: #8b5cf6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    .btn:hover { background: #7c3aed; }
  `;
}

function getNav(activePage: string): string {
  return `
    <nav class="nav">
      <div class="nav-brand">NotebookLM Feedback</div>
      <div class="nav-links">
        <a href="/" class="nav-link ${activePage === 'overview' ? 'active' : ''}">Overview</a>
        <a href="/feedback" class="nav-link ${activePage === 'feedback' ? 'active' : ''}">All Feedback</a>
        <a href="/insights" class="nav-link ${activePage === 'insights' ? 'active' : ''}">JTBD Insights</a>
      </div>
    </nav>
  `;
}

// Dashboard handler
async function handleDashboard(env: Env, page: string): Promise<Response> {
  let feedbackData: FeedbackEntry[] = [];
  let stats = { total: 0, analyzed: 0, avgSentiment: 0, avgUrgency: 0, bySource: {} as Record<string, number>, topThemes: [] as any[] };

  try {
    const result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
    feedbackData = result.results as FeedbackEntry[];
    stats.total = feedbackData.length;

    const analyzed = feedbackData.filter(f => f.analyzed_at);
    stats.analyzed = analyzed.length;

    let sentSum = 0, urgSum = 0;
    analyzed.forEach(f => {
      sentSum += parseInt(f.sentiment || "5");
      urgSum += parseInt(f.urgency || "5");
      stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
    });
    stats.avgSentiment = stats.analyzed > 0 ? Math.round((sentSum / stats.analyzed) * 10) / 10 : 0;
    stats.avgUrgency = stats.analyzed > 0 ? Math.round((urgSum / stats.analyzed) * 10) / 10 : 0;

    const themeResult = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 10").all();
    stats.topThemes = themeResult.results;
  } catch (e) {
    // DB might be empty
  }

  let content = '';
  if (page === 'overview') content = getOverviewPage(feedbackData, stats);
  else if (page === 'feedback') content = getFeedbackPage(feedbackData);
  else if (page === 'insights') content = getInsightsPage(feedbackData, stats);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotebookLM Feedback - ${page}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>${getStyles()}</style>
</head>
<body>
  ${getNav(page)}
  <div class="container">${content}</div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

function getOverviewPage(feedbackData: FeedbackEntry[], stats: any): string {
  const analyzed = feedbackData.filter(f => f.analyzed_at);
  const sourceColors: Record<string, string> = {
    reddit: '#ff4500', twitter: '#1da1f2', producthunt: '#da552f',
    appstore: '#007aff', forum: '#22c55e', email: '#6b7280'
  };

  // Show setup instructions if no data yet
  if (stats.total === 0) {
    return `
      <h1 class="page-title">NotebookLM Feedback Aggregator</h1>
      <p class="page-subtitle">AI-powered feedback analysis using Cloudflare Workers</p>

      <div class="setup-box">
        <h2 style="color: #3b82f6; margin-bottom: 1rem;">Get Started</h2>
        <p style="margin-bottom: 1rem;">This tool uses <strong>Workers AI (Llama 3.1)</strong> to automatically analyze customer feedback.</p>

        <p style="margin: 1rem 0;"><strong>Load sample data:</strong> (AI analyzes each entry automatically)</p>
        <div class="setup-step">curl -X POST ${typeof location !== 'undefined' ? location.origin : 'YOUR_URL'}/api/seed</div>

        <p style="margin: 1rem 0;">Then refresh this page!</p>

        <div style="margin-top: 1.5rem; padding: 1rem; background: #0f172a; border-radius: 8px;">
          <h3 style="color: #8b5cf6; margin-bottom: 0.5rem;">Cloudflare Products Used:</h3>
          <ul style="color: #94a3b8; margin-left: 1.5rem;">
            <li><strong>Workers</strong> - Hosting this application</li>
            <li><strong>D1 Database</strong> - Storing feedback entries</li>
            <li><strong>Workers AI</strong> - Llama 3.1 for sentiment, urgency, themes</li>
          </ul>
        </div>
      </div>
    `;
  }

  return `
    <h1 class="page-title">Feedback Overview</h1>
    <p class="page-subtitle">AI-analyzed insights from ${stats.analyzed} customer feedback items</p>

    <div class="grid">
      <div class="card">
        <h2>Total Analyzed</h2>
        <div class="stat-number">${stats.analyzed}</div>
        <div class="stat-label">by Workers AI</div>
      </div>
      <div class="card">
        <h2>Avg Sentiment</h2>
        <div class="stat-number" style="color: ${stats.avgSentiment >= 6 ? '#22c55e' : stats.avgSentiment >= 4 ? '#eab308' : '#ef4444'}">${stats.avgSentiment}/10</div>
        <div class="stat-label">${stats.avgSentiment >= 6 ? 'Generally positive' : stats.avgSentiment >= 4 ? 'Mixed' : 'Needs attention'}</div>
      </div>
      <div class="card">
        <h2>Avg Urgency</h2>
        <div class="stat-number" style="color: ${stats.avgUrgency >= 7 ? '#ef4444' : stats.avgUrgency >= 4 ? '#eab308' : '#22c55e'}">${stats.avgUrgency}/10</div>
        <div class="stat-label">${stats.avgUrgency >= 7 ? 'High priority' : stats.avgUrgency >= 4 ? 'Moderate' : 'Low priority'}</div>
      </div>
      <div class="card">
        <h2>Sources</h2>
        <div class="stat-number">${Object.keys(stats.bySource).length}</div>
        <div class="stat-label">channels</div>
      </div>
    </div>

    <div class="grid">
      <div class="card full-width">
        <h2>Pain Map - Sentiment vs Urgency (AI-Generated)</h2>
        <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.85rem;">X: Sentiment (0-10) | Y: Urgency (0-10) | Color: Source</p>
        <div class="chart-container"><canvas id="painMap"></canvas></div>
        <div class="legend">
          ${Object.entries(sourceColors).map(([s, c]) => `<div class="legend-item"><div class="legend-dot" style="background: ${c};"></div> ${s}</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Top Themes (AI-Extracted)</h2>
        ${stats.topThemes.length > 0 ? stats.topThemes.slice(0, 8).map((t: any, i: number) => `
          <div class="theme-bar">
            <span class="theme-name">${t.name}</span>
            <div class="theme-bar-bg">
              <div class="theme-bar-fill" style="width: ${Math.min(100, (t.count / stats.topThemes[0].count) * 100)}%; background: ${i < 3 ? '#8b5cf6' : '#475569'};">${t.count}</div>
            </div>
          </div>
        `).join('') : '<p style="color: #64748b;">Run analysis first</p>'}
      </div>
      <div class="card">
        <h2>By Source</h2>
        <div class="chart-container" style="height: 280px;"><canvas id="sourcesChart"></canvas></div>
      </div>
    </div>

    <script>
      const analyzed = ${JSON.stringify(analyzed)};
      const sourceColors = ${JSON.stringify(sourceColors)};

      const grouped = {};
      analyzed.forEach(f => {
        const sent = parseInt(f.sentiment) || 5;
        const urg = parseInt(f.urgency) || 5;
        const key = sent + '-' + urg + '-' + f.source;
        if (!grouped[key]) grouped[key] = { x: sent, y: urg, source: f.source, count: 0, sample: f.content };
        grouped[key].count++;
      });

      const painMapData = Object.values(grouped).map(g => ({
        x: g.x + (Math.random() - 0.5) * 0.4,
        y: g.y + (Math.random() - 0.5) * 0.4,
        r: Math.min(6 + g.count * 3, 20),
        source: g.source,
        sample: g.sample
      }));

      new Chart(document.getElementById('painMap'), {
        type: 'bubble',
        data: { datasets: [{ data: painMapData, backgroundColor: painMapData.map(d => (sourceColors[d.source] || '#666') + '99'), borderColor: painMapData.map(d => sourceColors[d.source] || '#666'), borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => painMapData[ctx.dataIndex].source + ': "' + painMapData[ctx.dataIndex].sample.substring(0, 40) + '..."' } } },
          scales: {
            x: { min: -0.5, max: 10.5, title: { display: true, text: 'Sentiment (0=negative, 10=positive)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { min: -0.5, max: 10.5, title: { display: true, text: 'Urgency (0=low, 10=critical)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
          }
        }
      });

      const sourceData = ${JSON.stringify(stats.bySource)};
      new Chart(document.getElementById('sourcesChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(sourceData), datasets: [{ data: Object.values(sourceData), backgroundColor: Object.keys(sourceData).map(s => sourceColors[s] || '#666') }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
      });
    </script>
  `;
}

function getFeedbackPage(feedbackData: FeedbackEntry[]): string {
  return `
    <h1 class="page-title">All Feedback</h1>
    <p class="page-subtitle">${feedbackData.length} items | ${feedbackData.filter(f => f.analyzed_at).length} analyzed by AI</p>
    <div class="scroll-container">
      ${feedbackData.map(f => {
        const sent = parseInt(f.sentiment || "5");
        const urg = parseInt(f.urgency || "5");
        const isAnalyzed = !!f.analyzed_at;
        const sentClass = isAnalyzed ? (sent >= 7 ? 'sentiment-good' : sent >= 4 ? 'sentiment-ok' : 'sentiment-bad') : '';
        return `
          <div class="feedback-item ${sentClass}">
            <div class="feedback-content">"${f.content}"</div>
            <div class="feedback-meta">
              <span class="badge badge-source">${f.source}</span>
              ${isAnalyzed ? `
                <span class="badge ${sent >= 7 ? 'score-high' : sent >= 4 ? 'score-mid' : 'score-low'}">Sent: ${sent}/10</span>
                <span class="badge ${urg >= 7 ? 'score-low' : urg >= 4 ? 'score-mid' : 'score-high'}">Urg: ${urg}/10</span>
              ` : '<span class="badge" style="background: #475569;">Not analyzed yet</span>'}
              <span style="color: #64748b; font-size: 0.75rem; margin-left: auto;">— ${f.author}</span>
            </div>
            ${isAnalyzed && f.job_to_be_done ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #8b5cf6;"><strong>JTBD:</strong> ${f.job_to_be_done}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getInsightsPage(feedbackData: FeedbackEntry[], stats: any): string {
  const analyzed = feedbackData.filter(f => f.analyzed_at);
  const painPoints = analyzed.filter(f => parseInt(f.urgency || "0") >= 7 && parseInt(f.sentiment || "10") <= 4);

  // Group JTBDs
  const jtbdGroups: Record<string, { count: number; samples: string[] }> = {};
  analyzed.forEach(f => {
    if (f.job_to_be_done) {
      const key = f.job_to_be_done.toLowerCase().includes('audio') ? 'Audio & Learning' :
                  f.job_to_be_done.toLowerCase().includes('research') || f.job_to_be_done.toLowerCase().includes('document') ? 'Research & Synthesis' :
                  f.job_to_be_done.toLowerCase().includes('team') || f.job_to_be_done.toLowerCase().includes('share') ? 'Collaboration' :
                  f.job_to_be_done.toLowerCase().includes('trust') || f.job_to_be_done.toLowerCase().includes('accurate') ? 'Trust & Accuracy' :
                  'Other';
      if (!jtbdGroups[key]) jtbdGroups[key] = { count: 0, samples: [] };
      jtbdGroups[key].count++;
      if (jtbdGroups[key].samples.length < 2) jtbdGroups[key].samples.push(f.job_to_be_done);
    }
  });

  return `
    <h1 class="page-title">JTBD Insights</h1>
    <p class="page-subtitle">AI-extracted jobs-to-be-done from ${analyzed.length} analyzed feedback items</p>

    <div class="grid">
      ${Object.entries(jtbdGroups).sort((a, b) => b[1].count - a[1].count).map(([name, data], i) => `
        <div class="jtbd-card">
          <div class="jtbd-icon">${['📚', '🎧', '👥', '🔒', '⚡'][i] || '💡'}</div>
          <div class="jtbd-title">${name}</div>
          <div class="jtbd-desc">${data.samples[0] || ''}</div>
          <div style="color: #8b5cf6; font-size: 0.75rem; margin-top: 0.5rem;">${data.count} mentions (${Math.round(data.count / analyzed.length * 100)}%)</div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-top: 2rem;">
      <h2>Critical Pain Points (High Urgency + Low Sentiment)</h2>
      <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.85rem;">Issues that need immediate PM attention</p>
      ${painPoints.length > 0 ? painPoints.slice(0, 5).map(f => `
        <div class="feedback-item sentiment-bad">
          <div class="feedback-content">"${f.content}"</div>
          <div class="feedback-meta">
            <span class="badge badge-source">${f.source}</span>
            <span class="badge score-low">Sent: ${f.sentiment}/10</span>
            <span class="badge score-low">Urg: ${f.urgency}/10</span>
          </div>
          ${f.job_to_be_done ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #8b5cf6;"><strong>JTBD:</strong> ${f.job_to_be_done}</div>` : ''}
        </div>
      `).join('') : '<p style="color: #64748b;">No critical pain points found. Run /api/analyze first.</p>'}
    </div>
  `;
}
