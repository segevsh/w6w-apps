/**
 * iClosed — sales-call scheduling and CRM for closers: contacts, booked calls,
 * deals, products, transactions and custom fields, over the iClosed public API
 * v1 (`public.api.iclosed.io`).
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document and guide pages at
 * `developer.iclosed.io`, plus live probes. The findings that shaped the design:
 *
 *  1. **The key prefix is `iclosed_`** — the spec says `iclosed-`, and the wire
 *     answers a hyphenated key as if it were absent (`lib/client.ts`).
 *  2. **A 401 means three things, told apart only by `message`** — missing/
 *     malformed, unknown/revoked, expired (`auth/api-key.ts`).
 *  3. **No consistent envelope**; and `GET /eventCalls` is documented as 201.
 *  4. **Per-endpoint 10-second rate windows** (20 Startup / 100 Business) with
 *     no rate-limit headers; the 429 body carries `retryAfter`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactNoteList from "./actions/contact-note-list.ts";
import contactNoteCreate from "./actions/contact-note-create.ts";
import fieldList from "./actions/field-list.ts";
import fieldListAll from "./actions/field-list-all.ts";
import contactStageList from "./actions/contact-stage-list.ts";
import fieldCreate from "./actions/field-create.ts";
import fieldUpdate from "./actions/field-update.ts";
import fieldAnswerSet from "./actions/field-answer-set.ts";
import fieldAnswerBulkSet from "./actions/field-answer-bulk-set.ts";
import dealList from "./actions/deal-list.ts";
import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import callList from "./actions/call-list.ts";
import callCreate from "./actions/call-create.ts";
import callReschedule from "./actions/call-reschedule.ts";
import callCancel from "./actions/call-cancel.ts";
import callSlotFreeSet from "./actions/call-slot-free-set.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventStatusSet from "./actions/event-status-set.ts";
import eventSlotsTroubleshoot from "./actions/event-slots-troubleshoot.ts";
import eventDatesList from "./actions/event-dates-list.ts";
import productList from "./actions/product-list.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import outcomeSet from "./actions/outcome-set.ts";
import transactionList from "./actions/transaction-list.ts";
import transactionCreate from "./actions/transaction-create.ts";
import transactionUpdate from "./actions/transaction-update.ts";
import transactionDelete from "./actions/transaction-delete.ts";
import userAvailabilityList from "./actions/user-availability-list.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactNoteList,
    contactNoteCreate,
    fieldList,
    fieldListAll,
    contactStageList,
    fieldCreate,
    fieldUpdate,
    fieldAnswerSet,
    fieldAnswerBulkSet,
    dealList,
    dealCreate,
    dealUpdate,
    callList,
    callCreate,
    callReschedule,
    callCancel,
    callSlotFreeSet,
    eventList,
    eventGet,
    eventStatusSet,
    eventSlotsTroubleshoot,
    eventDatesList,
    productList,
    productCreate,
    productUpdate,
    outcomeSet,
    transactionList,
    transactionCreate,
    transactionUpdate,
    transactionDelete,
    userAvailabilityList,
    userList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
