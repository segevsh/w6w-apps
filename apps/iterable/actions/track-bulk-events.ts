import type { ActionDefinition } from "@w6w/types";
import { call, compact, jsonArray } from "../lib/client.ts";

/**
 * `POST /api/events/trackBulk` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "track-bulk-events",
  type: "perform",
  resource: "event",
  title: "Track Events in Bulk",
  description: "Record many custom events in one call.",
  idempotent: false,
  params: [
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      hint: 'JSON array of {"eventName", "email"|"userId", "dataFields", ...} objects.',
    },
  ],
  output: [
    { key: "successCount", type: "number", label: "Events accepted" },
    { key: "failCount", type: "number", label: "Events rejected" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const events = jsonArray("events", p.events);
    if (events === undefined) throw new Error("`events` is required");
    ctx.log("info", "Iterable Track Events in Bulk");
    const out = await call(ctx, "POST", "/events/trackBulk", {
      body: compact({ "events": events }),
    });
    return out;
  },
};

export default action;
