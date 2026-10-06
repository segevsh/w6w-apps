/**
 * Kudosity — A2P messaging over the Transmit Message API v2 (`api.transmitmessage.com`): SMS, MMS,
 * WhatsApp and RCS sends, message history, RCS reachability checks, webhooks and sender
 * registrations. Verified 2026-10-06 against developers.kudosity.com's per-endpoint OpenAPI
 * fragments and live probes of the gateway.
 *
 * Findings that shaped it:
 *  1. Two response families share `/v2` (`lib/client.ts`): SMS/MMS/webhooks answer the bare
 *     resource with `{"error": "text"}`; WhatsApp/RCS/senders answer `{data, meta}` with RFC 9457
 *     errors. The gateway's own 401 is a third shape, `{"status": "..."}`.
 *  2. A missing key and a wrong key answer different `status` strings on the same 401, so the
 *     credential verdict is the documented `webhooks` array, never the status code.
 *  3. Pagination differs per family: page numbers (SMS, senders) versus opaque cursors
 *     (WhatsApp, RCS).
 *  4. `PUT /v2/webhook/{id}` is a full replace; omitted fields reset to defaults.
 *
 * Not covered: the legacy Transmit SMS v1 API (HTTP Basic key and secret, a separate credential),
 * sender-registration creation, verification and deletion, and CSV export of SMS lists.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import smsSend from "./actions/sms-send.ts";
import smsGet from "./actions/sms-get.ts";
import smsList from "./actions/sms-list.ts";
import mmsSend from "./actions/mms-send.ts";
import mmsGet from "./actions/mms-get.ts";
import whatsappSend from "./actions/whatsapp-send.ts";
import whatsappGet from "./actions/whatsapp-get.ts";
import whatsappList from "./actions/whatsapp-list.ts";
import rcsSend from "./actions/rcs-send.ts";
import rcsGet from "./actions/rcs-get.ts";
import rcsList from "./actions/rcs-list.ts";
import rcsCapabilityCheck from "./actions/rcs-capability-check.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import senderRegistrationList from "./actions/sender-registration-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    smsSend,
    smsGet,
    smsList,
    mmsSend,
    mmsGet,
    whatsappSend,
    whatsappGet,
    whatsappList,
    rcsSend,
    rcsGet,
    rcsList,
    rcsCapabilityCheck,
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    senderRegistrationList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
