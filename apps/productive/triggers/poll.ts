import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import bookingList from "../actions/booking-list.ts";
import commentList from "../actions/comment-list.ts";
import companyList from "../actions/company-list.ts";
import dealStatusList from "../actions/deal-status-list.ts";
import invoiceList from "../actions/invoice-list.ts";
import pageList from "../actions/page-list.ts";
import personList from "../actions/person-list.ts";
import projectList from "../actions/project-list.ts";
import taskList from "../actions/task-list.ts";
import timeEntryList from "../actions/time-entry-list.ts";
import { pollWindow } from "../lib/window.ts";

type Result = { items?: unknown[]; hasMore?: boolean };
type Item = Record<string, unknown>;
type Action = ActionDefinition;

/**
 * Shape (a), newest-first: one page of the list sorted by a field the vendor documents in the
 * action's sort enum (https://developer.productive.io/openapi.yaml, read 2026-11-10).
 * `-created_at` is a creation order; `-updated_at` feeds the `new-or-updated-*` siblings, whose
 * ids carry the update stamp so an edit is a new event.
 */
function newest(
  key: string,
  title: string,
  noun: string,
  action: Action,
  sort: "-created_at" | "-updated_at",
) {
  const updated = sort === "-updated_at";
  return pollFromListAction({
    key,
    title,
    description: `The run gets each ${updated ? "new or updated" : "newly created"} ${noun}.`,
    action,
    input: () => ({ sort, pageSize: 100, pageNumber: 1 }),
    items: (result) => (result as Result).items ?? [],
    idOf: (item) => {
      const row = item as Item;
      return updated
        ? `${String(row.id ?? "")}:${String(row.updated_at ?? "")}`
        : String(row.id ?? "");
    },
    output: updated
      ? [{ key: "id", type: "string", label: "ID" }, {
        key: "updated_at",
        type: "string",
        label: "Updated at",
      }]
      : [{ key: "id", type: "string", label: "ID" }],
    sample: updated ? { id: "record-1", updated_at: "2026-11-10T12:05:00Z" } : { id: "record-1" },
    maxPages: 1,
  });
}

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const OVERLAP_MS = 120_000;
const SEEN_WINDOW = 2 * PAGE_SIZE * MAX_PAGES;
const DAY_MS = 86_400_000;

/** Clock seam for deterministic trigger tests. */
export const clock = { now: (): number => Date.now() };

/**
 * Shape (b), since-filter, for lists with no creation sort: the vendor documents
 * `filter[created_at]` / `filter[updated_at]` as DATE filters with `gt_eq` (`format: date`, so day
 * granularity). The window starts one UTC day before `cursor - overlap` (the organization's time
 * zone is not stated), the seed's time floor drops anything older, and ids dedupe the re-read.
 */
function since(
  key: string,
  title: string,
  noun: string,
  action: Action,
  stamp: "created_at" | "updated_at",
): TriggerDefinition {
  const updated = stamp === "updated_at";
  return {
    key,
    title,
    description: `The run gets each ${updated ? "new or updated" : "newly created"} ${noun}.`,
    output: [{ key: "id", type: "string", label: "ID" }, {
      key: stamp,
      type: "string",
      label: updated ? "Updated at" : "Created at",
    }],
    sample: { id: "record-1", [stamp]: "2026-11-10T12:05:00Z" },
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return pollWindow<Item, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) =>
          `${String(item.id ?? "")}${updated ? `:${String(item.updated_at ?? "")}` : ""}`,
        tsOf: (item) => {
          const value = item[stamp];
          const ms = typeof value === "string" ? Date.parse(value) : NaN;
          return Number.isNaN(ms) ? undefined : ms;
        },
        async load(from, page) {
          const day = new Date(from - DAY_MS).toISOString().slice(0, 10);
          const number = page ?? 1;
          const result = await action.execute(
            { filter: { [stamp]: { gt_eq: day } }, pageSize: PAGE_SIZE, pageNumber: number },
            ctx,
          ) as Result;
          return {
            items: (result.items ?? []) as Item[],
            next: result.hasMore ? number + 1 : undefined,
          };
        },
      });
    },
  };
}

export const newComment = newest(
  "new-comment",
  "New Comment",
  "comment",
  commentList,
  "-created_at",
);
export const newCompany = newest(
  "new-company",
  "New Company",
  "company",
  companyList,
  "-created_at",
);
export const newDealStatus = newest(
  "new-deal-status",
  "New Deal Status",
  "deal status",
  dealStatusList,
  "-created_at",
);
export const newInvoice = newest(
  "new-invoice",
  "New Invoice",
  "invoice",
  invoiceList,
  "-created_at",
);
export const newPage = newest("new-page", "New Docs Page", "docs page", pageList, "-created_at");
export const newProject = newest(
  "new-project",
  "New Project",
  "project",
  projectList,
  "-created_at",
);
export const newTask = newest("new-task", "New Task", "task", taskList, "-created_at");
export const newOrUpdatedPage = newest(
  "new-or-updated-page",
  "New or Updated Docs Page",
  "docs page",
  pageList,
  "-updated_at",
);
export const newOrUpdatedTask = newest(
  "new-or-updated-task",
  "New or Updated Task",
  "task",
  taskList,
  "-updated_at",
);
export const newOrUpdatedTimeEntry = newest(
  "new-or-updated-time-entry",
  "New or Updated Time Entry",
  "time entry",
  timeEntryList,
  "-updated_at",
);
export const newBooking = since("new-booking", "New Booking", "booking", bookingList, "created_at");
export const newOrUpdatedBooking = since(
  "new-or-updated-booking",
  "New or Updated Booking",
  "booking",
  bookingList,
  "updated_at",
);
export const newPerson = since("new-person", "New Person", "person", personList, "created_at");

export const pollTriggers = [
  newBooking,
  newComment,
  newCompany,
  newDealStatus,
  newInvoice,
  newPage,
  newPerson,
  newProject,
  newTask,
  newOrUpdatedBooking,
  newOrUpdatedPage,
  newOrUpdatedTask,
  newOrUpdatedTimeEntry,
] as TriggerDefinition[];
