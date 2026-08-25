(() => {
  const data = window.CMD_BRIEFING;
  if (!data || !Array.isArray(data.entries) || !data.entries.length) return;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  const zone = data.timezone || "America/Edmonton";
  const dateKey = value => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(value));
    } catch {
      return String(value || "").slice(0, 10);
    }
  };

  const prettyDate = value => {
    try {
      return new Intl.DateTimeFormat("en", {
        timeZone: zone,
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(new Date(value));
    } catch {
      return String(value || "").slice(0, 10);
    }
  };

  const entries = [...data.entries]
    .filter(entry => entry && entry.published && entry.title)
    .sort((a, b) => new Date(b.published) - new Date(a.published));

  if (!entries.length) return;

  const latestKey = dateKey(entries[0].published);
  const latestEntries = entries.filter(entry => dateKey(entry.published) === latestKey);
  const latestLabel = prettyDate(entries[0].published);

  const intents = [
    ["surprise", "Surprise me", "No lane. Just make it good."],
    ["laugh", "Make me laugh", "Comedy, satire and bad decisions."],
    ["think", "Make me think", "Concepts, contrast and story arcs."],
    ["level-up", "Level me up", "Forward motion without the motivational-poster voice."],
    ["heavy", "Hit me hard", "Pressure, survival and the heavier catalog."],
    ["old-files", "Old files", "Earlier recordings and the road into the new stuff."]
  ];

  const feed = latestEntries.map((entry, index) => `
    <article class="briefing-item${index === 0 ? " briefing-item-lead" : ""}">
      <div class="briefing-item-meta">
        <span>${escapeHtml(entry.type || "Update")}</span>
        ${entry.badge ? `<b>${escapeHtml(entry.badge)}</b>` : ""}
      </div>
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(entry.summary || "")}</p>
      ${entry.href ? `<a href="${escapeHtml(entry.href)}">${escapeHtml(entry.cta || "Open")} <span aria-hidden="true">→</span></a>` : ""}
    </article>
  `).join("");

  const radioLanes = intents.map(([id, label, description]) => `
    <a class="briefing-intent" href="/music/?intent=${encodeURIComponent(id)}">
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>
      <b aria-hidden="true">→</b>
    </a>
  `).join("");

  const section = document.createElement("section");
  section.className = "shell briefing-section";
  section.id = "briefing";
  section.innerHTML = `
    <div class="briefing-head">
      <div>
        <div class="eyebrow">Daily briefing · ${escapeHtml(latestLabel)}</div>
        <h2>WHAT CHANGED<br>TODAY.</h2>
      </div>
      <div class="briefing-status">
        <span class="briefing-live-dot" aria-hidden="true"></span>
        <div>
          <strong>${latestEntries.length} ${latestEntries.length === 1 ? "update" : "updates"} in the latest drop</strong>
          <small>Music, experiments, archive finds and site changes all count.</small>
        </div>
      </div>
    </div>

    <div class="briefing-layout">
      <div class="briefing-feed">${feed}</div>
      <aside class="briefing-radio-card">
        <div class="kicker">Don't browse. Pick an intention.</div>
        <h3>WHAT DO YOU WANT<br>THE MUSIC TO DO?</h3>
        <p>The radio uses your answer as a weighting signal, not a rigid playlist. It can still surprise you; it just stops pretending every listener showed up for the same reason.</p>
        <div class="briefing-intents">${radioLanes}</div>
        <p class="briefing-radio-note">Every full run avoids duplicate song identities. Alternate versions rotate on later runs instead of stuffing one cycle with the same song six times.</p>
      </aside>
    </div>
  `;

  const hero = document.querySelector(".hero");
  const latest = document.querySelector(".latest-section");
  if (hero?.parentNode) {
    hero.insertAdjacentElement("afterend", section);
  } else if (latest?.parentNode) {
    latest.insertAdjacentElement("beforebegin", section);
  } else {
    document.querySelector("main")?.prepend(section);
  }

  const heroActions = document.querySelector(".hero .actions");
  const primary = heroActions?.querySelector(".btn.primary");
  if (primary) {
    primary.href = "#briefing";
    primary.textContent = "What changed today ↓";
  }
  if (heroActions && !heroActions.querySelector("[data-radio-entry]")) {
    const radioButton = document.createElement("a");
    radioButton.className = "btn";
    radioButton.href = "/music/?intent=surprise";
    radioButton.dataset.radioEntry = "true";
    radioButton.textContent = "Start intention radio";
    primary?.insertAdjacentElement("afterend", radioButton);
  }
})();