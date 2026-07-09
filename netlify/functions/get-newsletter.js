const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("newsletters");
    const data = await store.get("latest", { type: "json" });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || null),
    };
  } catch (err) {
    console.error("Failed to fetch newsletter:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
