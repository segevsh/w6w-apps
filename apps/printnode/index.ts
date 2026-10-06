/**
 * PrintNode — cloud printing. Send documents to printers attached to computers running the
 * PrintNode Client, track print job state, read scales, and manage webhooks, over the
 * PrintNode API (`api.printnode.com`).
 *
 * Every path, verb, parameter and field here was verified on 2026-10-06 against PrintNode's
 * own reference (`https://www.printnode.com/en/docs/api/curl`) plus live unauthenticated probes.
 *
 * Findings that shaped the design:
 *
 *  1. **Unusual response shapes** (`lib/client.ts`): lists are bare arrays (total only in the
 *     `Records-Total` header), `POST /printjobs` answers a bare integer, deletes answer the
 *     affected ids, `/printjobs/states` is an array of arrays, webhook writes answer the whole
 *     webhook list.
 *  2. **Webhooks return their `secret` in clear** on every read and write; it is stripped.
 *  3. **The probe is `GET /noop`** (`auth/api-key.ts`), not `/whoami` (personal data), and the
 *     verdict comes from the body: the live API answers 401 with code `BadRequest`, not the
 *     documented `InvalidCredentials`.
 *  4. **Bare `DELETE /computers` and `DELETE /printjobs` wipe everything**; no action builds them.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import accountGet from "./actions/account-get.ts";
import computerList from "./actions/computer-list.ts";
import computerGet from "./actions/computer-get.ts";
import computerDelete from "./actions/computer-delete.ts";
import printerList from "./actions/printer-list.ts";
import printerGet from "./actions/printer-get.ts";
import printjobCreate from "./actions/printjob-create.ts";
import printjobList from "./actions/printjob-list.ts";
import printjobGet from "./actions/printjob-get.ts";
import printjobCancel from "./actions/printjob-cancel.ts";
import printerPrintjobsCancel from "./actions/printer-printjobs-cancel.ts";
import printjobStatesList from "./actions/printjob-states-list.ts";
import scaleList from "./actions/scale-list.ts";
import scaleGet from "./actions/scale-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    computerList,
    computerGet,
    computerDelete,
    printerList,
    printerGet,
    printjobCreate,
    printjobList,
    printjobGet,
    printjobCancel,
    printerPrintjobsCancel,
    printjobStatesList,
    scaleList,
    scaleGet,
    webhookList,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
