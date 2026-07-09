// DEV-ONLY helper: serves public/ and mocks /api/newsletter with sample data,
// so the newspaper UI can be previewed without a real NEWS_API_KEY/GEMINI_API_KEY.
// Not used in production - the real deployed site uses server.js instead.
const http = require("http");
const fs = require("fs");
const path = require("path");

const sample = {
  issueDate: new Date().toISOString(),
  issueLabel: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  volume: 1,
  automotive: {
    lead: {
      headline: "WAYMO ROBOTAXIS HIT 2 MILLION RIDES AS RIVALS SCRAMBLE",
      summary:
        "Alphabet's self-driving unit Waymo announced it has now completed over two million paid robotaxi rides across three cities, a milestone that puts real distance between it and rivals still stuck in testing. Executives say expansion to five new metro areas is planned by year's end. The news sent competitors scrambling to accelerate their own rollout timelines.",
      category: "AUTONOMOUS DRIVING",
      source: "TechCrunch",
      url: "https://techcrunch.com",
      image:
        "https://images.unsplash.com/photo-1617704548623-340376564e68?w=900&q=80",
    },
    stories: [
      {
        headline: "Tesla Pushes Autopilot v13 to Entire Fleet",
        summary:
          "Tesla began rolling out its latest Autopilot software update, promising smoother highway merges and better pedestrian detection in dense city driving.",
        category: "ADAS",
        source: "Reuters",
        url: "https://reuters.com",
        image:
          "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&q=80",
      },
      {
        headline: "Mobileye Unveils Next-Gen Automotive AI Chip",
        summary:
          "Chipmaker Mobileye revealed a new system-on-chip purpose-built for Level 3 driving, claiming triple the processing power of its predecessor at lower cost.",
        category: "AUTOMOTIVE CHIPS",
        source: "The Verge",
        url: "https://theverge.com",
        image:
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
      },
      {
        headline: "EV Makers Race to Add In-Car AI Copilots",
        summary:
          "Several major automakers previewed conversational AI copilots for their next model years, aiming to turn the dashboard into an assistant-driven cockpit.",
        category: "EV SOFTWARE",
        source: "Bloomberg",
        url: "https://bloomberg.com",
        image:
          "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80",
      },
    ],
  },
  general: {
    lead: {
      headline: "OPENAI UNVEILS NEW REASONING MODEL, STUNS RESEARCHERS",
      summary:
        "In a dramatic press briefing yesterday, OpenAI announced its latest reasoning-focused model, claiming state-of-the-art performance on math and coding benchmarks. Industry watchers say the release marks a turning point in the race toward more capable, reliable AI systems. Rivals are expected to respond within weeks.",
      category: "TOP STORY",
      source: "TechCrunch",
      url: "https://techcrunch.com",
      image:
        "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&q=80",
    },
    stories: [
      {
        headline: "Anthropic Raises $4B in Fresh Funding",
        summary:
          "Claude-maker Anthropic closed a massive new funding round, valuing the company at over $60 billion as investors bet big on enterprise AI adoption.",
        category: "BUSINESS",
        source: "Reuters",
        url: "https://reuters.com",
        image:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
      },
      {
        headline: "EU Finalizes New AI Rulebook",
        summary:
          "Brussels lawmakers approved the final text of sweeping AI regulation, setting strict transparency requirements for foundation model makers.",
        category: "POLICY",
        source: "Financial Times",
        url: "https://ft.com",
        image:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
      },
      {
        headline: "Google DeepMind Cracks Protein Folding 2.0",
        summary:
          "Researchers unveiled an upgraded model that predicts molecular interactions with unprecedented accuracy, opening new doors for drug discovery.",
        category: "RESEARCH",
        source: "Nature",
        url: "https://nature.com",
        image:
          "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80",
      },
      {
        headline: "Meta Open-Sources Its Latest Model Weights",
        summary:
          "In a move welcomed by developers, Meta released the weights for its newest language model under a permissive license.",
        category: "PRODUCT",
        source: "The Verge",
        url: "https://theverge.com",
        image:
          "https://images.unsplash.com/photo-1550439062-609e1531270e?w=400&q=80",
      },
    ],
  },
};

const server = http.createServer((req, res) => {
  if (req.url === "/api/newsletter") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(sample));
    return;
  }

  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, "public", filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type =
      ext === ".css" ? "text/css" : ext === ".js" ? "application/javascript" : "text/html";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

server.listen(8899, () => console.log("Preview server running at http://localhost:8899"));
