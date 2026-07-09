const { generateNewsletter } = require("./lib/generate");

// On-demand trigger, useful to populate the very first issue right after deploy,
// or to force a refresh outside the weekly schedule.
// Call it by visiting /api/generate-now (see netlify.toml redirect).
exports.handler = async () => {
  try {
    const issue = await generateNewsletter();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, issueDate: issue.issueDate, volume: issue.volume }),
    };
  } catch (err) {
    console.error("Manual newsletter generation failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
