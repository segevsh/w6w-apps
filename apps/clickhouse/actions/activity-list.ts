import type { ActionDefinition } from "@w6w/types";
import { CloudClient, query } from "../lib/client.ts";

/**
 * `GET /v1/organizations/{org}/activities` — who changed what, and when.
 *
 * The control plane's audit trail: services created, scaled, stopped and
 * deleted, keys issued, members invited. It is the only retrospective view this
 * API offers.
 *
 * ## An API key's actions are attributed to the key
 *
 * So every automation sharing one key is indistinguishable in this log. Giving
 * each workflow its own key is what makes this readable afterwards, and there
 * is no way to reconstruct it once the events are written.
 *
 * ## The window is required in practice
 *
 * A busy organisation produces a great deal of this. `from_date` is how a
 * workflow asks "since I last looked" rather than paging back through
 * everything.
 */
const action: ActionDefinition = {
  key: "activity-list",
  type: "search",
  resource: "activity",
  title: "List organization activity",
  description:
    "The control plane's audit trail — services created, scaled, stopped, deleted. Actions taken " +
    "with an API key are attributed to the KEY, so one key per automation is what makes this " +
    "readable later.",
  params: [
    {
      key: "fromDate",
      label: "Since",
      type: "string",
      default: "",
      placeholder: "2026-08-01T00:00:00Z",
      hint: "ISO 8601. Without it, this is everything the organisation has ever done.",
    },
    {
      key: "toDate",
      label: "Until",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "activities", type: "array", label: "The events, newest first" },
    { key: "count", type: "number", label: "How many" },
    { key: "types", type: "array", label: "The distinct event types" },
    { key: "latest", type: "object", label: "The most recent event" },
    { key: "actors", type: "array", label: "Who or what performed them" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const activities = await new CloudClient(ctx).request<
      Array<
        { id?: string; type?: string; actorType?: string; actorId?: string; createdAt?: string }
      >
    >("/activities", {
      query: query({ from_date: p.fromDate, to_date: p.toDate }),
    });

    const all = Array.isArray(activities) ? activities : [];

    // Counts and types. The events themselves name people and services.
    ctx.log("info", "read ClickHouse Cloud activity", { count: all.length });

    return {
      activities: all,
      count: all.length,
      types: [...new Set(all.map((entry) => entry?.type).filter(Boolean))].sort(),
      latest: all[0],
      actors: [...new Set(all.map((entry) => entry?.actorType).filter(Boolean))].sort(),
    };
  },
};

export default action;
