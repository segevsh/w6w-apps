import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, query } from "../lib/client.ts";

/**
 * `GET /api/2/useractivity` — one user's recent event stream.
 *
 * ## It takes the Amplitude id, not the user id
 *
 * The internal numeric id, from `user-search`. Passing a `user_id` here returns
 * nothing rather than an error, which is a quiet way to conclude somebody has
 * no activity when they have plenty.
 *
 * ## It is a window, not a history
 *
 * The endpoint returns the most recent events — a few hundred — and there is no
 * cursor. For a full history, the Export API is the answer, and for anything
 * aggregate, segmentation. This exists for the support question: what did this
 * person actually do just before they complained.
 *
 * The `userData` block alongside carries the current user properties, which is
 * usually the other half of that question.
 */
const action: ActionDefinition = {
  key: "user-activity",
  type: "read",
  resource: "user",
  title: "Get a user's activity",
  description:
    "One user's recent events — the support question, not an analytics one. It takes the " +
    "AMPLITUDE ID, and a user id returns nothing rather than erroring.",
  params: [
    {
      key: "amplitudeId",
      label: "Amplitude ID",
      type: "string",
      required: true,
      default: "",
      hint: "The internal numeric id, from `user-search`. Not the user_id you set.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      advanced: true,
      hint: "How many of the most recent events to skip. There is no cursor.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      advanced: true,
      hint: "Up to 1000.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Recent events, newest first" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "userData", type: "object", label: "Current user properties" },
    { key: "eventTypes", type: "array", label: "The distinct event types in this window" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const amplitudeId = String(p.amplitudeId ?? "").trim();
    if (!amplitudeId) throw new Error("`amplitudeId` is required");
    if (!/^\d+$/.test(amplitudeId)) {
      throw new Error(
        `\`amplitudeId\` must be the internal numeric id, not a user_id — got ` +
          `${JSON.stringify(amplitudeId)}. \`user-search\` returns it, and passing a user_id ` +
          "here returns an empty result rather than an error",
      );
    }

    const result = await new AmplitudeClient(ctx).dashboard<{
      events?: Array<{ event_type?: string }>;
      userData?: Record<string, unknown>;
    }>("/api/2/useractivity", {
      query: query({
        user: amplitudeId,
        offset: Number(p.offset ?? 0) || undefined,
        limit: Math.min(1000, Math.max(1, Number(p.limit ?? 100))),
      }),
    });

    const events = result?.events ?? [];
    ctx.log("info", "read Amplitude user activity", { count: events.length });

    return {
      events,
      count: events.length,
      userData: result?.userData,
      eventTypes: [...new Set(events.map((event) => event?.event_type).filter(Boolean))],
    };
  },
};

export default action;
