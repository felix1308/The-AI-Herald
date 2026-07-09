const fs = require("fs");
const path = require("path");

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const DATA_DIR = path.join(__dirname, "..", "public", "data");
const LATEST_PATH = path.join(DATA_DIR, "latest.json");

const GENERAL_QUERY =
  '"artificial intelligence" OR "AI model" OR "large language model" OR OpenAI OR Anthropic OR "generative AI" OR "AI regulation"';

const AUTOMOTIVE_QUERY =
  '"self-driving" OR "autonomous vehicle" OR "autonomous driving" OR "AI in cars" OR "automotive AI" OR Waymo OR "Tesla Autopilot" OR "ADAS" OR robotaxi OR "EV software"';

async function fetchArticlesForQuery(query, { pageSize = 40 } = {}) {
  if (!NEWS_API_KEY) {
    throw new Error("Missing NEWS_API_KEY environment variable");
  }

  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&from=${from}&sortBy=publishedAt&language=en&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NewsAPI error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.articles || [];
}

async function fetchArticlePools() {
  const [automotiveRaw, generalRaw] = await Promise.all([
    fetchArticlesForQuery(AUTOMOTIVE_QUERY),
    fetchArticlesForQuery(GENERAL_QUERY),
  ]);

  const seen = new Set();
  let nextId = 0;

  function normalize(rawList, pool, limit) {
    const out = [];
    for (const a of rawList) {
      if (!a.title || !a.url || !a.urlToImage || !a.description) continue;
      const key = a.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: nextId++,
        pool,
        title: a.title,
        description: a.description,
        url: a.url,
        image: a.urlToImage,
        source: (a.source && a.source.name) || "Unknown",
        publishedAt: a.publishedAt,
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  const automotive = normalize(automotiveRaw, "automotive", 20);
  const general = normalize(generalRaw, "general", 25);

  return { automotive, general, all: [...automotive, ...general] };
}

async function selectAndWriteStories(pools) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const trim = ({ id, title, description, source, publishedAt }) => ({
    id,
    title,
    description,
    source,
    publishedAt,
  });

  const automotiveList = pools.automotive.map(trim);
  const generalList = pools.general.map(trim);

  const systemPrompt =
    'You are the editor of "The AI Herald," a weekly old-fashioned newspaper covering the artificial intelligence industry. You write in a punchy, classic newspaper style (think a 1940s press room, but reporting on 2020s AI news). You NEVER invent facts, sources, or article ids - only use the articles given to you. You are producing content for a strict 2-page print layout split into two sections, so you must be selective and concise.';

  const userPrompt = `SECTION 1 - AI & AUTOMOTIVE candidate articles (JSON array, fields: id, title, description, source, publishedAt):

${JSON.stringify(automotiveList)}

SECTION 2 - GENERAL AI WORLD candidate articles (JSON array, same fields):

${JSON.stringify(generalList)}

The candidate lists above are large (up to 20-25 articles each), so you should almost always be able to hit these targets:

For SECTION 1 (AI & Automotive): select 1 lead story PLUS EXACTLY 5 secondary stories (6 total). Treat different vehicles/companies/angles on a broad theme (e.g. one Waymo safety story vs. a separate Waymo expansion story) as distinct if they report different facts - do not discard good articles just because they share a company name. Only go below 5 secondary stories if the list truly does not contain 6 non-duplicate, substantive, on-topic articles (rare, given the list size) - minimum 2 secondary stories in that case.

For SECTION 2 (General AI World): select 1 lead story PLUS EXACTLY 6 secondary stories (7 total), covering diverse topics (model releases, research, funding/business, products, regulation, major tech-company moves). Only go below 6 secondary stories if the list truly does not contain 7 non-duplicate, substantive, on-topic articles (rare, given the list size) - minimum 4 secondary stories in that case.

Never invent content or pad with filler - only reduce the count below the targets above when the candidate list genuinely lacks enough distinct, substantive articles.

Return ONLY a JSON object with this exact shape:
{
  "automotive": {
    "lead": { "id": <id>, "headline": "<punchy newspaper headline, ALL CAPS, max 12 words>", "summary": "<3-4 sentence newspaper-style summary>", "category": "<short category label>" },
    "stories": [ { "id": <id>, "headline": "<headline, max 10 words>", "summary": "<2-3 sentence summary>", "category": "<short category label>" } ]
  },
  "general": {
    "lead": { "id": <id>, "headline": "<punchy newspaper headline, ALL CAPS, max 12 words>", "summary": "<3-4 sentence newspaper-style summary>", "category": "<short category label>" },
    "stories": [ { "id": <id>, "headline": "<headline, max 10 words>", "summary": "<2-3 sentence summary>", "category": "<short category label>" } ]
  }
}

Only use ids that are present in the respective list given above - do not mix ids between sections.`;

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

function mergeSection(sectionSelection, poolArticles) {
  const byId = new Map(poolArticles.map((a) => [a.id, a]));

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

  const lead = attach(sectionSelection && sectionSelection.lead);
  const stories = ((sectionSelection && sectionSelection.stories) || [])
    .map(attach)
    .filter(Boolean);

  if (!lead) throw new Error("Section lead id did not match any fetched article");

  return { lead, stories };
}

function getVolumeNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(diff / oneWeek);
}

async function generateNewsletter() {
  const pools = await fetchArticlePools();
  if (pools.general.length < 5) {
    throw new Error("Not enough qualifying general AI articles returned from NewsAPI");
  }
  if (pools.automotive.length < 3) {
    throw new Error("Not enough qualifying automotive AI articles returned from NewsAPI");
  }

  const selection = await selectAndWriteStories(pools);
  const automotive = mergeSection(selection.automotive, pools.automotive);
  const general = mergeSection(selection.general, pools.general);

  const now = new Date();
  const issue = {
    issueDate: now.toISOString(),
    issueLabel: now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    volume: getVolumeNumber(now),
    automotive,
    general,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LATEST_PATH, JSON.stringify(issue, null, 2));
  const archivePath = path.join(
    DATA_DIR,
    `archive-${now.toISOString().split("T")[0]}.json`
  );
  fs.writeFileSync(archivePath, JSON.stringify(issue, null, 2));

  return issue;
}

function getLatestNewsletter() {
  if (!fs.existsSync(LATEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(LATEST_PATH, "utf8"));
}

module.exports = { generateNewsletter, getLatestNewsletter };
