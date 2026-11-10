import type { OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";
import listEmployeeFiles from "../actions/list-employee-files.ts";
import listTimeOffRequests from "../actions/list-time-off-requests.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const DAY_MS = 86_400_000;
/** The request window looks one year ahead: BambooHR filters by overlap, not by creation. */
export const WINDOW_DAYS = 365;
/** Whole-window ceiling per check; ids are marked seen only when emitted (kit rule). */
export const MAX_EVENTS = 100;
export const SEEN_WINDOW = 5000;

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export interface TimeOffRequest {
  id?: string | number;
  employeeId?: string | number;
  name?: string;
  start?: string;
  end?: string;
  created?: string;
  updated?: string;
  status?: { status?: string; lastChanged?: string };
  type?: { id?: string | number; name?: string };
  amount?: { unit?: string; amount?: string | number };
}

export const TIME_OFF_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Request ID" },
  { key: "employeeId", type: "string", label: "Employee ID" },
  { key: "name", type: "string", label: "Employee name" },
  { key: "status", type: "object", label: "Status (`status`, `lastChanged`)" },
  { key: "start", type: "string", label: "First day off (YYYY-MM-DD)" },
  { key: "end", type: "string", label: "Last day off (YYYY-MM-DD)" },
  { key: "type", type: "object", label: "Time off type" },
  { key: "amount", type: "object", label: "Amount (`unit`, `amount`)" },
  { key: "created", type: "string", label: "Created (YYYY-MM-DD)" },
  { key: "updated", type: "string", label: "Created or last changed (ISO 8601 UTC)" },
];

const SAMPLE: TimeOffRequest = {
  id: "1342",
  employeeId: "4",
  name: "Charlotte Abbott",
  status: { status: "requested", lastChanged: "2026-11-09" },
  start: "2026-12-21",
  end: "2026-12-23",
  type: { id: "1", name: "Vacation" },
  amount: { unit: "days", amount: "3" },
  created: "2026-11-09",
  updated: "2026-11-09T14:30:00Z",
};

/**
 * `GET /time_off/requests` filters by date OVERLAP and has no creation order, so each check reads
 * the whole `[today, today + 365 d]` window (one bounded request, as the wrapped action does) and
 * dedupes by id (new) or `id:updated` (new-or-updated). A request that merely ENTERS the window
 * (its dates come into range) is not new: the seed stores `floor = now` (brief 9.9) and later checks
 * drop requests created before the floor's UTC day minus one day (`created` is a company-timezone
 * date) or, for edits, last changed before the floor instant.
 */
async function checkRequests(
  mode: "new" | "updated",
  state: unknown,
  ctx: Parameters<
    NonNullable<TriggerDefinition["poll"]>
  >[1],
) {
  const now = clock.now();
  const prior = (state && typeof state === "object" ? state : {}) as { floor?: unknown };
  const seeded = (state as { seeded?: unknown } | null)?.seeded === true;
  const floor = typeof prior.floor === "number" ? prior.floor : now;
  const result = await listTimeOffRequests.execute({
    start: ymd(now),
    end: ymd(now + WINDOW_DAYS * DAY_MS),
  }, ctx) as TimeOffRequest[] | { requests?: TimeOffRequest[] };
  const all = (Array.isArray(result) ? result : result.requests ?? [])
    .filter((r) => r.id !== undefined && r.id !== "");
  const floorDay = ymd(floor - DAY_MS);
  const kept = seeded
    ? all.filter((r) =>
      mode === "new"
        ? r.created === undefined || r.created >= floorDay
        : r.updated === undefined || Number.isNaN(Date.parse(r.updated)) ||
          Date.parse(r.updated) >= floor
    )
    : all;
  const { events, nextState } = await pollNewItems<TimeOffRequest>({
    state,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    seenWindow: SEEN_WINDOW,
    idOf: (r) =>
      mode === "new" ? String(r.id) : `${r.id}:${r.updated ?? r.status?.lastChanged ?? ""}`,
    fetchPage: () => Promise.resolve({ items: kept }),
  });
  return { events, nextState: { ...nextState, floor } };
}

export const newTimeOffRequest: TriggerDefinition = {
  key: "new-time-off-request",
  title: "New Time Off Request",
  description: "The run gets each time off request created while the trigger is active.",
  output: TIME_OFF_OUTPUT,
  sample: SAMPLE,
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => checkRequests("new", state, ctx),
};

export const newOrUpdatedTimeOffRequest: TriggerDefinition = {
  key: "new-or-updated-time-off-request",
  title: "New or Updated Time Off Request",
  description:
    "The run gets each time off request that is created, approved, denied, canceled or edited.",
  output: TIME_OFF_OUTPUT,
  sample: SAMPLE,
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => checkRequests("updated", state, ctx),
};

interface FileCategory {
  id?: number | string;
  name?: string;
  files?: Array<Record<string, unknown>>;
}

/**
 * `GET /employees/{id}/files/view` lists one employee's files grouped by category. The list is
 * small and has no order, so the files are diffed as a snapshot (added only). BambooHR answers 404
 * when the employee has no accessible category: that is an empty list, not a failure.
 */
export const newEmployeeFile: TriggerDefinition<{ employeeId: string }> = {
  key: "new-employee-file",
  title: "New Employee File",
  description: "The run gets each file newly added to the chosen employee.",
  params: [{
    key: "employeeId",
    label: "Employee ID",
    type: "string",
    required: true,
    hint: "The INTERNAL employee ID whose files to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "originalFileName", type: "string", label: "Original file name" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "dateCreated", type: "string", label: "Created" },
    { key: "createdBy", type: "string", label: "Uploaded by" },
    { key: "categoryId", type: "string", label: "Category ID" },
    { key: "categoryName", type: "string", label: "Category name" },
  ],
  sample: {
    id: "1234",
    name: "Employee handbook",
    originalFileName: "employee_handbook.doc",
    size: 23552,
    dateCreated: "2026-11-09T16:50:52+0000",
    createdBy: "John Doe",
    categoryId: "1",
    categoryName: "New Hire Docs",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    let result: { categories?: FileCategory[] } = {};
    try {
      result = await listEmployeeFiles.execute({ id: params.employeeId }, ctx) as typeof result;
    } catch (err) {
      if (!(err instanceof Error) || !/BambooHR 404 /.test(err.message)) throw err;
      // 404 is also what a permission blip looks like: keep the prior snapshot, never wipe it.
      if ((state as { seeded?: boolean } | undefined)?.seeded) {
        return { events: [], nextState: state };
      }
    }
    const files = (result.categories ?? []).flatMap((c) =>
      (c.files ?? []).filter((f) => f.id !== undefined).map((f) => ({
        ...f,
        id: String(f.id),
        categoryId: String(c.id ?? ""),
        categoryName: c.name ?? "",
      }))
    );
    const byId = new Map(files.map((f) => [f.id, f]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: files.map((f) => ({ key: f.id, values: { id: f.id } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};
