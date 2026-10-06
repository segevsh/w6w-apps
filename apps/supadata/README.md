# Supadata

Turn videos and web pages into text from a workflow: transcripts for YouTube, TikTok, Instagram, X
(Twitter), Facebook and public media files; unified post metadata; AI extraction of structured data
from video; web scraping, site mapping and crawling; and YouTube search, channels, playlists and
batch jobs. Vendor docs: <https://docs.supadata.ai>.

## Connecting

Create an API key in the Supadata dashboard and paste it into the connection. It is sent as the
`x-api-key` header on every request by the connection's `sign` hook; no action ever sees it. The
connection test calls `GET /v1/me`, which needs a valid key, costs no credit and is exempt from the
rate limit.

## Actions

| Action | Route | Notes |
| --- | --- | --- |
| Get Transcript | `GET /transcript` | any platform or file URL; returns the transcript or a job id (`pending`) |
| Get Transcript Job | `GET /transcript/{jobId}` | poll; free |
| Get Media Metadata | `GET /metadata` | unified schema, 1 credit |
| Start Video Extraction | `POST /extract` | prompt and/or JSON Schema; returns a job id |
| Get Extraction Job | `GET /extract/{jobId}` | poll; free |
| Scrape Web Page | `GET /web/scrape` | Markdown, 1 credit |
| Map Website | `GET /web/map` | |
| Start Crawl | `POST /web/crawl` | returns a job id |
| Get Crawl | `GET /web/crawl/{jobId}` | status and a page of results (`skip`, `next`) |
| Search YouTube | `GET /youtube/search` | videos, channels, playlists |
| Get YouTube Channel | `GET /youtube/channel` | |
| List YouTube Channel Videos | `GET /youtube/channel/videos` | ids only |
| Get YouTube Playlist | `GET /youtube/playlist` | |
| List YouTube Playlist Videos | `GET /youtube/playlist/videos` | ids only |
| Translate YouTube Transcript | `GET /youtube/transcript/translate` | |
| Start YouTube Transcript Batch | `POST /youtube/transcript/batch` | videos, a playlist or a channel |
| Start YouTube Video Metadata Batch | `POST /youtube/video/batch` | videos, a playlist or a channel |
| Get YouTube Batch | `GET /youtube/batch/{jobId}` | status, per-video results, stats |
| Get Account | `GET /me` | plan and credits used |

## Async jobs

Four things run asynchronously, each as a start action plus a poll action: generated transcripts
(Get Transcript answers `{ pending: true, jobId }` when it did not finish inline), extraction,
crawls and YouTube batches. Poll with the matching Get action until `status` is `completed` (crawls:
`completed`, `failed` or `cancelled`). Polling costs nothing.

## Cost

Credits, not requests: a native transcript is 1 credit, a generated one 2 credits per minute,
metadata 1, a scrape 1, a crawled page 1, a batch video 1 (charged on submission), extraction 5 per
started minute (minimum 5). A transcript that comes back unavailable (HTTP 206) still costs 1 credit.

## Health

| Check | What it does |
| --- | --- |
| `service` | Reads `status.supadata.ai` (Better Stack, page id 204857) and reports its `Transcript API` resource; `Dashboard` is shown but capped at degraded. |
| `api` | Unauthenticated `GET /v1/me`. Supadata's own JSON `unauthorized` refusal passes; an HTML page does not. |
| `quota` | Signed `GET /v1/me`: credits used against `maxCredits`. Informational; degraded from 90% used, down at 100% (this app's thresholds, not the vendor's). |

## Not covered

Deprecated by the vendor and so left out: `GET /youtube/video` (use Get Media Metadata) and
`GET /youtube/transcript` (use Get Transcript). Not wrapped: the vendor's MCP server and SDK-only
conveniences.

## Icon

`assets/icon.svg` is the vendor's favicon (`docs.supadata.ai/favicon.svg`), verbatim.
