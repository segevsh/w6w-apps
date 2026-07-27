/**
 * monday.com — w6w port of n8n's `Monday.com` node.
 *
 * monday has no REST API: every call is a GraphQL POST to a single endpoint
 * (`https://api.monday.com/v2`), so `lib/client.ts` is a GraphQL client rather
 * than a REST wrapper, and each action owns its query/mutation document. Three
 * things worth knowing:
 *
 *   - **GraphQL answers 200 on failure.** Problems come back in `errors[]` with
 *     an HTTP 200, so the client checks both — otherwise a failed mutation would
 *     read as a success with an undefined result.
 *   - **Column values are a JSON scalar, passed as a string.** The item write
 *     actions take a `columnValues` JSON object keyed by column id; monday's
 *     `JSON` scalar wants it stringified, which `jsonArg` validates and encodes.
 *   - **Ids differ by shape.** `board_id` / `item_id` are `ID`; `group_id` and
 *     `column_id` are string keys (`topics`, `status`). The `*-get-many` lookups
 *     exist to discover them.
 *
 * Deliberately absent: the webhook trigger (a Trigger, not an Action).
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import boardCreate from "./actions/board-create.ts";
import boardGet from "./actions/board-get.ts";
import boardGetMany from "./actions/board-get-many.ts";
import boardArchive from "./actions/board-archive.ts";
import groupCreate from "./actions/group-create.ts";
import groupGetMany from "./actions/group-get-many.ts";
import groupDelete from "./actions/group-delete.ts";
import itemCreate from "./actions/item-create.ts";
import itemGet from "./actions/item-get.ts";
import itemGetMany from "./actions/item-get-many.ts";
import itemChangeColumnValues from "./actions/item-change-column-values.ts";
import itemDelete from "./actions/item-delete.ts";
import itemMove from "./actions/item-move.ts";
import columnGetMany from "./actions/column-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // board
    boardCreate,
    boardGet,
    boardGetMany,
    boardArchive,
    // group
    groupCreate,
    groupGetMany,
    groupDelete,
    // item
    itemCreate,
    itemGet,
    itemGetMany,
    itemChangeColumnValues,
    itemDelete,
    itemMove,
    // column — the lookup that tells item writes which column ids exist
    columnGetMany,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
