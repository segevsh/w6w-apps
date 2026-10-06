/**
 * SeaTable — the cloud spreadsheet-database: read and write the rows, SQL, links,
 * tables, columns, views and row comments of one SeaTable Cloud base
 * (`cloud.seatable.io`).
 *
 * Every path, verb, body field and response shape here was verified on
 * 2026-10-06 against SeaTable's official API reference (`api.seatable.io`, the
 * OpenAPI 3.0 `info.version` 6.2 embedded in each reference page) plus live
 * probes against `cloud.seatable.io` and `status.seatable.com`. Nothing came from
 * a third-party integration directory. No part of the base API is marked
 * deprecated; the reference's only "deprecat" hit is unrelated prose.
 *
 * The findings that shaped the design:
 *
 *  1. **A two-step credential** (`auth/api-token.ts`). The per-base API-Token
 *     cannot call the base endpoints; it is exchanged for a three-day Base-Token,
 *     and that exchange also reveals the base's UUID, which every URL needs. The
 *     connection therefore IS a base, and no Action takes a base id.
 *  2. **Two error spellings on one host** (`lib/client.ts`): `error_msg` from
 *     the account API, `error_message` from the gateway — both 403 for a bad token.
 *  3. **Names in, names out, except where it is IDs.** Row endpoints take table
 *     and column NAMES; the link endpoints and row comments take table `_id`s and
 *     the 4-character `link_id`. Unknown column names in a row object are silently
 *     ignored, not rejected.
 *  4. **The status page is Gatus** (`health/service.ts`), not Statuspage — every
 *     Statuspage path 404s behind a 200 SPA shell.
 *
 * Only SeaTable Cloud is covered; a self-hosted server is a host of its own.
 */
import type { AppDefinition } from "@w6w/types";
import baseMetadataGet from "./actions/base-metadata-get.ts";
import collaboratorList from "./actions/collaborator-list.ts";
import sqlQuery from "./actions/sql-query.ts";
import rowList from "./actions/row-list.ts";
import rowGet from "./actions/row-get.ts";
import rowAppend from "./actions/row-append.ts";
import rowUpdate from "./actions/row-update.ts";
import rowDelete from "./actions/row-delete.ts";
import rowLock from "./actions/row-lock.ts";
import rowUnlock from "./actions/row-unlock.ts";
import rowLinkList from "./actions/row-link-list.ts";
import rowLinkCreate from "./actions/row-link-create.ts";
import rowLinkUpdate from "./actions/row-link-update.ts";
import rowLinkDelete from "./actions/row-link-delete.ts";
import rowCommentList from "./actions/row-comment-list.ts";
import rowCommentCreate from "./actions/row-comment-create.ts";
import tableCreate from "./actions/table-create.ts";
import tableRename from "./actions/table-rename.ts";
import tableDelete from "./actions/table-delete.ts";
import viewList from "./actions/view-list.ts";
import columnList from "./actions/column-list.ts";
import columnInsert from "./actions/column-insert.ts";
import columnDelete from "./actions/column-delete.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    baseMetadataGet,
    collaboratorList,
    sqlQuery,
    rowList,
    rowGet,
    rowAppend,
    rowUpdate,
    rowDelete,
    rowLock,
    rowUnlock,
    rowLinkList,
    rowLinkCreate,
    rowLinkUpdate,
    rowLinkDelete,
    rowCommentList,
    rowCommentCreate,
    tableCreate,
    tableRename,
    tableDelete,
    viewList,
    columnList,
    columnInsert,
    columnDelete,
  ],
  auth: [apiToken],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
