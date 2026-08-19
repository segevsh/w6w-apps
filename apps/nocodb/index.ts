/**
 * NocoDB — read and write records in bases and tables, follow links, and
 * inspect schemas and views.
 *
 * Two things shape this app. The **rate limit is 60 requests a minute**,
 * published on every response and small enough that it decides how a workflow
 * should be written: take big pages, use the bulk write endpoints, count
 * rather than page, and prefer filtering a child table to walking links.
 * Second, the `where` syntax takes **no spaces** inside a condition, and a
 * filter with them succeeds and returns nothing.
 *
 * Every deployment is its own host, so the health checks are connection-scoped
 * — and the interesting one reads `/api/v1/health`, which needs no credential
 * and reports the process's uptime. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiToken from "./auth/api-token.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

import recordList from "./actions/record-list.ts";
import recordGet from "./actions/record-get.ts";
import recordCount from "./actions/record-count.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";
import linkList from "./actions/link-list.ts";
import linkSet from "./actions/link-set.ts";
import baseList from "./actions/base-list.ts";
import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";
import viewList from "./actions/view-list.ts";
import webhookList from "./actions/webhook-list.ts";

const app: AppDefinition = {
  actions: [
    recordList,
    recordGet,
    recordCount,
    recordCreate,
    recordUpdate,
    recordDelete,
    linkList,
    linkSet,
    baseList,
    tableList,
    tableGet,
    viewList,
    webhookList,
  ],
  auth: [apiToken],
  healthChecks: [service, instance, quota],
};

export default app;
