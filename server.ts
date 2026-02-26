import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly try to load .env from current directory if not loaded OR if it's a placeholder
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || process.env.GEMINI_API_KEY.includes("YOUR_API_KEY")) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(`[DEBUG] Loading .env manually from ${envPath} (overriding placeholder/missing value)`);
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && key.trim() === 'GEMINI_API_KEY') {
        process.env[key.trim()] = value.trim();
        console.log(`[DEBUG] Set GEMINI_API_KEY from .env file`);
      }
    });
  } else {
    console.log(`[DEBUG] .env file not found at ${envPath}`);
  }
}

// Initialize Database
let db;
try {
  db = new Database("briefs.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database initialized successfully.");
} catch (err) {
  console.error("Failed to initialize database:", err);
  process.exit(1);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  app.get("/api/briefs", (req, res) => {
    try {
      const briefs = db.prepare("SELECT * FROM briefs ORDER BY created_at DESC").all();
      res.json(briefs);
    } catch (error) {
      console.error("Error fetching briefs:", error);
      res.status(500).json({ error: "Failed to fetch briefs" });
    }
  });

  app.get("/api/briefs/latest", (req, res) => {
    try {
      const brief = db.prepare("SELECT * FROM briefs ORDER BY created_at DESC LIMIT 1").get();
      res.json(brief || null);
    } catch (error) {
      console.error("Error fetching latest brief:", error);
      res.status(500).json({ error: "Failed to fetch latest brief" });
    }
  });

  app.post("/api/generate-brief", async (req, res) => {
    try {
      console.log("Generating brief request received...");
      
      // Reload env vars to ensure we catch any updates (though typically requires restart)
      // In this environment, we rely on the process restart that happened.
      
      let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      
      console.log(`[DEBUG] API Key check: ${apiKey ? 'Present' : 'Missing'}, Length: ${apiKey?.length || 0}`);
      if (apiKey) {
         console.log(`[DEBUG] API Key starts with: ${apiKey.substring(0, 4)}...`);
      }

      // MOCK DATA FALLBACK
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("YOUR_API_KEY")) {
        const reason = !apiKey ? "Missing API Key" : "Placeholder API Key Detected";
        console.warn(`No valid API key found (${reason}). Generating MOCK brief.`);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const today = new Date().toISOString().split('T')[0];
        const mockBrief = {
          date: today,
          is_mock: true,
          executive_summary: `⚠️ DEMO MODE (${reason}): The server could not find a valid GEMINI_API_KEY in the environment. \n\nDebug Info:\n- Env Var Present: ${!!process.env.GEMINI_API_KEY}\n- Key Length: ${apiKey?.length || 0}\n\nPlease ensure you have added the key to the Secrets/Environment Variables panel and restarted the server.`,
          top_10_opportunities: [
            {
              id: 1,
              feature_name: "Real-time Agent Coaching with Sentiment Analysis",
              description: "Live prompts for agents based on customer sentiment shifts.",
              why_build_it: "NICE and Genesys have launched this; high demand for reducing agent churn.",
              competitor_activity: "NICE CXone, Genesys Cloud CX"
            },
            {
              id: 2,
              feature_name: "Auto-Summarization for Voice & Digital",
              description: "Generative AI summaries of all interactions pushed to CRM.",
              why_build_it: "Standard table stakes feature now. Saves 3-5 mins per call.",
              competitor_activity: "Salesforce Einstein, Five9 AI Summaries"
            },
            {
              id: 3,
              feature_name: "Predictive Engagement Routing",
              description: "Route based on predicted customer intent and agent proficiency.",
              why_build_it: "Increases FCR (First Contact Resolution).",
              competitor_activity: "Genesys Predictive Routing"
            }
          ],
          sections: [
            {
              "title": "Vendor Innovation",
              "items": [
                {
                  "headline": "Salesforce Announces New 'Einstein Service Agent' Features",
                  "source": "Salesforce Service Cloud AI Blog",
                  "url": "https://www.salesforce.com/blog",
                  "summary": "Salesforce has unveiled new autonomous capabilities for Einstein, allowing agents to hand off complex tier-2 tickets to AI with higher confidence scores. Key features include auto-summarization of voice logs and sentiment-based routing.",
                  "tags": ["GenAI", "Agent Assist", "Automation"]
                },
                {
                  "headline": "NICE CXone Adds Real-Time Behavioral Coaching",
                  "source": "NICE CX AI",
                  "url": "https://www.nice.com/blog",
                  "summary": "NICE's latest update integrates real-time sentiment analysis to prompt agents with behavioral coaching tips during live calls, aiming to improve NPS scores in high-stress interactions.",
                  "tags": ["Coaching", "Real-time AI"]
                }
              ]
            },
            {
              "title": "Market Analysis",
              "items": [
                {
                  "headline": "The Shift from CCaaS to 'Experience Orchestration'",
                  "source": "NoJitter",
                  "url": "https://www.nojitter.com",
                  "summary": "Analysts discuss the rebranding of CCaaS platforms as 'Experience Orchestration' engines. The focus is shifting from pure call routing to managing the entire customer journey across digital and voice channels using predictive AI.",
                  "tags": ["Market Trends", "Strategy"]
                }
              ]
            },
            {
              "title": "Thought Leadership",
              "items": [
                {
                  "headline": "Why Your AI Strategy Needs a 'Human in the Loop'",
                  "source": "Sheila McGee-Smith",
                  "url": "https://www.linkedin.com",
                  "summary": "Sheila argues that while automation is surging, the most successful CCaaS deployments in 2024 are those that use AI to augment, not replace, human agents. She cites recent failures in fully autonomous support tiers.",
                  "tags": ["Strategy", "Human-AI Teaming"]
                }
              ]
            }
          ]
        };

        // Save mock to DB so history works
        const stmt = db.prepare("INSERT INTO briefs (date, content) VALUES (?, ?)");
        const info = stmt.run(mockBrief.date, JSON.stringify(mockBrief));

        return res.json({ id: info.lastInsertRowid, ...mockBrief });
      }

      console.log(`API Key present. Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}***`);

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const prompt = `
        You are an expert Product Manager assistant specializing in CCaaS (Contact Center as a Service) and AI.
        Your goal is to generate a "Daily Brief" by searching for the latest news, blog posts, and insights from the last 7 days.

        Please search specifically for content from these sources:
        1. News Sites: CXToday, NoJitter, VentureBeat (AI), TechCrunch (Enterprise), The Information.
        2. Vendor Innovation Blogs: NICE CX AI, Salesforce Service Cloud AI, Google Contact Center AI, Genesys AI, Zoom Contact Center, Five9, Talkdesk, Amazon Connect (AWS), Microsoft Digital Contact Center.
        3. Analyst Firms: Gartner, Forrester, IDC (look for recent blog posts or report summaries).
        4. Thought Leaders: Sheila McGee-Smith, Dan Miller, Martin Hill-Wilson, Shep Hyken, Blake Morgan.

        Search Query Strategy:
        - Perform multiple searches if necessary to cover these specific domains and people.
        - Focus on "AI", "Generative AI", "Agent Assist", "Automation", "Customer Experience", "CCaaS Innovation", "Voice AI", "Workforce Engagement Management".

        Output Format:
        Return a JSON object with the following structure (do NOT use Markdown formatting for the JSON itself, just raw JSON):
        {
          "date": "YYYY-MM-DD",
          "executive_summary": "A high-level synthesis of the most important trends found today (max 150 words).",
          "sections": [
            {
              "title": "Category Title (e.g., 'Vendor Innovation', 'Market Analysis', 'Thought Leadership')",
              "items": [
                {
                  "headline": "Article Headline",
                  "source": "Source Name",
                  "url": "URL to the article",
                  "summary": "A concise summary for a PM. What is the feature/news? Why does it matter? (max 100 words)",
                  "tags": ["Tag1", "Tag2"]
                }
              ]
            }
          ],
          "top_10_opportunities": [
            {
              "id": 1,
              "feature_name": "Name of the feature/product to build",
              "description": "Brief description of what it is.",
              "why_build_it": "Why is this high priority? (e.g., Competitor X just launched it, or high market demand).",
              "competitor_activity": "Which competitors are already doing this?"
            }
          ]
        }

        IMPORTANT INSTRUCTIONS:
        1. You MUST populate the "sections" array with actual news and blog posts found from the search. Do not skip this.
        2. Specifically look for and include a "Vendor Innovation" section and a "Thought Leadership" section.
        3. If you cannot find news from a specific source for the last 7 days, skip that source, but try to find enough items to fill the sections.
        4. For "top_10_opportunities", synthesize the news you found in the sections and your general knowledge of the CCaaS market to recommend the most impactful things to build NOW.
        5. Ensure the "executive_summary" connects the dots between different news items.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const responseText = result.text;
      
      // Clean up potential Markdown formatting (```json ... ```)
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      
      let briefData;
      try {
        briefData = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw Response:", responseText);
        throw new Error("Failed to parse AI response. The model might have returned invalid JSON.");
      }
      
      // Add timestamp if missing
      if (!briefData.date) {
        briefData.date = new Date().toISOString().split('T')[0];
      }

      // Save to DB
      const stmt = db.prepare("INSERT INTO briefs (date, content) VALUES (?, ?)");
      const info = stmt.run(briefData.date, JSON.stringify(briefData));

      res.json({ id: info.lastInsertRowid, ...briefData });

    } catch (error) {
      console.error("Error generating brief:", error);
      res.status(500).json({ error: "Failed to generate brief", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/research-topic", async (req, res) => {
    try {
      const { topic, context } = req.body;
      
      let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("YOUR_API_KEY")) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          summary: "This is a mock research summary because no API key is present.",
          key_findings: ["Competitor A has a similar feature.", "Market demand is growing."],
          links: [{ title: "Mock Link", url: "https://example.com" }]
        });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `
        You are a Competitive Intelligence Analyst.
        Research the following product opportunity/topic in the context of CCaaS:
        
        Topic: ${topic}
        Context: ${context}
        
        Please search for:
        1. Which competitors have this?
        2. What are the key features/capabilities?
        3. Any recent news or announcements about this?
        
        Output JSON:
        {
          "summary": "Detailed research summary (200 words).",
          "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
          "competitor_landscape": "Who are the main players?",
          "links": [
            { "title": "Page Title", "url": "URL" }
          ]
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const responseText = result.text;
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const research = JSON.parse(cleanJson);
      
      // Extract links from grounding metadata if available, otherwise use what the model put in JSON
      // Note: The model might hallucinate links in the JSON if not careful, but googleSearch tool usually provides grounding.
      // Ideally we extract from groundingMetadata, but for simplicity we asked the model to format it.
      
      res.json(research);

    } catch (error) {
      console.error("Error researching topic:", error);
      res.status(500).json({ error: "Failed to research topic" });
    }
  });

  app.post("/api/analyze-competitor", async (req, res) => {
    try {
      const { headline, summary, source } = req.body;
      
      let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("YOUR_API_KEY")) {
        // Mock response for demo mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          threat_level: "High",
          sprinklr_advantage: "Sprinklr's Unified-CXM platform offers native integration across 30+ channels, whereas this competitor solution likely requires disjointed point-solution integrations.",
          kill_points: [
            "Ask the prospect: 'How does this new feature share data with your marketing and social teams in real-time?'",
            "Ask: 'Does this require a separate license or login for your agents?'",
            "Highlight: Sprinklr AI+ is trained on your specific historical data, not just generic models."
          ],
          elevator_pitch: "While [Competitor] is just catching up with this feature, Sprinklr has had this integrated for months. Our advantage is that this feature triggers actions across Marketing and Care simultaneously, preventing the siloed customer experience that [Competitor] creates."
        });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `
        You are a Senior Product Marketing Manager at Sprinklr (Unified-CXM Platform).
        
        Analyze the following competitor news item and create a "Battlecard" for our Sales team.
        
        Competitor News:
        Headline: ${headline}
        Source: ${source}
        Summary: ${summary}
        
        Sprinklr Context:
        - We are a Unified-CXM platform (Social, Care, Marketing, Advertising).
        - Our key differentiator is "Unified Codebase" (no silos) and "Sprinklr AI+".
        - We compete against Salesforce (siloed clouds), Genesys/NICE (legacy voice roots), and Sprout Social (SMB focus).
        
        Output JSON format (Raw JSON only, no markdown):
        {
          "threat_level": "Low | Medium | High",
          "sprinklr_advantage": "Why Sprinklr wins against this specific feature/news.",
          "kill_points": ["Question 1 to ask prospect", "Question 2", "Question 3"],
          "elevator_pitch": "A 2-sentence script for the sales rep to pivot the conversation to Sprinklr."
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const responseText = result.text;
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const analysis = JSON.parse(cleanJson);
      
      res.json(analysis);

    } catch (error) {
      console.error("Error analyzing competitor:", error);
      res.status(500).json({ error: "Failed to analyze competitor" });
    }
  });

  // Catch-all for API routes to prevent falling through to Vite (which returns HTML)
  app.all("/api/*", (req, res) => {
    console.log(`[API] 404 Not Found: ${req.path}`);
    res.status(404).json({ error: "API route not found" });
  });

  // Global error handler for API routes
  app.use((err, req, res, next) => {
    console.error("[API] Unhandled error:", err);
    if (req.path.startsWith('/api')) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error", details: err.message });
      }
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
