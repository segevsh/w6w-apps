import type { ActionDefinition } from "@w6w/types";
import { call, parseList, pick, requireStr } from "../lib/client.ts";
import { json, select, str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  resource: "webhook",
  title: "Subscribe Webhook",
  description: "Subscribe a URL to person, project or company change events.",
  idempotent: false,
  params: [
    select("event", "Event", [
      "person.change",
      "project.change",
      "company.change",
      "person.audit.change",
      "project.audit.change",
      "company.audit.change",
    ], { required: true }),
    str("target_url", "Target URL", { required: true, hint: "Cloze POSTs events to this URL." }),
    select("scope", "Scope", ["local", "team"], {
      hint: "A hierarchy path is also accepted by the API.",
    }),
    str("client_reference", "Reference name", {
      hint: "Your own name for the subscription, usable to unsubscribe.",
    }),
    str("client_type", "Client type", { hint: "`human` returns displayed values." }),
    str("ttl", "TTL (seconds)"),
    json("filters", "Filters", { hint: "JSON array of filter objects; one match delivers." }),
  ],
  output: [
    { key: "uniqueid", type: "string", label: "Subscription ID" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/v1/webhooks/subscribe", {
      body: {
        event: requireStr("event", input.event),
        target_url: requireStr("target_url", input.target_url),
        ...pick(input, ["scope", "client_reference", "client_type", "ttl"]),
        ...(input.filters ? { filters: parseList("filters", input.filters) } : {}),
      },
    });
    return { uniqueid: res.uniqueid };
  },
};

export default webhookSubscribe;
