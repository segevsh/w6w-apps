/**
 * Wistia — video hosting and marketing analytics, over the Data API's `/modern` surface at
 * `api.wistia.com`.
 *
 * Every path, verb, parameter and body field was read off the per-endpoint OpenAPI documents
 * linked from `docs.wistia.com/llms.txt` (API version `2026-09`) and the unauthenticated
 * responses were probed live on 2026-10-06. The legacy `/v1` API still answers and is
 * deliberately not used.
 *
 * Findings that shape the code:
 *
 *  1. **Every operation requires an `X-Wistia-API-Version` header** (`lib/client.ts`).
 *  2. **Lists are bare arrays**, so list actions wrap them as `{items, count, nextCursor}`.
 *  3. **Folder request bodies are camelCase, responses snake_case** (`adminEmail`,
 *     `anonymousCanUpload` in; `anonymous_can_upload` out).
 *  4. **The probe is `GET /modern/account`**, documented as needing any scope, and its
 *     body carries no credential. A 401 is classified from its `code`, not the status.
 *  5. **The status page is Instatus**, not Statuspage, and no component is named API.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import mediaList from "./actions/media-list.ts";
import mediaGet from "./actions/media-get.ts";
import mediaUpdate from "./actions/media-update.ts";
import mediaDelete from "./actions/media-delete.ts";
import mediaMove from "./actions/media-move.ts";
import mediaImportUrl from "./actions/media-import-url.ts";
import mediaStatsGet from "./actions/media-stats-get.ts";
import mediaStatsSummaryGet from "./actions/media-stats-summary-get.ts";
import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderDelete from "./actions/folder-delete.ts";
import subfolderList from "./actions/subfolder-list.ts";
import captionList from "./actions/caption-list.ts";
import captionGet from "./actions/caption-get.ts";
import tagList from "./actions/tag-list.ts";
import accountGet from "./actions/account-get.ts";
import accountUsageGet from "./actions/account-usage-get.ts";
import statsAccountGet from "./actions/stats-account-get.ts";
import statsAccountByDate from "./actions/stats-account-by-date.ts";
import backgroundJobGet from "./actions/background-job-get.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // media
    mediaList,
    mediaGet,
    mediaUpdate,
    mediaDelete,
    mediaMove,
    mediaImportUrl,
    mediaStatsGet,
    mediaStatsSummaryGet,
    // Folders
    folderList,
    folderGet,
    folderCreate,
    folderUpdate,
    folderDelete,
    subfolderList,
    // Captions
    captionList,
    captionGet,
    // Account, tags, stats and jobs
    tagList,
    accountGet,
    accountUsageGet,
    statsAccountGet,
    statsAccountByDate,
    backgroundJobGet,
  ],
  auth: [apiToken],
  healthChecks: [service],
} satisfies AppDefinition;
