const createPrompt = (fileName, codeChunk) => {
  return `
You are a security auditor. Analyze this project file for vulnerabilities:

File: ${fileName}
Content:
${codeChunk}

Return ONLY JSON with:
{
  "vulnerabilities": [
    {
      "file": "${fileName}",
      "line": number,
      "severity": "Critical | High | Medium | Low",
      "issue": "short title",
      "description": "details",
      "recommendation": "fix steps",
      "exampleFix": "code snippet"
    }
  ]
}
`;
};

module.exports = createPrompt;
