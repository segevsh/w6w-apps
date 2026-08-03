import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  flowNs: string;
}

/**
 * Send an existing Manychat Automation (Flow) to a subscriber.
 *
 * `POST /fb/sending/sendFlow` with `{ subscriber_id, flow_ns }` →
 * `{ status: "success" }`.
 *
 * ## Usually the right send action
 *
 * Between this and `send-content`, this is the one to reach for by default, for
 * three reasons that are all visible in the spec:
 *
 *   1. **The content is authored in Manychat**, by whoever owns the messaging —
 *     so it can be edited, translated and A/B tested without touching the
 *     workflow. `send-content` hard-codes the message into the automation graph.
 *   2. **`flow_ns` is channel-agnostic.** A Flow knows how to render itself on
 *     whichever channel the subscriber is on; a `send-content` payload is written
 *     against one channel's block vocabulary.
 *   3. **Manychat's own community guidance**, when `sendContent` misbehaves on
 *     WhatsApp, is to use `sendFlow` instead. (Forum, not primary documentation —
 *     flagged as such.)
 *
 * ## `flow_ns`, not a numeric id
 *
 * The spec calls it the "Automation namespace — unique Automation ID" and types
 * it `string`. Get it from `list-flows`; there is no other published way to
 * discover one, and there is no send-by-flow-name variant.
 *
 * ## Two rate limits, and the second one is per-person
 *
 *     "***Limit:*** 20 queries per second,
 *      100 queries per a given subscriber per hour"
 *
 * The per-subscriber hourly cap is the only consumable allowance anywhere in this
 * API. It is not readable — no endpoint reports it, which is part of why the
 * `quota` health check is declared unavailable — so a fan-out that re-sends to
 * the same person in a loop can exhaust it invisibly.
 *
 * ## The messaging window still applies
 *
 * `sendFlow` takes **no `message_tag` and no `otn_topic_name`** — unlike
 * `sendContent`, which takes both. Nothing in the spec says the 24-hour window is
 * waived here; the parameters that open it are simply absent from this endpoint.
 * Read README.md "The 24-hour window is real" before scheduling a send that may
 * land outside it.
 *
 * `idempotent: false` — a retry sends the automation a second time, and a person
 * receives two messages. Never retry-safe.
 */
const sendFlow: ActionDefinition<Input> = {
  key: "send-flow",
  type: "perform",
  idempotent: false,
  resource: "sending",
  title: "Send Flow",
  description:
    "Send an existing Manychat Automation to a subscriber (POST /fb/sending/sendFlow). Takes " +
    "the flow's `ns` from List Flows. Capped at 100 sends per subscriber per hour.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "flowNs",
      label: "Flow namespace (`ns`)",
      type: "string",
      required: true,
      hint: "The opaque `ns` string from List Flows — not the Automation's name.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope>("/fb/sending/sendFlow", {
      subscriber_id: input.subscriberId,
      flow_ns: input.flowNs,
    });
  },
};

export default sendFlow;
