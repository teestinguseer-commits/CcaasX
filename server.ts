import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global Error Handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize Database
let db: any;
const isProduction = process.env.NODE_ENV === 'production';
// In production (often read-only root), use /tmp or memory
const dbPath = isProduction ? path.join(os.tmpdir(), 'briefs.db') : 'briefs.db';

try {
  console.log(`[DB] Attempting to initialize database at: ${dbPath}`);
  db = new Database(dbPath);
  console.log("[DB] Initialized successfully (file-based).");
} catch (err) {
  console.warn(`[DB] Failed to initialize at ${dbPath}, falling back to in-memory:`, err);
  try {
    db = new Database(":memory:");
    console.log("[DB] Initialized successfully (in-memory).");
  } catch (memErr) {
    console.error("[DB] CRITICAL: Failed to initialize in-memory database:", memErr);
    // Do not exit, just let it fail later so we can at least serve static files
  }
}

// Create tables if DB exists
if (db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        content JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("[DB] Failed to create tables:", err);
  }
}

function maskKey(key: string | undefined): string {
  if (!key) return "MISSING";
  if (key.length < 10) return key;
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

// Helper to get valid API key
function getApiKey() {
  const potentialKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    "AIzaSyCwR8ZoPRF7kuzMod5vohZovyUkgxHrzVA" // User provided fallback key
  ];

  // 1. Check standard variables and fallback
  for (const key of potentialKeys) {
    if (isValidKey(key)) return key;
  }

  // 2. Scan ALL environment variables for a valid Gemini key (starts with AIza)
  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.startsWith("AIza") && isValidKey(value)) {
      console.log(`[DEBUG] Found valid API key in env var: ${key}`);
      return value;
    }
  }

  return undefined;
}

function isValidKey(key: string | undefined): boolean {
  return !!key && 
    key.length > 20 && 
    !key.includes("YOUR_API_KEY") && 
    key !== "MY_GEMINI_API_KEY" &&
    !key.includes("placeholder");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Debug Environment on Startup
  console.log("--- Environment Debug ---");
  console.log("GEMINI_API_KEY:", maskKey(process.env.GEMINI_API_KEY));
  console.log("GOOGLE_API_KEY:", maskKey(process.env.GOOGLE_API_KEY));
  console.log("API_KEY:", maskKey(process.env.API_KEY));
  
  const resolvedKey = getApiKey();
  console.log("Resolved API Key:", maskKey(resolvedKey));
  console.log("-------------------------");

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: db ? "connected" : "disconnected" });
  });

  // API Routes
  app.get("/api/briefs", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const briefs = db.prepare("SELECT * FROM briefs ORDER BY created_at DESC").all();
      res.json(briefs);
    } catch (error) {
      console.error("Error fetching briefs:", error);
      res.status(500).json({ error: "Failed to fetch briefs" });
    }
  });

  app.get("/api/briefs/latest", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
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
      
      const apiKey = getApiKey();
      
      console.log(`[DEBUG] API Key check: ${apiKey ? 'Present' : 'Missing'}, Length: ${apiKey?.length || 0}`);

      // MOCK DATA FALLBACK
      if (!apiKey) {
        const reason = "Missing Valid API Key";
        console.warn(`No valid API key found. Generating MOCK brief.`);
        
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
            }
          ],
          sections: []
        };

        if (db) {
          const stmt = db.prepare("INSERT INTO briefs (date, content) VALUES (?, ?)");
          const info = stmt.run(mockBrief.date, JSON.stringify(mockBrief));
          return res.json({ id: info.lastInsertRowid, ...mockBrief });
        } else {
          return res.json({ id: 0, ...mockBrief });
        }
      }

      console.log(`API Key present. Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}***`);

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const prompt = `
        You are an expert Product Manager assistant specializing in CCaaS (Contact Center as a Service) and AI.
        Your goal is to generate a "Daily Brief" by searching for the latest news, blog posts, and insights from the last 7 days.
        
        Output Format (JSON only):
        {
          "date": "YYYY-MM-DD",
          "executive_summary": "...",
          "sections": [],
          "top_10_opportunities": []
        }
      `;

      // Add timeout to prevent proxy errors (50s timeout)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI Generation Timed Out")), 50000)
      );

      const result: any = await Promise.race([
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }]
          }
        }),
        timeoutPromise
      ]);

      const responseText = result.text;
      
      // Clean up potential Markdown formatting (```json\n?|\n?```)
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
      if (db) {
        const stmt = db.prepare("INSERT INTO briefs (date, content) VALUES (?, ?)");
        const info = stmt.run(briefData.date, JSON.stringify(briefData));
        res.json({ id: info.lastInsertRowid, ...briefData });
      } else {
        res.json({ id: Date.now(), ...briefData });
      }

    } catch (error: any) {
      console.error("Error generating brief:", error);
      res.status(500).json({ error: "Failed to generate brief", details: error.message || String(error) });
    }
  });

  app.post("/api/research-topic", async (req, res) => {
    try {
      const { topic, context } = req.body;
      
      const apiKey = getApiKey();
      
      if (!apiKey) {
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
      
      const apiKey = getApiKey();
      
      if (!apiKey) {
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
    
    // SPA Fallback: Serve index.html for any other route (client-side routing)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
