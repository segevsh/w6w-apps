import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { requireDate, requireString, toStringList } from "../lib/params.ts";

interface Input {
  employeeId: string;
  fromDate: string;
  toDate: string;
  fields?: unknown;
  limit?: number;
  cursor?: string;
}

/** Field ids Bob documents for the entries search; anything else is rejected before the call. */
export const ENTRY_FIELDS = [
  "/attendanceEntry/id",
  "/attendanceEntry/employeeId",
  "/attendanceEntry/clockInDate",
  "/attendanceEntry/type",
  "/attendanceEntry/clockInTime",
  "/attendanceEntry/clockOutDate",
  "/attendanceEntry/clockOutTime",
  "/attendanceEntry/duration",
  "/attendanceEntry/reasonCode",
  "/attendanceEntry/notes",
  "/attendanceEntry/projectId",
  "/attendanceEntry/taskId",
] as const;

/**
 * `POST /v1/attendance/entries/search` — time log entries. Requires the Time &
 * Attendance module (a 404 means it is not enabled). Bob requires an `employeeId`
 * filter plus a `clockInDate` range of at most **33 days**, and only returns the
 * fields requested. Paginates by cursor: pass `nextCursor` back as `cursor`.
 */
const attendanceEntriesSearch: ActionDefinition<Input> = {
  key: "attendance-entries-search",
  type: "search",
  resource: "attendance",
  title: "Search Attendance Entries",
  description:
    "Fetch one employee's attendance (clock in/out) entries for a date range of up to 33 days.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "Bob's internal employee id.",
    },
    { key: "fromDate", label: "Clock-in from", type: "date", required: true },
    {
      key: "toDate",
      label: "Clock-in to",
      type: "date",
      required: true,
      hint: "At most 33 days after the from date.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint: "Subset of /attendanceEntry/* ids. Defaults to all twelve.",
    },
    { key: "limit", label: "Page size", type: "number" },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "`nextCursor` from the previous page.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Entries, each with a `fields` object" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, absent on the last" },
  ],

  async execute(input, ctx) {
    const from = requireDate(input.fromDate, "fromDate");
    const to = requireDate(input.toDate, "toDate");
    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (days < 0) throw new Error("toDate must not be before fromDate");
    if (days > 33) throw new Error("Bob limits attendance searches to a 33-day range");

    const requested = toStringList(input.fields);
    for (const f of requested) {
      if (!(ENTRY_FIELDS as readonly string[]).includes(f)) {
        throw new Error(`Unknown attendance field "${f}"`);
      }
    }
    const body: Record<string, unknown> = {
      fields: requested.length ? requested : [...ENTRY_FIELDS],
      filters: [
        {
          fieldId: "/attendanceEntry/employeeId",
          operator: "equals",
          values: [requireString(input.employeeId, "employeeId")],
        },
        { fieldId: "/attendanceEntry/clockInDate", operator: "from", values: [from] },
        { fieldId: "/attendanceEntry/clockInDate", operator: "to", values: [to] },
      ],
    };
    if (input.limit !== undefined) body.limit = Math.trunc(Number(input.limit));
    if (input.cursor) body.cursor = input.cursor;

    const res = await new HibobClient(ctx).post<
      { items?: unknown[]; response_metadata?: { next_cursor?: string } }
    >("/attendance/entries/search", body);
    const nextCursor = res?.response_metadata?.next_cursor;
    return { items: res?.items ?? [], ...(nextCursor ? { nextCursor } : {}) };
  },
};

export default attendanceEntriesSearch;
