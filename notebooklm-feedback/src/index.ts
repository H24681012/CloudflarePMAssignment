/**
 * NotebookLM Feedback Aggregator
 *
 * Cloudflare Products Used:
 * - Workers: Hosting and API endpoints
 * - D1 Database: Store feedback and analysis results
 * - Workers AI (Llama 3.1): Sentiment analysis, theme extraction, urgency scoring
 * - Vectorize: Semantic similarity search for clustering related feedback
 */

export interface Env {
  DB: D1Database;
  AI: Ai;
  VECTORIZE: Vectorize;
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
  created_at?: string;
  analyzed_at?: string;
}

// AI analysis output - computed at runtime, NOT stored in database
interface AIAnalysis {
  sentiment: number;
  urgency: number;
  themes: string[];
  notebooklm_feedback_db: D1Database;
  AI: Ai;
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

// JTBD is computed separately and never stored - it's an OUTPUT, not INPUT
interface JTBDResult {
  feedbackId: number;
  content: string;
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
        case "/api/similar":
          return handleSimilar(request, env, corsHeaders);
        case "/api/clusters":
          return handleClusters(env, corsHeaders);
        case "/clusters":
          return handleDashboard(env, "clusters");
        case "/digest":
          return handleDashboard(env, "digest");
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Error:", error);
      return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
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

        case "/api/analyze":
          if (request.method === "POST") {
            return handleAnalyze(request, env, corsHeaders);
          }
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        case "/api/analyze-all":
          if (request.method === "POST") {
            return handleAnalyzeAll(env, corsHeaders);
          }
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });

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

// Generate embeddings using Workers AI for Vectorize
async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  try {
    const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: text.substring(0, 512) // Limit text length for embedding model
    });
    return (response as any).data?.[0] || [];
  } catch (e) {
    console.error("Embedding error:", e);
    return [];
  }
}

// Use Workers AI (Llama 3.1) to analyze feedback - stores sentiment/urgency/themes only
async function analyzeWithAI(env: Env, content: string): Promise<AIAnalysis> {
  const prompt = `Analyze this customer feedback about NotebookLM (a document analysis AI tool).

Feedback: "${content}"

Respond with ONLY valid JSON in this exact format (no other text):
{
  "sentiment": <number 0-10 where 0=very negative, 5=neutral, 10=very positive>,
  "urgency": <number 0-10 where 0=not urgent, 10=critical/blocking issue>,
  "themes": [<array of 2-3 keyword themes like "audio-quality", "source-limit", "collaboration">]
}`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a product feedback analyst. Always respond with valid JSON only, no other text." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
    });

    const text = (response as any).response || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: Math.min(10, Math.max(0, Number(parsed.sentiment) || 5)),
        urgency: Math.min(10, Math.max(0, Number(parsed.urgency) || 5)),
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3) : ["general"]
      };
    }
  } catch (e) {
    console.error("AI analysis error:", e);
  }

  return { sentiment: 5, urgency: 5, themes: ["general"] };
}

// Compute JTBD on-demand - this is an OUTPUT, never stored in database
async function computeJTBD(env: Env, content: string): Promise<string> {
  const prompt = `Analyze this customer feedback about NotebookLM and extract the Job to be Done.

Feedback: "${content}"

Write ONLY a single JTBD statement using this exact format:
"When I [situation/context], but [barrier/problem], help me [goal], so I can [outcome]."

Example: "When I need to review multiple research papers, but I don't have time to read them all, help me quickly synthesize key insights, so I can make informed decisions faster."

Respond with ONLY the JTBD statement, nothing else.`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a product analyst. Respond with only the JTBD statement." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
    });

    const text = ((response as any).response || "").trim();
    if (text && text.toLowerCase().includes("when i")) {
      return text;
    }
  } catch (e) {
    console.error("JTBD computation error:", e);
  }

  return "When I use this product, but encounter friction, help me accomplish my goal, so I can be more productive.";
}

// Generalized JTBD structure
interface GeneralizedJTBD {
  job: string;
  category: string;
  feedbackCount: number;
  avgSentiment: number;
  sources: string[];
}

// Compute 4-5 generalized JTBDs from all feedback (not individual ones)
async function computeGeneralizedJTBDs(env: Env, feedbackItems: FeedbackEntry[]): Promise<GeneralizedJTBD[]> {
  if (feedbackItems.length === 0) return [];

  // Combine all feedback content for analysis
  const feedbackSummary = feedbackItems.slice(0, 30).map((f, i) =>
    `${i + 1}. [${f.source}] "${f.content}"`
  ).join('\n');

  const prompt = `You are a product strategist using the Jobs-to-be-Done framework (from Clay Christensen and First Round Capital).

Analyze this customer feedback about NotebookLM and identify 2-3 core JOBS users are trying to accomplish.

FEEDBACK:
${feedbackSummary}

A job is NOT a feature request. It's the PROGRESS a person is trying to make in their life.

Use the First Round JTBD format:
"When I [circumstance/situation], but [barrier/anxiety], help me [progress I want to make], so I can [meaningful outcome]."

EXAMPLES of good JTBD statements:
- "When I want to jump into my favorite game, but I don't know if there are people around to play, help me safely coordinate with a group of like-minded gamers, so I can easily find a way to enjoy my favorite multiplayer game." (Discord)
- "When I need to understand what people are doing on my platform, but I have different sources of data that all tell me different stories, help me easily pull together one source of truth, so I can make better product and marketing decisions." (Segment)

GUIDELINES:
1. Focus on CIRCUMSTANCES that trigger the need, not demographics
2. Capture the EMOTIONAL dimension (frustration, anxiety, aspiration)
3. The outcome should be MEANINGFUL (not just "save time" or "be productive")
4. Jobs should be broad enough to represent multiple users, specific enough to be actionable

Respond with ONLY a valid JSON array:
[
  {
    "job": "When I [circumstance], but [barrier], help me [progress], so I can [outcome].",
    "category": "Research OR Audio OR Collaboration OR Reliability OR Customization"
  }
]

Return exactly 2-3 jobs that represent the core user needs.`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a product strategist trained in Clayton Christensen's Jobs-to-be-Done theory. You identify the underlying jobs customers are trying to accomplish, focusing on circumstances and progress rather than demographics or features. Respond with only valid JSON." },
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
    });

    const text = ((response as any).response || "").trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        // Calculate stats for each job category (max 3 jobs)
        return parsed.slice(0, 3).map((j: any) => {
          const category = (j.category || 'General').toLowerCase();
          // Find matching feedback for this category based on keywords
          const keywords = category.split(/[\s,]+/);
          const matchingFeedback = feedbackItems.filter(f =>
            keywords.some(k => f.content.toLowerCase().includes(k) ||
                              (f.themes && f.themes.toLowerCase().includes(k)))
          );

          const count = Math.max(matchingFeedback.length, Math.floor(feedbackItems.length / 3));
          const avgSent = matchingFeedback.length > 0
            ? matchingFeedback.reduce((sum, f) => sum + parseInt(f.sentiment || "5"), 0) / matchingFeedback.length
            : 5;
          const sources = [...new Set(matchingFeedback.map(f => f.source))];

          return {
            job: j.job || "When I use this product, but encounter friction, help me accomplish my goal, so I can be more productive.",
            category: j.category || 'General',
            feedbackCount: count,
            avgSentiment: Math.round(avgSent * 10) / 10,
            sources: sources.length > 0 ? sources : ['multiple']
          };
        });
      }
    }
  } catch (e) {
    console.error("Generalized JTBD computation error:", e);
  }

  // Fallback if AI fails
  return [{
    job: "When I need to analyze documents, but the process is manual and slow, help me quickly extract insights, so I can make better decisions faster.",
    category: "Research",
    feedbackCount: feedbackItems.length,
    avgSentiment: 5,
    sources: [...new Set(feedbackItems.map(f => f.source))]
  }];
}

// Generate a random date within the last N days
function getRandomPastDate(maxDaysAgo: number): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return pastDate.toISOString().replace('T', ' ').substring(0, 19);
}

// Auto-seed function (called automatically when DB is empty)
// NOTE: Database stores ONLY raw inputs + basic analysis (sentiment/urgency/themes)
// JTBD is computed on-demand by AI, never stored
async function autoSeedData(env: Env): Promise<void> {
  const themeCounts: Record<string, number> = {};
  const vectors: VectorizeVector[] = [];

  for (let i = 0; i < MOCK_FEEDBACK.length; i++) {
    const f = MOCK_FEEDBACK[i];
    // Spread feedback across last 90 days: first items are older, recent items are newer
    const daysAgo = Math.floor((MOCK_FEEDBACK.length - i) / MOCK_FEEDBACK.length * 90);
    const createdAt = getRandomPastDate(Math.max(1, daysAgo));

    const result = await env.DB.prepare(
      "INSERT INTO feedback (source, content, author, url, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id"
    ).bind(f.source, f.content, f.author, f.url, createdAt).first() as { id: number };

    const analysis = await analyzeWithAI(env, f.content);

    // Store sentiment, themes, urgency - but NOT job_to_be_done (that's computed on-demand)
    await env.DB.prepare(
      `UPDATE feedback SET sentiment = ?, themes = ?, urgency = ?, analyzed_at = datetime('now') WHERE id = ?`
    ).bind(String(analysis.sentiment), JSON.stringify(analysis.themes), String(analysis.urgency), result.id).run();

    const embedding = await generateEmbedding(env, f.content);
    if (embedding.length > 0) {
      vectors.push({
        id: String(result.id),
        values: embedding,
        metadata: { source: f.source, sentiment: analysis.sentiment, urgency: analysis.urgency, themes: analysis.themes.join(",") }
      });
    }

    analysis.themes.forEach(t => {
      themeCounts[t.toLowerCase()] = (themeCounts[t.toLowerCase()] || 0) + 1;
    });
  }

  for (const [name, count] of Object.entries(themeCounts)) {
    await env.DB.prepare(
      `INSERT INTO themes (name, count, last_seen) VALUES (?, ?, datetime('now')) ON CONFLICT(name) DO UPDATE SET count = ?, last_seen = datetime('now')`
    ).bind(name, count, count).run();
  }

  if (vectors.length > 0 && env.VECTORIZE) {
    try { await env.VECTORIZE.upsert(vectors); } catch (e) { console.error("Vectorize upsert error:", e); }
  }
}

// Seed database AND automatically analyze with Workers AI + store embeddings in Vectorize
// NOTE: JTBD is NOT stored - it's computed on-demand when viewing the JTBD page
async function handleSeed(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    await env.DB.prepare("DELETE FROM feedback").run();
    await env.DB.prepare("DELETE FROM themes").run();

    let inserted = 0;
    let analyzed = 0;
    let embedded = 0;
    const themeCounts: Record<string, number> = {};
    const vectors: VectorizeVector[] = [];

    for (let i = 0; i < MOCK_FEEDBACK.length; i++) {
      const f = MOCK_FEEDBACK[i];
      // Spread feedback across last 90 days for realistic digest data
      const daysAgo = Math.floor((MOCK_FEEDBACK.length - i) / MOCK_FEEDBACK.length * 90);
      const createdAt = getRandomPastDate(Math.max(1, daysAgo));

      // Insert raw feedback (INPUT) with varied timestamp
      const result = await env.DB.prepare(
        "INSERT INTO feedback (source, content, author, url, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id"
      ).bind(f.source, f.content, f.author, f.url, createdAt).first() as { id: number };
      inserted++;

      // Analyze with Workers AI (Llama 3.1) - only sentiment/urgency/themes
      const analysis = await analyzeWithAI(env, f.content);

      // Store analysis results - but NOT job_to_be_done (that's computed on-demand as OUTPUT)
      await env.DB.prepare(
        `UPDATE feedback SET sentiment = ?, themes = ?, urgency = ?, analyzed_at = datetime('now') WHERE id = ?`
      ).bind(
        String(analysis.sentiment),
        JSON.stringify(analysis.themes),
        String(analysis.urgency),
        result.id
      ).run();
      analyzed++;

      // Generate embedding for Vectorize (semantic similarity)
      const embedding = await generateEmbedding(env, f.content);
      if (embedding.length > 0) {
        vectors.push({
          id: String(result.id),
          values: embedding,
          metadata: {
            source: f.source,
            sentiment: analysis.sentiment,
            urgency: analysis.urgency,
            themes: analysis.themes.join(",")
          }
        });
        embedded++;
      }

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

    // Batch insert vectors into Vectorize
    if (vectors.length > 0 && env.VECTORIZE) {
      try {
        await env.VECTORIZE.upsert(vectors);
      } catch (e) {
        console.error("Vectorize upsert error:", e);
      }
    }

    return Response.json({
      success: true,
      message: `Loaded and analyzed ${analyzed} feedback entries with AI + Vectorize. JTBD computed on-demand.`,
      inserted,
      analyzed,
      embedded,
      ai_model: "@cf/meta/llama-3.1-8b-instruct",
      embedding_model: "@cf/baai/bge-base-en-v1.5",
      themes_extracted: Object.keys(themeCounts).length,
      note: "Job-to-be-done is computed by AI on-demand when viewing the JTBD page, not stored in database"
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

// Run AI analysis on all unanalyzed feedback
// NOTE: Only stores sentiment/urgency/themes - JTBD is computed on-demand
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
      // Call Workers AI for analysis - only sentiment/urgency/themes
      const analysis = await analyzeWithAI(env, feedback.content);

      // Update the database - NOT storing job_to_be_done (computed on-demand)
      await env.DB.prepare(
        `UPDATE feedback SET sentiment = ?, themes = ?, urgency = ?, analyzed_at = datetime('now') WHERE id = ?`
      ).bind(
        String(analysis.sentiment),
        JSON.stringify(analysis.themes),
        String(analysis.urgency),
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
      note: remaining.count > 0 ? "Call /api/analyze again to analyze more" : "All done! JTBD computed on-demand when viewing JTBD page."
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

// API: Find semantically similar feedback using Vectorize
async function handleSimilar(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const feedbackId = url.searchParams.get("id");

  if (!query && !feedbackId) {
    return Response.json({
      error: "Provide ?q=search+text or ?id=feedbackId",
      example: "/api/similar?q=audio+quality+issues"
    }, { status: 400, headers: corsHeaders });
  }

  try {
    let queryVector: number[] = [];

    if (feedbackId) {
      // Find similar to existing feedback by ID
      const result = await env.DB.prepare("SELECT content FROM feedback WHERE id = ?").bind(feedbackId).first() as { content: string } | null;
      if (!result) {
        return Response.json({ error: "Feedback not found" }, { status: 404, headers: corsHeaders });
      }
      queryVector = await generateEmbedding(env, result.content);
    } else {
      // Find similar to query text
      queryVector = await generateEmbedding(env, query);
    }

    if (queryVector.length === 0) {
      return Response.json({ error: "Failed to generate embedding" }, { status: 500, headers: corsHeaders });
    }

    // Query Vectorize for similar feedback
    const matches = await env.VECTORIZE.query(queryVector, {
      topK: 5,
      returnMetadata: "all"
    });

    // Fetch full feedback details for matches
    const similarFeedback = [];
    for (const match of matches.matches) {
      const id = parseInt(match.id);
      if (feedbackId && id === parseInt(feedbackId)) continue; // Skip self

      const fb = await env.DB.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first() as FeedbackEntry | null;
      if (fb) {
        similarFeedback.push({
          ...fb,
          similarity: Math.round(match.score * 100) / 100
        });
      }
    }

    return Response.json({
      query: query || `Feedback #${feedbackId}`,
      results: similarFeedback,
      count: similarFeedback.length
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

// API: Get cluster data for D3.js visualization using Vectorize
async function handleClusters(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Get all analyzed feedback (JTBD not stored - computed on-demand on JTBD page only)
    const result = await env.DB.prepare(
      "SELECT id, content, source, sentiment, urgency, themes FROM feedback WHERE analyzed_at IS NOT NULL"
    ).all();
    const feedback = result.results as FeedbackEntry[];

    if (feedback.length === 0) {
      return Response.json({ nodes: [], links: [] }, { headers: corsHeaders });
    }

    // Build nodes (no JTBD - that's computed on-demand only on JTBD page)
    const nodes = feedback.map(f => ({
      id: String(f.id),
      content: f.content?.substring(0, 100) + "...",
      source: f.source,
      sentiment: parseInt(f.sentiment || "5"),
      urgency: parseInt(f.urgency || "5"),
      themes: f.themes ? JSON.parse(f.themes) : []
    }));

    // Use Vectorize to find similar feedback and create links
    const links: { source: string; target: string; similarity: number }[] = [];
    const SIMILARITY_THRESHOLD = 0.75; // Only connect if >75% similar

    // For each feedback, query Vectorize for similar items
    for (const node of nodes.slice(0, 20)) { // Limit to avoid timeout
      try {
        const fb = feedback.find(f => String(f.id) === node.id);
        if (!fb) continue;

        const embedding = await generateEmbedding(env, fb.content);
        if (embedding.length === 0) continue;

        const matches = await env.VECTORIZE.query(embedding, {
          topK: 5,
          returnMetadata: "all"
        });

        for (const match of matches.matches) {
          if (match.id === node.id) continue; // Skip self
          if (match.score >= SIMILARITY_THRESHOLD) {
            // Avoid duplicate links
            const existingLink = links.find(l =>
              (l.source === node.id && l.target === match.id) ||
              (l.source === match.id && l.target === node.id)
            );
            if (!existingLink) {
              links.push({
                source: node.id,
                target: match.id,
                similarity: Math.round(match.score * 100) / 100
              });
            }
          }
        }
      } catch (e) {
        console.error("Vectorize query error:", e);
      }
    }

    return Response.json({
      nodes,
      links,
      stats: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        avgSimilarity: links.length > 0 ? (links.reduce((sum, l) => sum + l.similarity, 0) / links.length).toFixed(2) : 0
      }
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
  }
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

    /* Twitter-style feed */
    .feed-container { max-width: 680px; margin: 0 auto; }
    .tweet { background: #1e293b; border: 1px solid #334155; padding: 1rem 1.25rem; transition: background 0.15s; cursor: pointer; }
    .tweet:hover { background: #283548; }
    .tweet:not(:last-child) { border-bottom: none; }
    .tweet:first-child { border-radius: 12px 12px 0 0; }
    .tweet:last-child { border-radius: 0 0 12px 12px; }
    .tweet:only-child { border-radius: 12px; }
    .tweet-header { display: flex; align-items: flex-start; gap: 0.75rem; }
    .tweet-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.1rem; flex-shrink: 0; }
    .tweet-main { flex: 1; min-width: 0; }
    .tweet-author-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
    .tweet-author { font-weight: 600; color: #e2e8f0; }
    .tweet-handle { color: #64748b; font-size: 0.9rem; }
    .tweet-dot { color: #64748b; }
    .tweet-time { color: #64748b; font-size: 0.9rem; }
    .tweet-content { font-size: 1rem; line-height: 1.5; color: #e2e8f0; margin: 0.5rem 0; white-space: pre-wrap; word-wrap: break-word; }
    .tweet-insight { background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 0.75rem 1rem; margin: 0.75rem 0; }
    .tweet-insight-label { color: #8b5cf6; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
    .tweet-insight-text { color: #c4b5fd; font-size: 0.9rem; }
    .tweet-metrics { display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .tweet-metric { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 6px; }
    .tweet-metric.sentiment-high { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .tweet-metric.sentiment-mid { background: rgba(234, 179, 8, 0.15); color: #facc15; }
    .tweet-metric.sentiment-low { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .tweet-metric.urgency { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
    .tweet-actions { display: flex; justify-content: space-between; margin-top: 0.75rem; max-width: 400px; }
    .tweet-action { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.85rem; padding: 0.5rem; border-radius: 50%; transition: all 0.2s; }
    .tweet-action:hover { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
    .tweet-action svg { width: 18px; height: 18px; }
    .source-tag { display: inline-flex; align-items: center; gap: 0.35rem; background: #334155; color: #94a3b8; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
    .source-tag.discord { background: rgba(88, 101, 242, 0.2); color: #818cf8; }
    .source-tag.github { background: rgba(110, 84, 148, 0.2); color: #a78bfa; }
    .source-tag.twitter { background: rgba(29, 155, 240, 0.2); color: #38bdf8; }
    .source-tag.email { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .source-tag.forums { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
  `;
}

function getNav(activePage: string): string {
  return `
    <nav class="nav">
      <div class="nav-brand">NotebookLM Feedback</div>
      <div class="nav-links">
        <a href="/" class="nav-link ${activePage === 'overview' ? 'active' : ''}">Overview</a>
        <a href="/clusters" class="nav-link ${activePage === 'clusters' ? 'active' : ''}">Clusters</a>
        <a href="/feedback" class="nav-link ${activePage === 'feedback' ? 'active' : ''}">Feed</a>
        <a href="/insights" class="nav-link ${activePage === 'insights' ? 'active' : ''}">JTBD</a>
        <a href="/digest" class="nav-link ${activePage === 'digest' ? 'active' : ''}">Digest</a>
      </div>
    </nav>
  `;
}

// Dashboard handler
async function handleDashboard(env: Env, page: string): Promise<Response> {
  let feedbackData: FeedbackEntry[] = [];
  let stats = { total: 0, analyzed: 0, avgSentiment: 0, avgUrgency: 0, bySource: {} as Record<string, number>, topThemes: [] as any[] };
  let generalizedJTBDs: GeneralizedJTBD[] = [];

  try {
    const result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
    feedbackData = result.results as FeedbackEntry[];
    stats.total = feedbackData.length;

    // AUTO-SEED: If database is empty, automatically load and analyze mock data
    if (stats.total === 0) {
      await autoSeedData(env);
      // Re-fetch after seeding
      const newResult = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
      feedbackData = newResult.results as FeedbackEntry[];
      stats.total = feedbackData.length;
    }

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

    // For JTBD page: compute GENERALIZED JTBDs on-demand using Workers AI (OUTPUT, not stored)
    if (page === 'insights' && analyzed.length > 0) {
      generalizedJTBDs = await computeGeneralizedJTBDs(env, analyzed);
    }
  } catch (e) {
    // DB might be empty
  }

  let content = '';
  if (page === 'overview') content = getOverviewPage(feedbackData, stats);
  else if (page === 'clusters') content = getClustersPage();
  else if (page === 'feedback') content = getFeedbackPage(feedbackData);
  else if (page === 'insights') content = getInsightsPage(feedbackData, stats, generalizedJTBDs);
  else if (page === 'digest') content = getDigestPage(feedbackData, stats);

  const extraScripts = page === 'clusters' ? '<script src="https://d3js.org/d3.v7.min.js"></script>' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotebookLM Feedback - ${page}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  ${extraScripts}
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

  // Data now auto-loads, this shouldn't happen but just in case
  if (stats.total === 0) {
    return `
      <h1 class="page-title">NotebookLM Feedback Aggregator</h1>
      <p class="page-subtitle">Loading feedback data and running AI analysis...</p>
      <div class="setup-box">
        <p>Please wait - Workers AI is analyzing feedback. This may take a moment on first load.</p>
        <p style="margin-top: 1rem;">Refresh the page in a few seconds.</p>
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
    <div class="endpoints">
      <h3>Available Endpoints:</h3>
      <code>GET / - This page</code>
      <code>GET /api/health - Health check</code>
      <code>GET /api/feedback - List all feedback</code>
      <code>GET /api/feedback?source=reddit - Filter by source</code>
      <code>POST /api/feedback - Add new feedback</code>
      <code>GET /api/stats - Get feedback statistics</code>
      <code>POST /api/analyze - Analyze text with AI</code>
      <code>POST /api/analyze-all - Analyze all unanalyzed feedback</code>
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
        const sent = Math.min(10, Math.max(0, parseInt(f.sentiment) || 5));
        const urg = Math.min(10, Math.max(0, parseInt(f.urgency) || 5));
        const key = sent + '-' + urg + '-' + f.source;
        if (!grouped[key]) grouped[key] = { x: sent, y: urg, source: f.source, count: 0, sample: f.content };
        grouped[key].count++;
      });

      const painMapData = Object.values(grouped).map(g => ({
        x: Math.min(10, Math.max(0, g.x + (Math.random() - 0.5) * 0.3)),
        y: Math.min(10, Math.max(0, g.y + (Math.random() - 0.5) * 0.3)),
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
            x: { min: 0, max: 10, title: { display: true, text: 'Sentiment (0=negative, 10=positive)', color: '#94a3b8' }, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } },
            y: { min: 0, max: 10, title: { display: true, text: 'Urgency (0=low, 10=critical)', color: '#94a3b8' }, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } }
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

// Cluster visualization page using D3.js + Vectorize similarity
function getClustersPage(): string {
  return `
    <h1 class="page-title">Feedback Clusters</h1>
    <p class="page-subtitle">Semantic similarity visualization powered by <strong>Vectorize</strong> + <strong>Workers AI</strong> embeddings</p>

    <div class="card full-width" style="margin-bottom: 2rem;">
      <h2>How Cluster Analysis Works</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
        <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border-left: 3px solid #3b82f6;">
          <h3 style="color: #3b82f6; font-size: 0.9rem; margin-bottom: 0.5rem;">1. Embedding Generation</h3>
          <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">Each feedback item is converted to a 768-dimensional vector using <strong>Workers AI (bge-base-en-v1.5)</strong>. This captures semantic meaning.</p>
        </div>
        <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border-left: 3px solid #8b5cf6;">
          <h3 style="color: #8b5cf6; font-size: 0.9rem; margin-bottom: 0.5rem;">2. Vector Storage</h3>
          <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">Vectors are stored in <strong>Cloudflare Vectorize</strong>, enabling fast similarity queries across all feedback.</p>
        </div>
        <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border-left: 3px solid #22c55e;">
          <h3 style="color: #22c55e; font-size: 0.9rem; margin-bottom: 0.5rem;">3. Similarity Clustering</h3>
          <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">Feedback with <strong>>75% cosine similarity</strong> are connected. Clusters reveal common pain points and feature requests.</p>
        </div>
      </div>
      <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(139, 92, 246, 0.1); border-radius: 8px;">
        <p style="color: #a78bfa; font-size: 0.85rem; margin: 0;"><strong>Reading the graph:</strong> Node color = sentiment (green=positive, red=negative). Node size = urgency. Connected nodes = semantically similar feedback.</p>
      </div>
    </div>

    <div class="card full-width">
      <h2>Similarity Graph</h2>
      <div id="cluster-graph" style="width: 100%; height: 600px; background: #0f172a; border-radius: 8px;"></div>
      <div id="loading" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading cluster data from Vectorize...</div>
      <div id="node-details" style="display: none; margin-top: 1rem; padding: 1rem; background: #0f172a; border-radius: 8px; border: 1px solid #334155;">
        <h3 style="color: #8b5cf6; margin-bottom: 0.5rem;">Selected Feedback</h3>
        <p id="detail-content" style="margin-bottom: 0.5rem;"></p>
        <p id="detail-meta" style="font-size: 0.85rem; color: #64748b;"></p>
      </div>
    </div>

    <div class="legend" style="margin-top: 1rem;">
      <div class="legend-item"><div class="legend-dot" style="background: #22c55e;"></div> Positive (7-10)</div>
      <div class="legend-item"><div class="legend-dot" style="background: #eab308;"></div> Neutral (4-6)</div>
      <div class="legend-item"><div class="legend-dot" style="background: #ef4444;"></div> Negative (0-3)</div>
    </div>

    <script>
    async function loadClusters() {
      try {
        const res = await fetch('/api/clusters');
        const data = await res.json();
        document.getElementById('loading').style.display = 'none';

        if (data.error || data.nodes.length === 0) {
          document.getElementById('cluster-graph').innerHTML = '<p style="text-align: center; padding: 2rem; color: #ef4444;">No cluster data available. Make sure feedback is analyzed.</p>';
          return;
        }

        renderGraph(data);
      } catch (e) {
        document.getElementById('loading').innerHTML = '<p style="color: #ef4444;">Error loading clusters: ' + e.message + '</p>';
      }
    }

    function renderGraph(data) {
      const container = document.getElementById('cluster-graph');
      const width = container.clientWidth;
      const height = 600;

      const svg = d3.select('#cluster-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // Color scale based on sentiment
      const getColor = (sentiment) => {
        if (sentiment >= 7) return '#22c55e';
        if (sentiment >= 4) return '#eab308';
        return '#ef4444';
      };

      // Size based on urgency
      const getRadius = (urgency) => 8 + (urgency * 1.5);

      // Create force simulation
      const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(100).strength(d => d.similarity))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => getRadius(d.urgency) + 5));

      // Draw links
      const link = svg.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', '#475569')
        .attr('stroke-opacity', d => d.similarity)
        .attr('stroke-width', d => d.similarity * 3);

      // Draw nodes
      const node = svg.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', d => getRadius(d.urgency))
        .attr('fill', d => getColor(d.sentiment))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Tooltips
      node.append('title').text(d => d.content);

      // Click to show details
      node.on('click', (event, d) => {
        document.getElementById('node-details').style.display = 'block';
        document.getElementById('detail-content').textContent = '"' + d.content + '"';
        document.getElementById('detail-meta').innerHTML =
          '<span style="color: ' + getColor(d.sentiment) + ';">Sentiment: ' + d.sentiment + '/10</span> | ' +
          'Urgency: ' + d.urgency + '/10 | Source: ' + d.source +
          '<br><em style="color: #64748b;">View JTBD analysis on the JTBD tab</em>';
      });

      // Update positions
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        node
          .attr('cx', d => Math.max(20, Math.min(width - 20, d.x)))
          .attr('cy', d => Math.max(20, Math.min(height - 20, d.y)));
      });

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    }

    loadClusters();
    </script>
  `;
}

function getFeedbackPage(feedbackData: FeedbackEntry[]): string {
  // Generate avatar colors based on author name
  const getAvatarColor = (name: string) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Get initials from author name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  // Generate handle from author name
  const getHandle = (name: string) => {
    return '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  };

  // Get source class for colored tags
  const getSourceClass = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('discord')) return 'discord';
    if (s.includes('github')) return 'github';
    if (s.includes('twitter') || s.includes('x.com')) return 'twitter';
    if (s.includes('email')) return 'email';
    if (s.includes('forum') || s.includes('reddit')) return 'forums';
    return '';
  };

  // Generate relative time
  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDays > 0) return diffDays + 'd';
    if (diffHours > 0) return diffHours + 'h';
    return 'now';
  };

  const analyzed = feedbackData.filter(f => f.analyzed_at).length;

  return `
    <div style="text-align: center; margin-bottom: 2rem;">
      <h1 class="page-title">Feedback Feed</h1>
      <p class="page-subtitle">${feedbackData.length} items from users | ${analyzed} analyzed by Workers AI</p>
    </div>
    <div class="feed-container">
      ${feedbackData.map(f => {
        const sent = parseInt(f.sentiment || "5");
        const urg = parseInt(f.urgency || "5");
        const isAnalyzed = !!f.analyzed_at;
        const avatarColor = getAvatarColor(f.author);
        const initials = getInitials(f.author);
        const handle = getHandle(f.author);
        const sourceClass = getSourceClass(f.source);
        const relTime = getRelativeTime(f.created_at);

        return `
          <div class="tweet">
            <div class="tweet-header">
              <div class="tweet-avatar" style="background: ${avatarColor};">${initials}</div>
              <div class="tweet-main">
                <div class="tweet-author-row">
                  <span class="tweet-author">${f.author}</span>
                  <span class="tweet-handle">${handle}</span>
                  <span class="tweet-dot">·</span>
                  <span class="tweet-time">${relTime}</span>
                  <span class="source-tag ${sourceClass}">${f.source}</span>
                </div>
                <div class="tweet-content">${f.content}</div>
                ${isAnalyzed ? `
                  <div class="tweet-metrics">
                    <span class="tweet-metric ${sent >= 7 ? 'sentiment-high' : sent >= 4 ? 'sentiment-mid' : 'sentiment-low'}">
                      ${sent >= 7 ? '😊' : sent >= 4 ? '😐' : '😞'} Sentiment: ${sent}/10
                    </span>
                    <span class="tweet-metric urgency">
                      ${urg >= 7 ? '🔥' : urg >= 4 ? '⚡' : '💤'} Urgency: ${urg}/10
                    </span>
                  </div>
                ` : `
                  <div class="tweet-metrics">
                    <span class="tweet-metric" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8;">⏳ Pending AI analysis</span>
                  </div>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// JTBD page - JTBDs are computed on-demand by AI, never stored in database
function getInsightsPage(feedbackData: FeedbackEntry[], stats: any, generalizedJTBDs: GeneralizedJTBD[]): string {
  const analyzed = feedbackData.filter(f => f.analyzed_at);

  // Highlight JTBD parts
  const highlightJTBD = (text: string) => {
    return text
      .replace(/(When I)/gi, '<span class="when">$1</span>')
      .replace(/(, but|but )/gi, '<span class="but">$1</span>')
      .replace(/(help me)/gi, '<span class="help">$1</span>')
      .replace(/(so I can|so I)/gi, '<span class="so">$1</span>');
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('research') || cat.includes('analysis')) return '🔬';
    if (cat.includes('audio') || cat.includes('voice')) return '🎧';
    if (cat.includes('collab') || cat.includes('team') || cat.includes('share')) return '👥';
    if (cat.includes('perf') || cat.includes('speed') || cat.includes('reliab')) return '⚡';
    if (cat.includes('feature') || cat.includes('custom')) return '✨';
    if (cat.includes('mobile') || cat.includes('access')) return '📱';
    if (cat.includes('security') || cat.includes('privacy')) return '🔒';
    return '💡';
  };

  return `
    <style>
      .jtbd-full-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; transition: all 0.2s; }
      .jtbd-full-card:hover { border-color: #8b5cf6; transform: translateY(-2px); }
      .jtbd-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
      .jtbd-icon { font-size: 2rem; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #0f172a; border-radius: 12px; }
      .jtbd-category { font-size: 0.8rem; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 0.25rem; }
      .jtbd-statement { font-size: 1.1rem; line-height: 1.6; color: #e2e8f0; }
      .jtbd-statement .when { color: #60a5fa; font-weight: 500; }
      .jtbd-statement .but { color: #f87171; font-weight: 500; }
      .jtbd-statement .help { color: #4ade80; font-weight: 500; }
      .jtbd-statement .so { color: #c084fc; font-weight: 500; }
      .jtbd-meta { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
      .jtbd-stat { display: flex; align-items: center; gap: 0.5rem; background: #0f172a; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.85rem; }
      .jtbd-stat-value { font-weight: 600; }
      .jtbd-sources { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .jtbd-note { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
      .jtbd-note p { color: #a78bfa; font-size: 0.9rem; margin: 0; }
    </style>

    <h1 class="page-title">Key Jobs to be Done</h1>
    <p class="page-subtitle">AI-identified user needs from ${analyzed.length} feedback items using <strong>Workers AI (Llama 3.1)</strong></p>

    <div class="card full-width" style="margin-bottom: 2rem; background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border-color: #3b82f6;">
      <h2 style="color: #3b82f6;">Jobs-to-be-Done Framework</h2>
      <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 1rem;">
        Based on <strong>Clay Christensen's JTBD theory</strong> and the <strong>First Round Capital framework</strong>. A job is not a feature request—it's the <em>progress</em> a person is trying to make in their life.
      </p>
      <div style="background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <p style="color: #e2e8f0; font-size: 0.95rem; line-height: 1.6; margin: 0;">
          <span style="color: #60a5fa; font-weight: 500;">When I</span> [circumstance] <span style="color: #f87171; font-weight: 500;">but</span> [barrier/anxiety] <span style="color: #4ade80; font-weight: 500;">help me</span> [progress] <span style="color: #c084fc; font-weight: 500;">so I can</span> [meaningful outcome]
        </p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div style="padding: 0.75rem; background: rgba(96, 165, 250, 0.1); border-radius: 6px;">
          <p style="color: #60a5fa; font-size: 0.8rem; font-weight: 600; margin: 0 0 0.25rem 0;">CIRCUMSTANCE</p>
          <p style="color: #94a3b8; font-size: 0.8rem; margin: 0;">The situation that triggers the need</p>
        </div>
        <div style="padding: 0.75rem; background: rgba(248, 113, 113, 0.1); border-radius: 6px;">
          <p style="color: #f87171; font-size: 0.8rem; font-weight: 600; margin: 0 0 0.25rem 0;">BARRIER</p>
          <p style="color: #94a3b8; font-size: 0.8rem; margin: 0;">Friction, anxiety, or frustration</p>
        </div>
        <div style="padding: 0.75rem; background: rgba(74, 222, 128, 0.1); border-radius: 6px;">
          <p style="color: #4ade80; font-size: 0.8rem; font-weight: 600; margin: 0 0 0.25rem 0;">PROGRESS</p>
          <p style="color: #94a3b8; font-size: 0.8rem; margin: 0;">The advancement they seek</p>
        </div>
        <div style="padding: 0.75rem; background: rgba(192, 132, 252, 0.1); border-radius: 6px;">
          <p style="color: #c084fc; font-size: 0.8rem; font-weight: 600; margin: 0 0 0.25rem 0;">OUTCOME</p>
          <p style="color: #94a3b8; font-size: 0.8rem; margin: 0;">Functional + emotional benefit</p>
        </div>
      </div>
      <p style="margin-top: 1rem; color: #64748b; font-size: 0.85rem;">
        ${generalizedJTBDs.length} jobs identified from ${analyzed.length} feedback items. Computed by Workers AI (Llama 3.1).
      </p>
    </div>

    ${generalizedJTBDs.length > 0 ? generalizedJTBDs.map((jtbd, index) => {
      const sentColor = jtbd.avgSentiment >= 7 ? '#4ade80' : jtbd.avgSentiment >= 4 ? '#facc15' : '#f87171';
      const sentBg = jtbd.avgSentiment >= 7 ? 'rgba(34, 197, 94, 0.15)' : jtbd.avgSentiment >= 4 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const sentEmoji = jtbd.avgSentiment >= 7 ? '😊' : jtbd.avgSentiment >= 4 ? '😐' : '😞';

      return `
        <div class="jtbd-full-card">
          <div class="jtbd-header">
            <div class="jtbd-icon">${getCategoryIcon(jtbd.category)}</div>
            <div style="flex: 1;">
              <div class="jtbd-category">${jtbd.category}</div>
              <div class="jtbd-statement">${highlightJTBD(jtbd.job)}</div>
            </div>
          </div>
          <div class="jtbd-meta">
            <div class="jtbd-stat">
              <span>📊</span>
              <span class="jtbd-stat-value" style="color: #8b5cf6;">~${jtbd.feedbackCount}</span>
              <span style="color: #94a3b8;">related feedback</span>
            </div>
            <div class="jtbd-stat" style="background: ${sentBg};">
              <span>${sentEmoji}</span>
              <span class="jtbd-stat-value" style="color: ${sentColor};">${jtbd.avgSentiment}/10</span>
              <span style="color: #94a3b8;">sentiment</span>
            </div>
            <div class="jtbd-sources">
              ${jtbd.sources.slice(0, 4).map(s => `<span class="badge badge-source">${s}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="card full-width">
        <p style="text-align: center; color: #64748b; padding: 2rem;">
          Computing key jobs-to-be-done using Workers AI... This may take a moment.
        </p>
      </div>
    `}
  `;
}

function getDigestPage(feedbackData: FeedbackEntry[], stats: any): string {
  const now = new Date();
  const analyzed = feedbackData.filter(f => f.analyzed_at);

  // Filter feedback by time periods
  const filterByPeriod = (hours: number) => {
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return analyzed.filter(f => f.created_at && new Date(f.created_at) >= cutoff);
  };

  const last24h = filterByPeriod(24);
  const last7d = filterByPeriod(24 * 7);
  const last90d = filterByPeriod(24 * 90);

  // Calculate stats for a period
  const getPeriodStats = (items: FeedbackEntry[]) => {
    if (items.length === 0) return { count: 0, avgSent: 0, avgUrg: 0, topIssues: [] as FeedbackEntry[], topPraise: [] as FeedbackEntry[], sources: {} as Record<string, number> };

    let sentSum = 0, urgSum = 0;
    const sources: Record<string, number> = {};
    const issues: FeedbackEntry[] = [];
    const praise: FeedbackEntry[] = [];

    items.forEach(f => {
      const sent = parseInt(f.sentiment || "5");
      const urg = parseInt(f.urgency || "5");
      sentSum += sent;
      urgSum += urg;
      sources[f.source] = (sources[f.source] || 0) + 1;
      if (sent <= 4) issues.push(f);
      if (sent >= 7) praise.push(f);
    });

    return {
      count: items.length,
      avgSent: Math.round((sentSum / items.length) * 10) / 10,
      avgUrg: Math.round((urgSum / items.length) * 10) / 10,
      topIssues: issues.sort((a, b) => parseInt(b.urgency || "5") - parseInt(a.urgency || "5")).slice(0, 3),
      topPraise: praise.sort((a, b) => parseInt(b.sentiment || "5") - parseInt(a.sentiment || "5")).slice(0, 3),
      sources
    };
  };

  const stats24h = getPeriodStats(last24h);
  const stats7d = getPeriodStats(last7d);
  const stats90d = getPeriodStats(last90d);

  // Helper to render items
  const renderIssues = (items: FeedbackEntry[]) => items.map(f =>
    '<div class="digest-item issue"><div class="digest-item-content">"' + f.content.substring(0, 150) + (f.content.length > 150 ? '...' : '') + '"</div><div class="digest-item-meta"><span class="badge badge-source">' + f.source + '</span><span class="badge score-low">Urg: ' + f.urgency + '/10</span></div></div>'
  ).join('');

  const renderPraise = (items: FeedbackEntry[]) => items.map(f =>
    '<div class="digest-item praise"><div class="digest-item-content">"' + f.content.substring(0, 150) + (f.content.length > 150 ? '...' : '') + '"</div><div class="digest-item-meta"><span class="badge badge-source">' + f.source + '</span><span class="badge score-high">Sent: ' + f.sentiment + '/10</span></div></div>'
  ).join('');

  const getSentColor = (avg: number) => avg >= 7 ? '#22c55e' : avg >= 4 ? '#eab308' : '#ef4444';
  const getSentEmoji = (avg: number) => avg >= 7 ? '😊' : avg >= 4 ? '😐' : '😟';
  const getUrgEmoji = (avg: number) => avg >= 7 ? '🔥' : avg >= 4 ? '⚡' : '💤';

  const renderDigestSection = (title: string, periodStats: any) => {
    return '<div class="digest-section"><div class="digest-header"><h3>' + title + '</h3><span class="digest-count">' + periodStats.count + ' feedback items</span></div>' +
      '<div class="digest-metrics">' +
      '<div class="digest-metric"><span class="digest-metric-value" style="color: ' + getSentColor(periodStats.avgSent) + '">' + getSentEmoji(periodStats.avgSent) + ' ' + periodStats.avgSent + '/10</span><span class="digest-metric-label">Avg Sentiment</span></div>' +
      '<div class="digest-metric"><span class="digest-metric-value" style="color: #fb923c">' + getUrgEmoji(periodStats.avgUrg) + ' ' + periodStats.avgUrg + '/10</span><span class="digest-metric-label">Avg Urgency</span></div>' +
      '<div class="digest-metric"><span class="digest-metric-value" style="color: #8b5cf6">' + Object.keys(periodStats.sources).length + '</span><span class="digest-metric-label">Sources</span></div>' +
      '</div>' +
      '<div class="digest-insights"><h4>📋 Jobs to be Done</h4><p style="color: #94a3b8; font-size: 0.9rem;">View AI-computed JTBD analysis on the <a href="/insights" style="color: #8b5cf6;">JTBD tab</a></p></div>' +
      (periodStats.topIssues.length > 0 ? '<div class="digest-issues"><h4>🚨 Top Issues to Address</h4>' + renderIssues(periodStats.topIssues) + '</div>' : '<p style="color: #64748b; font-size: 0.9rem;">No critical issues in this period</p>') +
      (periodStats.topPraise.length > 0 ? '<div class="digest-praise"><h4>🌟 Positive Highlights</h4>' + renderPraise(periodStats.topPraise) + '</div>' : '') +
      '</div>';
  };

  const styles = '<style>' +
    '.digest-container { max-width: 800px; margin: 0 auto; }' +
    '.digest-tabs { display: flex; gap: 0; margin-bottom: 2rem; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }' +
    '.digest-tab { flex: 1; padding: 1rem; text-align: center; cursor: pointer; background: transparent; border: none; color: #94a3b8; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }' +
    '.digest-tab:hover { background: #283548; color: #e2e8f0; }' +
    '.digest-tab.active { background: #8b5cf6; color: white; }' +
    '.digest-panel { display: none; }' +
    '.digest-panel.active { display: block; }' +
    '.digest-section { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }' +
    '.digest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #334155; }' +
    '.digest-header h3 { font-size: 1.25rem; color: #e2e8f0; margin: 0; }' +
    '.digest-count { background: #334155; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.85rem; color: #94a3b8; }' +
    '.digest-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }' +
    '.digest-metric { background: #0f172a; padding: 1rem; border-radius: 8px; text-align: center; }' +
    '.digest-metric-value { font-size: 1.5rem; font-weight: 600; display: block; margin-bottom: 0.25rem; }' +
    '.digest-metric-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.digest-insights { margin-bottom: 1.5rem; }' +
    '.digest-insights h4, .digest-issues h4, .digest-praise h4 { font-size: 0.9rem; color: #94a3b8; margin-bottom: 0.75rem; }' +
    '.digest-issues, .digest-praise { margin-top: 1.5rem; }' +
    '.digest-item { background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 3px solid transparent; }' +
    '.digest-item.issue { border-left-color: #ef4444; }' +
    '.digest-item.praise { border-left-color: #22c55e; }' +
    '.digest-item-content { font-size: 0.9rem; line-height: 1.5; margin-bottom: 0.5rem; color: #e2e8f0; }' +
    '.digest-item-meta { display: flex; gap: 0.5rem; }' +
    '.email-preview { background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 1.5rem; margin-top: 2rem; }' +
    '.email-preview h4 { color: #60a5fa; margin-bottom: 0.5rem; }' +
    '.email-preview p { color: #94a3b8; font-size: 0.9rem; }' +
    '.email-note { background: rgba(251, 146, 60, 0.1); border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 8px; padding: 1rem; margin-top: 1rem; }' +
    '.email-note p { color: #fb923c; font-size: 0.85rem; margin: 0; }' +
    '</style>';

  const script = '<script>' +
    'function showTab(period) {' +
    "document.querySelectorAll('.digest-tab').forEach(t => t.classList.remove('active'));" +
    "document.querySelectorAll('.digest-panel').forEach(p => p.classList.remove('active'));" +
    "document.querySelector('[data-period=\"' + period + '\"]').classList.add('active');" +
    "document.getElementById('panel-' + period).classList.add('active');" +
    '}' +
    '</script>';

  return styles +
    '<div style="text-align: center; margin-bottom: 2rem;">' +
    '<h1 class="page-title">Email Digest Preview</h1>' +
    '<p class="page-subtitle">AI-generated summaries for PM stakeholder updates</p>' +
    '</div>' +
    '<div class="digest-container">' +
    '<div class="digest-tabs">' +
    '<button class="digest-tab active" data-period="24h" onclick="showTab(\'24h\')">Last 24 Hours</button>' +
    '<button class="digest-tab" data-period="7d" onclick="showTab(\'7d\')">Last 7 Days</button>' +
    '<button class="digest-tab" data-period="90d" onclick="showTab(\'90d\')">Last Quarter</button>' +
    '</div>' +
    '<div id="panel-24h" class="digest-panel active">' + renderDigestSection('Last 24 Hours Summary', stats24h) + '</div>' +
    '<div id="panel-7d" class="digest-panel">' + renderDigestSection('Weekly Summary', stats7d) + '</div>' +
    '<div id="panel-90d" class="digest-panel">' + renderDigestSection('Quarterly Summary', stats90d) + '</div>' +
    '<div class="email-preview">' +
    '<h4>📧 Email Delivery Note</h4>' +
    '<p>This digest would be sent to PMs via email using a third-party service (SendGrid, Resend, or Mailchannels).</p>' +
    '<div class="email-note">' +
    '<p><strong>Friction Point:</strong> Cloudflare Workers do not have native outbound email support. Email Workers only handle <em>receiving</em> emails, not sending. A third-party integration would be required for scheduled digest delivery.</p>' +
    '</div>' +
    '</div>' +
    '</div>' +
    script;
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

// POST /api/analyze - Analyze a single piece of text with AI
async function handleAnalyze(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await request.json() as { text: string };

  if (!body.text) {
    return Response.json(
      { success: false, error: "Missing required field: text" },
      { status: 400, headers: corsHeaders }
    );
  }

  const analysis = await analyzeWithAI(env, body.text);

  return Response.json({
    success: true,
    analysis,
  }, { headers: corsHeaders });
}

// POST /api/analyze-all - Analyze all unanalyzed feedback entries
async function handleAnalyzeAll(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Get all feedback that hasn't been analyzed yet
  const unanalyzed = await env.notebooklm_feedback_db
    .prepare("SELECT id, content FROM feedback WHERE analyzed_at IS NULL LIMIT 10")
    .all();

  if (unanalyzed.results.length === 0) {
    return Response.json({
      success: true,
      message: "No unanalyzed feedback found",
      analyzed: 0,
    }, { headers: corsHeaders });
  }

  let analyzedCount = 0;

  for (const entry of unanalyzed.results as { id: number; content: string }[]) {
    try {
      const analysis = await analyzeWithAI(env, entry.content);

      // Update the feedback entry with analysis results
      await env.notebooklm_feedback_db
        .prepare(
          `UPDATE feedback
           SET sentiment = ?, themes = ?, urgency = ?, analyzed_at = datetime('now')
           WHERE id = ?`
        )
        .bind(analysis.sentiment, analysis.themes, analysis.urgency, entry.id)
        .run();

      analyzedCount++;
    } catch (error) {
      console.error(`Failed to analyze feedback ${entry.id}:`, error);
    }
  }

  return Response.json({
    success: true,
    message: `Analyzed ${analyzedCount} feedback entries`,
    analyzed: analyzedCount,
  }, { headers: corsHeaders });
}

// Helper function to analyze text with Workers AI
async function analyzeWithAI(
  env: Env,
  text: string
): Promise<{ sentiment: string; themes: string; urgency: string; summary: string }> {
  const prompt = `Analyze this user feedback about NotebookLM (Google's AI notebook tool):

"${text}"

Respond in JSON format only, no other text:
{
  "sentiment": "positive" or "negative" or "neutral",
  "themes": "comma-separated list of 1-3 main themes like: usability, feature-request, bug, performance, pricing, documentation",
  "urgency": "low" or "medium" or "high" or "critical",
  "summary": "one sentence summary of the feedback"
}`;

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt,
    max_tokens: 200,
  });

  // Parse the AI response
  try {
    const responseText = (response as { response: string }).response;
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to parse AI response:", error);
  }

  // Return defaults if parsing fails
  return {
    sentiment: "neutral",
    themes: "general",
    urgency: "medium",
    summary: "Unable to analyze",
  };
}
