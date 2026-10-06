/**
 * Short.io — branded link shortening over `api.short.io`.
 *
 * Every path, verb, parameter and body field was verified on 2026-10-06 against
 * Short.io's OpenAPI 3.1 document (`https://api.short.io/openapi.json`, 71 paths)
 * plus live unauthenticated probes. Findings that shaped the design:
 *
 *  1. **Auth is the bare key** in `Authorization` — no `Bearer` prefix.
 *  2. **Routes are inconsistent**: listing links is `GET /api/links` (by numeric
 *     `domain_id`), listing domains is `GET /api/domains`, everything else is
 *     `/links/…` or `/domains/…`; updating a link is `POST /links/{id}`.
 *  3. **Several responses are undocumented** (folders, QR) and are returned
 *     untouched under `result`; bulk create can return a 200 with per-element
 *     error objects.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import linkCreate from "./actions/link-create.ts";
import linkGet from "./actions/link-get.ts";
import linkUpdate from "./actions/link-update.ts";
import linkDelete from "./actions/link-delete.ts";
import linkList from "./actions/link-list.ts";
import linkExpand from "./actions/link-expand.ts";
import linkArchive from "./actions/link-archive.ts";
import linkUnarchive from "./actions/link-unarchive.ts";
import linkDuplicate from "./actions/link-duplicate.ts";
import linkBulkCreate from "./actions/link-bulk-create.ts";
import linkBulkDelete from "./actions/link-bulk-delete.ts";
import domainList from "./actions/domain-list.ts";
import domainGet from "./actions/domain-get.ts";
import tagList from "./actions/tag-list.ts";
import qrCodeCreate from "./actions/qr-code-create.ts";
import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import folderCreate from "./actions/folder-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    linkCreate,
    linkGet,
    linkUpdate,
    linkDelete,
    linkList,
    linkExpand,
    linkArchive,
    linkUnarchive,
    linkDuplicate,
    linkBulkCreate,
    linkBulkDelete,
    domainList,
    domainGet,
    tagList,
    qrCodeCreate,
    folderList,
    folderGet,
    folderCreate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
