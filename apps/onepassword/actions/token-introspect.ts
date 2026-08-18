import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `GET /api/auth/introspect` — what this Events token is allowed to read.
 *
 * ## The answer to "why is that endpoint 403ing"
 *
 * Events Reporting grants sign-in attempts, item usages and audit events
 * **independently**. A token missing one returns 403 on that endpoint alone and
 * works perfectly on the others, which looks like an intermittent failure until
 * somebody realises it is not.
 *
 * `Features` lists what was granted, and running this is faster than reasoning
 * about it.
 *
 * It also reports the token's issue time and uuid, which is what identifies it
 * in the account's own integrations list when the time comes to rotate it.
 */
const action: ActionDefinition = {
  key: "token-introspect",
  type: "read",
  resource: "token",
  title: "Inspect the Events token",
  description:
    "What this token may read. Grants are per event kind, so a 403 on one endpoint while the " +
    "others work is scope rather than a fault.",
  params: [],
  output: [
    { key: "features", type: "array", label: "The event kinds granted" },
    { key: "canReadAuditEvents", type: "boolean", label: "Whether `audit-event-list` will work" },
    { key: "canReadItemUsages", type: "boolean", label: "Whether `item-usage-list` will work" },
    {
      key: "canReadSignInAttempts",
      type: "boolean",
      label: "Whether `signin-attempt-list` will work",
    },
    { key: "uuid", type: "string", label: "The token's id, for finding it in the account" },
    { key: "issuedAt", type: "string", label: "When it was issued" },
  ],

  async execute(_input, ctx) {
    const client = new OnePasswordClient(ctx);
    const host = client.requireEvents("token-introspect");

    const result = await client.request<{
      Features?: string[];
      UUID?: string;
      IssuedAt?: string;
    }>(host, "/api/auth/introspect");

    const features = result?.Features ?? [];
    const has = (name: string) => features.some((feature) => feature.toLowerCase().includes(name));

    return {
      features,
      canReadAuditEvents: has("auditevent"),
      canReadItemUsages: has("itemusage"),
      canReadSignInAttempts: has("signinattempt"),
      uuid: result?.UUID,
      issuedAt: result?.IssuedAt,
    };
  },
};

export default action;
