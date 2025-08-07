const fs = require("fs");
require("dotenv").config();
const path = require("path");
const createPrompt = require("../utils/prompt");
const client = require("../config/gpt_4");

const MAX_FILE_CHARS = 100000; // Reduced for better performance

// Helper to get all code files in a directory recursively
function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (file !== "node_modules" && file !== ".git" && file !== ".vscode") {
          getAllFiles(filePath, fileList);
        }
      } else {
        // Only include code files
        if (
          /\.(js|ts|py|java|go|rb|php|c|cpp|cs|html|css|json)$/i.test(filePath)
        ) {
          fileList.push(filePath);
        }
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  return fileList;
}

async function analyzeWithAI(projectPath) {
  console.log(`Starting analysis of: ${projectPath}`);

  let filesToAnalyze = [];

  try {
    if (fs.existsSync(projectPath) && fs.statSync(projectPath).isDirectory()) {
      filesToAnalyze = getAllFiles(projectPath);
      console.log(`Found ${filesToAnalyze.length} files to analyze`);
    } else {
      filesToAnalyze = [projectPath];
    }
  } catch (error) {
    throw new Error(`Invalid project path: ${projectPath}`);
  }

  const allVulnerabilities = [];

  for (const filePath of filesToAnalyze) {
    const fileName = path.basename(filePath);
    console.log(`Processing: ${fileName}`);

    let content;
    try {
      // Skip files larger than 200KB
      const stats = fs.statSync(filePath);
      if (stats.size > 200 * 1024) {
        console.log(`Skipping large file: ${fileName}`);
        continue;
      }

      content = fs.readFileSync(filePath, "utf-8");
      if (!content || content.trim().length === 0) {
        continue;
      }
    } catch (e) {
      console.log(`Skipping unreadable file: ${fileName}`);
      continue;
    }

    const chunks = splitContent(content, MAX_FILE_CHARS);
    if (!chunks || chunks.length === 0) continue;

    try {
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(
          `  Analyzing chunk ${i + 1}/${chunks.length} of ${fileName}`
        );

        const prompt = createPrompt(fileName, chunks[i]);

        try {
          const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT,
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            max_tokens: 2000,
          });

          if (response?.choices?.[0]?.message?.content) {
            results.push(response.choices[0].message.content);
          }
        } catch (apiError) {
          console.error(`API Error for ${fileName}:`, apiError.message);
          continue;
        }

        // Add delay between API calls
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (results.length > 0) {
        const vulnerabilities = formatVulnerabilitiesAsObjects(results);
        allVulnerabilities.push(...vulnerabilities);
      }
    } catch (err) {
      console.error(`Error processing ${fileName}:`, err.message);
      continue;
    }
  }

  console.log(
    `Analysis complete. Found ${allVulnerabilities.length} vulnerabilities.`
  );
  return allVulnerabilities;
}

function splitContent(content, maxChars) {
  const chunks = [];
  for (let i = 0; i < content.length; i += maxChars) {
    chunks.push(content.slice(i, i + maxChars));
  }
  return chunks;
}

function formatVulnerabilitiesAsObjects(results) {
  const vulnerabilities = [];
  results.forEach((resultStr, idx) => {
    try {
      const result = JSON.parse(resultStr);
      if (result.vulnerabilities && result.vulnerabilities.length > 0) {
        result.vulnerabilities.forEach((vuln) => {
          vulnerabilities.push({
            file: vuln.file,
            line: vuln.line,
            severity: vuln.severity,
            issue: vuln.issue,
            description: vuln.description,
            recommendation: vuln.recommendation,
            exampleFix: vuln.exampleFix,
          });
        });
      }
    } catch (e) {
      console.error(`Failed to parse result #${idx + 1}:`, e.message);
    }
  });
  return vulnerabilities;
}

module.exports = { analyzeWithAI };
