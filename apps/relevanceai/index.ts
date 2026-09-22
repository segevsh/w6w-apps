/**
 * Relevance AI — trigger and manage agents and tools over the vendor's own
 * `api-<region_id>.stack.tryrelevance.com/latest` API.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against Relevance AI's live, unauthenticated OpenAPI
 * document (`GET https://api-f1db6c.stack.tryrelevance.com/latest/openapi_schema.json`
 * — 11,792,917 bytes, `openapi: 3.0.0`, 527 paths, discovered from the region
 * host's own Scalar `/latest/documentation` shell) plus live HTTP probes against
 * the same host and against `status.relevanceai.com`. `relevanceai.com/docs/
 * api-reference/*` is deliberately unused: those pages are Mintlify's unfilled
 * template, confirmed by diffing the raw `.mdx` against Mintlify's stock sample
 * content.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **There is no API host.** The OpenAPI document declares one server,
 *     `{"url": "/latest"}`, with no hostname, and every request goes to a
 *     per-organization `api-<region_id>.stack.tryrelevance.com` whose region id
 *     the user reads off their own API Keys page (`lib/client.ts`,
 *     `auth/api-token.ts`). The manifest therefore allowlists the wildcard
 *     `*.stack.tryrelevance.com`, the way Zendesk's allowlists `*.zendesk.com`.
 *  2. **Auth is one opaque key in one unprefixed header**
 *     (`auth/api-token.ts`). `AuthorizationHeader` is `apiKey` in
 *     `Authorization`, and the key already contains its `project_id:secret`
 *     shape, so it is sent verbatim — no `Bearer`.
 *  3. **A wrong key is not a 401** (`auth/api-token.ts`). Measured live: a
 *     missing header is `401 authorization_header_missing`, a syntactically
 *     plausible wrong key is **400** `unset_error_type`. Credential validity is
 *     read from the body, never from the status code.
 *  4. **The vendor caps its own supported surface at this app's 12 actions**
 *     (`README.md`, "Deliberately not covered"): "The Relevance AI API is
 *     officially supported only for triggering Agents and Tools. All other usage
 *     is currently unsupported." The other ~515 paths in that schema are real,
 *     and out of scope by the vendor's own statement rather than by omission.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import agentTrigger from "./actions/agent-trigger.ts";
import agentGet from "./actions/agent-get.ts";
import agentList from "./actions/agent-list.ts";
import agentRunCancel from "./actions/agent-run-cancel.ts";
import conversationList from "./actions/conversation-list.ts";

import toolTrigger from "./actions/tool-trigger.ts";
import toolTriggerAsync from "./actions/tool-trigger-async.ts";
import toolJobPoll from "./actions/tool-job-poll.ts";
import toolJobCancel from "./actions/tool-job-cancel.ts";
import toolGet from "./actions/tool-get.ts";
import toolList from "./actions/tool-list.ts";

import authInfoGet from "./actions/auth-info-get.ts";

import service from "./health/service.ts";
import host from "./health/host.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Agents
    agentTrigger,
    agentGet,
    agentList,
    agentRunCancel,
    conversationList,
    // Tools (the API's "studios")
    toolTrigger,
    toolTriggerAsync,
    toolJobPoll,
    toolJobCancel,
    toolGet,
    toolList,
    // Identity
    authInfoGet,
  ],
  // One auth method, because Relevance AI offers exactly one for API access: an
  // opaque API key plus the region id of the organization it belongs to.
  auth: [apiToken],
  healthChecks: [service, host, quota],
} satisfies AppDefinition;
