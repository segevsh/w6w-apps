/**
 * Tidio: the OpenAPI at `api.tidio.com` (contacts, conversations, tickets, operators, Lyro).
 *
 * Every path, verb, parameter and body field was read on 2026-10-06 from Tidio's own reference
 * (`developers.tidio.com/reference/*.md`, each embedding its OpenAPI definition). Findings:
 *
 *  1. **Two headers are the credential** (`X-Tidio-Openapi-Client-Id` `ci_...` and
 *     `X-Tidio-Openapi-Client-Secret` `cs_...`), modelled as one auth method with two secret
 *     fields.
 *  2. **A version `Accept` header is mandatory** (`application/json; version=1`).
 *  3. **Plan-gated.** OpenAPI needs Plus or Premium (Products endpoints need paid Lyro and are
 *     left out); lower plans get `403 api_access_disabled`.
 *  4. **Cursor pagination**, with `meta.cursor` null on the last page; writes mostly answer 204.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";
import projectGet from "./actions/project-get.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactBatchCreate from "./actions/contact-batch-create.ts";
import contactBatchUpdate from "./actions/contact-batch-update.ts";
import contactViewedPagesList from "./actions/contact-viewed-pages-list.ts";
import contactMessageList from "./actions/contact-message-list.ts";
import contactMessageSend from "./actions/contact-message-send.ts";
import contactPropertyList from "./actions/contact-property-list.ts";
import operatorList from "./actions/operator-list.ts";
import departmentList from "./actions/department-list.ts";
import ticketList from "./actions/ticket-list.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketCreate from "./actions/ticket-create.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketReply from "./actions/ticket-reply.ts";
import ticketTagList from "./actions/ticket-tag-list.ts";
import ticketCustomFieldList from "./actions/ticket-custom-field-list.ts";
import lyroDataSourceList from "./actions/lyro-data-source-list.ts";
import lyroQaCreate from "./actions/lyro-qa-create.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    projectGet,
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactBatchCreate,
    contactBatchUpdate,
    contactViewedPagesList,
    contactMessageList,
    contactMessageSend,
    contactPropertyList,
    operatorList,
    departmentList,
    ticketList,
    ticketGet,
    ticketCreate,
    ticketUpdate,
    ticketDelete,
    ticketReply,
    ticketTagList,
    ticketCustomFieldList,
    lyroDataSourceList,
    lyroQaCreate,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
