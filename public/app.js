async function loadNewsletter() {
  const root = document.getElementById("root");
  try {
    const res = await fetch(`data/latest.json?t=${Date.now()}`);
    if (res.status === 404) {
      renderEmptyState(root);
      return;
    }
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const issue = await res.json();

    if (!issue) {
      renderEmptyState(root);
      return;
    }

    renderIssue(root, issue);
  } catch (err) {
    renderErrorState(root, err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function storyCardHtml(story) {
  return `
    <article class="story">
      <span class="category-tag">${escapeHtml(story.category || "AI NEWS")}</span>
      <h3>${escapeHtml(story.headline)}</h3>
      <div class="story-inner">
        <img src="${escapeHtml(story.image)}" alt="${escapeHtml(story.headline)}" loading="lazy" onerror="this.style.display='none'" />
        <div class="story-text">
          <p>${escapeHtml(story.summary)}</p>
          <a class="source-link" href="${escapeHtml(story.url)}" target="_blank" rel="noopener noreferrer">Source: ${escapeHtml(story.source)} &rarr; Read full article</a>
        </div>
      </div>
    </article>
  `;
}

function leadStoryHtml(lead) {
  return `
    <div class="lead-story">
      <span class="category-tag">${escapeHtml(lead.category || "TOP STORY")}</span>
      <h2>${escapeHtml(lead.headline)}</h2>
      <figure>
        <img src="${escapeHtml(lead.image)}" alt="${escapeHtml(lead.headline)}" loading="lazy" onerror="this.style.display='none'" />
        <figcaption>Source: ${escapeHtml(lead.source)}</figcaption>
      </figure>
      <div class="body-text">
        <p>${escapeHtml(lead.summary)}</p>
      </div>
      <a class="source-link" href="${escapeHtml(lead.url)}" target="_blank" rel="noopener noreferrer">Read full article &rarr;</a>
    </div>
  `;
}

function renderIssue(root, issue) {
  const automotive = issue.automotive || { lead: null, stories: [] };
  const general = issue.general || { lead: null, stories: [] };

  root.innerHTML = `
    <header class="masthead">
      <div class="kicker">A Weekly Chronicle of the Machine Age</div>
      <h1>The AI Herald</h1>
      <div class="tagline">"All the Intelligence Fit to Print"</div>
      <div class="rule-double"></div>
      <div class="meta-row">
        <span>Vol. ${escapeHtml(issue.volume)}</span>
        <span>${escapeHtml(issue.issueLabel)}</span>
        <span>Price: One Click</span>
      </div>
    </header>

    <main class="spread">
      <section class="page page-one">
        <div class="section-header">AI &amp; Automotive</div>
        ${automotive.lead ? leadStoryHtml(automotive.lead) : ""}
        <div class="story-grid">
          ${automotive.stories.map(storyCardHtml).join("")}
        </div>
        <div class="page-number">Page One</div>
      </section>

      <section class="page page-two">
        <div class="section-header">The Wider AI World</div>
        ${general.lead ? leadStoryHtml(general.lead) : ""}
        <div class="story-grid">
          ${general.stories.map(storyCardHtml).join("")}
        </div>
        <div class="colophon">
          Compiled and written by an AI editor from linked news sources. Published every week. No opinions, just headlines.
        </div>
        <div class="page-number">Page Two</div>
      </section>
    </main>
  `;
}

function renderEmptyState(root) {
  root.innerHTML = `
    <div class="error-box">
      <h2>The Presses Haven't Run Yet</h2>
      <p>This week's edition hasn't been printed. It auto-generates every Monday via a scheduled GitHub Action.</p>
      <p class="manual-refresh">To print the first issue now, go to the repo's Actions tab and run the "Weekly Newsletter" workflow manually (or run <code>node scripts/generate-static.js</code> locally with your API keys set), then wait for it to redeploy.</p>
    </div>
  `;
}

function renderErrorState(root, err) {
  root.innerHTML = `
    <div class="error-box">
      <h2>Trouble at the Print Shop</h2>
      <p>${escapeHtml(err.message)}</p>
    </div>
  `;
}

loadNewsletter();
