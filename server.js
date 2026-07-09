require("dotenv").config();
const path = require("path");
const express = require("express");
const cron = require("node-cron");
const { generateNewsletter, getLatestNewsletter } = require("./lib/generate");

const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/newsletter", (req, res) => {
  try {
    const issue = getLatestNewsletter();
    res.json(issue);
  } catch (err) {
    console.error("Failed to read newsletter:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/generate-now", async (req, res) => {
  try {
    const issue = await generateNewsletter();
    res.json({ ok: true, issueDate: issue.issueDate, volume: issue.volume });
  } catch (err) {
    console.error("Manual generation failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Runs automatically every Monday at 06:00 UTC.
cron.schedule(
  "0 6 * * 1",
  () => {
    console.log("Running scheduled weekly newsletter generation...");
    generateNewsletter()
      .then((issue) => console.log(`Generated issue dated ${issue.issueDate}`))
      .catch((err) => console.error("Scheduled generation failed:", err));
  },
  { timezone: "UTC" }
);

app.listen(PORT, () => {
  console.log(`The AI Herald running at http://localhost:${PORT}`);
});
