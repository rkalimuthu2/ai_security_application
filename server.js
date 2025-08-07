require("dotenv").config();
const path = require("path");
const express = require("express");
const { analyzeWithAI } = require("./src/services/aiService");
const { cloneRepo, cleanupTempFiles } = require("./src/services/repoService");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve the frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

// Main API endpoint for repository analysis
app.post("/api/analyze", async (req, res) => {
  let projectPath = null;

  try {
    const { repoUrl } = req.body;

    if (!repoUrl || repoUrl.trim() === "") {
      return res.status(400).json({
        error: "Repository URL is required",
        example: "https://github.com/username/repository",
      });
    }

    console.log(`Analyzing repository: ${repoUrl}`);

    // Clone the repository
    projectPath = await cloneRepo(repoUrl);
    console.log(`Repository cloned to: ${projectPath}`);

    // Analyze the code
    const vulnerabilities = await analyzeWithAI(projectPath);

    // Clean up temporary files
    await cleanupTempFiles(projectPath);

    // Return results
    res.status(200).json({
      success: true,
      repository: repoUrl,
      totalVulnerabilities: vulnerabilities.length,
      vulnerabilities: vulnerabilities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis failed:", error.message);

    // Clean up on error
    if (projectPath) {
      await cleanupTempFiles(projectPath);
    }

    res.status(500).json({
      error: "Failed to analyze repository",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "AI Security Auditor",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AI Security Auditor running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});
