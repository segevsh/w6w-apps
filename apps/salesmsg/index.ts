/**
 * Salesmsg — business SMS: contacts, conversations, messages, tags, inboxes and numbers over the
 * Salesmsg public API v2.3 (`api.salesmessage.com/pub/v2.3`).
 *
 * Every path, verb, parameter and scope was read off the vendor's OpenAPI 3.0 document
 * (`https://app.salesmessage.com/api/docs/salesmessage-public-api-v2.3.json`, 416 operations, fetched
 * 2026-10-05) and the live host was probed unauthenticated the same day. 27 operations are
 * covered; what is left out, and why, is in the README.
 *
 * The findings that shaped the design:
 *
 *  1. **Writes are mostly query parameters** (`lib/client.ts`). The document puts the fields of
 *     create-contact, send-message, create-tag, start-conversation and reassign in the query
 *     string and declares no body; only update-contact and list-contacts take JSON.
 *  2. **Credential failures do not share a status or a body** (`auth/access-token.ts`). A missing
 *     token is `401 {"message":"Unauthorized"}`, a malformed one `403` on one route and `500` on
 *     another, so the auth probe reads the body's wording.
 *  3. **No idempotency key anywhere**, so every send and create is `idempotent: false`.
 *  4. **OAuth2 is left out** on purpose — the README says why.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import userGet from "./actions/user-get.ts";
import organizationGet from "./actions/organization-get.ts";
import memberList from "./actions/member-list.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import numberList from "./actions/number-list.ts";
import contactList from "./actions/contact-list.ts";
import contactSearch from "./actions/contact-search.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactOptOut from "./actions/contact-opt-out.ts";
import contactOptIn from "./actions/contact-opt-in.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationStart from "./actions/conversation-start.ts";
import conversationClose from "./actions/conversation-close.ts";
import conversationOpen from "./actions/conversation-open.ts";
import conversationAssign from "./actions/conversation-assign.ts";
import messageSend from "./actions/message-send.ts";
import messageSendToConversation from "./actions/message-send-to-conversation.ts";
import messageList from "./actions/message-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGet,
    organizationGet,
    memberList,
    teamList,
    teamGet,
    numberList,
    contactList,
    contactSearch,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactOptOut,
    contactOptIn,
    tagList,
    tagCreate,
    contactTagAdd,
    contactTagRemove,
    conversationList,
    conversationGet,
    conversationStart,
    conversationClose,
    conversationOpen,
    conversationAssign,
    messageSend,
    messageSendToConversation,
    messageList,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
