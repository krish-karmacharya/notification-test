# Nepal Alerts Desk

A no-server dashboard that pulls road, weather and disaster alerts from Nepal government sources, drafts short push-notification text with AI, and lets you review and send it.

```
GitHub Actions (every 30 min)            GitHub Pages (docs/)             GitHub Actions (on button press)
 scripts/fetch.mjs  -> docs/data/*.json   dashboard: Roads | Weather |     scripts/push.mjs -> Firebase (FCM topic)
 scripts/draft.mjs  -> drafts.json         Alerts, edit text, Push  ----->  workflow_dispatch via GitHub API
```

No machine to run. Everything is static files plus two scheduled/manual workflows.

## Try it locally (sample data)

```bash
npm install
npm run fetch:sample     # writes docs/data from ./fixtures (clearly marked SAMPLE)
npx serve docs           # open the printed URL
```

## Put it online

1. Create a GitHub repo and push this folder.
2. Settings > Pages > Deploy from branch, `main`, folder `/docs`.
3. Settings > Secrets and variables > Actions, add:
   - `ANTHROPIC_API_KEY` for AI drafts (optional; without it you get plain template drafts).
   - `FIREBASE_SERVICE_ACCOUNT`: the full service-account JSON from Firebase (Project settings > Service accounts).
4. Actions tab > "Refresh data" > Run workflow once, then it runs every 30 minutes.
5. In the dashboard, open "Push settings" and enter `owner/repo` plus a fine-grained GitHub token limited to this repo with Actions: Read and write. It is kept only in your browser.

## Before real data works: confirm the three sources

The sandbox this was built in could not reach any Nepal government site, so the live adapters are **untested against the real pages**. `sources.json` says what is confirmed and what is not.

| Tab | Source | What to check |
|---|---|---|
| Roads | Nepal Police notices, `nepalpolice.gov.np/notices/1141/` | Page exists. Open it, view source, and check the notice links match `LINK_FILTER` in `scripts/adapters/html-notices.mjs`. Notices may be images/PDFs, in which case the text must be OCR'd or typed. |
| Weather | DHM weather warnings, `dhm.gov.np/mfd/` | It is a JavaScript app. In Chrome DevTools > Network, find the request that returns the warnings JSON and paste it into `apiUrl`. Until then the Open-Meteo fallback (unofficial, labelled as such) fills the tab. |
| Alerts | BIPAD / NDRRMA, `bipad.gov.np` | The `apiUrl` is from memory. Check it in DevTools the same way. Field names are guessed in `adapters/json-list.mjs`. |

Check each site's terms and robots rules, and keep the 30-minute interval polite.

## Sending to users

`push.mjs` sends to FCM topics `nepal-roads`, `nepal-weather`, `nepal-alerts`. Android and iOS apps can subscribe to a topic directly from the client SDK. **Web push cannot**: subscribing a browser to a topic needs a server call, so for web you would store tokens in Firestore and have `push.mjs` send to those instead.

## Safety rules built in

- Drafts are never sent automatically. A person reads them and presses Push (with a confirm box).
- The AI prompt only allows facts from the item. Still check each draft against the source, especially road names and places.
- If every source for a tab fails, the dashboard keeps the last good data and shows a "stale" banner instead of going blank.
- The push script only accepts the three topics and caps title/body length.

## Files

- `sources.json`: list of sources per tab (edit URLs here)
- `scripts/adapters/`: one small file per source type
- `scripts/fetch.mjs`, `draft.mjs`, `push.mjs`
- `docs/index.html`: the whole dashboard (one file, no build step)
- `.github/workflows/refresh.yml`, `push.yml`
- `fixtures/`: sample data for offline testing
# notification-test
