/**
 * Elastic Email — send email and manage contacts, lists, templates, campaigns,
 * suppressions and statistics over API v4 (`api.elasticemail.com/v4`). Verified 2026-10-06
 * against the vendor OpenAPI 3.0.3 document (`elasticemail.com/api/redoc-spec/api-v4`).
 * See README.md for what is deliberately not covered.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import campaignGet from "./actions/campaign-get.ts";
import campaignList from "./actions/campaign-list.ts";
import contactAdd from "./actions/contact-add.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import emailSend from "./actions/email-send.ts";
import emailSendBulk from "./actions/email-send-bulk.ts";
import emailStatus from "./actions/email-status.ts";
import listAddContacts from "./actions/list-add-contacts.ts";
import listContacts from "./actions/list-contacts.ts";
import listCreate from "./actions/list-create.ts";
import listList from "./actions/list-list.ts";
import listRemoveContacts from "./actions/list-remove-contacts.ts";
import statisticsGet from "./actions/statistics-get.ts";
import suppressionDelete from "./actions/suppression-delete.ts";
import suppressionGet from "./actions/suppression-get.ts";
import suppressionList from "./actions/suppression-list.ts";
import templateGet from "./actions/template-get.ts";
import templateList from "./actions/template-list.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    campaignGet,
    campaignList,
    contactAdd,
    contactDelete,
    contactGet,
    contactList,
    emailSend,
    emailSendBulk,
    emailStatus,
    listAddContacts,
    listContacts,
    listCreate,
    listList,
    listRemoveContacts,
    statisticsGet,
    suppressionDelete,
    suppressionGet,
    suppressionList,
    templateGet,
    templateList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
