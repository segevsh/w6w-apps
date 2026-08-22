import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/event-patterns/by-name/{eventName}` — verified against Loops'
 * OpenAPI document (`getEventPatternByName`).
 *
 * Looking a pattern up **by name** rather than by id is the useful direction: a
 * workflow knows the event name it is about to send, and this answers whether
 * Loops has ever seen it and what properties it carries. An event name with no
 * pattern is one nothing is listening for — which is the quiet failure of
 * `event-send`, since firing an unmatched event succeeds and does nothing.
 */
const action: ActionDefinition = {
  key: "event-pattern-get",
  type: "read",
  resource: "event-pattern",
  title: "Get an event pattern",
  description: "Look up an event by name to see whether Loops knows it and what it carries.",
  params: [
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "trial_ended",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.eventName ?? "").trim();
    if (!name) throw new Error("`eventName` is required");

    ctx.log("info", "getting a Loops event pattern", { name });

    return await new LoopsClient(ctx).request(
      `/event-patterns/by-name/${encodeURIComponent(name)}`,
    );
  },
};

export default action;
