const { schedule } = require("@netlify/functions");
const { generateNewsletter } = require("./lib/generate");

// Runs automatically once a week (Monday 06:00 UTC) on Netlify's infrastructure.
// Cron format: minute hour day-of-month month day-of-week
const handler = async () => {
  try {
    const issue = await generateNewsletter();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, issueDate: issue.issueDate }),
    };
  } catch (err) {
    console.error("Scheduled newsletter generation failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

module.exports.handler = schedule("0 6 * * 1", handler);
