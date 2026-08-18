import type { ActionDefinition } from "@w6w/types";
import { entityId, HomeAssistantClient, query } from "../lib/client.ts";

/**
 * `GET /api/logbook/<timestamp>` — what happened, in words.
 *
 * ## Not the same thing as history, and the difference is useful
 *
 * `history-get` returns raw state changes: every value an entity took. The
 * logbook returns **events a person would care about**, already described —
 * "Kitchen light turned on", "Alice arrived home", "Automation Morning
 * triggered" — with the *cause* attached where Home Assistant knows it
 * (`context_user_id`, or the automation that fired).
 *
 * For "what did this thing do", history. For "why did this happen", logbook.
 * That causal link is not available anywhere in the history API.
 */
const action: ActionDefinition = {
  key: "logbook-get",
  type: "read",
  resource: "history",
  title: "Get the logbook",
  description:
    "Human-readable events with their causes — which automation or person triggered them. " +
    "History says what changed; the logbook says why.",
  params: [
    {
      key: "entityId",
      label: "Entity",
      type: "string",
      default: "",
      hint: "One entity id to narrow to. Without it, everything in the period — which is a lot.",
    },
    {
      key: "startTime",
      label: "From",
      type: "string",
      default: "",
      hint: "ISO 8601. Defaults to one day ago.",
    },
    {
      key: "endTime",
      label: "To",
      type: "string",
      default: "",
      hint: "ISO 8601. Defaults to now.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Logbook entries, oldest first" },
    { key: "count", type: "number", label: "How many" },
    { key: "triggeredByAutomation", type: "number", label: "Entries with an automation as cause" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = String(p.entityId ?? "").trim();
    const start = String(p.startTime ?? "").trim();

    const result = await new HomeAssistantClient(ctx).request<
      Array<{ context_event_type?: string; context_entity_id?: string }>
    >(start ? `/logbook/${encodeURIComponent(start)}` : "/logbook", {
      query: query({
        entity: entity ? entityId(entity, "entityId") : undefined,
        end_time: p.endTime,
      }),
    });

    const entries = Array.isArray(result) ? result : [];
    // The causal link the history API does not have.
    const triggeredByAutomation =
      entries.filter((entry) => String(entry?.context_entity_id ?? "").startsWith("automation."))
        .length;

    ctx.log("info", "read the Home Assistant logbook", { count: entries.length });
    return { entries, count: entries.length, triggeredByAutomation };
  },
};

export default action;
