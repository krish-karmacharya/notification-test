import { getJson, item } from "../lib.mjs";

// Unofficial fallback so the Weather tab is never empty. Flags heavy rain in the next 3 days.
export default async function run(src, { cities = [], json } = {}) {
  const out = [];
  for (const c of cities) {
    const url =
      `${src.url}?latitude=${c.lat}&longitude=${c.lon}` +
      `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKathmandu&forecast_days=3`;
    const d = json?.[c.name] ?? (await getJson(url));
    const rain = d.daily.precipitation_sum;
    const days = d.daily.time;
    const worst = Math.max(...rain);
    const severity = worst >= 100 ? "danger" : worst >= 50 ? "warning" : worst >= 20 ? "watch" : "info";
    const line = days
      .map((day, i) => `${day}: ${rain[i]} mm rain, ${d.daily.temperature_2m_min[i]}–${d.daily.temperature_2m_max[i]}°C`)
      .join("; ");
    out.push(
      item({
        source: src.name,
        title: `${c.name}: ${worst >= 20 ? "heavy rain possible" : "no heavy rain expected"} (3-day peak ${worst} mm)`,
        body: line,
        time: days[0],
        place: c.name,
        severity,
        url: "https://open-meteo.com/",
      })
    );
  }
  return out;
}
