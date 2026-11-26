// Pulls every source in sources.json and writes docs/data/{roads,weather,alerts}.json + status.json.
// Usage: node scripts/fetch.mjs            (live)
//        node scripts/fetch.mjs --fixtures (offline, uses ./fixtures)
import path from "node:path";
import { readFile } from "node:fs/promises";
import { DATA, ROOT, readJson, writeJson } from "./lib.mjs";

const useFixtures = process.argv.includes("--fixtures");
const sources = JSON.parse(await readFile(path.join(ROOT, "sources.json"), "utf8"));
const fx = async (name) => readFile(path.join(ROOT, "fixtures", name), "utf8");

const adapters = {
  "html-notices": (await import("./adapters/html-notices.mjs")).default,
  "json-list": (await import("./adapters/json-list.mjs")).default,
  "open-meteo": (await import("./adapters/open-meteo.mjs")).default,
};

const fixtureFor = {
  "nepal-police-1141": async () => ({ html: await fx("nepal-police-notices.html") }),
  "bipad-alerts": async () => ({ json: JSON.parse(await fx("bipad-alerts.json")) }),
  "dhm-warnings": async () => ({ json: JSON.parse(await fx("dhm-warnings.json")) }),
  "open-meteo-fallback": async () => ({ json: JSON.parse(await fx("open-meteo.json")) }),
};

const status = { updated: new Date().toISOString(), mode: useFixtures ? "fixtures" : "live", sources: {} };

for (const tab of ["roads", "weather", "alerts"]) {
  const file = path.join(DATA, `${tab}.json`);
  const previous = await readJson(file, { items: [] });
  const fresh = [];

  for (const src of sources[tab]) {
    try {
      const opts = useFixtures ? await fixtureFor[src.id]() : {};
      const items = await adapters[src.adapter](src, { cities: sources.cities, ...opts });
      fresh.push(...items);
      status.sources[src.id] = { name: src.name, tab, ok: true, count: items.length };
    } catch (e) {
      status.sources[src.id] = { name: src.name, tab, ok: false, error: String(e.message ?? e).slice(0, 200) };
      console.error(`[${tab}] ${src.id} failed: ${e.message}`);
    }
  }

  // Keep the last good data if every source for this tab failed, so the dashboard never goes blank.
  const items = fresh.length ? fresh : previous.items;
  const order = { danger: 0, warning: 1, watch: 2, info: 3 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  await writeJson(file, { updated: status.updated, stale: fresh.length === 0, items });
  console.log(`[${tab}] ${items.length} items${fresh.length ? "" : " (kept previous, all sources failed)"}`);
}

await writeJson(path.join(DATA, "status.json"), status);
