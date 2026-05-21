const API_URL = "https://standup-ai.onrender.com";

let currentResult = null;
let currentType = "notes";
let workLog = JSON.parse(localStorage.getItem("standup_log") || "[]");

const SAMPLES = {
  dev: {
    type: "notes",
    text: `Website: fixed the login bug that was blocking users, pushed fix to staging
Mobile App: reviewed 3 PRs from the team, left feedback on the payment flow
also had a quick sync with design team about the new dashboard layout`
  },
  commits: {
    type: "commits",
    text: `fix(auth): resolve login issue blocking users on mobile devices
feat(dashboard): add real-time chart with live data updates
fix(api): handle timeout errors in payment processing
review: approve user profile PR with minor suggestions
chore: update dependencies, fix 2 security vulnerabilities`
  },
  pm: {
    type: "notes",
    text: `Product: finalized the new onboarding flow with design team, got sign-off
Client Work: jumped on 2 client calls, resolved one escalation
General: updated project roadmap for next quarter, shared with stakeholders`
  }
};

function setType(type) {
  currentType = type;
  document.querySelectorAll(".type-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.type === type);
  });
}

function loadSample(key) {
  const s = SAMPLES[key];
  document.getElementById("raw-input").value = s.text;
  setType(s.type);
}

function setDate() {
  const now = new Date();
  document.getElementById("nav-date").textContent = now.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

async function generate() {
  const raw = document.getElementById("raw-input").value.trim();
  const context = document.getElementById("team-context").value.trim();
  const btn = document.getElementById("gen-btn");
  const genText = document.getElementById("gen-text");
  const genLoader = document.getElementById("gen-loader");

  if (!raw) { showToast("⚠️ Please paste some notes first"); return; }

  btn.disabled = true;
  genText.classList.add("hidden");
  genLoader.classList.remove("hidden");

  try {
    const res = await fetch(`${API_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_input: raw, input_type: currentType, team_context: context })
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    currentResult = data;
    renderOutput(data);
  } catch (err) {
    showToast("❌ Failed — check if backend is running");
  } finally {
    btn.disabled = false;
    genText.classList.remove("hidden");
    genLoader.classList.add("hidden");
  }
}

function renderOutput(d) {
  document.getElementById("output-empty").classList.add("hidden");
  document.getElementById("output-content").classList.remove("hidden");

  // mood badge
  const moodMap = {
    "productive": ["productive", "mood-productive"],
    "blocked": ["🚧 blocked", "mood-blocked"],
    "steady": ["steady", "mood-steady"],
    "crushing it": ["🔥 crushing it", "mood-crushing"]
  };
  const [moodText, moodClass] = moodMap[d.mood] || ["steady", "mood-steady"];
  const moodEl = document.getElementById("mood-badge");
  moodEl.textContent = moodText;
  moodEl.className = `mood-badge ${moodClass}`;

  document.getElementById("tags-row").innerHTML = (d.tags || [])
    .map(t => `<span class="tag">${t}</span>`).join("");

  document.getElementById("highlight-box").textContent = `⭐ ${d.highlight}`;

  // render grouped projects
  const projectsEl = document.getElementById("projects-output");
  projectsEl.innerHTML = (d.projects || []).map(p => `
    <div class="project-group">
      <div class="project-name">📁 ${p.name}</div>
      <div class="standup-section">
        <div class="section-label">✅ Yesterday</div>
        <ul class="standup-list">${(p.yesterday||[]).map(i=>`<li>${i}</li>`).join("")}</ul>
      </div>
      <div class="standup-section">
        <div class="section-label">🎯 Today</div>
        <ul class="standup-list">${(p.today||[]).map(i=>`<li>${i}</li>`).join("")}</ul>
      </div>
      <div class="standup-section">
        <div class="section-label">🚧 Blockers</div>
        <ul class="standup-list">${(p.blockers||[]).map(i=>`<li>${i}</li>`).join("")}</ul>
      </div>
    </div>
  `).join("");

  // slack-ready copy text grouped by project
  const slackText = (d.projects || []).map(p => {
    return `*${p.name}*\n` +
      `✅ Yesterday:\n${(p.yesterday||[]).map(i=>`• ${i}`).join("\n")}\n` +
      `🎯 Today:\n${(p.today||[]).map(i=>`• ${i}`).join("\n")}\n` +
      `🚧 Blockers:\n${(p.blockers||[]).map(i=>`• ${i}`).join("\n")}`;
  }).join("\n\n");
  document.getElementById("copy-ready-text").textContent = slackText;
}

function copyStandup() {
  const text = document.getElementById("copy-ready-text").textContent;
  navigator.clipboard.writeText(text).then(() => showToast("✅ Copied to clipboard!"));
}

function saveToLog() {
  if (!currentResult) return;
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" }),
    highlight: currentResult.highlight,
    tags: currentResult.tags || [],
    projects: currentResult.projects || []
  };
  workLog.unshift(entry);
  localStorage.setItem("standup_log", JSON.stringify(workLog));
  renderLog();
  showToast("💾 Saved to work log!");
}

function renderLog() {
  const logList = document.getElementById("log-list");
  const logEmpty = document.getElementById("log-empty");
  const weeklyBtn = document.getElementById("weekly-btn");

  if (workLog.length === 0) {
    logEmpty.classList.remove("hidden");
    logList.innerHTML = "";
    weeklyBtn.style.display = "none";
    return;
  }

  logEmpty.classList.add("hidden");
  weeklyBtn.style.display = "flex";

  logList.innerHTML = workLog.map(e => `
    <div class="log-item">
      <div class="log-item-left">
        <div class="log-date">${e.date}</div>
        <div class="log-highlight">${e.highlight || ""}</div>
        <div class="log-tags">${(e.tags||[]).map(t=>`<span class="log-tag">${t}</span>`).join("")}</div>
      </div>
      <button class="log-delete" onclick="deleteLog(${e.id})" title="Delete">✕</button>
    </div>
  `).join("");
}

function deleteLog(id) {
  workLog = workLog.filter(e => e.id !== id);
  localStorage.setItem("standup_log", JSON.stringify(workLog));
  renderLog();
}

async function generateWeekly() {
  if (workLog.length === 0) { showToast("⚠️ No logs to summarize"); return; }
  const btn = document.getElementById("weekly-btn");
  const wText = document.getElementById("weekly-text");
  const wLoader = document.getElementById("weekly-loader");

  btn.disabled = true;
  wText.classList.add("hidden");
  wLoader.classList.remove("hidden");

  try {
    const res = await fetch(`${API_URL}/weekly-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workLog.slice(0, 7))
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    renderWeekly(data);
  } catch (err) {
    showToast("❌ Failed to generate summary");
  } finally {
    btn.disabled = false;
    wText.classList.remove("hidden");
    wLoader.classList.add("hidden");
  }
}

function renderWeekly(d) {
  const el = document.getElementById("weekly-output");
  el.classList.remove("hidden");

  document.getElementById("weekly-overall").textContent = d.overall_summary;

  // grouped by project
  document.getElementById("weekly-projects").innerHTML = (d.projects || []).map(p => `
    <div class="weekly-project">
      <div class="weekly-project-name">📁 ${p.name}</div>
      ${(p.achievements||[]).map(a => `<div class="achievement-item">${a}</div>`).join("")}
    </div>
  `).join("");

  const score = Math.round((d.productivity_score || 7) * 10);
  document.getElementById("weekly-score-fill").style.width = score + "%";
  document.getElementById("weekly-score-num").textContent = `${d.productivity_score}/10`;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2800);
}

setDate();
renderLog();
