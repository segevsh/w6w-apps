/**
 * Freshdesk — w6w port of n8n's `Freshdesk` node.
 *
 * Covers the ticket, contact and company resources.
 *
 * The thing that shapes this app is that **every account has its own host** —
 * `acme.freshdesk.com`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.freshdesk.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Deliberately absent: agents, groups, products and canned-response admin
 * objects (n8n's node only surfaces these as `loadOptions` dropdowns, not as
 * standalone operations), and the webhook/trigger surface (a Trigger, not an
 * Action).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import ticketCreate from "./actions/ticket-create.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketGetMany from "./actions/ticket-get-many.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketAddNote from "./actions/ticket-add-note.ts";
import ticketAddReply from "./actions/ticket-add-reply.ts";

import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactGetMany from "./actions/contact-get-many.ts";
import contactUpdate from "./actions/contact-update.ts";

import companyGet from "./actions/company-get.ts";
import companyGetMany from "./actions/company-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    // ticket
    ticketCreate,
    ticketGet,
    ticketGetMany,
    ticketUpdate,
    ticketDelete,
    ticketAddNote,
    ticketAddReply,
    // contact
    contactCreate,
    contactGet,
    contactGetMany,
    contactUpdate,
    // company
    companyGet,
    companyGetMany,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;
