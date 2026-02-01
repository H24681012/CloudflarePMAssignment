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
  sentiment: string;
  themes: string;
  urgency: string;
  job_to_be_done: string;
  created_at?: string;
  analyzed_at?: string;
}

// Pre-analyzed mock data - ready to use instantly
const MOCK_FEEDBACK: Omit<FeedbackEntry, "id" | "created_at" | "analyzed_at">[] = [
  {
    source: "reddit",
    content: "NotebookLM is absolutely game-changing for research! I uploaded 20 papers and it instantly found connections I'd missed after months of reading.",
    author: "u/PhD_Survivor",
    url: "https://reddit.com/r/NotebookLM/comments/abc123",
    sentiment: "positive",
    themes: JSON.stringify(["research", "document-analysis", "productivity"]),
    urgency: "low",
    job_to_be_done: "When I'm doing academic research, but I have too many papers to read manually, help me find connections between sources, so I can discover insights faster."
  },
  {
    source: "reddit",
    content: "The audio overview feature is incredible. I listen to my research notes while commuting now. It's like having a personal podcast about my own work!",
    author: "u/AudioLearner42",
    url: "https://reddit.com/r/NotebookLM/comments/def456",
    sentiment: "positive",
    themes: JSON.stringify(["audio-overview", "commute", "learning"]),
    urgency: "low",
    job_to_be_done: "When I'm commuting, but I can't read documents, help me consume my research content as audio, so I can learn during dead time."
  },
  {
    source: "reddit",
    content: "Why is there a 50 source limit?? I have 200+ papers for my thesis and I need them all in one notebook. This is a dealbreaker.",
    author: "u/ThesisStruggles",
    url: "https://reddit.com/r/NotebookLM/comments/jkl012",
    sentiment: "negative",
    themes: JSON.stringify(["source-limit", "thesis", "scalability"]),
    urgency: "high",
    job_to_be_done: "When I'm writing my thesis, but the 50 source limit blocks me, help me include all my research papers, so I can have a complete knowledge base."
  },
  {
    source: "reddit",
    content: "Keeps timing out when I upload large PDFs. Tried 3 times with my 500-page textbook, nothing works. Super frustrating.",
    author: "u/BigBookProblems",
    url: "https://reddit.com/r/NotebookLM/comments/mno345",
    sentiment: "negative",
    themes: JSON.stringify(["upload-timeout", "large-files", "reliability"]),
    urgency: "high",
    job_to_be_done: "When I need to analyze a large textbook, but uploads keep timing out, help me upload large PDFs reliably, so I can use my actual study materials."
  },
  {
    source: "reddit",
    content: "Audio overview is great but WHY can't I choose the voice? The default voices are so generic. Let me pick something more natural.",
    author: "u/VoiceMatters",
    url: "https://reddit.com/r/NotebookLM/comments/pqr678",
    sentiment: "neutral",
    themes: JSON.stringify(["audio-overview", "voice-customization", "personalization"]),
    urgency: "medium",
    job_to_be_done: "When I'm listening to audio overviews, but the voices feel generic, help me choose voices I enjoy, so I can have a better listening experience."
  },
  {
    source: "reddit",
    content: "Citations are sometimes wrong - it cited paragraph 3 but the info was actually in paragraph 7. Had to double-check everything.",
    author: "u/FactChecker99",
    url: "https://reddit.com/r/NotebookLM/comments/stu901",
    sentiment: "negative",
    themes: JSON.stringify(["citation-accuracy", "trust", "reliability"]),
    urgency: "high",
    job_to_be_done: "When I'm citing sources from NotebookLM, but citations are sometimes wrong, help me trust the references, so I don't have to double-check everything."
  },
  {
    source: "twitter",
    content: "Just discovered @NotebookLM and my mind is BLOWN. Uploaded my entire course syllabus and it created a study guide in seconds.",
    author: "@StudentLife2024",
    url: "https://twitter.com/StudentLife2024/status/123456",
    sentiment: "positive",
    themes: JSON.stringify(["study-guide", "education", "speed"]),
    urgency: "low",
    job_to_be_done: "When I'm preparing for classes, but creating study guides takes hours, help me generate guides instantly, so I can focus on learning."
  },
  {
    source: "twitter",
    content: "NotebookLM audio summaries are my new favorite thing. Turned my boring meeting notes into an engaging 5-min podcast. Team loved it!",
    author: "@ProductManager_J",
    url: "https://twitter.com/ProductManager_J/status/234567",
    sentiment: "positive",
    themes: JSON.stringify(["audio-overview", "meetings", "team-sharing"]),
    urgency: "low",
    job_to_be_done: "When I need to share meeting notes with my team, but written notes are boring, help me create engaging audio summaries, so my team actually consumes the info."
  },
  {
    source: "twitter",
    content: "@NotebookLM please add team collaboration!! I want to share notebooks with my research group but there's no way to do it.",
    author: "@CollabNeeded",
    url: "https://twitter.com/CollabNeeded/status/345678",
    sentiment: "negative",
    themes: JSON.stringify(["collaboration", "sharing", "team-features"]),
    urgency: "high",
    job_to_be_done: "When I'm working with my research group, but I can't share notebooks, help me collaborate with teammates, so we can build on each other's work."
  },
  {
    source: "twitter",
    content: "Is anyone else's NotebookLM super slow today? Taking 2+ minutes to generate responses. Usually it's instant.",
    author: "@TechUserAnna",
    url: "https://twitter.com/TechUserAnna/status/456789",
    sentiment: "negative",
    themes: JSON.stringify(["performance", "speed", "reliability"]),
    urgency: "medium",
    job_to_be_done: "When I'm using NotebookLM for quick answers, but responses are slow, help me get instant responses, so I can maintain my workflow."
  },
  {
    source: "twitter",
    content: "Hot take: NotebookLM > ChatGPT for research because it actually stays grounded in YOUR sources. No hallucinations.",
    author: "@AIResearcher",
    url: "https://twitter.com/AIResearcher/status/567890",
    sentiment: "positive",
    themes: JSON.stringify(["accuracy", "grounding", "no-hallucination"]),
    urgency: "low",
    job_to_be_done: "When I need AI assistance for research, but I worry about hallucinations, help me get answers grounded in my sources, so I can trust the output."
  },
  {
    source: "producthunt",
    content: "This is the best AI product I've used all year. As a lawyer, I can upload case files and get instant summaries. Saves me hours every day.",
    author: "LegalEagle",
    url: "https://producthunt.com/products/notebooklm/reviews/123",
    sentiment: "positive",
    themes: JSON.stringify(["legal", "summarization", "time-saving"]),
    urgency: "low",
    job_to_be_done: "When I'm reviewing case files, but reading them takes hours, help me get instant summaries, so I can handle more cases efficiently."
  },
  {
    source: "producthunt",
    content: "Love the concept but needs mobile app badly. I want to listen to audio overviews on my phone but the web experience on mobile is clunky.",
    author: "MobileFirst_Dev",
    url: "https://producthunt.com/products/notebooklm/reviews/456",
    sentiment: "neutral",
    themes: JSON.stringify(["mobile-app", "audio-overview", "ux"]),
    urgency: "medium",
    job_to_be_done: "When I want to use NotebookLM on mobile, but there's no native app, help me access audio overviews easily on my phone, so I can learn on the go."
  },
  {
    source: "producthunt",
    content: "4/5 stars - Great for personal use but enterprise features are missing. No SSO, no admin controls, no audit logs.",
    author: "EnterpriseBuyer",
    url: "https://producthunt.com/products/notebooklm/reviews/789",
    sentiment: "neutral",
    themes: JSON.stringify(["enterprise", "sso", "admin-controls"]),
    urgency: "medium",
    job_to_be_done: "When I want to adopt NotebookLM for my company, but enterprise features are missing, help me get SSO and admin controls, so IT will approve it."
  },
  {
    source: "producthunt",
    content: "The audio overview hosts have so much personality! It actually makes learning fun. My kids now ask to listen to their homework summaries.",
    author: "HomeschoolMom",
    url: "https://producthunt.com/products/notebooklm/reviews/101",
    sentiment: "positive",
    themes: JSON.stringify(["audio-overview", "education", "engagement"]),
    urgency: "low",
    job_to_be_done: "When I'm helping my kids learn, but traditional studying is boring, help me make content engaging, so my kids actually want to learn."
  },
  {
    source: "appstore",
    content: "Would be 5 stars but it doesn't work offline. I travel a lot and need access to my notebooks on planes. Please add offline mode!",
    author: "FrequentFlyer_Review",
    url: "https://apps.apple.com/review/111",
    sentiment: "neutral",
    themes: JSON.stringify(["offline-mode", "travel", "accessibility"]),
    urgency: "medium",
    job_to_be_done: "When I'm traveling without internet, but NotebookLM requires connectivity, help me access notebooks offline, so I can work during flights."
  },
  {
    source: "appstore",
    content: "Perfect for medical school. I upload lecture slides and textbook chapters, then quiz myself using the chat. Helped me ace my boards!",
    author: "MedStudent2025",
    url: "https://apps.apple.com/review/222",
    sentiment: "positive",
    themes: JSON.stringify(["medical-education", "quizzing", "exam-prep"]),
    urgency: "low",
    job_to_be_done: "When I'm studying for medical exams, but passive reading isn't effective, help me actively quiz myself on material, so I retain information better."
  },
  {
    source: "appstore",
    content: "Audio quality is tinny and robotic. Expected better from Google. The content is good but I can't listen for more than 5 minutes.",
    author: "AudiophileUser",
    url: "https://apps.apple.com/review/333",
    sentiment: "negative",
    themes: JSON.stringify(["audio-quality", "voice-synthesis", "listening-experience"]),
    urgency: "medium",
    job_to_be_done: "When I'm listening to audio overviews, but the quality is poor, help me hear natural-sounding audio, so I can listen for longer periods."
  },
  {
    source: "appstore",
    content: "Crashes every time I try to upload more than 10 sources. iPhone 12. Please fix this bug!",
    author: "BugReporter_iOS",
    url: "https://apps.apple.com/review/444",
    sentiment: "negative",
    themes: JSON.stringify(["crash", "ios-bug", "reliability"]),
    urgency: "high",
    job_to_be_done: "When I'm adding multiple sources, but the app crashes, help me upload sources reliably, so I can build comprehensive notebooks."
  },
  {
    source: "forum",
    content: "Has anyone figured out how to export their notebooks? I'm worried about vendor lock-in. What happens if Google discontinues this?",
    author: "DataPortability",
    url: "https://forum.example.com/thread/555",
    sentiment: "negative",
    themes: JSON.stringify(["export", "data-portability", "vendor-lock-in"]),
    urgency: "medium",
    job_to_be_done: "When I've invested time in NotebookLM, but I can't export my work, help me own my data, so I'm not dependent on one vendor."
  },
  {
    source: "forum",
    content: "Pro tip: Use NotebookLM for meeting prep! Upload the attendee's LinkedIn profiles and recent emails. It creates amazing talking points.",
    author: "SalesHacker",
    url: "https://forum.example.com/thread/666",
    sentiment: "positive",
    themes: JSON.stringify(["meeting-prep", "sales", "productivity"]),
    urgency: "low",
    job_to_be_done: "When I'm preparing for important meetings, but research takes too long, help me quickly synthesize info about attendees, so I can have better conversations."
  },
  {
    source: "forum",
    content: "Been using this for 3 months and just realized there's no search across notebooks. I have 50 notebooks now and finding things is impossible.",
    author: "OrganizationFreak",
    url: "https://forum.example.com/thread/888",
    sentiment: "negative",
    themes: JSON.stringify(["search", "organization", "discoverability"]),
    urgency: "high",
    job_to_be_done: "When I have many notebooks, but I can't search across them, help me find information quickly, so I don't waste time hunting through notebooks."
  },
  {
    source: "email",
    content: "Your product deleted my notebook without warning! I had 6 months of research in there. How do I recover it? This is unacceptable.",
    author: "support_ticket_1001",
    url: "internal://ticket/1001",
    sentiment: "negative",
    themes: JSON.stringify(["data-loss", "backup", "trust"]),
    urgency: "high",
    job_to_be_done: "When I've spent months building a notebook, but it got deleted, help me recover my work, so I don't lose valuable research."
  },
  {
    source: "email",
    content: "I love NotebookLM but my university blocks Google services. Any plans for a self-hosted version or alternative domain?",
    author: "support_ticket_1002",
    url: "internal://ticket/1002",
    sentiment: "neutral",
    themes: JSON.stringify(["university", "blocked-access", "self-hosted"]),
    urgency: "medium",
    job_to_be_done: "When I want to use NotebookLM at university, but Google is blocked, help me access the service, so I can use it for my studies."
  },
  {
    source: "email",
    content: "Feature request: Can you add support for YouTube videos as sources? I have educational videos I want to include alongside my notes.",
    author: "support_ticket_1003",
    url: "internal://ticket/1003",
    sentiment: "neutral",
    themes: JSON.stringify(["youtube", "video-sources", "feature-request"]),
    urgency: "medium",
    job_to_be_done: "When I learn from YouTube videos, but I can't add them as sources, help me include video content, so I have all my learning materials together."
  },
  {
    source: "email",
    content: "The notebook shared with me shows 'no access' even though my colleague sent the link. Permissions seem broken.",
    author: "support_ticket_1004",
    url: "internal://ticket/1004",
    sentiment: "negative",
    themes: JSON.stringify(["sharing", "permissions", "bug"]),
    urgency: "high",
    job_to_be_done: "When my colleague shares a notebook, but I can't access it, help me view shared content, so we can collaborate effectively."
  },
  {
    source: "reddit",
    content: "NotebookLM is great but I wish it could handle tables better. My data gets mangled when I upload CSVs converted to PDF.",
    author: "u/DataAnalyst_Jane",
    url: "https://reddit.com/r/NotebookLM/comments/tbl999",
    sentiment: "neutral",
    themes: JSON.stringify(["tables", "csv", "data-formatting"]),
    urgency: "medium",
    job_to_be_done: "When I need to analyze tabular data, but tables get mangled, help me preserve table formatting, so I can query my data accurately."
  },
  {
    source: "twitter",
    content: "Accessibility issue: @NotebookLM audio player has no keyboard shortcuts. Hard to use for those who rely on keyboard navigation.",
    author: "@A11yAdvocate",
    url: "https://twitter.com/A11yAdvocate/status/678901",
    sentiment: "negative",
    themes: JSON.stringify(["accessibility", "keyboard-navigation", "a11y"]),
    urgency: "medium",
    job_to_be_done: "When I rely on keyboard navigation, but audio player lacks shortcuts, help me control playback without a mouse, so I can use the product accessibly."
  },
  {
    source: "producthunt",
    content: "Game changer for language learning! I upload books in Spanish and chat about them in English. It's like having a bilingual tutor.",
    author: "PolyglotPatty",
    url: "https://producthunt.com/products/notebooklm/reviews/202",
    sentiment: "positive",
    themes: JSON.stringify(["language-learning", "bilingual", "education"]),
    urgency: "low",
    job_to_be_done: "When I'm learning a new language, but reading foreign books is hard, help me discuss content in my native language, so I can understand better."
  },
  {
    source: "forum",
    content: "Does NotebookLM work with handwritten notes? I scanned my notebook pages but the text recognition seems hit or miss.",
    author: "AnalogMeetsDigital",
    url: "https://forum.example.com/thread/999",
    sentiment: "neutral",
    themes: JSON.stringify(["handwriting", "ocr", "scanning"]),
    urgency: "medium",
    job_to_be_done: "When I have handwritten notes, but OCR is unreliable, help me digitize my notes accurately, so I can query my handwritten content."
  },
  {
    source: "reddit",
    content: "The 'Deep Dive' conversation mode is incredible but the two hosts sometimes talk over each other. Minor issue but noticeable.",
    author: "u/PodcastFan",
    url: "https://reddit.com/r/NotebookLM/comments/deepdive1",
    sentiment: "positive",
    themes: JSON.stringify(["deep-dive", "audio-quality", "podcast"]),
    urgency: "low",
    job_to_be_done: "When I'm listening to Deep Dive mode, but hosts overlap, help me hear clear conversations, so I can follow along easily."
  },
  {
    source: "twitter",
    content: "I pay for Google One but NotebookLM doesn't give any premium features. Why is there no paid tier with higher limits?",
    author: "@WillingToPay",
    url: "https://twitter.com/WillingToPay/status/789012",
    sentiment: "negative",
    themes: JSON.stringify(["pricing", "premium-tier", "limits"]),
    urgency: "medium",
    job_to_be_done: "When I want more features, but there's no way to pay for them, help me upgrade for higher limits, so I can use the product professionally."
  },
  {
    source: "appstore",
    content: "Dark mode please! Using this at night is blinding. My eyes are begging for mercy.",
    author: "NightOwlCoder",
    url: "https://apps.apple.com/review/555",
    sentiment: "negative",
    themes: JSON.stringify(["dark-mode", "ui", "accessibility"]),
    urgency: "medium",
    job_to_be_done: "When I use NotebookLM at night, but there's no dark mode, help me reduce eye strain, so I can work comfortably in low light."
  },
  {
    source: "email",
    content: "We're a small startup and would love to use NotebookLM for our documentation. Is there a startup program or discount for teams under 10?",
    author: "support_ticket_1005",
    url: "internal://ticket/1005",
    sentiment: "positive",
    themes: JSON.stringify(["startup", "pricing", "team-plan"]),
    urgency: "low",
    job_to_be_done: "When I want to use NotebookLM for my startup, but there's no team pricing, help me get affordable access, so my whole team can benefit."
  },
  {
    source: "reddit",
    content: "Pro tip: The FAQ generation feature is amazing for creating documentation. Upload your code and it generates user-friendly FAQs.",
    author: "u/DevRelGuru",
    url: "https://reddit.com/r/NotebookLM/comments/faq123",
    sentiment: "positive",
    themes: JSON.stringify(["faq-generation", "documentation", "developer-tools"]),
    urgency: "low",
    job_to_be_done: "When I need to create documentation, but writing FAQs is tedious, help me generate FAQs from code, so users can self-serve answers."
  },
  {
    source: "twitter",
    content: "NotebookLM + Obsidian export would be a dream combo. Anyone know if there's an API or integration planned?",
    author: "@ObsidianUser",
    url: "https://twitter.com/ObsidianUser/status/890123",
    sentiment: "neutral",
    themes: JSON.stringify(["obsidian", "integration", "api"]),
    urgency: "medium",
    job_to_be_done: "When I use Obsidian for notes, but can't connect it to NotebookLM, help me integrate my tools, so I have a seamless workflow."
  },
  {
    source: "producthunt",
    content: "I've tried every AI note tool - Notion AI, Mem, Reflect. NotebookLM is the only one that actually helps me THINK, not just summarize.",
    author: "PKMEnthusiast",
    url: "https://producthunt.com/products/notebooklm/reviews/303",
    sentiment: "positive",
    themes: JSON.stringify(["thinking-tool", "pkm", "unique-value"]),
    urgency: "low",
    job_to_be_done: "When I need to think through complex topics, but other tools just summarize, help me actually develop my thinking, so I gain deeper understanding."
  },
  {
    source: "forum",
    content: "Can we get a status page? NotebookLM was down for 2 hours yesterday and I had no way to know if it was just me or everyone.",
    author: "UptimeMatters",
    url: "https://forum.example.com/thread/1111",
    sentiment: "negative",
    themes: JSON.stringify(["status-page", "reliability", "communication"]),
    urgency: "medium",
    job_to_be_done: "When NotebookLM is down, but I don't know if it's me or the service, help me check system status, so I know whether to troubleshoot or wait."
  },
  {
    source: "reddit",
    content: "Workflow tip: I export ChatGPT conversations as PDF and upload to NotebookLM. Now I have searchable, queryable chat history!",
    author: "u/WorkflowWizard",
    url: "https://reddit.com/r/NotebookLM/comments/workflow1",
    sentiment: "positive",
    themes: JSON.stringify(["chatgpt", "workflow", "searchability"]),
    urgency: "low",
    job_to_be_done: "When I have valuable ChatGPT conversations, but they're hard to search, help me make them queryable, so I can find past insights easily."
  },
  {
    source: "appstore",
    content: "Please add widget support! I want quick access to my most recent notebook from my home screen.",
    author: "WidgetLover",
    url: "https://apps.apple.com/review/666",
    sentiment: "neutral",
    themes: JSON.stringify(["widget", "ios", "quick-access"]),
    urgency: "low",
    job_to_be_done: "When I want to quickly open my notebook, but I have to navigate through the app, help me access notebooks from home screen, so I can jump in faster."
  },
  {
    source: "email",
    content: "GDPR question: Where is my data stored? I'm in the EU and need to know before I can use this for work.",
    author: "support_ticket_1006",
    url: "internal://ticket/1006",
    sentiment: "neutral",
    themes: JSON.stringify(["gdpr", "data-privacy", "compliance"]),
    urgency: "high",
    job_to_be_done: "When I need to use NotebookLM for work, but I'm unsure about GDPR compliance, help me understand data storage, so I can get approval from legal."
  },
  {
    source: "twitter",
    content: "Used NotebookLM to prepare for a job interview. Uploaded the job posting, company blog posts, and interviewer's LinkedIn. Crushed it!",
    author: "@GotTheJob",
    url: "https://twitter.com/GotTheJob/status/901234",
    sentiment: "positive",
    themes: JSON.stringify(["interview-prep", "job-search", "research"]),
    urgency: "low",
    job_to_be_done: "When I'm preparing for an interview, but researching takes hours, help me synthesize company info quickly, so I can give informed answers."
  },
  {
    source: "producthunt",
    content: "One complaint: No way to organize notebooks into folders. I have 30+ notebooks now and the flat list is unmanageable.",
    author: "NeedsOrganization",
    url: "https://producthunt.com/products/notebooklm/reviews/404",
    sentiment: "negative",
    themes: JSON.stringify(["folders", "organization", "scalability"]),
    urgency: "medium",
    job_to_be_done: "When I have many notebooks, but they're in a flat list, help me organize them into folders, so I can find what I need quickly."
  },
  {
    source: "reddit",
    content: "Am I the only one who thinks the audio overviews are TOO enthusiastic? Sometimes I just want a neutral summary, not a hype podcast.",
    author: "u/JustTheFacts",
    url: "https://reddit.com/r/NotebookLM/comments/tone123",
    sentiment: "neutral",
    themes: JSON.stringify(["audio-tone", "customization", "preferences"]),
    urgency: "low",
    job_to_be_done: "When I want a straightforward summary, but the audio is too enthusiastic, help me choose the tone, so I can get content that matches my preference."
  },
  {
    source: "forum",
    content: "Security concern: Can Google employees see my uploaded documents? I work with confidential legal files and need clarity on this.",
    author: "PrivacyFirst",
    url: "https://forum.example.com/thread/2222",
    sentiment: "negative",
    themes: JSON.stringify(["security", "privacy", "confidentiality"]),
    urgency: "high",
    job_to_be_done: "When I handle confidential documents, but I'm unsure who can access them, help me understand privacy policies, so I can trust the platform with sensitive data."
  },
  {
    source: "appstore",
    content: "Lost all my highlights and notes when I accidentally clicked 'Remove Source'. No confirmation dialog, no undo. 2 hours of annotation gone!",
    author: "NeedsUndo",
    url: "https://apps.apple.com/review/777",
    sentiment: "negative",
    themes: JSON.stringify(["undo", "confirmation", "data-loss"]),
    urgency: "high",
    job_to_be_done: "When I accidentally remove a source, but there's no undo, help me recover my work, so I don't lose hours of annotations."
  },
  {
    source: "email",
    content: "Love the product! Quick suggestion: Let us rename the AI hosts in audio overview. Would be fun to customize.",
    author: "support_ticket_1007",
    url: "internal://ticket/1007",
    sentiment: "positive",
    themes: JSON.stringify(["customization", "audio-hosts", "fun"]),
    urgency: "low",
    job_to_be_done: "When I listen to audio overviews, but hosts have generic names, help me personalize the experience, so it feels more engaging."
  },
  {
    source: "twitter",
    content: "NotebookLM struggles with technical jargon in my biotech papers. It mispronounces gene names in audio overview. Minor but distracting.",
    author: "@BiotechResearcher",
    url: "https://twitter.com/BiotechResearcher/status/012345",
    sentiment: "neutral",
    themes: JSON.stringify(["pronunciation", "technical-jargon", "biotech"]),
    urgency: "low",
    job_to_be_done: "When I listen to technical content, but jargon is mispronounced, help me hear accurate pronunciations, so I'm not distracted by errors."
  },
  {
    source: "reddit",
    content: "Feature comparison: NotebookLM vs Claude Projects vs ChatGPT Custom GPTs. NotebookLM wins for source management, loses on flexibility.",
    author: "u/AIToolsReview",
    url: "https://reddit.com/r/AItools/comments/comparison1",
    sentiment: "neutral",
    themes: JSON.stringify(["comparison", "competitors", "source-management"]),
    urgency: "low",
    job_to_be_done: "When I'm choosing an AI tool, but each has tradeoffs, help me understand NotebookLM's strengths, so I can pick the right tool for my needs."
  },
  {
    source: "producthunt",
    content: "Wish there was version history for notebooks. Made some changes and now I want to go back but there's no way to see previous versions.",
    author: "VersionControlFan",
    url: "https://producthunt.com/products/notebooklm/reviews/505",
    sentiment: "negative",
    themes: JSON.stringify(["version-history", "undo", "recovery"]),
    urgency: "medium",
    job_to_be_done: "When I make changes to my notebook, but I want to revert, help me access version history, so I can recover previous states."
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
          return handleDashboard(env);
        case "/api/health":
          return handleHealth();
        case "/api/seed":
          return handleSeed(env, corsHeaders);
        case "/api/feedback":
          return handleFeedback(request, env, corsHeaders);
        case "/api/stats":
          return handleStats(env, corsHeaders);
        case "/api/digest":
          return handleDigest(env, corsHeaders);
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

// Dashboard with 2D Pain Map visualization
async function handleDashboard(env: Env): Promise<Response> {
  // Get feedback data
  let feedbackData: FeedbackEntry[] = [];
  let stats = { total: 0, positive: 0, negative: 0, neutral: 0, bySource: {} as Record<string, number>, topThemes: [] as {name: string, count: number}[] };

  try {
    const result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
    feedbackData = result.results as FeedbackEntry[];

    // Calculate stats
    stats.total = feedbackData.length;
    feedbackData.forEach(f => {
      if (f.sentiment === 'positive') stats.positive++;
      else if (f.sentiment === 'negative') stats.negative++;
      else stats.neutral++;

      stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
    });

    // Get top themes
    const themeResult = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 10").all();
    stats.topThemes = themeResult.results as {name: string, count: number}[];
  } catch (e) {
    // Database might be empty
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotebookLM Feedback Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 2rem;
      text-align: center;
    }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h2 { font-size: 1rem; color: #94a3b8; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-number { font-size: 3rem; font-weight: bold; }
    .stat-positive { color: #4ade80; }
    .stat-negative { color: #f87171; }
    .stat-neutral { color: #fbbf24; }
    .pain-map-container { height: 400px; position: relative; }
    .chart-container { height: 300px; }
    .jtbd-list { list-style: none; }
    .jtbd-item {
      background: #0f172a;
      padding: 1rem;
      margin-bottom: 0.75rem;
      border-radius: 8px;
      border-left: 4px solid #8b5cf6;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .jtbd-item .source {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .source-reddit { background: #ff4500; }
    .source-twitter { background: #1da1f2; }
    .source-producthunt { background: #da552f; }
    .source-appstore { background: #007aff; }
    .source-forum { background: #22c55e; }
    .source-email { background: #6b7280; }
    .digest-box {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .digest-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .digest-header svg { width: 24px; height: 24px; }
    .theme-tag {
      display: inline-block;
      background: #334155;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin: 0.25rem;
      font-size: 0.85rem;
    }
    .theme-count { color: #94a3b8; margin-left: 0.25rem; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
    .full-width { grid-column: 1 / -1; }
    .feedback-scroll { max-height: 400px; overflow-y: auto; }
    .feedback-item {
      background: #0f172a;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }
    .feedback-meta { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .badge {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .badge-positive { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
    .badge-negative { background: rgba(248, 113, 113, 0.2); color: #f87171; }
    .badge-neutral { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    .badge-high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .badge-medium { background: rgba(249, 115, 22, 0.2); color: #f97316; }
    .badge-low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
  </style>
</head>
<body>
  <div class="header">
    <h1>NotebookLM Feedback Dashboard</h1>
    <p>Real-time insights from customer feedback across all channels</p>
  </div>

  <div class="container">
    <!-- Stats Row -->
    <div class="grid">
      <div class="card">
        <h2>Total Feedback</h2>
        <div class="stat-number">${stats.total}</div>
      </div>
      <div class="card">
        <h2>Positive</h2>
        <div class="stat-number stat-positive">${stats.positive}</div>
      </div>
      <div class="card">
        <h2>Negative</h2>
        <div class="stat-number stat-negative">${stats.negative}</div>
      </div>
      <div class="card">
        <h2>Neutral</h2>
        <div class="stat-number stat-neutral">${stats.neutral}</div>
      </div>
    </div>

    <!-- Pain Map -->
    <div class="grid">
      <div class="card full-width">
        <h2>Pain Map - Where Does the Product Hurt?</h2>
        <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.9rem;">
          X-axis: Sentiment (negative → positive) | Y-axis: Urgency (low → high) | Color: Source | Size: Volume
        </p>
        <div class="pain-map-container">
          <canvas id="painMap"></canvas>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot" style="background: #ff4500;"></div> Reddit</div>
          <div class="legend-item"><div class="legend-dot" style="background: #1da1f2;"></div> Twitter</div>
          <div class="legend-item"><div class="legend-dot" style="background: #da552f;"></div> Product Hunt</div>
          <div class="legend-item"><div class="legend-dot" style="background: #007aff;"></div> App Store</div>
          <div class="legend-item"><div class="legend-dot" style="background: #22c55e;"></div> Forum</div>
          <div class="legend-item"><div class="legend-dot" style="background: #6b7280;"></div> Email</div>
        </div>
      </div>
    </div>

    <!-- JTBD and Themes -->
    <div class="grid">
      <div class="card">
        <h2>What Users Are Hiring NotebookLM For (JTBD)</h2>
        <ul class="jtbd-list">
          ${feedbackData.slice(0, 6).map(f => `
            <li class="jtbd-item">
              <span class="source source-${f.source}">${f.source}</span>
              <div>${f.job_to_be_done || 'Analyzing...'}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="card">
        <h2>Top Themes</h2>
        <div>
          ${stats.topThemes.length > 0
            ? stats.topThemes.map(t => `<span class="theme-tag">${t.name}<span class="theme-count">(${t.count})</span></span>`).join('')
            : '<p style="color: #64748b;">Run /api/seed to populate data</p>'
          }
        </div>
        <div class="chart-container" style="margin-top: 1rem;">
          <canvas id="sourcesChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Email Digest Preview -->
    <div class="grid">
      <div class="card full-width digest-box">
        <div class="digest-header">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          <h2 style="margin: 0;">Weekly Feedback Digest Preview</h2>
        </div>
        <p style="color: #94a3b8; margin-bottom: 1rem;">This is what a PM would receive in their inbox:</p>
        <div style="background: #0f172a; padding: 1.5rem; border-radius: 8px;">
          <p><strong>Summary:</strong> ${stats.total} feedback items analyzed this week.</p>
          <p style="margin-top: 0.5rem;"><strong>Sentiment Breakdown:</strong> ${stats.positive} positive, ${stats.negative} negative, ${stats.neutral} neutral</p>
          <p style="margin-top: 0.5rem;"><strong>Top Pain Points:</strong></p>
          <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li>Source limits (50 cap) blocking power users</li>
            <li>Missing team collaboration features</li>
            <li>No offline mode for travelers</li>
            <li>Data export/portability concerns</li>
          </ul>
          <p style="margin-top: 0.5rem;"><strong>Action Items:</strong></p>
          <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li>Prioritize increasing source limit (high urgency, high volume)</li>
            <li>Add sharing/collaboration as next major feature</li>
            <li>Publish data privacy FAQ for enterprise users</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Recent Feedback -->
    <div class="grid">
      <div class="card full-width">
        <h2>Recent Feedback</h2>
        <div class="feedback-scroll">
          ${feedbackData.slice(0, 15).map(f => `
            <div class="feedback-item">
              <div>${f.content}</div>
              <div class="feedback-meta">
                <span class="badge source-${f.source}">${f.source}</span>
                <span class="badge badge-${f.sentiment}">${f.sentiment}</span>
                <span class="badge badge-${f.urgency}">${f.urgency} urgency</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>

  <script>
    // Pain Map Data
    const feedbackData = ${JSON.stringify(feedbackData)};

    const sourceColors = {
      reddit: '#ff4500',
      twitter: '#1da1f2',
      producthunt: '#da552f',
      appstore: '#007aff',
      forum: '#22c55e',
      email: '#6b7280'
    };

    const sentimentToX = { negative: 1, neutral: 2, positive: 3 };
    const urgencyToY = { low: 1, medium: 2, high: 3 };

    // Group feedback by position for bubble size
    const grouped = {};
    feedbackData.forEach(f => {
      const key = f.sentiment + '-' + f.urgency + '-' + f.source;
      if (!grouped[key]) {
        grouped[key] = { x: sentimentToX[f.sentiment] || 2, y: urgencyToY[f.urgency] || 2, source: f.source, count: 0, items: [] };
      }
      grouped[key].count++;
      grouped[key].items.push(f.content);
    });

    const painMapData = Object.values(grouped).map(g => ({
      x: g.x + (Math.random() - 0.5) * 0.3,
      y: g.y + (Math.random() - 0.5) * 0.3,
      r: Math.min(5 + g.count * 4, 25),
      source: g.source,
      count: g.count,
      sample: g.items[0]
    }));

    // Pain Map Chart
    new Chart(document.getElementById('painMap'), {
      type: 'bubble',
      data: {
        datasets: [{
          data: painMapData,
          backgroundColor: painMapData.map(d => sourceColors[d.source] + '99'),
          borderColor: painMapData.map(d => sourceColors[d.source]),
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
                return d.source + ': ' + d.count + ' items - "' + d.sample.substring(0, 50) + '..."';
              }
            }
          }
        },
        scales: {
          x: {
            min: 0.5, max: 3.5,
            ticks: {
              callback: (v) => ['', 'Negative', 'Neutral', 'Positive'][Math.round(v)] || '',
              color: '#94a3b8'
            },
            grid: { color: '#334155' },
            title: { display: true, text: 'Sentiment', color: '#94a3b8' }
          },
          y: {
            min: 0.5, max: 3.5,
            ticks: {
              callback: (v) => ['', 'Low', 'Medium', 'High'][Math.round(v)] || '',
              color: '#94a3b8'
            },
            grid: { color: '#334155' },
            title: { display: true, text: 'Urgency', color: '#94a3b8' }
          }
        }
      }
    });

    // Sources Pie Chart
    const sourceData = ${JSON.stringify(stats.bySource)};
    new Chart(document.getElementById('sourcesChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(sourceData),
        datasets: [{
          data: Object.values(sourceData),
          backgroundColor: Object.keys(sourceData).map(s => sourceColors[s] || '#6b7280')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94a3b8' } }
        }
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

function handleHealth(): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "notebooklm-feedback",
    version: "2.0.0",
  });
}

// Seed with pre-analyzed data
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
      ).bind(
        feedback.source, feedback.content, feedback.author, feedback.url,
        feedback.sentiment, feedback.themes, feedback.urgency, feedback.job_to_be_done
      ).run();
      inserted++;

      // Count themes
      try {
        const themes = JSON.parse(feedback.themes);
        themes.forEach((t: string) => {
          themeCounts[t.toLowerCase()] = (themeCounts[t.toLowerCase()] || 0) + 1;
        });
      } catch {}
    }

    // Insert theme counts
    for (const [name, count] of Object.entries(themeCounts)) {
      await env.DB.prepare(
        `INSERT INTO themes (name, count, last_seen) VALUES (?, ?, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET count = ?, last_seen = datetime('now')`
      ).bind(name, count, count).run();
    }

    return Response.json({ success: true, message: `Seeded ${inserted} pre-analyzed feedback entries`, count: inserted }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
  }
}

async function handleFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const sentiment = url.searchParams.get("sentiment");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let query = "SELECT * FROM feedback";
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (source) { conditions.push("source = ?"); params.push(source); }
  if (sentiment) { conditions.push("sentiment = ?"); params.push(sentiment); }
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ success: true, count: result.results.length, feedback: result.results }, { headers: corsHeaders });
}

async function handleStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const feedback = await env.DB.prepare("SELECT sentiment, source, urgency FROM feedback").all();
  const themes = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 20").all();

  const stats = {
    total: feedback.results.length,
    bySentiment: { positive: 0, negative: 0, neutral: 0 },
    bySource: {} as Record<string, number>,
    byUrgency: { low: 0, medium: 0, high: 0 },
    topThemes: themes.results
  };

  feedback.results.forEach((f: any) => {
    stats.bySentiment[f.sentiment as keyof typeof stats.bySentiment]++;
    stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
    stats.byUrgency[f.urgency as keyof typeof stats.byUrgency]++;
  });

  return Response.json(stats, { headers: corsHeaders });
}

async function handleDigest(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const feedback = await env.DB.prepare("SELECT * FROM feedback").all();
  const themes = await env.DB.prepare("SELECT name, count FROM themes ORDER BY count DESC LIMIT 5").all();

  const data = feedback.results as FeedbackEntry[];
  const negative = data.filter(f => f.sentiment === 'negative');
  const highUrgency = data.filter(f => f.urgency === 'high');

  const digest = {
    generated_at: new Date().toISOString(),
    summary: {
      total_feedback: data.length,
      sentiment_breakdown: {
        positive: data.filter(f => f.sentiment === 'positive').length,
        negative: negative.length,
        neutral: data.filter(f => f.sentiment === 'neutral').length
      }
    },
    top_themes: themes.results,
    urgent_issues: highUrgency.slice(0, 5).map(f => ({
      content: f.content,
      source: f.source,
      job_to_be_done: f.job_to_be_done
    })),
    action_items: [
      "Review source limit complaints - consider increasing from 50",
      "Prioritize team collaboration feature requests",
      "Address data portability concerns with export feature",
      "Investigate iOS crash reports on iPhone 12"
    ]
  };

  return Response.json(digest, { headers: corsHeaders });
}
