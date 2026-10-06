import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, jsonObject, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/events/track` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "track-event",
  type: "perform",
  resource: "event",
  title: "Track Event",
  description:
    "Record a custom event for a user. Events are created asynchronously. Pass an `id` to make retries safe (Iterable dedupes on it).",
  idempotent: false,
  params: [
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      hint: "Name of the custom event.",
    },
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
    { key: "dataFields", label: "Data Fields", type: "json", hint: "Event data as a JSON object." },
    {
      key: "id",
      label: "Event ID",
      type: "string",
      hint: "Optional unique event id; supplying one lets a retry be deduplicated.",
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "number",
      hint: "Unix timestamp in seconds (default: now).",
    },
    { key: "campaignId", label: "Campaign ID", type: "number" },
    { key: "templateId", label: "Template ID", type: "number" },
    {
      key: "createNewFields",
      label: "Create New Fields",
      type: "boolean",
      hint: "Create unknown data fields automatically.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const eventName = str(p.eventName);
    const email = str(p.email);
    const userId = str(p.userId);
    const dataFields = jsonObject("dataFields", p.dataFields);
    const id = str(p.id);
    const createdAt = int("createdAt", p.createdAt);
    const campaignId = int("campaignId", p.campaignId);
    const templateId = int("templateId", p.templateId);
    const createNewFields = bool(p.createNewFields);
    oneOf(["email", "userId"], { "email": email, "userId": userId }, "at-least-one");
    if (eventName === undefined) throw new Error("`eventName` is required");
    ctx.log("info", "Iterable Track Event", { eventName });
    const out = await call(ctx, "POST", "/events/track", {
      body: compact({
        "eventName": eventName,
        "email": email,
        "userId": userId,
        "dataFields": dataFields,
        "id": id,
        "createdAt": createdAt,
        "campaignId": campaignId,
        "templateId": templateId,
        "createNewFields": createNewFields,
      }),
    });
    return out;
  },
};

export default action;
