/**
 * GIPHY — the GIF and sticker library, over its public REST API
 * (`api.giphy.com/v1`).
 *
 * Every path, verb, query parameter, enum and response field in this app was
 * verified on 2026-09-22 against GIPHY's own developer documentation
 * (`developers.giphy.com/docs/api/`, `/endpoint/`, `/schema/` and
 * `/docs/api/#response-codes`) plus live probes against `api.giphy.com` and
 * `status.giphy.com`. Nothing here came from a third-party integration
 * directory or a sibling app.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The credential goes in the query string** (`auth/api-key.ts`). GIPHY
 *     documents `api_key` as a required *query-string parameter* on every single
 *     endpoint and documents no header form at all, so `sign` merges it into the
 *     request's existing query with `URLSearchParams` — never a hand-appended
 *     `"?api_key=…"`, which would double the `?` on the actions that already
 *     send parameters.
 *  2. **The real status is in the body** (`lib/client.ts`). GIPHY echoes its own
 *     response code into `meta.status` and always sends an envelope
 *     (`{ data, meta, pagination? }`). Every success/failure decision here reads
 *     that field; a call that answers HTTP 200 while its body says 401 is a
 *     failure.
 *  3. **Two response shapes, not one** (`lib/client.ts`). List endpoints put an
 *     array in `data`; `random` and `translate` put a single `GifObject` there.
 *     The actions declare which they return rather than pretending it is
 *     uniform.
 *  4. **One 4xx is an answer** (`actions/get-gif-by-id.ts`). An unknown GIF id
 *     answers a `4xx` `meta.status` with an empty `data` — a legitimate result,
 *     returned with `meta` so the caller can read it, while every other
 *     non-200 code throws.
 *  5. **The API is read-only** (`index.ts`, this file). GIPHY's documented
 *     write path — upload — needs a different, non-`api_key` authenticated flow
 *     for GIPHY-channel accounts, so no action here is `perform`.
 *
 * Health: the `service` check reads GIPHY's real Statuspage feed and reports the
 * API-group components. There is deliberately no `quota` check — no
 * rate-limit header of any kind was observed on a live response, so there is
 * nothing to read; the beta-key ceiling of 100 calls/hour is stated in the auth
 * hint instead. `Auth.test` is projected into the health surface as
 * `auth:api-key` automatically, so no placeholder is written for it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import searchGifs from "./actions/search-gifs.ts";
import searchStickers from "./actions/search-stickers.ts";
import getTrendingGifs from "./actions/get-trending-gifs.ts";
import getTrendingStickers from "./actions/get-trending-stickers.ts";
import getRandomGif from "./actions/get-random-gif.ts";
import getRandomSticker from "./actions/get-random-sticker.ts";
import translateGif from "./actions/translate-gif.ts";
import translateSticker from "./actions/translate-sticker.ts";
import getGifById from "./actions/get-gif-by-id.ts";
import getGifsById from "./actions/get-gifs-by-id.ts";
import getCategories from "./actions/get-categories.ts";
import getRandomId from "./actions/get-random-id.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Search
    searchGifs,
    searchStickers,
    // Trending
    getTrendingGifs,
    getTrendingStickers,
    // Random
    getRandomGif,
    getRandomSticker,
    // Translate
    translateGif,
    translateSticker,
    // By id
    getGifById,
    getGifsById,
    // Library
    getCategories,
    getRandomId,
  ],
  // One method: a query-string API key. GIPHY publishes no OAuth surface for
  // third-party apps and no header-based key, so there is nothing else to
  // declare.
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
