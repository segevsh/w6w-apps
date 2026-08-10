import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Output {
  health_status: string;
}

/**
 * `GET /ping` — Mailchimp's lightweight, account-scoped health check. No
 * params, safe to invoke with `{}`, which is what lets it double as the
 * `service` health check's automatable signal (see health/service.ts).
 */
const ping: ActionDefinition<Record<string, never>, Output> = {
  key: "ping",
  type: "read",
  resource: "service",
  title: "Ping",
  description: "Verify the connection can reach Mailchimp — no account data is touched.",
  idempotent: true,
  sample: { health_status: "Everything's Chimpy!" },
  healthCheck: { kind: "credential" },

  execute(_input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request<Output>("/ping");
  },
};

export default ping;
