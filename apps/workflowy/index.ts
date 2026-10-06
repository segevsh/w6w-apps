/**
 * WorkFlowy — the outliner. Capture, edit, move, complete, mirror and export
 * nodes over the public API v1 (`workflowy.com/api/v1`).
 *
 * Verified 2026-10-06 against the vendor's API reference
 * (`workflowy.com/api-reference/`) and live probes. Findings that shaped it:
 *
 *  1. **Mutations return almost nothing** — create answers `{item_id}`, the rest
 *     `{status:"ok"}`; fetch the node afterwards if you need it.
 *  2. **Lists are unordered** — the actions sort by `priority`.
 *  3. **Parent addressing is rich but not uniform** — create/move/list accept
 *     keys (`inbox`, `today`, `YYYY-MM-DD`, shortcuts, `None`), mirror needs a
 *     full node id.
 *  4. **Errors use `{"errors": "…"}`** with a string value; export is limited to
 *     one request per minute.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import nodeCreate from "./actions/node-create.ts";
import nodeUpdate from "./actions/node-update.ts";
import nodeGet from "./actions/node-get.ts";
import nodeList from "./actions/node-list.ts";
import nodeDelete from "./actions/node-delete.ts";
import nodeMove from "./actions/node-move.ts";
import nodeComplete from "./actions/node-complete.ts";
import nodeUncomplete from "./actions/node-uncomplete.ts";
import nodeMirrorCreate from "./actions/node-mirror-create.ts";
import nodeMirrorDelete from "./actions/node-mirror-delete.ts";
import nodesExport from "./actions/nodes-export.ts";
import targetsList from "./actions/targets-list.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    nodeCreate,
    nodeUpdate,
    nodeGet,
    nodeList,
    nodeDelete,
    nodeMove,
    nodeComplete,
    nodeUncomplete,
    nodeMirrorCreate,
    nodeMirrorDelete,
    nodesExport,
    targetsList,
  ],
  auth: [apiKey],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
