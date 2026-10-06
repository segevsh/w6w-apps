/**
 * SignWell — send documents and templates for e-signature, track and remind recipients, run bulk
 * sends, and fetch completed documents.
 *
 * Every path, parameter, required body field and response shape was taken from SignWell's own
 * OpenAPI 3.0.1 document (`https://developers.signwell.com/openapi/resources-and-endpoints.json`,
 * ~229KB, fetched 2026-10-06); auth and error behaviour were measured live. See `lib/client.ts`.
 *
 * ## What the API has no list endpoint for
 *
 * Documents and templates are read by id only — SignWell exposes no `GET /documents` or
 * `GET /document_templates`. Keep the ids a create returns (or learn them from a webhook).
 *
 * ## Deliberately not covered (see README)
 *
 * Update Authentication, the API-application endpoints, the bulk-send CSV helpers and documents
 * listing, and the Mexico NOM-151 certificate.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import documentCreate from "./actions/document-create.ts";
import documentCreateFromTemplate from "./actions/document-create-from-template.ts";
import documentGet from "./actions/document-get.ts";
import documentSend from "./actions/document-send.ts";
import documentDelete from "./actions/document-delete.ts";
import documentCompletedPdf from "./actions/document-completed-pdf.ts";
import documentRemind from "./actions/document-remind.ts";
import documentUpdateRecipients from "./actions/document-update-recipients.ts";
import templateGet from "./actions/template-get.ts";
import templateCreate from "./actions/template-create.ts";
import templateDelete from "./actions/template-delete.ts";
import bulkSendList from "./actions/bulk-send-list.ts";
import bulkSendGet from "./actions/bulk-send-get.ts";
import bulkSendCreate from "./actions/bulk-send-create.ts";
import accountGet from "./actions/account-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // documents
    documentCreate,
    documentCreateFromTemplate,
    documentGet,
    documentSend,
    documentDelete,
    documentCompletedPdf,
    documentRemind,
    documentUpdateRecipients,
    // templates
    templateGet,
    templateCreate,
    templateDelete,
    // bulk sends
    bulkSendList,
    bulkSendGet,
    bulkSendCreate,
    // account + webhooks
    accountGet,
    webhookList,
    webhookCreate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
