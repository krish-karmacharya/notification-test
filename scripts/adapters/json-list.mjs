import { getJson, item } from "../lib.mjs";

// Generic JSON adapter. Handles both {results:[...]} (Django REST style, as used by BIPAD)
// and plain arrays. Field names are guessed from common keys; adjust PICK if yours differ.
const PICK = {
  title: ["title", "title_en", "headline", "event", "name"],
  body: ["description", "description_en", "summary", "message", "details"],
  time: ["started_on", "created_on", "published", "sent", "date", "time"],
  place: ["area", "areaDesc", "district", "location", "address"],
  url: ["url", "link"],
  level: ["severity", "level", "alertLevel", "hazard"],
};

const first = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null || v === "") continue;
    return typeof v === "object" ? (v.title ?? v.name ?? v.en ?? JSON.stringify(v)) : String(v);
  }
  return "";
};

const severityOf = (v) => {
  const s = String(v).toLowerCase();
  if (/red|severe|extreme|danger|high/.test(s)) return "danger";
  if (/orange|warning|moderate/.test(s)) return "warning";
  if (/yellow|watch|minor/.test(s)) return "watch";
  return "info";
};

export default async function run(src, { limit = 15, json } = {}) {
  if (!json && !src.apiUrl) {
    throw new Error(`${src.id}: no apiUrl set in sources.json yet (see the note there)`);
  }
  const data = json ?? (await getJson(src.apiUrl));
  const rows = Array.isArray(data) ? data : data.results ?? data.items ?? data.alerts ?? [];
  return rows.slice(0, limit).map((r) =>
    item({
      source: src.name,
      title: first(r, PICK.title) || "Untitled alert",
      body: first(r, PICK.body),
      time: first(r, PICK.time) || null,
      place: first(r, PICK.place),
      url: first(r, PICK.url) || src.url,
      severity: severityOf(first(r, PICK.level)),
    })
  );
}
