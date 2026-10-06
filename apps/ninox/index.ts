/**
 * Ninox — the Ninox 4 low-code platform, over its public API v1
 * (`go.ninox.com/api/v1/workspace/{workspaceId}/…`).
 *
 * Every path, verb, query parameter and body field was verified on 2026-10-06 against the
 * vendor's OpenAPI 3.0 document (`go.ninox.com/api/docs-json`, `info.version` 1.0.0) and live
 * probes against `go.ninox.com`. The findings that shaped the design:
 *
 *  1. **One key, one workspace.** A key only works inside the workspace it was created in and every
 *     path starts with that workspace's 12-character id, so the id is a Connection field echoed
 *     onto the Connection's display by `afterConnect` (`auth/api-key.ts`, `lib/client.ts`).
 *  2. **The gateway does not speak the documented error envelope.** A missing and a wrong key are
 *     the same `401 text/plain` (`Workspace orchestrator error`), and an unknown path answers
 *     **200 with the HTML web-app shell**. Success is therefore judged by the `{"data": …}` body,
 *     never by status (`lib/client.ts`, `health/api.ts`).
 *  3. **Singular `record`, plural `records`.** One record is read at `…/record/{id}`; everything
 *     else is `…/records`. Record ids are integers on the way in and strings on the way out.
 *  4. **Batch writes are transactional.** One bad record in an update or delete rolls back the
 *     batch, so the write actions are all-or-nothing.
 *  5. **`filter`, not `filters`.** The only deprecation in the document is the Ninox 3 alias
 *     `filters`; this app sends `filter`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import workspaceGet from "./actions/workspace-get.ts";
import schemaChangesList from "./actions/schema-changes-list.ts";
import moduleList from "./actions/module-list.ts";
import moduleGet from "./actions/module-get.ts";
import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";
import fieldList from "./actions/field-list.ts";
import fieldGet from "./actions/field-get.ts";
import functionList from "./actions/function-list.ts";
import recordList from "./actions/record-list.ts";
import recordGet from "./actions/record-get.ts";
import recordChangesList from "./actions/record-changes-list.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";
import recordUpsert from "./actions/record-upsert.ts";
import scriptExec from "./actions/script-exec.ts";
import viewList from "./actions/view-list.ts";
import viewGet from "./actions/view-get.ts";
import reportList from "./actions/report-list.ts";
import reportGet from "./actions/report-get.ts";
import reportPrint from "./actions/report-print.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

export default {
  actions: [
    // Workspace
    workspaceGet,
    schemaChangesList,
    // Modules, tables, fields
    moduleList,
    moduleGet,
    tableList,
    tableGet,
    fieldList,
    fieldGet,
    functionList,
    // Records
    recordList,
    recordGet,
    recordChangesList,
    recordCreate,
    recordUpdate,
    recordDelete,
    recordUpsert,
    // Scripts
    scriptExec,
    // Views and reports
    viewList,
    viewGet,
    reportList,
    reportGet,
    reportPrint,
  ],
  // Workspace API key + workspace id. Ninox publishes no OAuth surface for the public API.
  auth: [apiKey],
  healthChecks: [service, api],
} satisfies AppDefinition;
