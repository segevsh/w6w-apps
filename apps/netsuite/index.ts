import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import tba from "./auth/tba.ts";

import recordGet from "./actions/record-get.ts";
import recordList from "./actions/record-list.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordUpsert from "./actions/record-upsert.ts";
import recordDelete from "./actions/record-delete.ts";
import recordTransform from "./actions/record-transform.ts";
import recordAction from "./actions/record-action.ts";
import suiteqlQuery from "./actions/suiteql-query.ts";
import metadataGet from "./actions/metadata-get.ts";
import serverTimeGet from "./actions/server-time-get.ts";
import governanceLimitsGet from "./actions/governance-limits-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerFind from "./actions/customer-find.ts";
import salesOrderCreate from "./actions/sales-order-create.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    recordGet,
    recordList,
    recordCreate,
    recordUpdate,
    recordUpsert,
    recordDelete,
    recordTransform,
    recordAction,
    suiteqlQuery,
    metadataGet,
    serverTimeGet,
    governanceLimitsGet,
    customerCreate,
    customerFind,
    salesOrderCreate,
  ],
  auth: [oauth2, tba],
  healthChecks: [service, account, quota],
} satisfies AppDefinition;
