import attendanceEntriesSearch from "../actions/attendance-entries-search.ts";
import { dayCount, isoDay, LOOKBACK_PARAM, requireId, snapshotTrigger } from "../lib/triggers.ts";
import { employeeIdParam } from "../lib/params.ts";

/** Bob caps an attendance search at 33 days; the trigger watches the last `lookbackDays` (default 7, max 33) and follows `next_cursor`. */
const MAX_PAGES = 20;

export default snapshotTrigger({
  key: "new-attendance-entry",
  title: "New Attendance Entry",
  description:
    "The run gets each clock-in/out entry that appears for the chosen employee in the watched window.",
  action: attendanceEntriesSearch,
  params: [employeeIdParam, {
    ...LOOKBACK_PARAM(7),
    hint: "Days back from today, 1 to 33 (Bob's search limit).",
  }],
  async load(p, ctx) {
    const base = {
      employeeId: requireId(p.employeeId, "employeeId"),
      fromDate: isoDay(-Math.min(dayCount(p.lookbackDays, 7), 33)),
      toDate: isoDay(0),
    };
    const items: unknown[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await attendanceEntriesSearch.execute(
        cursor ? { ...base, cursor } : base,
        ctx,
      ) as { items?: unknown[]; nextCursor?: string };
      items.push(...(res.items ?? []));
      cursor = res.nextCursor;
      if (!cursor) return items;
    }
    throw new Error(`New Attendance Entry: more than ${MAX_PAGES} pages in the watched window`);
  },
  idOf: (item) =>
    String(
      (item as { fields?: Record<string, { value?: unknown }> })?.fields?.["/attendanceEntry/id"]
        ?.value ?? "",
    ),
  output: [
    { key: "objectType", type: "string", label: "Object type" },
    { key: "fields", type: "object", label: "Entry fields keyed /attendanceEntry/…" },
  ],
  sample: {
    objectType: "attendanceEntry",
    fields: {
      "/attendanceEntry/id": { value: 101 },
      "/attendanceEntry/employeeId": { value: "3332741000" },
      "/attendanceEntry/clockInDate": { value: "2026-11-10" },
    },
  },
});
