/**
 * Memberstack — the membership, gated-content and plans platform — through its Admin REST
 * API (`admin.memberstack.com`): members, free-plan connections, member-token verification
 * and Data Table records.
 *
 * Every path, verb, field and error shape was verified on 2026-10-05 against Memberstack's
 * Admin REST API pages (quick-start, member-actions, verification, data-tables) plus live
 * probes against `admin.memberstack.com` and `status.memberstack.com`. The front-end DOM
 * SDK is not part of this API and is not covered.
 */
import type { AppDefinition } from "@w6w/types";
import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberCreate from "./actions/member-create.ts";
import memberUpdate from "./actions/member-update.ts";
import memberDelete from "./actions/member-delete.ts";
import memberAddPlan from "./actions/member-add-plan.ts";
import memberRemovePlan from "./actions/member-remove-plan.ts";
import memberVerifyToken from "./actions/member-verify-token.ts";
import dataTableList from "./actions/data-table-list.ts";
import dataTableGet from "./actions/data-table-get.ts";
import dataRecordCreate from "./actions/data-record-create.ts";
import dataRecordGet from "./actions/data-record-get.ts";
import dataRecordQuery from "./actions/data-record-query.ts";
import dataRecordUpdate from "./actions/data-record-update.ts";
import dataRecordDelete from "./actions/data-record-delete.ts";
import secretKey from "./auth/secret-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    memberList,
    memberGet,
    memberCreate,
    memberUpdate,
    memberDelete,
    memberAddPlan,
    memberRemovePlan,
    memberVerifyToken,
    dataTableList,
    dataTableGet,
    dataRecordCreate,
    dataRecordGet,
    dataRecordQuery,
    dataRecordUpdate,
    dataRecordDelete,
  ],
  auth: [secretKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
