import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /unsubscribe` — remove a webhook subscription by its target URL.
 * Idempotent: unsubscribing an already-unsubscribed URL is a no-op end
 * state.
 */
interface Input {
  url: string;
  mode?: string;
}

const webhookUnsubscribe: ActionDefinition<Input> = {
  key: "webhook-unsubscribe",
  type: "perform",
  resource: "webhook",
  title: "Unsubscribe From Event",
  description: "Remove a webhook subscription by its registered target URL.",
  idempotent: true,
  params: [
    { key: "url", label: "Target URL", type: "string", required: true },
    modeParam,
  ],
  output: [],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/unsubscribe", {
      form: { url: input.url },
      mode: input.mode,
    });
  },
};

export default webhookUnsubscribe;
