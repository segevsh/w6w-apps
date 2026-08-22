/**
 * WorkOS — the enterprise features a B2B product has to ship before an
 * enterprise will buy it: SSO, SCIM user provisioning, audit logs and the
 * Admin Portal that lets a customer configure all three themselves.
 *
 * See `lib/client.ts` for the shape of the API and `README.md` for the
 * distinctions that decide whether a workflow built on it is correct — chiefly
 * that a directory **listing** cannot see a deletion and the **event stream**
 * can.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import environment from "./health/environment.ts";
import quota from "./health/quota.ts";

import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";
import organizationCreate from "./actions/organization-create.ts";
import organizationUpdate from "./actions/organization-update.ts";
import organizationDelete from "./actions/organization-delete.ts";
import connectionList from "./actions/connection-list.ts";
import connectionGet from "./actions/connection-get.ts";
import portalLinkCreate from "./actions/portal-link-create.ts";
import directoryList from "./actions/directory-list.ts";
import directoryUserList from "./actions/directory-user-list.ts";
import directoryUserGet from "./actions/directory-user-get.ts";
import directoryGroupList from "./actions/directory-group-list.ts";
import eventList from "./actions/event-list.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import organizationMembershipList from "./actions/organization-membership-list.ts";
import organizationMembershipCreate from "./actions/organization-membership-create.ts";
import invitationSend from "./actions/invitation-send.ts";
import auditLogEventCreate from "./actions/audit-log-event-create.ts";
import auditLogExportCreate from "./actions/audit-log-export-create.ts";
import auditLogExportGet from "./actions/audit-log-export-get.ts";

const app: AppDefinition = {
  actions: [
    organizationList,
    organizationGet,
    organizationCreate,
    organizationUpdate,
    organizationDelete,
    connectionList,
    connectionGet,
    portalLinkCreate,
    directoryList,
    directoryUserList,
    directoryUserGet,
    directoryGroupList,
    eventList,
    userList,
    userGet,
    userCreate,
    userUpdate,
    organizationMembershipList,
    organizationMembershipCreate,
    invitationSend,
    auditLogEventCreate,
    auditLogExportCreate,
    auditLogExportGet,
  ],
  auth: [apiKey],
  healthChecks: [service, environment, quota],
};

export default app;
