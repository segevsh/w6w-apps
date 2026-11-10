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
 * Deliberately absent: the
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
import conversationCreated from "./triggers/conversation-created.ts";
import contactCreated from "./triggers/contact-created.ts";
import newContact from "./triggers/new-contact.ts";
import contactUpdated from "./triggers/contact-updated.ts";
import contactDeleted from "./triggers/contact-deleted.ts";
import companyCreated from "./triggers/company-created.ts";
import companyUpdated from "./triggers/company-updated.ts";
import companyDeleted from "./triggers/company-deleted.ts";
import newConversation from "./triggers/new-conversation.ts";
import conversationUserReplied from "./triggers/conversation-user-replied.ts";
import conversationAdminReplied from "./triggers/conversation-admin-replied.ts";
import conversationClosed from "./triggers/conversation-closed.ts";
import conversationAssigned from "./triggers/conversation-assigned.ts";
import conversationDeleted from "./triggers/conversation-deleted.ts";
import newNote from "./triggers/new-note.ts";
import newTag from "./triggers/new-tag.ts";
import anyEvent from "./triggers/any-event.ts";

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
  triggers: [
    conversationCreated,
    contactCreated,
    newContact,
    contactUpdated,
    contactDeleted,
    companyCreated,
    companyUpdated,
    companyDeleted,
    newConversation,
    conversationUserReplied,
    conversationAdminReplied,
    conversationClosed,
    conversationAssigned,
    conversationDeleted,
    newNote,
    newTag,
    anyEvent,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
