/**
 * 1Password — read and manage vault items through a self-hosted Connect server,
 * and read the account's audit trail through the Events API.
 *
 * This app reads secrets, so `lib/client.ts` explains the handling before
 * anything else: `item-get` redacts by default, `item-field-get` is the narrow
 * path for one value, and no action logs a field value anywhere.
 *
 * The two auth methods reach two different services and are deliberately not
 * combinable in one connection.
 */
import type { AppDefinition } from "@w6w/types";

import connectToken from "./auth/connect-token.ts";
import eventsToken from "./auth/events-token.ts";

import service from "./health/service.ts";
import surface from "./health/surface.ts";
import quota from "./health/quota.ts";

import vaultList from "./actions/vault-list.ts";
import vaultGet from "./actions/vault-get.ts";
import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";
import itemFieldGet from "./actions/item-field-get.ts";
import itemCreate from "./actions/item-create.ts";
import itemUpdate from "./actions/item-update.ts";
import itemDelete from "./actions/item-delete.ts";
import itemFileList from "./actions/item-file-list.ts";
import itemFileGet from "./actions/item-file-get.ts";
import auditEventList from "./actions/audit-event-list.ts";
import itemUsageList from "./actions/item-usage-list.ts";
import signinAttemptList from "./actions/signin-attempt-list.ts";
import tokenIntrospect from "./actions/token-introspect.ts";

const app: AppDefinition = {
  actions: [
    vaultList,
    vaultGet,
    itemList,
    itemGet,
    itemFieldGet,
    itemCreate,
    itemUpdate,
    itemDelete,
    itemFileList,
    itemFileGet,
    auditEventList,
    itemUsageList,
    signinAttemptList,
    tokenIntrospect,
  ],
  auth: [connectToken, eventsToken],
  healthChecks: [service, surface, quota],
};

export default app;
