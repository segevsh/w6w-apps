import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient, queryDate } from "../lib/client.ts";
import { DATE_RANGE_PARAMS, WHERE_PARAM } from "../lib/params.ts";

/**
 * `GET /api/query/retention` — cohorted retention: of the people who did one
 * thing, how many came back and did another.
 *
 * The two events are separate parameters and both matter. `born_event` defines
 * the cohort (signed up, first purchase); `event` is what counts as coming
 * back. Leaving `event` unset counts *any* activity, which is the friendlier
 * number and a different question.
 *
 * `retention_type` is the one that changes the shape of the answer:
 *
 *   - **`birth`** — the classic cohort table. Somebody counts in week 3 only
 *     if they returned in week 3.
 *   - **`compounded`** — counts them in week 3 if they returned in week 3 *or
 *     any week before it*, which produces a much flatter, much more flattering
 *     curve.
 *
 * They are both legitimate and they are not comparable, so the parameter is
 * explicit rather than defaulted quietly.
 */
const action: ActionDefinition = {
  key: "retention-query",
  type: "read",
  resource: "report",
  title: "Query retention",
  description:
    "Of the people who did one thing, how many came back. The cohort event and the return " +
    "event are separate, and the retention type changes the shape of the answer.",
  params: [
    ...DATE_RANGE_PARAMS,
    {
      key: "bornEvent",
      label: "Cohort Event",
      type: "string",
      default: "",
      placeholder: "Signed Up",
      hint: "What puts somebody in the cohort. Required for birth-type retention.",
    },
    {
      key: "event",
      label: "Return Event",
      type: "string",
      default: "",
      hint: "What counts as coming back. Empty counts any activity at all — a friendlier " +
        "number, and a different question.",
    },
    {
      key: "retentionType",
      label: "Retention Type",
      type: "select",
      default: "birth",
      options: [
        { value: "birth", label: "Birth — returned in THAT period" },
        { value: "compounded", label: "Compounded — returned in that period or any before it" },
      ],
      hint: "Compounded produces a much flatter curve. The two are not comparable.",
    },
    {
      key: "unit",
      label: "Period",
      type: "select",
      default: "day",
      options: [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ],
    },
    {
      key: "interval",
      label: "Periods",
      type: "number",
      default: 0,
      advanced: true,
      hint: "How many periods to report. 0 lets Mixpanel choose from the date range.",
    },
    WHERE_PARAM,
  ],
  output: [
    { key: "data", type: "object", label: "Retention by cohort date" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = queryDate(p.fromDate, "fromDate");
    const to = queryDate(p.toDate, "toDate");
    if (!from || !to) throw new Error("`fromDate` and `toDate` are both required");

    const retentionType = String(p.retentionType ?? "birth");
    const bornEvent = String(p.bornEvent ?? "").trim();
    if (retentionType === "birth" && !bornEvent) {
      throw new Error("`bornEvent` is required for birth-type retention — it defines the cohort");
    }
    const interval = Number(p.interval ?? 0);

    return await new MixpanelClient(ctx).request("/api/query/retention", {
      query: {
        from_date: from,
        to_date: to,
        born_event: bornEvent || undefined,
        event: String(p.event ?? "") || undefined,
        retention_type: retentionType,
        unit: String(p.unit ?? "day"),
        interval: Number.isFinite(interval) && interval > 0 ? interval : undefined,
        where: String(p.where ?? "") || undefined,
      },
    });
  },
};

export default action;
