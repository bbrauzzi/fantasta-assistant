---
name: run-app
description: Launch and drive FantAsta Assistant (Vite dev server + browser) to see a change working. Use when asked to run, start, or screenshot the app.
---

# Running FantAsta Assistant

Vite 7 + React 19 + Tailwind 4 SPA. No backend, no auth, no database — every
bit of state lives client-side in `localStorage`. "Running it" means: dev
server up, page driven in a real browser, screenshot looked at.

Seven tabs: Listone, Obiettivi, Rosa, Avversari, Moduli, Registro, Setup.

## 1. Install

Plain `npm install` **fails with `E401`**. `package-lock.json` resolves all 522
packages through `artifactory.thalesdigital.io` (corporate Artifactory), and
the token in `~/.npmrc` is not valid for it. Use:

```bash
npm install --package-lock=false --registry=https://registry.npmjs.org/
```

`--package-lock=false` is the load-bearing flag. It stops npm from following
the lockfile's Artifactory `resolved` URLs, and leaves `package-lock.json`
untouched so `git status` stays clean.

Tradeoff, worth stating out loud when you report: the resulting tree is
resolved fresh from public npm, **not lockfile-pinned**, so versions may drift
from what the lockfile records.

Expected and harmless:

```
npm warn install-scripts esbuild@0.28.2 (postinstall: node install.js)
```

Vite runs fine without it. Only if an esbuild binary error actually appears:
`npm install-scripts approve esbuild`.

The permanent fix is out of scope for a run — mention it, don't do it: either
refresh the Artifactory token (`npm login --registry=https://artifactory.thalesdigital.io/artifactory/api/npm/npm/`)
or regenerate the lockfile against public npm.

## 2. Dev server

```bash
npm run dev -- --port 5173 > /tmp/vite.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:5173/ >/dev/null; do sleep 1; done'
```

Poll the port — don't `sleep`. Vite is ready in ~150ms here, but the poll also
covers a cold first compile.

Stop it before relaunching, or the next run hits `EADDRINUSE`:

```bash
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

Kill the port's listener, not the npm wrapper (`$!` is only the wrapper; npm
does not forward SIGTERM to vite). Avoid a broad `pkill -f` — it can match the
agent's own command line and kill the session.

## 3. Drive it

**`chromium-cli` is not installed on this machine** — don't go looking for it,
and skip the parent `run` skill's `examples/playwright.md` recipe. Use the
claude-in-chrome MCP tools, which are verified working here.

Load them in one `ToolSearch` call:

```
select:mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_close_mcp
```

Then:

1. `navigate` → `http://localhost:5173/`. Called standalone it creates the tab
   and returns the `tabId`.
2. `computer` `screenshot`. **Look at it.** A blank frame, or one showing only
   "Apri su schermo più grande", is a failed launch — see gotchas.
3. `computer` `left_click` the search field (~`[200, 89]` at 1568px wide), then
   `type`.
4. `read_console_messages` with `onlyErrors: true` before declaring success.

The whole app is client-side rendering over the seed listone, so one search
proves it's genuinely live:

> Search **`Martinez`** in Listone → the footer narrows to
> `2 calciatori mostrati su 517`, listing Martinez L. (Inter, A) and
> Martinez Jo. (Inter, P).

Use a real surname from the seed. The seed stores **abbreviated** surnames, so
`Lautaro` returns "Nessun calciatore con questi filtri" — that's correct
behaviour, not a bug.

Fallback if claude-in-chrome is unavailable: the Playwright MCP
(`mcp__plugin_playwright_playwright__*`).

## 4. Gotchas

**1024px minimum width.** Below it, `SchermoPiccolo`
(`src/components/SchermoPiccolo.tsx:1`) throws a full-viewport overlay reading
"Apri su schermo più grande" and nothing else renders. A narrow browser window
produces a screenshot that looks like a broken app. Keep the viewport ≥1024px
(~1568px works well).

**localStorage auto-save.** The zustand store persists under key
`fantasta-assistant` (`src/store/store.ts:579`) and UI state under
`fantasta:ui` (`src/store/ui.ts:118`). A re-run **resumes the previous
auction** — leftover roster, spent credits, a changed theme — so a "fresh app"
check may be reading stale state from an earlier session.

To reset, clear both keys and reload:

```js
localStorage.removeItem('fantasta-assistant');
localStorage.removeItem('fantasta:ui');
location.reload();
```

This destroys real auction data. Only do it on a scratch run, never on a
browser profile the user may have a live auction in.

**React controlled inputs.** Type through the MCP `type` action. Assigning
`el.value` via an evaluate does not fire React's `onChange` and the store
never updates.

## 5. What running is not

`npm test` (vitest, `src/**/*.test.ts`, node environment) is the test suite,
not the app. It proves nothing about whether the page renders.
