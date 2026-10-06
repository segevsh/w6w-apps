/**
 * Loop Returns — the Shopify returns and exchanges platform, over the Loop API v1
 * (`https://api.loopreturns.com/api/v1`).
 *
 * Every path, verb, parameter and enum here was read on 2026-10-06 from Loop's own OpenAPI 3.1
 * documents under `docs.loopreturns.com/openapi/` (returns, orders, customers, destinations,
 * labels, fraud-reports, outgoing-webhooks, bulk-operations) and checked against live probes of
 * `api.loopreturns.com`. No spec carries a deprecation or sunset notice.
 *
 * Findings that shaped the design:
 *
 *  1. **Failures arrive with HTTP 200** (`lib/client.ts`). Cancel, flag, close, remove and process
 *     answer `true` on success and `{"errors": {"message": …}}` — with status 200 — on refusal;
 *     return details answers `{"error": {"message"}}` with 200 when nothing matches. Success is
 *     decided from the body.
 *  2. **The credential header is `X-Authorization`**, not `Authorization` (`auth/api-key.ts`).
 *  3. **Two error envelopes on the same host**: the gateway's
 *     `{"error": {"http_code": "GEN-UNAUTHORIZED"}}` and the Returns API's `{"errors": "…"}`.
 *  4. **`process` only queues.** `true` means Loop accepted the work, not that it finished.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import returnList from "./actions/return-list.ts";
import returnGet from "./actions/return-get.ts";
import returnCancel from "./actions/return-cancel.ts";
import returnFlag from "./actions/return-flag.ts";
import returnClose from "./actions/return-close.ts";
import returnProcess from "./actions/return-process.ts";
import returnRemoveLineItems from "./actions/return-remove-line-items.ts";
import returnNotesList from "./actions/return-notes-list.ts";
import returnNoteCreate from "./actions/return-note-create.ts";
import returnAsnReport from "./actions/return-asn-report.ts";
import returnDeepLinkCreate from "./actions/return-deep-link-create.ts";
import returnQrCreate from "./actions/return-qr-create.ts";
import returnLabelGenerate from "./actions/return-label-generate.ts";
import fraudReportCreate from "./actions/fraud-report-create.ts";
import fraudReportDelete from "./actions/fraud-report-delete.ts";
import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderGetByExternalId from "./actions/order-get-by-external-id.ts";
import orderReturnEligibility from "./actions/order-return-eligibility.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerGetByExternalId from "./actions/customer-get-by-external-id.ts";
import customerUpsert from "./actions/customer-upsert.ts";
import destinationList from "./actions/destination-list.ts";
import destinationGet from "./actions/destination-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import labelRequestList from "./actions/label-request-list.ts";
import bulkOperationList from "./actions/bulk-operation-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    returnList,
    returnGet,
    returnCancel,
    returnFlag,
    returnClose,
    returnProcess,
    returnRemoveLineItems,
    returnNotesList,
    returnNoteCreate,
    returnAsnReport,
    returnDeepLinkCreate,
    returnQrCreate,
    returnLabelGenerate,
    fraudReportCreate,
    fraudReportDelete,
    orderList,
    orderGet,
    orderGetByExternalId,
    orderReturnEligibility,
    customerList,
    customerGet,
    customerGetByExternalId,
    customerUpsert,
    destinationList,
    destinationGet,
    webhookList,
    webhookCreate,
    webhookDelete,
    labelRequestList,
    bulkOperationList,
  ],
  // API key only. Loop also defines an OAuth2 flow, but only for the programmatic-webhooks API
  // (scope `developer_tools`); every other endpoint takes the key.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
