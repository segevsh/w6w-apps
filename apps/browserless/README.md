# Browserless

Headless Chrome as a service, driven from a workflow: screenshots, PDFs, rendered HTML, element
scraping, your own Puppeteer code, Lighthouse audits, stealth page loads, site mapping, web search,
smart scraping and asynchronous crawls. Vendor docs: <https://docs.browserless.io>.

## Connecting

Create an API token at <https://www.browserless.io/account> (an account can hold up to 20 tokens;
make one per connection so it can be revoked on its own) and pick the **region** your account is
served from:

| Region | Host |
| --- | --- |
| US West (San Francisco), default | `production-sfo.browserless.io` |
| Europe (London) | `production-lon.browserless.io` |
| Europe (Amsterdam) | `production-ams.browserless.io` |

The token travels as the `?token=` query parameter, added by the connection to every request. The
account-level Usage API is on `api.browserless.io` for every region. Self-hosted Browserless is not
supported: an arbitrary host would need an unrestricted network allow-list.

## Actions

| Action | Route | Notes |
| --- | --- | --- |
| Take Screenshot | `POST /screenshot` | PNG, JPEG or WebP, returned as base64 |
| Render PDF | `POST /pdf` | returned as base64 |
| Get Rendered HTML | `POST /content` | |
| Scrape Elements | `POST /scrape` | one CSS selector per line |
| Run Function | `POST /function` | your own Puppeteer ES module |
| Export Page | `POST /export` | file, or a ZIP with assets |
| Run Lighthouse Audit | `POST /performance` | |
| Unblock Page | `POST /unblock` | stealth browser for bot-protected pages |
| Map Site URLs | `POST /map` | |
| Search the Web | `POST /search` | optionally scrapes each result |
| Smart Scrape | `POST /smart-scrape` | HTTP, then proxy, then browser |
| Start Crawl | `POST /crawl` | asynchronous; returns an id |
| Get Crawl | `GET /crawl/{id}` | status, counters, a page of results |
| Cancel Crawl | `DELETE /crawl/{id}` | a 409 is returned as `alreadyFinished` |
| List Crawls | `GET /crawl` | |
| Get Account Usage | `GET /v1/account/usage` | on `api.browserless.io` |

Every browser action accepts **Request overrides (JSON)**, merged over the body the action builds,
for vendor options without a dedicated field (cookies, `addStyleTag`, `emulateMediaType`,
`requestInterceptors`, and so on). Binary results (screenshot, PDF, export, function) are returned as
`base64` with `contentType` and `sizeBytes`, because a workflow step cannot carry raw bytes.

## Cost

Usage is billed in units: 1 unit per 30 seconds of browser time, 6 units/MB through the residential
proxy, 2 units/MB through the datacenter proxy, 10 units per CAPTCHA solved. `/map`, `/search`,
`/smart-scrape` and `/crawl` default their proxy to **residential**, so set **Proxy** explicitly to
`datacenter` when the target does not need it.

## Health

| Check | What it does |
| --- | --- |
| `service` | Reads `status.browserless.io` (Better Stack, page id 213963) and reports the resource for the connection's region (US West, London, Amsterdam). Other resources are listed but never drive the verdict. |
| `api` | Unauthenticated `GET /active` on the region's host with a bogus token. The application's plain-text `Invalid API key` refusal passes; the load balancer's HTML 401 does not. |
| `quota` | Declared unavailable (informational): the Usage API's response schema and any remaining-units header are unpublished. |

## Not covered yet

Agent Run API (beta), `/download`, BrowserQL, sessions and authenticated profiles, `/meta`,
`/pressure`, WebSocket and BaaS endpoints, `/chrome/*` aliases and self-hosted deployments.

## Icon

`assets/icon.svg` is the vendor's favicon with its dark-mode `@media` rule replaced by a static
`fill:black`; `assets/icon.dark.svg` is the same mark in white. The host picks the variant through
`appearance.darkMode`, and the pack's legibility audit does not evaluate the media rule.
