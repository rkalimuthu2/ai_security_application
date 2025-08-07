const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const simpleGit = require("simple-git");
const crypto = require("crypto");

const tmpDir = path.join(__dirname, "../uploads");

function generateFolderName() {
  return crypto.randomBytes(8).toString("hex");
}

async function cloneRepo(repoUrl) {
  try {
    console.log(`Cloning repository: ${repoUrl}`);

    const folderName = generateFolderName();
    const repoPath = path.join(tmpDir, folderName);

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });

    const git = simpleGit();

    // Clone with timeout and error handling
    await git.clone(repoUrl, repoPath, ["--depth", "1"]); // Shallow clone for speed

    console.log(`Repository cloned successfully to: ${repoPath}`);
    return repoPath;
  } catch (error) {
    console.error("Error cloning repository:", error.message);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

// Cleanup function to remove temporary files
async function cleanupTempFiles(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`Cleaned up: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up ${filePath}:`, error.message);
  }
}

module.exports = { cloneRepo, cleanupTempFiles };
