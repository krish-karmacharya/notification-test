import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const DATA = path.join(ROOT, "docs", "data");

export const id = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

export async function getText(url, { timeout = 20000, headers = {} } = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { "user-agent": "nepal-alerts-bot (+github pages project)", ...headers },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

export async function getJson(url, opts) {
  return JSON.parse(await getText(url, opts));
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
}

// Every item the dashboard shows has this shape.
export function item({ source, title, body = "", url = "", time = null, severity = "info", place = "" }) {
  return {
    id: id(`${source}|${title}|${time ?? ""}`),
    source,
    title: title.trim(),
    body: body.trim(),
    url,
    time,
    severity, // info | watch | warning | danger
    place,
  };
}
