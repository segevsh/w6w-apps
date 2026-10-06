/**
 * Synthflow AI — voice AI agents: place and monitor phone calls (single and batch), read the
 * agent, phone-number, voice, knowledge-base, action and contact catalogs behind them, manage
 * contacts and run text chats, over Synthflow's Platform API (`/v2`).
 *
 * Verified 2026-10-05 against `https://docs.synthflow.ai/openapi.json` (OpenAPI 3.1, 69 paths,
 * no deprecated operation) and live probes of the three API hosts and `status.synthflow.ai`.
 *
 * Findings that shaped the design:
 *
 *  1. **Three clusters, one key space each** (`lib/client.ts`, `auth/api-key.ts`). Global, US and
 *     EU hosts serve the same paths; a workspace lives on one forever and a key only works there.
 *     Region is therefore a connection field, and `network.allow` lists exactly the three hosts.
 *  2. **A `{status, response}` envelope with exceptions** (`lib/client.ts`). `GET /numbers/{slug}`
 *     answers the object bare; deletes answer `{status}` alone; `GET /calls/{id}` answers a
 *     one-element `calls` array rather than the call itself.
 *  3. **Three pagination styles.** `limit`/`offset` with a `pagination` block for most lists;
 *     `total`/`page_size`/`page_number` siblings on contacts and phone books; a `cursor` on chats.
 *  4. **`workspace` is a required query parameter** on `/numbers` and `/voices`, and nowhere else.
 *  5. **No usage or rate-limit surface** (`health/quota.ts`) — quota is a declared absence.
 *
 * Agent/action/knowledge-base/simulation authoring is deliberately left to the dashboard — see
 * the README for the full list of what is out.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import assistantList from "./actions/assistant-list.ts";
import assistantGet from "./actions/assistant-get.ts";
import assistantDelete from "./actions/assistant-delete.ts";
import callMake from "./actions/call-make.ts";
import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import batchCallCreate from "./actions/batch-call-create.ts";
import batchCallList from "./actions/batch-call-list.ts";
import batchCallGet from "./actions/batch-call-get.ts";
import batchCallListRecipients from "./actions/batch-call-list-recipients.ts";
import batchCallPause from "./actions/batch-call-pause.ts";
import batchCallResume from "./actions/batch-call-resume.ts";
import batchCallCancel from "./actions/batch-call-cancel.ts";
import phoneNumberList from "./actions/phone-number-list.ts";
import phoneNumberGet from "./actions/phone-number-get.ts";
import voiceList from "./actions/voice-list.ts";
import knowledgeBaseList from "./actions/knowledge-base-list.ts";
import knowledgeBaseGet from "./actions/knowledge-base-get.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import chatCreate from "./actions/chat-create.ts";
import chatSendMessage from "./actions/chat-send-message.ts";
import chatGet from "./actions/chat-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    assistantList,
    assistantGet,
    assistantDelete,
    callMake,
    callList,
    callGet,
    batchCallCreate,
    batchCallList,
    batchCallGet,
    batchCallListRecipients,
    batchCallPause,
    batchCallResume,
    batchCallCancel,
    phoneNumberList,
    phoneNumberGet,
    voiceList,
    knowledgeBaseList,
    knowledgeBaseGet,
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    chatCreate,
    chatSendMessage,
    chatGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
