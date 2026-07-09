const { getStore } = require("@netlify/blobs");

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

async function fetchArticles() {
  if (!NEWS_API_KEY) {
    throw new Error("Missing NEWS_API_KEY environment variable");
  }

  const query = encodeURIComponent(
    '"artificial intelligence" OR "AI model" OR "large language model" OR OpenAI OR Anthropic OR "generative AI" OR "AI regulation"'
  );
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const url = `https://newsapi.org/v2/everything?q=${query}&from=${from}&sortBy=publishedAt&language=en&pageSize=50&apiKey=${NEWS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NewsAPI error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();

  const seen = new Set();
  const articles = [];
  for (const a of data.articles || []) {
    if (!a.title || !a.url || !a.urlToImage || !a.description) continue;
    const key = a.title.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    articles.push({
      id: articles.length,
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.urlToImage,
      source: (a.source && a.source.name) || "Unknown",
      publishedAt: a.publishedAt,
    });
    if (articles.length >= 25) break;
  }
  return articles;
}

async function selectAndWriteStories(articles) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const listForPrompt = articles.map(
    ({ id, title, description, source, publishedAt }) => ({
      id,
      title,
      description,
      source,
      publishedAt,
    })
  );

  const systemPrompt =
    'You are the editor of "The AI Herald," a weekly old-fashioned newspaper covering only the artificial intelligence industry. You write in a punchy, classic newspaper style (think a 1940s press room, but reporting on 2020s AI news). You NEVER invent facts, sources, or article ids - only use the articles given to you. You are producing content for a strict 2-page print layout, so you must be selective and concise.';

  const userPrompt = `Here are recent AI news articles as a JSON array (fields: id, title, description, source, publishedAt):

${JSON.stringify(listForPrompt)}

Select the most important and diverse stories about CURRENT AI TRENDS (model releases, research breakthroughs, major funding/business moves, notable products, regulation/policy). Choose exactly 1 lead story and exactly 6 secondary stories (7 total), covering distinct topics. Prefer stories that are substantive and clearly about AI.

Return ONLY a JSON object with this exact shape:
{
  "leadStory": { "id": <id>, "headline": "<punchy newspaper headline, ALL CAPS, max 12 words>", "summary": "<3-4 sentence newspaper-style summary>", "category": "<short category label>" },
  "stories": [
    { "id": <id>, "headline": "<headline, max 10 words>", "summary": "<2-3 sentence summary>", "category": "<short category label>" }
  ]
}

"stories" must contain exactly 6 items. Do not include ids that are not present in the given list.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  }

  const completion = await res.json();
  const candidate = completion.candidates && completion.candidates[0];
  const content =
    candidate &&
    candidate.content &&
    candidate.content.parts &&
    candidate.content.parts[0] &&
    candidate.content.parts[0].text;
  if (!content) throw new Error("Gemini returned no content");

  return JSON.parse(content);
}

function mergeArticleData(selection, articles) {
  const byId = new Map(articles.map((a) => [a.id, a]));

  function attach(item) {
    if (!item) return null;
    const src = byId.get(item.id);
    if (!src) return null;
    return {
      headline: item.headline,
      summary: item.summary,
      category: item.category,
      source: src.source,
      url: src.url,
      image: src.image,
      publishedAt: src.publishedAt,
    };
  }

  const lead = attach(selection.leadStory);
  const stories = (selection.stories || []).map(attach).filter(Boolean);

  if (!lead) throw new Error("Lead story id did not match any fetched article");

  return { lead, stories };
}

function getVolumeNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(diff / oneWeek);
}

async function generateNewsletter() {
  const articles = await fetchArticles();
  if (articles.length < 5) {
    throw new Error("Not enough qualifying articles returned from NewsAPI");
  }

  const selection = await selectAndWriteStories(articles);
  const { lead, stories } = mergeArticleData(selection, articles);

  const now = new Date();
  const issue = {
    issueDate: now.toISOString(),
    issueLabel: now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    volume: getVolumeNumber(now),
    lead,
    stories,
  };

  const store = getStore("newsletters");
  await store.setJSON("latest", issue);
  await store.setJSON(`archive-${now.toISOString().split("T")[0]}`, issue);

  return issue;
}

module.exports = { generateNewsletter };
