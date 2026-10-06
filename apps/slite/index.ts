/**
 * Slite — a team knowledge base: notes, search, an AI that answers from them, and the users and
 * groups that own them, over the Slite public API v1 (`api.slite.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was verified on 2026-10-06
 * against Slite's own reference (`developers.slite.com`, branch 1.0 — the OpenAPI document
 * behind each `/reference/*` page) plus live unauthenticated probes against `api.slite.com`.
 * Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design:
 *
 *  1. **The docs name two auth headers** (`auth/api-key.ts`). The guide says
 *     `x-slite-api-key`; the OpenAPI documents say `Authorization: Bearer`. An unauthenticated
 *     probe cannot tell them apart (all three of: no key, either header with garbage, answer
 *     the identical 401), so `sign` stamps both with the same value.
 *  2. **`/ask` can return 202** (`actions/ask.ts`). A slow answer is not an error and not a
 *     result: it is `{status: "processing", threadId}`, polled with `thread-get`. The pointer
 *     sentence Slite puts in `answer` while processing is deliberately dropped.
 *  3. **Three required-but-nullable or required-despite-prose fields** (`note-verify`,
 *     `note-flag-outdated`): `until` must be sent as `null` for "no expiry", and `reason` is
 *     "optional" in the summary but required by the schema.
 *  4. **Two pagination styles** (`lib/client.ts`): opaque `cursor`/`nextCursor` for notes,
 *     users, groups and knowledge-management; zero-based `page`/`nbPages` for search.
 *
 * Left out on purpose: `POST/DELETE/GET /ask/index` (custom-content indexing). Their OpenAPI
 * documents mark all three `deprecated: true` and they need a `rootId` created in the UI as a
 * custom data source.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meGet from "./actions/me-get.ts";
import noteCreate from "./actions/note-create.ts";
import noteList from "./actions/note-list.ts";
import noteGet from "./actions/note-get.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";
import noteChildrenList from "./actions/note-children-list.ts";
import noteSearch from "./actions/note-search.ts";
import noteVerify from "./actions/note-verify.ts";
import noteFlagOutdated from "./actions/note-flag-outdated.ts";
import noteArchiveSet from "./actions/note-archive-set.ts";
import noteOwnerUpdate from "./actions/note-owner-update.ts";
import tileUpdate from "./actions/tile-update.ts";
import kmNoteList from "./actions/km-note-list.ts";
import kmPublicNoteList from "./actions/km-public-note-list.ts";
import kmInactiveNoteList from "./actions/km-inactive-note-list.ts";
import kmEmptyNoteList from "./actions/km-empty-note-list.ts";
import userGet from "./actions/user-get.ts";
import userSearch from "./actions/user-search.ts";
import groupGet from "./actions/group-get.ts";
import groupSearch from "./actions/group-search.ts";
import ask from "./actions/ask.ts";
import threadGet from "./actions/thread-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    meGet,
    // Notes
    noteCreate,
    noteList,
    noteGet,
    noteUpdate,
    noteDelete,
    noteChildrenList,
    noteSearch,
    // Review and ownership
    noteVerify,
    noteFlagOutdated,
    noteArchiveSet,
    noteOwnerUpdate,
    tileUpdate,
    // Knowledge management
    kmNoteList,
    kmPublicNoteList,
    kmInactiveNoteList,
    kmEmptyNoteList,
    // Users and groups
    userGet,
    userSearch,
    groupGet,
    groupSearch,
    // Ask
    ask,
    threadGet,
  ],
  // One personal API key. Slite publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
