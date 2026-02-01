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
  DB: D1Database;
  AI: Ai;
}

// Feedback entry type
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

// Main Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for API endpoints
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
          return handleHealth();

        case "/api/seed":
          return handleSeed(env, corsHeaders);

        case "/api/feedback":
          return handleFeedback(request, env, corsHeaders);

        case "/api/analyze":
          return handleAnalyze(request, env, corsHeaders);

        default:
          return new Response("Not Found", { status: 404 });
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

// ============================================
// MOCK DATA - 50+ realistic NotebookLM feedback entries
// ============================================
const MOCK_FEEDBACK: Omit<FeedbackEntry, "id" | "created_at" | "analyzed_at">[] = [
  // Reddit feedback - positive
  {
    source: "reddit",
    content: "NotebookLM is absolutely game-changing for research! I uploaded 20 papers and it instantly found connections I'd missed after months of reading.",
    author: "u/PhD_Survivor",
    url: "https://reddit.com/r/NotebookLM/comments/abc123",
  },
  {
    source: "reddit",
    content: "The audio overview feature is incredible. I listen to my research notes while commuting now. It's like having a personal podcast about my own work!",
    author: "u/AudioLearner42",
    url: "https://reddit.com/r/NotebookLM/comments/def456",
  },
  {
    source: "reddit",
    content: "Finally a tool that actually understands academic papers. No more copying sections into ChatGPT and losing context.",
    author: "u/ResearcherMike",
    url: "https://reddit.com/r/MachineLearning/comments/ghi789",
  },
  // Reddit feedback - negative/feature requests
  {
    source: "reddit",
    content: "Why is there a 50 source limit?? I have 200+ papers for my thesis and I need them all in one notebook. This is a dealbreaker.",
    author: "u/ThesisStruggles",
    url: "https://reddit.com/r/NotebookLM/comments/jkl012",
  },
  {
    source: "reddit",
    content: "Keeps timing out when I upload large PDFs. Tried 3 times with my 500-page textbook, nothing works. Super frustrating.",
    author: "u/BigBookProblems",
    url: "https://reddit.com/r/NotebookLM/comments/mno345",
  },
  {
    source: "reddit",
    content: "Audio overview is great but WHY can't I choose the voice? The default voices are so generic. Let me pick something more natural.",
    author: "u/VoiceMatters",
    url: "https://reddit.com/r/NotebookLM/comments/pqr678",
  },
  {
    source: "reddit",
    content: "Citations are sometimes wrong - it cited paragraph 3 but the info was actually in paragraph 7. Had to double-check everything.",
    author: "u/FactChecker99",
    url: "https://reddit.com/r/NotebookLM/comments/stu901",
  },
  // Twitter/X feedback
  {
    source: "twitter",
    content: "Just discovered @NotebookLM and my mind is BLOWN. Uploaded my entire course syllabus and it created a study guide in seconds. Where has this been all my life?! 🤯",
    author: "@StudentLife2024",
    url: "https://twitter.com/StudentLife2024/status/123456",
  },
  {
    source: "twitter",
    content: "NotebookLM audio summaries are my new favorite thing. Turned my boring meeting notes into an engaging 5-min podcast. Team loved it!",
    author: "@ProductManager_J",
    url: "https://twitter.com/ProductManager_J/status/234567",
  },
  {
    source: "twitter",
    content: "@NotebookLM please add team collaboration!! I want to share notebooks with my research group but there's no way to do it 😭",
    author: "@CollabNeeded",
    url: "https://twitter.com/CollabNeeded/status/345678",
  },
  {
    source: "twitter",
    content: "Is anyone else's NotebookLM super slow today? Taking 2+ minutes to generate responses. Usually it's instant.",
    author: "@TechUserAnna",
    url: "https://twitter.com/TechUserAnna/status/456789",
  },
  {
    source: "twitter",
    content: "Hot take: NotebookLM > ChatGPT for research because it actually stays grounded in YOUR sources. No hallucinations because it can only use what you give it.",
    author: "@AIResearcher",
    url: "https://twitter.com/AIResearcher/status/567890",
  },
  // Product Hunt feedback
  {
    source: "producthunt",
    content: "This is the best AI product I've used all year. As a lawyer, I can upload case files and get instant summaries. Saves me hours every day.",
    author: "LegalEagle",
    url: "https://producthunt.com/products/notebooklm/reviews/123",
  },
  {
    source: "producthunt",
    content: "Love the concept but needs mobile app badly. I want to listen to audio overviews on my phone but the web experience on mobile is clunky.",
    author: "MobileFirst_Dev",
    url: "https://producthunt.com/products/notebooklm/reviews/456",
  },
  {
    source: "producthunt",
    content: "4/5 stars - Great for personal use but enterprise features are missing. No SSO, no admin controls, no audit logs. Can't convince my company to adopt it.",
    author: "EnterpriseBuyer",
    url: "https://producthunt.com/products/notebooklm/reviews/789",
  },
  {
    source: "producthunt",
    content: "The audio overview hosts have so much personality! It actually makes learning fun. My kids now ask to listen to their homework summaries 😂",
    author: "HomeschoolMom",
    url: "https://producthunt.com/products/notebooklm/reviews/101",
  },
  // App Store reviews
  {
    source: "appstore",
    content: "Would be 5 stars but it doesn't work offline. I travel a lot and need access to my notebooks on planes. Please add offline mode!",
    author: "FrequentFlyer_Review",
    url: "https://apps.apple.com/review/111",
  },
  {
    source: "appstore",
    content: "Perfect for medical school. I upload lecture slides and textbook chapters, then quiz myself using the chat. Helped me ace my boards!",
    author: "MedStudent2025",
    url: "https://apps.apple.com/review/222",
  },
  {
    source: "appstore",
    content: "Audio quality is tinny and robotic. Expected better from Google. The content is good but I can't listen for more than 5 minutes.",
    author: "AudiophileUser",
    url: "https://apps.apple.com/review/333",
  },
  {
    source: "appstore",
    content: "Crashes every time I try to upload more than 10 sources. iPhone 12. Please fix this bug!",
    author: "BugReporter_iOS",
    url: "https://apps.apple.com/review/444",
  },
  // Forum discussions
  {
    source: "forum",
    content: "Has anyone figured out how to export their notebooks? I'm worried about vendor lock-in. What happens if Google discontinues this like they did with Stadia?",
    author: "DataPortability",
    url: "https://forum.example.com/thread/555",
  },
  {
    source: "forum",
    content: "Pro tip: Use NotebookLM for meeting prep! Upload the attendee's LinkedIn profiles and recent emails. It creates amazing talking points.",
    author: "SalesHacker",
    url: "https://forum.example.com/thread/666",
  },
  {
    source: "forum",
    content: "The suggested questions feature is underrated. I thought I understood a paper until NotebookLM asked questions I couldn't answer. Humbling!",
    author: "CuriousReader",
    url: "https://forum.example.com/thread/777",
  },
  {
    source: "forum",
    content: "Been using this for 3 months and just realized there's no search across notebooks. I have 50 notebooks now and finding things is impossible.",
    author: "OrganizationFreak",
    url: "https://forum.example.com/thread/888",
  },
  // Email support tickets (anonymized)
  {
    source: "email",
    content: "Your product deleted my notebook without warning! I had 6 months of research in there. How do I recover it? This is unacceptable.",
    author: "support_ticket_1001",
    url: "internal://ticket/1001",
  },
  {
    source: "email",
    content: "I love NotebookLM but my university blocks Google services. Any plans for a self-hosted version or alternative domain?",
    author: "support_ticket_1002",
    url: "internal://ticket/1002",
  },
  {
    source: "email",
    content: "Feature request: Can you add support for YouTube videos as sources? I have educational videos I want to include alongside my notes.",
    author: "support_ticket_1003",
    url: "internal://ticket/1003",
  },
  {
    source: "email",
    content: "The notebook shared with me shows 'no access' even though my colleague sent the link. Permissions seem broken.",
    author: "support_ticket_1004",
    url: "internal://ticket/1004",
  },
  // More diverse feedback
  {
    source: "reddit",
    content: "NotebookLM is great but I wish it could handle tables better. My data gets mangled when I upload CSVs converted to PDF.",
    author: "u/DataAnalyst_Jane",
    url: "https://reddit.com/r/NotebookLM/comments/tbl999",
  },
  {
    source: "twitter",
    content: "Accessibility issue: @NotebookLM audio player has no keyboard shortcuts. Hard to use for those who rely on keyboard navigation.",
    author: "@A11yAdvocate",
    url: "https://twitter.com/A11yAdvocate/status/678901",
  },
  {
    source: "producthunt",
    content: "Game changer for language learning! I upload books in Spanish and chat about them in English. It's like having a bilingual tutor.",
    author: "PolyglotPatty",
    url: "https://producthunt.com/products/notebooklm/reviews/202",
  },
  {
    source: "forum",
    content: "Does NotebookLM work with handwritten notes? I scanned my notebook pages but the text recognition seems hit or miss.",
    author: "AnalogMeetsDigital",
    url: "https://forum.example.com/thread/999",
  },
  {
    source: "reddit",
    content: "The 'Deep Dive' conversation mode is incredible but the two hosts sometimes talk over each other. Minor issue but noticeable.",
    author: "u/PodcastFan",
    url: "https://reddit.com/r/NotebookLM/comments/deepdive1",
  },
  {
    source: "twitter",
    content: "I pay for Google One but NotebookLM doesn't give any premium features. Why is there no paid tier with higher limits?",
    author: "@WillingToPay",
    url: "https://twitter.com/WillingToPay/status/789012",
  },
  {
    source: "appstore",
    content: "Dark mode please! Using this at night is blinding. My eyes are begging for mercy.",
    author: "NightOwlCoder",
    url: "https://apps.apple.com/review/555",
  },
  {
    source: "email",
    content: "We're a small startup and would love to use NotebookLM for our documentation. Is there a startup program or discount for teams under 10?",
    author: "support_ticket_1005",
    url: "internal://ticket/1005",
  },
  {
    source: "reddit",
    content: "Pro tip: The FAQ generation feature is amazing for creating documentation. Upload your code and it generates user-friendly FAQs.",
    author: "u/DevRelGuru",
    url: "https://reddit.com/r/NotebookLM/comments/faq123",
  },
  {
    source: "twitter",
    content: "NotebookLM + Obsidian export would be a dream combo. Anyone know if there's an API or integration planned?",
    author: "@ObsidianUser",
    url: "https://twitter.com/ObsidianUser/status/890123",
  },
  {
    source: "producthunt",
    content: "I've tried every AI note tool - Notion AI, Mem, Reflect. NotebookLM is the only one that actually helps me THINK, not just summarize.",
    author: "PKMEnthusiast",
    url: "https://producthunt.com/products/notebooklm/reviews/303",
  },
  {
    source: "forum",
    content: "Can we get a status page? NotebookLM was down for 2 hours yesterday and I had no way to know if it was just me or everyone.",
    author: "UptimeMatters",
    url: "https://forum.example.com/thread/1111",
  },
  {
    source: "reddit",
    content: "Workflow tip: I export ChatGPT conversations as PDF and upload to NotebookLM. Now I have searchable, queryable chat history!",
    author: "u/WorkflowWizard",
    url: "https://reddit.com/r/NotebookLM/comments/workflow1",
  },
  {
    source: "appstore",
    content: "Please add widget support! I want quick access to my most recent notebook from my home screen.",
    author: "WidgetLover",
    url: "https://apps.apple.com/review/666",
  },
  {
    source: "email",
    content: "GDPR question: Where is my data stored? I'm in the EU and need to know before I can use this for work.",
    author: "support_ticket_1006",
    url: "internal://ticket/1006",
  },
  {
    source: "twitter",
    content: "Used NotebookLM to prepare for a job interview. Uploaded the job posting, company blog posts, and interviewer's LinkedIn. Crushed it! 🎉",
    author: "@GotTheJob",
    url: "https://twitter.com/GotTheJob/status/901234",
  },
  {
    source: "producthunt",
    content: "One complaint: No way to organize notebooks into folders. I have 30+ notebooks now and the flat list is unmanageable.",
    author: "NeedsOrganization",
    url: "https://producthunt.com/products/notebooklm/reviews/404",
  },
  {
    source: "reddit",
    content: "Am I the only one who thinks the audio overviews are TOO enthusiastic? Sometimes I just want a neutral summary, not a hype podcast.",
    author: "u/JustTheFacts",
    url: "https://reddit.com/r/NotebookLM/comments/tone123",
  },
  {
    source: "forum",
    content: "Security concern: Can Google employees see my uploaded documents? I work with confidential legal files and need clarity on this.",
    author: "PrivacyFirst",
    url: "https://forum.example.com/thread/2222",
  },
  {
    source: "appstore",
    content: "Lost all my highlights and notes when I accidentally clicked 'Remove Source'. No confirmation dialog, no undo. 2 hours of annotation gone!",
    author: "NeedsUndo",
    url: "https://apps.apple.com/review/777",
  },
  {
    source: "email",
    content: "Love the product! Quick suggestion: Let us rename the AI hosts in audio overview. Would be fun to customize.",
    author: "support_ticket_1007",
    url: "internal://ticket/1007",
  },
  {
    source: "twitter",
    content: "NotebookLM struggles with technical jargon in my biotech papers. It mispronounces gene names in audio overview. Minor but distracting.",
    author: "@BiotechResearcher",
    url: "https://twitter.com/BiotechResearcher/status/012345",
  },
  {
    source: "reddit",
    content: "Feature comparison: NotebookLM vs Claude Projects vs ChatGPT Custom GPTs. Honestly, NotebookLM wins for source management, loses on flexibility.",
    author: "u/AIToolsReview",
    url: "https://reddit.com/r/AItools/comments/comparison1",
  },
  {
    source: "producthunt",
    content: "Wish there was version history for notebooks. Made some changes and now I want to go back but there's no way to see previous versions.",
    author: "VersionControlFan",
    url: "https://producthunt.com/products/notebooklm/reviews/505",
  },
];

// ============================================
// API HANDLERS
// ============================================

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
      <code>POST /api/seed - Seed database with mock data</code>
      <code>POST /api/analyze - Analyze feedback with AI</code>
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

// Seed database with mock feedback
async function handleSeed(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Clear existing data
    await env.DB.prepare("DELETE FROM feedback").run();
    await env.DB.prepare("DELETE FROM themes").run();

    // Insert mock feedback
    let inserted = 0;
    for (const feedback of MOCK_FEEDBACK) {
      await env.DB.prepare(
        `INSERT INTO feedback (source, content, author, url) VALUES (?, ?, ?, ?)`
      )
        .bind(feedback.source, feedback.content, feedback.author, feedback.url)
        .run();
      inserted++;
    }

    return Response.json(
      {
        success: true,
        message: `Seeded database with ${inserted} feedback entries`,
        count: inserted,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Get all feedback
async function handleFeedback(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const source = url.searchParams.get("source");
    const sentiment = url.searchParams.get("sentiment");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let query = "SELECT * FROM feedback";
    const conditions: string[] = [];
    const params: string[] = [];

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
    params.push(limit.toString());

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    return Response.json(
      {
        success: true,
        count: result.results.length,
        feedback: result.results,
      },
      { headers: corsHeaders }
    );
  }

  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: corsHeaders }
  );
}

// Analyze feedback with AI
async function handleAnalyze(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Get unanalyzed feedback
    const unanalyzed = await env.DB.prepare(
      "SELECT * FROM feedback WHERE sentiment IS NULL LIMIT 10"
    ).all();

    if (unanalyzed.results.length === 0) {
      return Response.json(
        { success: true, message: "No feedback to analyze", analyzed: 0 },
        { headers: corsHeaders }
      );
    }

    let analyzed = 0;
    for (const feedback of unanalyzed.results as FeedbackEntry[]) {
      // Call Workers AI for analysis
      const prompt = `Analyze this user feedback about NotebookLM (a Google AI product for analyzing documents):

"${feedback.content}"

Respond in JSON format with:
{
  "sentiment": "positive" | "negative" | "neutral",
  "themes": ["theme1", "theme2"],
  "urgency": "low" | "medium" | "high",
  "job_to_be_done": "When I [situation], but [barrier], help me [goal], so I [outcome]"
}

The job_to_be_done should capture what the user is trying to accomplish in the JTBD framework format.
Only respond with valid JSON, no other text.`;

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt,
        max_tokens: 300,
      });

      // Parse AI response
      try {
        const responseText = (aiResponse as { response: string }).response;
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          // Update database
          await env.DB.prepare(
            `UPDATE feedback
             SET sentiment = ?, themes = ?, urgency = ?, job_to_be_done = ?, analyzed_at = datetime('now')
             WHERE id = ?`
          )
            .bind(
              analysis.sentiment,
              JSON.stringify(analysis.themes),
              analysis.urgency,
              analysis.job_to_be_done,
              feedback.id
            )
            .run();

          // Update themes table
          for (const theme of analysis.themes) {
            await env.DB.prepare(
              `INSERT INTO themes (name, count, last_seen)
               VALUES (?, 1, datetime('now'))
               ON CONFLICT(name) DO UPDATE SET count = count + 1, last_seen = datetime('now')`
            )
              .bind(theme.toLowerCase())
              .run();
          }

          analyzed++;
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
      }
    }

    return Response.json(
      {
        success: true,
        message: `Analyzed ${analyzed} feedback entries`,
        analyzed,
        remaining: unanalyzed.results.length - analyzed,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
