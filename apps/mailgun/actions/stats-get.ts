import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `GET /v3/{domain}/stats/total` — aggregated send/delivery/engagement
 * counters for a domain, bucketed by resolution.
 * Source: https://mailgun-docs.redoc.ly/docs/mailgun/api-reference/openapi-final/tag/Stats/
 */
const action: ActionDefinition = {
  key: "stats-get",
  type: "read",
  resource: "stat",
  title: "Get domain stats",
  description: "Aggregated send/delivery/engagement counters for a domain.",
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
      label: "Event(s)",
      type: "multiselect",
      required: true,
      hint: "One or more counters to return.",
      options: [
        { value: "accepted", label: "Accepted" },
        { value: "delivered", label: "Delivered" },
        { value: "failed", label: "Failed" },
        { value: "opened", label: "Opened" },
        { value: "clicked", label: "Clicked" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "complained", label: "Complained" },
        { value: "stored", label: "Stored" },
      ],
    },
    {
      key: "start",
      label: "Start",
      type: "string",
      hint: "RFC 2822 or unix epoch. Defaults to 7 days ago.",
    },
    { key: "end", label: "End", type: "string", hint: "RFC 2822 or unix epoch. Defaults to now." },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      default: "day",
      options: [
        { value: "hour", label: "Hour" },
        { value: "day", label: "Day" },
        { value: "month", label: "Month" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim();
    if (!domain) throw new Error("`domain` is required");
    const events = p.event;
    const eventList = Array.isArray(events)
      ? events.map(String)
      : typeof events === "string" && events
      ? [events]
      : [];
    if (!eventList.length) throw new Error("`event` is required (at least one)");

    const client = new MailgunClient(ctx);
    return await client.request(`/v3/${encodeURIComponent(domain)}/stats/total`, {
      query: {
        event: eventList,
        start: typeof p.start === "string" && p.start ? p.start : undefined,
        end: typeof p.end === "string" && p.end ? p.end : undefined,
        resolution: typeof p.resolution === "string" && p.resolution ? p.resolution : undefined,
      },
    });
  },
};

export default action;
