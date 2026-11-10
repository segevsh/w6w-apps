/**
 * Zendesk Support — w6w port of n8n's `Zendesk` node.
 *
 * Covers the ticket, user, organization and ticket-field resources.
 *
 * The thing that shapes this app is that **every account has its own host** —
 * `acme.zendesk.com`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.zendesk.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the subdomain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Triggers are signed event-subscription webhooks (`lib/triggers.ts`): `onSubscribe` registers
 * the webhook through the Webhooks API and keeps its signing secret in the subscription state.
 * Named triggers cover tickets, users and organizations; `any-event` takes a list of event types.
 *
 * Deliberately absent: Zendesk's automation/trigger/view admin objects.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import ticketCreate from "./actions/ticket-create.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketAddComment from "./actions/ticket-add-comment.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketGetMany from "./actions/ticket-get-many.ts";
import ticketSearch from "./actions/ticket-search.ts";

import userCreate from "./actions/user-create.ts";
import userCreateOrUpdate from "./actions/user-create-or-update.ts";
import userGet from "./actions/user-get.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";
import userSearch from "./actions/user-search.ts";

import organizationCreate from "./actions/organization-create.ts";
import organizationGet from "./actions/organization-get.ts";
import organizationGetMany from "./actions/organization-get-many.ts";

import ticketFieldGetMany from "./actions/ticket-field-get-many.ts";

import newTicket from "./triggers/new-ticket.ts";
import ticketStatusChanged from "./triggers/ticket-status-changed.ts";
import ticketCommentAdded from "./triggers/ticket-comment-added.ts";
import ticketDeleted from "./triggers/ticket-deleted.ts";
import ticketPriorityChanged from "./triggers/ticket-priority-changed.ts";
import ticketAssigneeChanged from "./triggers/ticket-assignee-changed.ts";
import newUser from "./triggers/new-user.ts";
import userDeleted from "./triggers/user-deleted.ts";
import userDetailsChanged from "./triggers/user-details-changed.ts";
import newOrganization from "./triggers/new-organization.ts";
import organizationDeleted from "./triggers/organization-deleted.ts";
import anyEvent from "./triggers/any-event.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import account from "./health/account.ts";

export default {
  actions: [
    // ticket
    ticketCreate,
    ticketGet,
    ticketUpdate,
    ticketAddComment,
    ticketDelete,
    ticketGetMany,
    ticketSearch,
    // user
    userCreate,
    userCreateOrUpdate,
    userGet,
    userUpdate,
    userDelete,
    userSearch,
    // organization
    organizationCreate,
    organizationGet,
    organizationGetMany,
    // ticket field
    ticketFieldGetMany,
  ],
  triggers: [
    newTicket,
    ticketStatusChanged,
    ticketCommentAdded,
    ticketDeleted,
    ticketPriorityChanged,
    ticketAssigneeChanged,
    newUser,
    userDeleted,
    userDetailsChanged,
    newOrganization,
    organizationDeleted,
    anyEvent,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota, account],
} satisfies AppDefinition;
