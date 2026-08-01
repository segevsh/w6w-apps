import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v3/{domain}/events` — the domain's event log (delivered, opened,
 * clicked, bounced, complained, unsubscribed, …).
 * Source: https://mailgun-docs.redoc.ly/docs/mailgun/api-reference/openapi-final/tag/Events/
 */
const action: ActionDefinition = {
  key: "event-get-many",
  type: "read",
  resource: "event",
  title: "List events",
  description: "List logged events (delivered, opened, clicked, bounced, …) for a domain.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "mg.example.com",
    },
    {
      key: "event",
      label: "Event Type",
      type: "select",
      hint: "Leave unset to return every event type.",
      options: [
        { value: "accepted", label: "Accepted" },
        { value: "delivered", label: "Delivered" },
        { value: "failed", label: "Failed" },
        { value: "opened", label: "Opened" },
        { value: "clicked", label: "Clicked" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "complained", label: "Complained" },
        { value: "stored", label: "Stored" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    { key: "begin", label: "Begin (epoch seconds)", type: "number" },
    { key: "end", label: "End (epoch seconds)", type: "number" },
    { key: "recipient", label: "Recipient", type: "string", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 300." },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim();
    if (!domain) throw new Error("`domain` is required");

    const client = new MailgunClient(ctx);
    return await client.request(`/v3/${encodeURIComponent(domain)}/events`, {
      query: {
        event: typeof p.event === "string" ? p.event : undefined,
        begin: typeof p.begin === "number" ? p.begin : undefined,
        end: typeof p.end === "number" ? p.end : undefined,
        recipient: typeof p.recipient === "string" && p.recipient ? p.recipient : undefined,
        limit: typeof p.limit === "number" ? p.limit : undefined,
      },
    });
  },
};

export default action;
