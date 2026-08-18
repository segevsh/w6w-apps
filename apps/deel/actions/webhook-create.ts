import type { ActionDefinition } from "@w6w/types";
import { compact, csv, DeelClient } from "../lib/client.ts";

/**
 * `POST /webhooks` — verified against Deel's own OpenAPI document
 * (`endpoints.json`, `create-webhook`).
 *
 * Deel pushes events rather than making you poll, so this is how a workflow
 * gets told about a signed contract or an approved time-off request.
 * `webhook-event-list` returns the event names this accepts.
 */
const action: ActionDefinition = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create a webhook",
  description: "Register a URL to receive Deel events.",
  // A second call registers a second webhook, and both will fire.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Shown in Deel's webhook list.",
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      default: "",
      hint: "Must be HTTPS and publicly reachable — Deel posts to it.",
    },
    {
      key: "events",
      label: "Events",
      type: "string",
      required: true,
      default: "",
      placeholder: "contract.created,time_off.created",
      hint: "Comma-separated. See List webhook events for what is available.",
    },
    {
      key: "apiVersion",
      label: "API Version",
      type: "string",
      default: "",
      hint: "Optional payload version, if your endpoint expects a specific one.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Webhook" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    const url = String(p.url ?? "").trim();
    const events = csv(p.events);
    if (!name) throw new Error("`name` is required");
    if (!url) throw new Error("`url` is required");
    if (!events) throw new Error("`events` is required — at least one event name");
    if (!url.startsWith("https://")) {
      // Deel refuses plain HTTP; failing here says why.
      throw new Error("`url` must be https — Deel will not post to plain HTTP");
    }

    ctx.log("info", "creating Deel webhook", { name, events });

    return await new DeelClient(ctx).request("/webhooks", {
      method: "POST",
      body: {
        data: compact({ name, url, events, api_version: p.apiVersion }),
      },
    });
  },
};

export default action;
