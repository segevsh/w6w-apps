/**
 * Intercom — contacts, companies, conversations, notes and tags over the
 * Intercom REST API (https://api.intercom.io).
 *
 * Two things worth knowing:
 *
 *   - **Listing contacts is a POST, not a GET.** Intercom lists contacts through
 *     its Search API (`POST /contacts/search`) with a query object and cursor
 *     pagination, so `contact-search` is the "get many" for contacts.
 *   - **Every request pins `Intercom-Version`.** `lib/client.ts` sends a recent
 *     stable version on every call so response shapes stay predictable; the auth
 *     `test` and `quota` probes send it too.
 *
 * Deliberately absent: webhook triggers (a Trigger, not an Action) and the
 * legacy `/users` + `/leads` endpoints the old n8n node used — both are folded
 * into `/contacts` on the modern API.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import companyCreateOrUpdate from "./actions/company-create-or-update.ts";
import companyGet from "./actions/company-get.ts";
import companyGetMany from "./actions/company-get-many.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationGetMany from "./actions/conversation-get-many.ts";
import conversationReply from "./actions/conversation-reply.ts";
import noteCreate from "./actions/note-create.ts";
import noteGetMany from "./actions/note-get-many.ts";
import tagGetMany from "./actions/tag-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contact
    contactCreate,
    contactGet,
    contactSearch,
    contactUpdate,
    contactDelete,
    // company
    companyCreateOrUpdate,
    companyGet,
    companyGetMany,
    // conversation
    conversationGet,
    conversationGetMany,
    conversationReply,
    // note
    noteCreate,
    noteGetMany,
    // tag
    tagGetMany,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
