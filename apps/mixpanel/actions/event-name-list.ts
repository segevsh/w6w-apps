import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient } from "../lib/client.ts";

/**
 * `GET /api/query/events/names` — the event names this project actually has.
 *
 * Worth calling before any query that names an event, because Mixpanel matches
 * event names **exactly** and a query for an event that does not exist returns
 * zeros rather than an error. `"Signed Up"` and `"signed up"` are two different
 * events, and a project that has been through a tracking-plan rewrite usually
 * has both.
 *
 * `type` distinguishes *general* (every occurrence) from *unique* (people) when
 * ranking; `limit` caps how many names come back.
 */
const action: ActionDefinition = {
  key: "event-name-list",
  type: "read",
  resource: "event",
  title: "List event names",
  description:
    "The event names in this project. Mixpanel matches names exactly, and a query for an event " +
    "that does not exist returns zeros rather than an error.",
  params: [
    {
      key: "type",
      label: "Rank By",
      type: "select",
      default: "general",
      options: [
        { value: "general", label: "Occurrences" },
        { value: "unique", label: "People" },
        { value: "average", label: "Average" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 255,
      hint: "How many names to return.",
    },
  ],
  output: [
    { key: "names", type: "array", label: "Event names" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const limit = Number(p.limit ?? 255);
    const names = await new MixpanelClient(ctx).request<string[]>("/api/query/events/names", {
      query: {
        type: String(p.type ?? "general"),
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      },
    });
    return { names };
  },
};

export default action;
