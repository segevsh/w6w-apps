# WebScraping.AI

Scrape pages from a workflow: full HTML or Markdown text through headless Chromium and rotating
proxies, CSS-selector extraction, LLM question answering and field extraction over a page, parsed
Google results and structured JSON for supported sites. Vendor docs: <https://webscraping.ai/docs>;
the API is described by <https://webscraping.ai/openapi.json> (OpenAPI 3.1, v3.2.2, the version this
app was built against).

## Connecting

Create an API key in the WebScraping.AI dashboard and paste it into the connection. It is sent as
the `api_key` **query parameter** (the vendor's only documented scheme) by the connection's `sign`
hook; no action ever sees it. The connection test calls `GET /account`, which needs a valid key and
returns the account email and credit counters, never the key.

## Actions

Every route is a `GET` on `https://api.webscraping.ai`.

| Action | Route | Notes |
| --- | --- | --- |
| Ask a Question About a Page | `GET /ai/question` | LLM answer, plain text |
| Extract Fields From a Page | `GET /ai/fields` | `{ result: { name: value \| null } }` |
| Get Page HTML | `GET /html` | optional custom JavaScript and its result |
| Get Page Text | `GET /text` | Markdown, or JSON/XML with title and description |
| Get HTML of a CSS Selector | `GET /selected` | first match; no match is a 400 |
| Get HTML of Several CSS Selectors | `GET /selected-multiple` | one list of matches per selector |
| Search Google | `GET /serp` | parsed organic results, related searches, pagination |
| Get Structured Page Data | `GET /data` | YouTube, TikTok, X, LinkedIn, Instagram, Reddit, ... |
| Get Account | `GET /account` | email, credits, concurrency, reset time |

The page-fetching actions share a collapsible "Fetch options" section: JS rendering and its timeout,
wait-for selector, request timeout, proxy type (datacenter, residential, stealth, auto), proxy
country, custom proxy, device, target headers and fail-on-404/redirect.

## Cost and failure

Credits, not requests; the price depends on the proxy tier and JS rendering, and failed requests
are not billed. A failure is thrown with the vendor's `error_code` (for example `target_blocked`)
and the target page's HTTP status; the vendor's own message already names the next configuration to
try and its price.

## Health

| Check | What it does |
| --- | --- |
| `service` | Declared unavailable (informational): WebScraping.AI publishes no status page. `status.webscraping.ai` does not resolve and `webscraping.ai/status` is a 404. |
| `api` | Unauthenticated `GET /account`. The application's own JSON `Wrong API key` 403 passes; an HTML page does not. |
| `quota` | Signed `GET /account`: remaining credits and reset time. Informational; down at zero credits. |

## Not covered

The vendor's `format=json` switch (wraps a text or HTML answer in `{ result }`) is left out: it
exists only for tools that cannot read plain text, and the actions already return structured
objects. The deprecated `remaining_api_calls` account field is not declared as an output (the
action still passes it through). No deprecation or sunset notice appears in the OpenAPI document.

## Icon

`assets/icon.png` is the vendor's `apple-touch-icon.png` (180x180), saved verbatim from
`https://webscraping.ai/apple-touch-icon.png`; the site serves no SVG mark (`/favicon.svg` is a 404
HTML page).
