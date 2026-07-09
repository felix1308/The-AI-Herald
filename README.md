---
title: The AI Herald
emoji: 📰
colorFrom: yellow
colorTo: red
sdk: static
app_file: public/index.html
pinned: false
---

# The AI Herald

A weekly, old-fashioned newspaper-style newsletter about what's happening in the AI world — auto-generated from [NewsAPI.org](https://newsapi.org) headlines and written up by Google's Gemini API, rendered as a two-page, book-style newspaper spread with images and links back to the original sources. Deployed as a **Static Hugging Face Space**: a scheduled **GitHub Action** does the generation (NewsAPI + Gemini calls) and pushes the resulting JSON straight to the Space, which just serves plain HTML/CSS/JS with no backend and no server-side secrets exposed to the browser.

## How it works

1. **`.github/workflows/weekly-newsletter.yml`** runs every Monday at 06:00 UTC (and can be triggered manually from the repo's **Actions** tab).
2. **`lib/generate.js`** (invoked via `scripts/generate-static.js`) does the actual work:
   - Pulls the last 7 days of headlines from NewsAPI via **two separate queries**: one targeted at AI-in-automotive (self-driving, ADAS, EV software, robotaxis, automotive AI chips) and one for the general AI industry (model releases, funding, research, regulation, major tech-company moves).
   - Sends both candidate lists to Gemini, which picks a lead + up to 5 secondary stories for the Automotive section and a lead + up to 6 secondary stories for the General AI World section — the count adapts to how much genuinely distinct, substantive material is available that week (it never pads with filler, and never invents facts or URLs — those come straight from NewsAPI).
   - Saves the resulting issue as JSON to `public/data/latest.json`.
3. The workflow **commits** `public/data/latest.json` back to the GitHub repo, then **pushes the whole repo** to the Hugging Face Space's git remote, which redeploys instantly (static Spaces have no build step).
4. **`public/`** is a static site (`index.html` + `styles.css` + `app.js`) styled like an old newspaper — masthead, two-page spread with a dedicated section per page ("AI & Automotive" on Page One, "The Wider AI World" on Page Two), images pulled from the original articles, and "Read full article →" links to the real sources. `app.js` fetches `data/latest.json` directly — no backend API calls, no secrets in the browser.

Roughly 5-6 Automotive stories + 6-7 General AI stories, one section per page — nothing more, per the "2-page, recent-trends-only" requirement.

> `netlify.toml` and the `netlify/` directory are leftover from an earlier Netlify-based version of this project and are no longer used — safe to delete.

## Setup (run/test locally)

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your keys:
   ```
   NEWS_API_KEY=your_newsapi_key
   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=gemini-3.5-flash   # optional
   ```
3. Generate an issue directly (writes `public/data/latest.json`):
   ```
   node scripts/generate-static.js
   ```
4. Serve the static files to preview (any static server works, e.g.):
   ```
   npx serve public
   ```
   Or use the bundled Express dev server (`npm start`), which also serves `public/` and exposes a `/api/generate-now` convenience route for local testing only — it's not part of the production deployment.

## Deploying to Hugging Face Spaces (Static SDK)

1. Create a new Space at [huggingface.co/new-space](https://huggingface.co/new-space) with **SDK = Static**.
2. Create a **Hugging Face access token** (Settings → Access Tokens, "Write" role) — you'll use this from GitHub Actions to push to the Space.
3. Push this repo to **GitHub** (a plain repo, not the Space itself):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
4. In the **GitHub repo's Settings → Secrets and variables → Actions**, add these repository secrets:
   | Secret | Value |
   |---|---|
   | `NEWS_API_KEY` | your NewsAPI key |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | optional, e.g. `gemini-3.5-flash` |
   | `HF_TOKEN` | the Hugging Face access token from step 2 |
   | `HF_SPACE` | `<your-hf-username>/<space-name>` |
5. Trigger the workflow once manually: GitHub repo → **Actions** tab → **Weekly Newsletter** → **Run workflow**. This generates the first issue, commits it to GitHub, and pushes the whole repo (including the `sdk: static` README frontmatter) to the Hugging Face Space, which deploys immediately.
6. From then on, the workflow runs automatically every Monday at 06:00 UTC (`.github/workflows/weekly-newsletter.yml`) — GitHub Actions' free tier cron is reliable and doesn't require the Space to stay "awake" the way a Docker Space's in-process scheduler would.

## Notes

- The generated issue is a plain JSON file committed at `public/data/latest.json` — it's part of the git history, not a database. `app.js` fetches it directly as a static asset.
- To change the schedule, edit the cron string in `.github/workflows/weekly-newsletter.yml` (currently `"0 6 * * 1"` = every Monday 06:00 UTC).
- Images and source links come directly from the NewsAPI articles the LLM selected — nothing is AI-generated except the headlines/summaries/categorization.
- If NewsAPI returns too few qualifying articles (missing images/descriptions) in a given week, generation throws and the workflow step fails without committing/deploying — the previous week's issue stays live on the Space until the next successful run.
- `server.js`, `Dockerfile`, and `.dockerignore` are kept for local development/testing convenience only; they are not used by the Static Space deployment described above.
