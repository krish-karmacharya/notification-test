import * as cheerio from "cheerio";
import { getText, item } from "../lib.mjs";

// Generic "list of notices" scraper. It looks for links on the page and keeps the ones
// that look like notices, then opens the newest few to read the text.
// If the site layout differs, adjust LINK_FILTER or the selectors below.
const LINK_FILTER = /notice|1141|road|highway|सडक/i;

const severityOf = (t) =>
  /completely blocked|fully blocked|पूर्ण रूपमा अवरुद्ध|बन्द/i.test(t) ? "danger"
  : /one-way|partially|एकतर्फी|restricted/i.test(t) ? "warning" : "info";

export default async function run(src, { limit = 6, html } = {}) {
  const page = html ?? (await getText(src.url));
  const $ = cheerio.load(page);
  const base = new URL(src.url);

  const links = [];
  $("a[href]").each((_, a) => {
    const text = $(a).text().replace(/\s+/g, " ").trim();
    const href = $(a).attr("href");
    if (!text || text.length < 8 || !href) return;
    if (!LINK_FILTER.test(text + href)) return;
    const url = new URL(href, base).toString();
    if (!links.some((l) => l.url === url)) links.push({ title: text, url });
  });

  const out = [];
  for (const l of links.slice(0, limit)) {
    let body = "";
    if (!html) {
      try {
        const detail = cheerio.load(await getText(l.url));
        detail("script,style,nav,header,footer").remove();
        body = detail("main, article, .content, body").first().text().replace(/\s+/g, " ").trim().slice(0, 1500);
      } catch {
        /* keep the title only */
      }
    }
    out.push(item({ source: src.name, title: l.title, body, url: l.url, severity: severityOf(l.title + body) }));
  }
  return out;
}
