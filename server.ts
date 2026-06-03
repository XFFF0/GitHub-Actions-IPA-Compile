import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load configuration
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini Client Utility with custom headers for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Endpoint for Checking Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Endpoint for Gemini Action Failures & Log Diagnostics
app.post("/api/gemini/analyze-error", async (req, res) => {
  try {
    const { errorLogs, fileContent, filePath } = req.body;

    if (!errorLogs) {
      return res.status(400).json({ error: "errorLogs parameter is required." });
    }

    const systemPrompt = `You are an expert iOS Development, Xcode compiler, and Github Actions CI/CD Specialist.
Your job is to analyze the provided build log failure, explain it clearly to the developer, find the exact line causing the issue (if possible), and supply a corrected code block/configuration.
The user is working on an iOS app, expecting to compile a final .ipa binary.

Return your response in standard JSON format conforming exactly to the responseSchema provided.`;

    const userPrompt = `
Here is the raw error log from the GitHub Actions step failure:
--- START LOG ---
${errorLogs.substring(0, 10000)}
--- END LOG ---

${filePath ? `Active file being compiled: ${filePath}` : ""}
${fileContent ? `Content of active file:\n\`\`\`\n${fileContent}\n\`\`\`` : ""}

Identify the root cause of the compilation/workflow failure, explain it beautifully, pinpoint the failure line if relevant, and write the proposed code/fix that corrects the issue.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["errorSummary", "explanation", "errorLine", "proposedCode", "filePath", "confidence"],
          properties: {
            errorSummary: {
              type: Type.STRING,
              description: "A short, crystal-clear 1-sentence executive summary of the error."
            },
            explanation: {
              type: Type.STRING,
              description: "Detailed, rich developer-to-developer explanation with clear debugging context, explaining why it failed and how to prevent it."
            },
            errorLine: {
              type: Type.INTEGER,
              description: "The line number in files that caused the failure, if known/detectable. Return -1 if not applicable or cannot be traced precisely."
            },
            proposedCode: {
              type: Type.STRING,
              description: "Clean, corrected code, YAML workflow, or file content that should replace the bad lines."
            },
            filePath: {
              type: Type.STRING,
              description: "The relative path of the file that contains the issue (e.g. '.github/workflows/build-ipa.yml' or 'src/App.tsx' etc.) or blank if not specific."
            },
            confidence: {
              type: Type.NUMBER,
              description: "Score between 0 and 100 indicating confidence in this automatic fix."
            }
          }
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);

  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze build failure using Gemini.",
      details: error.message || error
    });
  }
});

// Proxy route for downloading GitHub artifacts safely without CORS issues.
// GitHub artifact downloads return status 302 and redirect to Amazon S3 which has strict CORS policies.
// The browser iframe cannot follow this redirect with custom Authorization headers. 
// We handle it here on the backend and stream the ZIP/IPA file back.
app.get("/api/proxy/artifact-download", async (req, res) => {
  const { owner, repo, artifactId, token } = req.query;

  if (!owner || !repo || !artifactId || !token) {
    return res.status(400).json({ error: "Missing required query parameters: owner, repo, artifactId, token" });
  }

  try {
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`;
    
    // First request to GitHub with Authentication Token
    const gitResponse = await fetch(githubUrl, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Actions-IPA-Manager"
      },
      redirect: 'manual' // Manage redirects directly
    });

    const redirectUrl = gitResponse.headers.get("location");
    if (!redirectUrl) {
      const errorText = await gitResponse.text();
      return res.status(gitResponse.status || 500).json({ 
        error: "Failed to get download URL from GitHub.", 
        details: errorText 
      });
    }

    // Securely pull from Amazon S3/Cloud Storage and stream it directly back to the client
    const targetResponse = await fetch(redirectUrl);
    
    if (!targetResponse.ok) {
      return res.status(500).json({ error: "Failed to fetch artifact archive from redirection source." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${repo}-ipa-artifact-${artifactId}.zip"`);
    
    // Convert Web readable stream to Node stream via buffer pipelines
    const arrayBuffer = await targetResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);

  } catch (error: any) {
    console.error("Artifact download proxy error:", error);
    res.status(500).json({ error: "Internal server error downloading artifact.", details: error.message });
  }
});

// Start-up & developer environments integration
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Error launching server:", err);
});
