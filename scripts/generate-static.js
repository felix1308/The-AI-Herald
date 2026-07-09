// Standalone CLI entry point used by the GitHub Actions weekly workflow
// (and available for manual local runs) to generate this week's issue
// without needing to spin up the Express server.
require("dotenv").config();
const { generateNewsletter } = require("../lib/generate");

generateNewsletter()
  .then((issue) => {
    console.log(`Generated issue dated ${issue.issueDate} (volume ${issue.volume})`);
  })
  .catch((err) => {
    console.error("Newsletter generation failed:", err);
    process.exitCode = 1;
  });
