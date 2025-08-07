const OpenAI = require("openai");
require("dotenv").config();
const client = new OpenAI.AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
  apiVersion: "2025-01-01-preview",
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY,
  },
  timeout: 60000, // 60 second timeout
  maxRetries: 3,
});

module.exports = client;
