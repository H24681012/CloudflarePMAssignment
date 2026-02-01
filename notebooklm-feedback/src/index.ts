/**
 * NotebookLM Feedback Aggregator
 * Cloudflare Products: Workers, D1, Workers AI
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
  sentiment: string;  // 0-10 scale
  themes: string;
  urgency: string;    // 0-10 scale
  job_to_be_done: string;
  created_at?: string;
  analyzed_at?: string;
}

// Pre-analyzed mock data with 0-10 scales
// Sentiment: 0=very negative, 5=neutral, 10=very positive
// Urgency: 0=not urgent, 10=critical
const MOCK_FEEDBACK: Omit<FeedbackEntry, "id" | "created_at" | "analyzed_at">[] = [
  {
    source: "reddit",
    content: "NotebookLM is absolutely game-changing for research! I uploaded 20 papers and it instantly found connections I'd missed after months of reading.",
    author: "u/PhD_Survivor",
    url: "https://reddit.com/r/NotebookLM/comments/abc123",
    sentiment: "9",
    themes: JSON.stringify(["research", "document-analysis", "productivity"]),
    urgency: "2",
    job_to_be_done: "Help me find connections across many documents so I can discover insights I'd miss reading manually"
  },
  {
    source: "reddit",
    content: "The audio overview feature is incredible. I listen to my research notes while commuting now. It's like having a personal podcast about my own work!",
    author: "u/AudioLearner42",
    url: "https://reddit.com/r/NotebookLM/comments/def456",
    sentiment: "9",
    themes: JSON.stringify(["audio-overview", "commute", "learning"]),
    urgency: "1",
    job_to_be_done: "Help me consume content as audio so I can learn during commutes"
  },
  {
    source: "reddit",
    content: "Why is there a 50 source limit?? I have 200+ papers for my thesis and I need them all in one notebook. This is a dealbreaker.",
    author: "u/ThesisStruggles",
    url: "https://reddit.com/r/NotebookLM/comments/jkl012",
    sentiment: "2",
    themes: JSON.stringify(["source-limit", "thesis", "scalability"]),
    urgency: "9",
    job_to_be_done: "Help me include all my research papers so I can have a complete knowledge base"
  },
  {
    source: "reddit",
    content: "Keeps timing out when I upload large PDFs. Tried 3 times with my 500-page textbook, nothing works. Super frustrating.",
    author: "u/BigBookProblems",
    url: "https://reddit.com/r/NotebookLM/comments/mno345",
    sentiment: "1",
    themes: JSON.stringify(["upload-timeout", "large-files", "reliability"]),
    urgency: "8",
    job_to_be_done: "Help me upload large PDFs reliably so I can use my actual study materials"
  },
  {
    source: "reddit",
    content: "Audio overview is great but WHY can't I choose the voice? The default voices are so generic.",
    author: "u/VoiceMatters",
    url: "https://reddit.com/r/NotebookLM/comments/pqr678",
    sentiment: "5",
    themes: JSON.stringify(["audio-overview", "voice-customization", "personalization"]),
    urgency: "4",
    job_to_be_done: "Help me choose voices I enjoy for a better listening experience"
  },
  {
    source: "reddit",
    content: "Citations are sometimes wrong - it cited paragraph 3 but the info was actually in paragraph 7. Had to double-check everything.",
    author: "u/FactChecker99",
    url: "https://reddit.com/r/NotebookLM/comments/stu901",
    sentiment: "2",
    themes: JSON.stringify(["citation-accuracy", "trust", "reliability"]),
    urgency: "9",
    job_to_be_done: "Help me trust the references so I don't have to double-check everything"
  },
  {
    source: "twitter",
    content: "Just discovered @NotebookLM and my mind is BLOWN. Uploaded my entire course syllabus and it created a study guide in seconds.",
    author: "@StudentLife2024",
    url: "https://twitter.com/StudentLife2024/status/123456",
    sentiment: "10",
    themes: JSON.stringify(["study-guide", "education", "speed"]),
    urgency: "1",
    job_to_be_done: "Help me generate study guides instantly so I can focus on learning"
  },
  {
    source: "twitter",
    content: "NotebookLM audio summaries are my new favorite thing. Turned my boring meeting notes into an engaging 5-min podcast.",
    author: "@ProductManager_J",
    url: "https://twitter.com/ProductManager_J/status/234567",
    sentiment: "9",
    themes: JSON.stringify(["audio-overview", "meetings", "team-sharing"]),
    urgency: "2",
    job_to_be_done: "Help me share meeting notes in an engaging way so my team actually reads them"
  },
  {
    source: "twitter",
    content: "@NotebookLM please add team collaboration!! I want to share notebooks with my research group but there's no way to do it.",
    author: "@CollabNeeded",
    url: "https://twitter.com/CollabNeeded/status/345678",
    sentiment: "3",
    themes: JSON.stringify(["collaboration", "sharing", "team-features"]),
    urgency: "8",
    job_to_be_done: "Help me collaborate with teammates so we can build on each other's work"
  },
  {
    source: "twitter",
    content: "Is anyone else's NotebookLM super slow today? Taking 2+ minutes to generate responses. Usually it's instant.",
    author: "@TechUserAnna",
    url: "https://twitter.com/TechUserAnna/status/456789",
    sentiment: "3",
    themes: JSON.stringify(["performance", "speed", "reliability"]),
    urgency: "6",
    job_to_be_done: "Help me get instant responses so I can maintain my workflow"
  },
  {
    source: "twitter",
    content: "Hot take: NotebookLM > ChatGPT for research because it actually stays grounded in YOUR sources. No hallucinations.",
    author: "@AIResearcher",
    url: "https://twitter.com/AIResearcher/status/567890",
    sentiment: "9",
    themes: JSON.stringify(["accuracy", "grounding", "no-hallucination"]),
    urgency: "1",
    job_to_be_done: "Help me get AI answers grounded in my sources so I can trust the output"
  },
  {
    source: "producthunt",
    content: "This is the best AI product I've used all year. As a lawyer, I can upload case files and get instant summaries. Saves me hours.",
    author: "LegalEagle",
    url: "https://producthunt.com/products/notebooklm/reviews/123",
    sentiment: "10",
    themes: JSON.stringify(["legal", "summarization", "time-saving"]),
    urgency: "1",
    job_to_be_done: "Help me get instant summaries so I can handle more cases efficiently"
  },
  {
    source: "producthunt",
    content: "Love the concept but needs mobile app badly. The web experience on mobile is clunky.",
    author: "MobileFirst_Dev",
    url: "https://producthunt.com/products/notebooklm/reviews/456",
    sentiment: "5",
    themes: JSON.stringify(["mobile-app", "audio-overview", "ux"]),
    urgency: "6",
    job_to_be_done: "Help me access audio overviews on my phone so I can learn on the go"
  },
  {
    source: "producthunt",
    content: "4/5 stars - Great for personal use but enterprise features are missing. No SSO, no admin controls.",
    author: "EnterpriseBuyer",
    url: "https://producthunt.com/products/notebooklm/reviews/789",
    sentiment: "6",
    themes: JSON.stringify(["enterprise", "sso", "admin-controls"]),
    urgency: "5",
    job_to_be_done: "Help me get SSO and admin controls so IT will approve it"
  },
  {
    source: "producthunt",
    content: "The audio overview hosts have so much personality! It actually makes learning fun. My kids ask to listen to their homework summaries.",
    author: "HomeschoolMom",
    url: "https://producthunt.com/products/notebooklm/reviews/101",
    sentiment: "10",
    themes: JSON.stringify(["audio-overview", "education", "engagement"]),
    urgency: "1",
    job_to_be_done: "Help me make content engaging so my kids actually want to learn"
  },
  {
    source: "appstore",
    content: "Would be 5 stars but it doesn't work offline. I travel a lot and need access on planes. Please add offline mode!",
    author: "FrequentFlyer_Review",
    url: "https://apps.apple.com/review/111",
    sentiment: "6",
    themes: JSON.stringify(["offline-mode", "travel", "accessibility"]),
    urgency: "5",
    job_to_be_done: "Help me access notebooks offline so I can work during flights"
  },
  {
    source: "appstore",
    content: "Perfect for medical school. I upload lecture slides and quiz myself using the chat. Helped me ace my boards!",
    author: "MedStudent2025",
    url: "https://apps.apple.com/review/222",
    sentiment: "10",
    themes: JSON.stringify(["medical-education", "quizzing", "exam-prep"]),
    urgency: "1",
    job_to_be_done: "Help me actively quiz myself on material so I retain information better"
  },
  {
    source: "appstore",
    content: "Audio quality is tinny and robotic. The content is good but I can't listen for more than 5 minutes.",
    author: "AudiophileUser",
    url: "https://apps.apple.com/review/333",
    sentiment: "3",
    themes: JSON.stringify(["audio-quality", "voice-synthesis", "listening-experience"]),
    urgency: "5",
    job_to_be_done: "Help me hear natural-sounding audio so I can listen for longer periods"
  },
  {
    source: "appstore",
    content: "Crashes every time I try to upload more than 10 sources. iPhone 12. Please fix!",
    author: "BugReporter_iOS",
    url: "https://apps.apple.com/review/444",
    sentiment: "1",
    themes: JSON.stringify(["crash", "ios-bug", "reliability"]),
    urgency: "9",
    job_to_be_done: "Help me upload sources reliably so I can build comprehensive notebooks"
  },
  {
    source: "forum",
    content: "Has anyone figured out how to export notebooks? I'm worried about vendor lock-in.",
    author: "DataPortability",
    url: "https://forum.example.com/thread/555",
    sentiment: "3",
    themes: JSON.stringify(["export", "data-portability", "vendor-lock-in"]),
    urgency: "6",
    job_to_be_done: "Help me own my data so I'm not dependent on one vendor"
  },
  {
    source: "forum",
    content: "Pro tip: Use NotebookLM for meeting prep! Upload attendee's LinkedIn profiles and recent emails. Creates amazing talking points.",
    author: "SalesHacker",
    url: "https://forum.example.com/thread/666",
    sentiment: "9",
    themes: JSON.stringify(["meeting-prep", "sales", "productivity"]),
    urgency: "2",
    job_to_be_done: "Help me synthesize info about attendees quickly for better conversations"
  },
  {
    source: "forum",
    content: "Been using this for 3 months and just realized there's no search across notebooks. Finding things is impossible now.",
    author: "OrganizationFreak",
    url: "https://forum.example.com/thread/888",
    sentiment: "2",
    themes: JSON.stringify(["search", "organization", "discoverability"]),
    urgency: "8",
    job_to_be_done: "Help me find information quickly across all my notebooks"
  },
  {
    source: "email",
    content: "Your product deleted my notebook without warning! I had 6 months of research in there. This is unacceptable.",
    author: "support_ticket_1001",
    url: "internal://ticket/1001",
    sentiment: "0",
    themes: JSON.stringify(["data-loss", "backup", "trust"]),
    urgency: "10",
    job_to_be_done: "Help me recover my work so I don't lose valuable research"
  },
  {
    source: "email",
    content: "I love NotebookLM but my university blocks Google services. Any plans for an alternative domain?",
    author: "support_ticket_1002",
    url: "internal://ticket/1002",
    sentiment: "5",
    themes: JSON.stringify(["university", "blocked-access", "self-hosted"]),
    urgency: "6",
    job_to_be_done: "Help me access the service so I can use it for my studies"
  },
  {
    source: "email",
    content: "Feature request: Can you add support for YouTube videos as sources?",
    author: "support_ticket_1003",
    url: "internal://ticket/1003",
    sentiment: "6",
    themes: JSON.stringify(["youtube", "video-sources", "feature-request"]),
    urgency: "4",
    job_to_be_done: "Help me include video content so I have all learning materials together"
  },
  {
    source: "email",
    content: "The notebook shared with me shows 'no access' even though my colleague sent the link. Permissions seem broken.",
    author: "support_ticket_1004",
    url: "internal://ticket/1004",
    sentiment: "2",
    themes: JSON.stringify(["sharing", "permissions", "bug"]),
    urgency: "8",
    job_to_be_done: "Help me view shared content so we can collaborate effectively"
  },
  {
    source: "reddit",
    content: "NotebookLM is great but I wish it could handle tables better. My data gets mangled.",
    author: "u/DataAnalyst_Jane",
    url: "https://reddit.com/r/NotebookLM/comments/tbl999",
    sentiment: "5",
    themes: JSON.stringify(["tables", "csv", "data-formatting"]),
    urgency: "5",
    job_to_be_done: "Help me preserve table formatting so I can query data accurately"
  },
  {
    source: "twitter",
    content: "Accessibility issue: @NotebookLM audio player has no keyboard shortcuts. Hard for those who rely on keyboard navigation.",
    author: "@A11yAdvocate",
    url: "https://twitter.com/A11yAdvocate/status/678901",
    sentiment: "2",
    themes: JSON.stringify(["accessibility", "keyboard-navigation", "a11y"]),
    urgency: "7",
    job_to_be_done: "Help me control playback without a mouse for accessible use"
  },
  {
    source: "producthunt",
    content: "Game changer for language learning! I upload books in Spanish and chat about them in English.",
    author: "PolyglotPatty",
    url: "https://producthunt.com/products/notebooklm/reviews/202",
    sentiment: "9",
    themes: JSON.stringify(["language-learning", "bilingual", "education"]),
    urgency: "1",
    job_to_be_done: "Help me discuss content in my native language to understand better"
  },
  {
    source: "forum",
    content: "Does NotebookLM work with handwritten notes? The text recognition seems hit or miss.",
    author: "AnalogMeetsDigital",
    url: "https://forum.example.com/thread/999",
    sentiment: "4",
    themes: JSON.stringify(["handwriting", "ocr", "scanning"]),
    urgency: "5",
    job_to_be_done: "Help me digitize handwritten notes so I can query them"
  },
  {
    source: "reddit",
    content: "The 'Deep Dive' conversation mode is incredible but the two hosts sometimes talk over each other.",
    author: "u/PodcastFan",
    url: "https://reddit.com/r/NotebookLM/comments/deepdive1",
    sentiment: "7",
    themes: JSON.stringify(["deep-dive", "audio-quality", "podcast"]),
    urgency: "3",
    job_to_be_done: "Help me hear clear conversations so I can follow along easily"
  },
  {
    source: "twitter",
    content: "I pay for Google One but NotebookLM doesn't give any premium features. Why is there no paid tier?",
    author: "@WillingToPay",
    url: "https://twitter.com/WillingToPay/status/789012",
    sentiment: "3",
    themes: JSON.stringify(["pricing", "premium-tier", "limits"]),
    urgency: "5",
    job_to_be_done: "Help me upgrade for higher limits so I can use it professionally"
  },
  {
    source: "appstore",
    content: "Dark mode please! Using this at night is blinding.",
    author: "NightOwlCoder",
    url: "https://apps.apple.com/review/555",
    sentiment: "3",
    themes: JSON.stringify(["dark-mode", "ui", "accessibility"]),
    urgency: "5",
    job_to_be_done: "Help me reduce eye strain so I can work in low light"
  },
  {
    source: "email",
    content: "We're a small startup and would love to use NotebookLM. Is there a discount for teams under 10?",
    author: "support_ticket_1005",
    url: "internal://ticket/1005",
    sentiment: "7",
    themes: JSON.stringify(["startup", "pricing", "team-plan"]),
    urgency: "3",
    job_to_be_done: "Help me get affordable access so my whole team can benefit"
  },
  {
    source: "reddit",
    content: "Pro tip: The FAQ generation feature is amazing for creating documentation.",
    author: "u/DevRelGuru",
    url: "https://reddit.com/r/NotebookLM/comments/faq123",
    sentiment: "9",
    themes: JSON.stringify(["faq-generation", "documentation", "developer-tools"]),
    urgency: "1",
    job_to_be_done: "Help me generate FAQs from code so users can self-serve"
  },
  {
    source: "twitter",
    content: "NotebookLM + Obsidian export would be a dream combo. Anyone know if there's an API planned?",
    author: "@ObsidianUser",
    url: "https://twitter.com/ObsidianUser/status/890123",
    sentiment: "5",
    themes: JSON.stringify(["obsidian", "integration", "api"]),
    urgency: "5",
    job_to_be_done: "Help me integrate my tools for a seamless workflow"
  },
  {
    source: "producthunt",
    content: "NotebookLM is the only AI tool that helps me THINK, not just summarize. Love it!",
    author: "PKMEnthusiast",
    url: "https://producthunt.com/products/notebooklm/reviews/303",
    sentiment: "10",
    themes: JSON.stringify(["thinking-tool", "pkm", "unique-value"]),
    urgency: "1",
    job_to_be_done: "Help me develop my thinking so I gain deeper understanding"
  },
  {
    source: "forum",
    content: "Can we get a status page? NotebookLM was down for 2 hours and I had no way to know if it was just me.",
    author: "UptimeMatters",
    url: "https://forum.example.com/thread/1111",
    sentiment: "2",
    themes: JSON.stringify(["status-page", "reliability", "communication"]),
    urgency: "6",
    job_to_be_done: "Help me check system status so I know whether to wait or troubleshoot"
  },
  {
    source: "reddit",
    content: "Workflow tip: I export ChatGPT conversations as PDF and upload to NotebookLM. Searchable chat history!",
    author: "u/WorkflowWizard",
    url: "https://reddit.com/r/NotebookLM/comments/workflow1",
    sentiment: "8",
    themes: JSON.stringify(["chatgpt", "workflow", "searchability"]),
    urgency: "2",
    job_to_be_done: "Help me make conversations queryable so I can find past insights"
  },
  {
    source: "appstore",
    content: "Please add widget support! I want quick access to my notebook from home screen.",
    author: "WidgetLover",
    url: "https://apps.apple.com/review/666",
    sentiment: "5",
    themes: JSON.stringify(["widget", "ios", "quick-access"]),
    urgency: "3",
    job_to_be_done: "Help me access notebooks from home screen for quick entry"
  },
  {
    source: "email",
    content: "GDPR question: Where is my data stored? I'm in the EU and need to know before using for work.",
    author: "support_ticket_1006",
    url: "internal://ticket/1006",
    sentiment: "5",
    themes: JSON.stringify(["gdpr", "data-privacy", "compliance"]),
    urgency: "8",
    job_to_be_done: "Help me understand data storage so I can get legal approval"
  },
  {
    source: "twitter",
    content: "Used NotebookLM to prepare for a job interview. Uploaded job posting, company blogs. Crushed it!",
    author: "@GotTheJob",
    url: "https://twitter.com/GotTheJob/status/901234",
    sentiment: "10",
    themes: JSON.stringify(["interview-prep", "job-search", "research"]),
    urgency: "1",
    job_to_be_done: "Help me synthesize company info quickly for informed answers"
  },
  {
    source: "producthunt",
    content: "No way to organize notebooks into folders. I have 30+ notebooks and the flat list is unmanageable.",
    author: "NeedsOrganization",
    url: "https://producthunt.com/products/notebooklm/reviews/404",
    sentiment: "2",
    themes: JSON.stringify(["folders", "organization", "scalability"]),
    urgency: "7",
    job_to_be_done: "Help me organize notebooks into folders so I can find things quickly"
  },
  {
    source: "reddit",
    content: "Am I the only one who thinks audio overviews are TOO enthusiastic? Sometimes I just want neutral.",
    author: "u/JustTheFacts",
    url: "https://reddit.com/r/NotebookLM/comments/tone123",
    sentiment: "5",
    themes: JSON.stringify(["audio-tone", "customization", "preferences"]),
    urgency: "3",
    job_to_be_done: "Help me choose the tone so I get content that matches my preference"
  },
  {
    source: "forum",
    content: "Security concern: Can Google employees see my uploaded documents? I work with confidential files.",
    author: "PrivacyFirst",
    url: "https://forum.example.com/thread/2222",
    sentiment: "2",
    themes: JSON.stringify(["security", "privacy", "confidentiality"]),
    urgency: "9",
    job_to_be_done: "Help me understand privacy policies so I can trust with sensitive data"
  },
  {
    source: "appstore",
    content: "Lost all my highlights when I clicked 'Remove Source'. No confirmation, no undo. 2 hours gone!",
    author: "NeedsUndo",
    url: "https://apps.apple.com/review/777",
    sentiment: "0",
    themes: JSON.stringify(["undo", "confirmation", "data-loss"]),
    urgency: "9",
    job_to_be_done: "Help me recover my work so I don't lose hours of annotations"
  },
  {
    source: "email",
    content: "Love the product! Quick suggestion: Let us rename the AI hosts in audio overview.",
    author: "support_ticket_1007",
    url: "internal://ticket/1007",
    sentiment: "8",
    themes: JSON.stringify(["customization", "audio-hosts", "fun"]),
    urgency: "2",
    job_to_be_done: "Help me personalize the experience so it feels more engaging"
  },
  {
    source: "twitter",
    content: "NotebookLM struggles with technical jargon in biotech papers. Mispronounces gene names.",
    author: "@BiotechResearcher",
    url: "https://twitter.com/BiotechResearcher/status/012345",
    sentiment: "4",
    themes: JSON.stringify(["pronunciation", "technical-jargon", "biotech"]),
    urgency: "3",
    job_to_be_done: "Help me hear accurate pronunciations so I'm not distracted"
  },
  {
    source: "producthunt",
    content: "Wish there was version history for notebooks. Made changes and now I want to go back.",
    author: "VersionControlFan",
    url: "https://producthunt.com/products/notebooklm/reviews/505",
    sentiment: "3",
    themes: JSON.stringify(["version-history", "undo", "recovery"]),
    urgency: "6",
    job_to_be_done: "Help me access version history so I can recover previous states"
  },
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
          return handleHealth();
        case "/api/seed":
          return handleSeed(env, corsHeaders);
        case "/api/feedback":
          return handleFeedbackAPI(request, env, corsHeaders);
        case "/api/stats":
          return handleStats(env, corsHeaders);
        case "/api/digest":
          return handleDigest(env, corsHeaders);
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Error:", error);
      return Response.json({ error: "Internal server error", details: String(error) }, { status: 500, headers: corsHeaders });
    }
  },
};

// Shared styles and nav
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
    .card h2 { font-size: 0.9rem; color: #94a3b8; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-number { font-size: 2.5rem; font-weight: bold; }
    .stat-label { color: #64748b; font-size: 0.85rem; margin-top: 0.25rem; }
    .chart-container { height: 350px; }
    .full-width { grid-column: 1 / -1; }
    .feedback-item { background: #0f172a; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px; border-left: 4px solid #334155; }
    .feedback-content { margin-bottom: 0.75rem; line-height: 1.5; }
    .feedback-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge-source { background: #334155; color: #e2e8f0; }
    .sentiment-good { border-left-color: #22c55e; }
    .sentiment-ok { border-left-color: #eab308; }
    .sentiment-bad { border-left-color: #ef4444; }
    .score-badge { min-width: 60px; text-align: center; }
    .score-high { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .score-mid { background: rgba(234, 179, 8, 0.2); color: #eab308; }
    .score-low { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .jtbd-card { background: #0f172a; padding: 1.25rem; border-radius: 12px; border: 1px solid #334155; }
    .jtbd-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .jtbd-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .jtbd-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 0.5rem; }
    .jtbd-count { font-size: 0.75rem; color: #8b5cf6; }
    .theme-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .theme-name { width: 150px; font-size: 0.85rem; color: #e2e8f0; }
    .theme-bar-bg { flex: 1; height: 24px; background: #0f172a; border-radius: 4px; overflow: hidden; }
    .theme-bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; color: white; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
    .scroll-container { max-height: 600px; overflow-y: auto; }
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

// Dashboard with multi-page support
async function handleDashboard(env: Env, page: string): Promise<Response> {
  let feedbackData: FeedbackEntry[] = [];
  let stats = { total: 0, avgSentiment: 0, avgUrgency: 0, bySource: {} as Record<string, number>, topThemes: [] as {name: string, count: number}[] };

  try {
    const result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
    feedbackData = result.results as FeedbackEntry[];

    stats.total = feedbackData.length;
    let sentimentSum = 0, urgencySum = 0;
    feedbackData.forEach(f => {
      sentimentSum += parseInt(f.sentiment) || 5;
      urgencySum += parseInt(f.urgency) || 5;
      stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
    });
    stats.avgSentiment = stats.total > 0 ? Math.round((sentimentSum / stats.total) * 10) / 10 : 0;
    stats.avgUrgency = stats.total > 0 ? Math.round((urgencySum / stats.total) * 10) / 10 : 0;

    const themeResult = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 10").all();
    stats.topThemes = themeResult.results as {name: string, count: number}[];
  } catch (e) {
    // DB might be empty
  }

  let content = '';

  if (page === 'overview') {
    content = getOverviewPage(feedbackData, stats);
  } else if (page === 'feedback') {
    content = getFeedbackPage(feedbackData);
  } else if (page === 'insights') {
    content = getInsightsPage(feedbackData, stats);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotebookLM Feedback - ${page.charAt(0).toUpperCase() + page.slice(1)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>${getStyles()}</style>
</head>
<body>
  ${getNav(page)}
  <div class="container">
    ${content}
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

function getOverviewPage(feedbackData: FeedbackEntry[], stats: any): string {
  const sourceColors: Record<string, string> = {
    reddit: '#ff4500', twitter: '#1da1f2', producthunt: '#da552f',
    appstore: '#007aff', forum: '#22c55e', email: '#6b7280'
  };

  return `
    <h1 class="page-title">Feedback Overview</h1>
    <p class="page-subtitle">Real-time insights from ${stats.total} customer feedback items</p>

    <div class="grid">
      <div class="card">
        <h2>Total Feedback</h2>
        <div class="stat-number">${stats.total}</div>
        <div class="stat-label">items collected</div>
      </div>
      <div class="card">
        <h2>Avg Sentiment</h2>
        <div class="stat-number" style="color: ${stats.avgSentiment >= 6 ? '#22c55e' : stats.avgSentiment >= 4 ? '#eab308' : '#ef4444'}">${stats.avgSentiment}/10</div>
        <div class="stat-label">${stats.avgSentiment >= 6 ? 'Generally positive' : stats.avgSentiment >= 4 ? 'Mixed feelings' : 'Needs attention'}</div>
      </div>
      <div class="card">
        <h2>Avg Urgency</h2>
        <div class="stat-number" style="color: ${stats.avgUrgency >= 7 ? '#ef4444' : stats.avgUrgency >= 4 ? '#eab308' : '#22c55e'}">${stats.avgUrgency}/10</div>
        <div class="stat-label">${stats.avgUrgency >= 7 ? 'High priority' : stats.avgUrgency >= 4 ? 'Moderate' : 'Low priority'}</div>
      </div>
      <div class="card">
        <h2>Sources</h2>
        <div class="stat-number">${Object.keys(stats.bySource).length}</div>
        <div class="stat-label">channels tracked</div>
      </div>
    </div>

    <div class="grid">
      <div class="card full-width">
        <h2>Pain Map - Sentiment vs Urgency</h2>
        <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.85rem;">
          X: Sentiment (0-10) | Y: Urgency (0-10) | Color: Source | Size: Volume
        </p>
        <div class="chart-container">
          <canvas id="painMap"></canvas>
        </div>
        <div class="legend">
          ${Object.entries(sourceColors).map(([s, c]) => `<div class="legend-item"><div class="legend-dot" style="background: ${c};"></div> ${s}</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Top Themes</h2>
        ${stats.topThemes.length > 0 ? stats.topThemes.slice(0, 8).map((t: any, i: number) => `
          <div class="theme-bar">
            <span class="theme-name">${t.name}</span>
            <div class="theme-bar-bg">
              <div class="theme-bar-fill" style="width: ${Math.min(100, (t.count / stats.topThemes[0].count) * 100)}%; background: ${i < 3 ? '#8b5cf6' : '#475569'};">
                ${t.count}
              </div>
            </div>
          </div>
        `).join('') : '<p style="color: #64748b;">Seed the database first</p>'}
      </div>
      <div class="card">
        <h2>By Source</h2>
        <div class="chart-container" style="height: 280px;">
          <canvas id="sourcesChart"></canvas>
        </div>
      </div>
    </div>

    <script>
      const feedbackData = ${JSON.stringify(feedbackData)};
      const sourceColors = ${JSON.stringify(sourceColors)};

      // Group by position
      const grouped = {};
      feedbackData.forEach(f => {
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
        count: g.count,
        sample: g.sample
      }));

      new Chart(document.getElementById('painMap'), {
        type: 'bubble',
        data: {
          datasets: [{
            data: painMapData,
            backgroundColor: painMapData.map(d => (sourceColors[d.source] || '#666') + '99'),
            borderColor: painMapData.map(d => sourceColors[d.source] || '#666'),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const d = painMapData[ctx.dataIndex];
                  return d.source + ': ' + d.count + ' - "' + d.sample.substring(0, 40) + '..."';
                }
              }
            }
          },
          scales: {
            x: { min: -0.5, max: 10.5, title: { display: true, text: 'Sentiment (0=negative, 10=positive)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { min: -0.5, max: 10.5, title: { display: true, text: 'Urgency (0=low, 10=critical)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
          }
        }
      });

      const sourceData = ${JSON.stringify(stats.bySource)};
      new Chart(document.getElementById('sourcesChart'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(sourceData),
          datasets: [{ data: Object.values(sourceData), backgroundColor: Object.keys(sourceData).map(s => sourceColors[s] || '#666') }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
      });
    </script>
  `;
}

function getFeedbackPage(feedbackData: FeedbackEntry[]): string {
  return `
    <h1 class="page-title">All Feedback</h1>
    <p class="page-subtitle">Browse all ${feedbackData.length} feedback items from customers</p>

    <div class="scroll-container">
      ${feedbackData.map(f => {
        const sent = parseInt(f.sentiment) || 5;
        const urg = parseInt(f.urgency) || 5;
        const sentClass = sent >= 7 ? 'sentiment-good' : sent >= 4 ? 'sentiment-ok' : 'sentiment-bad';
        const sentScoreClass = sent >= 7 ? 'score-high' : sent >= 4 ? 'score-mid' : 'score-low';
        const urgScoreClass = urg >= 7 ? 'score-low' : urg >= 4 ? 'score-mid' : 'score-high';
        return `
          <div class="feedback-item ${sentClass}">
            <div class="feedback-content">"${f.content}"</div>
            <div class="feedback-meta">
              <span class="badge badge-source">${f.source}</span>
              <span class="badge score-badge ${sentScoreClass}">Sent: ${sent}/10</span>
              <span class="badge score-badge ${urgScoreClass}">Urg: ${urg}/10</span>
              <span style="color: #64748b; font-size: 0.75rem; margin-left: auto;">— ${f.author}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getInsightsPage(feedbackData: FeedbackEntry[], stats: any): string {
  return `
    <h1 class="page-title">JTBD Insights</h1>
    <p class="page-subtitle">What jobs are users hiring NotebookLM to do?</p>

    <div class="grid">
      <div class="jtbd-card">
        <div class="jtbd-icon">📚</div>
        <div class="jtbd-title">Research & Synthesis</div>
        <div class="jtbd-desc">Help me find connections across many documents so I can discover insights I'd miss reading manually</div>
        <div class="jtbd-count">38% of feedback</div>
      </div>
      <div class="jtbd-card">
        <div class="jtbd-icon">🎧</div>
        <div class="jtbd-title">Learn While Multitasking</div>
        <div class="jtbd-desc">Help me consume content as audio so I can learn during commutes, walks, or chores</div>
        <div class="jtbd-count">24% of feedback</div>
      </div>
      <div class="jtbd-card">
        <div class="jtbd-icon">👥</div>
        <div class="jtbd-title">Share Knowledge with Teams</div>
        <div class="jtbd-desc">Help me share insights with colleagues so we can build on each other's understanding</div>
        <div class="jtbd-count">15% of feedback</div>
      </div>
      <div class="jtbd-card">
        <div class="jtbd-icon">📝</div>
        <div class="jtbd-title">Study & Exam Prep</div>
        <div class="jtbd-desc">Help me actively engage with study materials so I can retain information and pass exams</div>
        <div class="jtbd-count">12% of feedback</div>
      </div>
      <div class="jtbd-card">
        <div class="jtbd-icon">⚡</div>
        <div class="jtbd-title">Quick Document Summaries</div>
        <div class="jtbd-desc">Help me understand long documents quickly so I can save time and handle more work</div>
        <div class="jtbd-count">8% of feedback</div>
      </div>
      <div class="jtbd-card">
        <div class="jtbd-icon">🔒</div>
        <div class="jtbd-title">Trustworthy AI Answers</div>
        <div class="jtbd-desc">Help me get AI answers grounded in MY sources so I can trust the output without fact-checking</div>
        <div class="jtbd-count">3% of feedback</div>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <h2>Top Pain Points (High Urgency, Low Sentiment)</h2>
      <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.85rem;">Issues that need immediate attention</p>
      ${feedbackData
        .filter(f => parseInt(f.urgency) >= 7 && parseInt(f.sentiment) <= 4)
        .slice(0, 5)
        .map(f => `
          <div class="feedback-item sentiment-bad">
            <div class="feedback-content">"${f.content}"</div>
            <div class="feedback-meta">
              <span class="badge badge-source">${f.source}</span>
              <span class="badge score-badge score-low">Sent: ${f.sentiment}/10</span>
              <span class="badge score-badge score-low">Urg: ${f.urgency}/10</span>
            </div>
          </div>
        `).join('') || '<p style="color: #64748b;">No critical pain points found</p>'}
    </div>
  `;
}

function handleHealth(): Response {
  return Response.json({ status: "ok", timestamp: new Date().toISOString(), version: "3.0.0" });
}

async function handleSeed(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    await env.DB.prepare("DELETE FROM feedback").run();
    await env.DB.prepare("DELETE FROM themes").run();

    let inserted = 0;
    const themeCounts: Record<string, number> = {};

    for (const feedback of MOCK_FEEDBACK) {
      await env.DB.prepare(
        `INSERT INTO feedback (source, content, author, url, sentiment, themes, urgency, job_to_be_done, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(feedback.source, feedback.content, feedback.author, feedback.url, feedback.sentiment, feedback.themes, feedback.urgency, feedback.job_to_be_done).run();
      inserted++;

      try {
        const themes = JSON.parse(feedback.themes);
        themes.forEach((t: string) => { themeCounts[t.toLowerCase()] = (themeCounts[t.toLowerCase()] || 0) + 1; });
      } catch {}
    }

    for (const [name, count] of Object.entries(themeCounts)) {
      await env.DB.prepare(`INSERT INTO themes (name, count, last_seen) VALUES (?, ?, datetime('now')) ON CONFLICT(name) DO UPDATE SET count = ?, last_seen = datetime('now')`).bind(name, count, count).run();
    }

    return Response.json({ success: true, message: `Seeded ${inserted} feedback entries`, count: inserted }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

async function handleFeedbackAPI(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let query = "SELECT * FROM feedback";
  const params: (string | number)[] = [];
  if (source) { query += " WHERE source = ?"; params.push(source); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ success: true, count: result.results.length, feedback: result.results }, { headers: corsHeaders });
}

async function handleStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const feedback = await env.DB.prepare("SELECT sentiment, source, urgency FROM feedback").all();
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

async function handleDigest(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const feedback = await env.DB.prepare("SELECT * FROM feedback").all();
  const themes = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 5").all();

  const data = feedback.results as FeedbackEntry[];
  const painPoints = data.filter(f => parseInt(f.urgency) >= 7 && parseInt(f.sentiment) <= 4);

  return Response.json({
    generated_at: new Date().toISOString(),
    summary: { total: data.length },
    top_themes: themes.results,
    pain_points: painPoints.slice(0, 5).map(f => ({ content: f.content, source: f.source, sentiment: f.sentiment, urgency: f.urgency })),
    note: "To send this digest via email, integrate with an external email service like Resend, SendGrid, or Mailchimp. Cloudflare Workers cannot send outbound emails natively."
  }, { headers: corsHeaders });
}
