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
 * Deliberately absent: the webhook/trigger surface (a Trigger, not an Action),
 * and Zendesk's automation/trigger/view admin objects.
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
  auth: [apiToken, oauth2],
} satisfies AppDefinition;
