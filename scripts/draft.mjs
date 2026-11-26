// Turns new alert items into short push-notification drafts (English + Nepali).
// Drafts are written to docs/data/drafts.json and are NEVER sent automatically: you review and press Push.
// Needs ANTHROPIC_API_KEY. Without it, a plain template draft is used so the dashboard still works.
import path from "node:path";
import { DATA, readJson, writeJson } from "./lib.mjs";

const MODEL = process.env.DRAFT_MODEL || "claude-haiku-5-5";
const MAX_PER_RUN = Number(process.env.DRAFT_MAX || 10);
const topicOf = { roads: "nepal-roads", weather: "nepal-weather", alerts: "nepal-alerts" };

const SYSTEM = `You write push-notification text for a Nepal public-safety alerts app.
Rules:
- Use ONLY facts in the item you are given. Never add locations, numbers, times or advice that are not in it.
- title: max 45 characters. body: max 130 characters. Plain, calm, no emojis, no ALL CAPS.
- If the item is unclear, write a cautious notification that points people to check the official source.
- Return Nepali (Devanagari) versions of the same text, same limits.
Reply with ONLY a JSON object: {"title_en":"","body_en":"","title_ne":"","body_ne":""}`;

function templateDraft(it) {
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  return {
    title_en: clip(it.title, 45),
    body_en: clip(it.body || `Source: ${it.source}. Check the official page for details.`, 130),
    title_ne: "",
    body_ne: "",
    by: "template",
  };
}

async function aiDraft(it) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Category: ${it.tab}\nSource: ${it.source}\nSeverity: ${it.severity}\nPlace: ${it.place}\nTitle: ${it.title}\nDetails: ${it.body.slice(0, 1200)}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API HTTP ${res.status}`);
  const data = await res.json();
  const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return { ...json, by: MODEL };
}

const drafts = await readJson(path.join(DATA, "drafts.json"), {});
let made = 0;

for (const tab of ["roads", "weather", "alerts"]) {
  const { items = [] } = await readJson(path.join(DATA, `${tab}.json`), {});
  for (const it of items) {
    if (drafts[it.id] || it.severity === "info" || made >= MAX_PER_RUN) continue;
    const withTab = { ...it, tab };
    try {
      drafts[it.id] = process.env.ANTHROPIC_API_KEY ? await aiDraft(withTab) : templateDraft(withTab);
    } catch (e) {
      console.error(`draft failed for "${it.title}": ${e.message}`);
      drafts[it.id] = templateDraft(withTab);
    }
    drafts[it.id].topic = topicOf[tab];
    drafts[it.id].created = new Date().toISOString();
    made++;
  }
}

// Drop drafts for items that are no longer on any tab, so the file does not grow forever.
const live = new Set();
for (const tab of ["roads", "weather", "alerts"]) {
  (await readJson(path.join(DATA, `${tab}.json`), { items: [] })).items.forEach((i) => live.add(i.id));
}
for (const k of Object.keys(drafts)) if (!live.has(k)) delete drafts[k];

await writeJson(path.join(DATA, "drafts.json"), drafts);
console.log(`drafts: ${made} new, ${Object.keys(drafts).length} total`);
