import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient, queryDate } from "../lib/client.ts";
import { DATE_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/query/events/properties` — the values one property takes on one
 * event, with counts.
 *
 * The lookup that makes a filter expression writable. Before asking "how many
 * signups from the pro plan", this answers what `plan` actually contains — and
 * usually reveals that it contains `pro`, `Pro`, `PRO` and an empty string,
 * because it was set from three places over two years.
 *
 * Like `segmentation-query`, `type` decides whether the counts are occurrences
 * or people, and the same warning applies to reporting one as the other.
 */
const action: ActionDefinition = {
  key: "event-property-values",
  type: "read",
  resource: "event",
  title: "List a property's values",
  description:
    "What values one property takes on one event, with counts — the lookup that makes a filter " +
    "expression writable, and that reveals the four spellings of `pro`.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "string",
      required: true,
      default: "",
      placeholder: "Signed Up",
    },
    {
      key: "name",
      label: "Property",
      type: "string",
      required: true,
      default: "",
      placeholder: "plan",
      hint: "The property name as stored — no brackets or quotes here, unlike a filter " +
        "expression.",
    },
    ...DATE_RANGE_PARAMS,
    {
      key: "type",
      label: "Count",
      type: "select",
      default: "general",
      options: [
        { value: "general", label: "Occurrences" },
        { value: "unique", label: "People" },
        { value: "average", label: "Average" },
      ],
    },
    {
      key: "unit",
      label: "Bucket",
      type: "select",
      default: "day",
      options: [
        { value: "hour", label: "Hour" },
        { value: "day", label: "Day" },
        { value: "month", label: "Month" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 255,
      advanced: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Series and values" },
    { key: "legend_size", type: "number", label: "Distinct values" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const event = String(p.event ?? "").trim();
    if (!event) throw new Error("`event` is required");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const from = queryDate(p.fromDate, "fromDate");
    const to = queryDate(p.toDate, "toDate");
    if (!from || !to) throw new Error("`fromDate` and `toDate` are both required");
    const limit = Number(p.limit ?? 255);

    return await new MixpanelClient(ctx).request("/api/query/events/properties", {
      query: {
        event,
        name,
        from_date: from,
        to_date: to,
        type: String(p.type ?? "general"),
        unit: String(p.unit ?? "day"),
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      },
    });
  },
};

export default action;
