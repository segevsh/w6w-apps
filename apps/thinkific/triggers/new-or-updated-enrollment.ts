import type { TriggerDefinition } from "@w6w/types";
import enrollmentsList from "../actions/enrollments-list.ts";
import { PAGE_SIZE, pollSince } from "../lib/since-poll.ts";

interface Page {
  items?: unknown[];
  meta?: { pagination?: { next_page?: number | null } };
}

/**
 * Same request as `new-enrollment` but windowed on `query[updated_after]` / `query[updated_before]`.
 * `updated_at` is part of every enrollment, so the dedupe id carries it: an edit is a new event.
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-enrollment",
  title: "New or Updated Enrollment",
  description: "The run gets each enrollment that was newly created or updated.",
  output: [
    { key: "id", type: "number", label: "Enrollment ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
    { key: "completed", type: "boolean", label: "Completed" },
  ],
  sample: {
    id: 101,
    user_email: "student@example.com",
    completed: false,
    updated_at: "2026-11-09T12:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) =>
    pollSince<unknown>({
      state,
      idOf: (e) => {
        const r = e as { id?: unknown; updated_at?: unknown };
        return `${String(r.id ?? "")}:${String(r.updated_at ?? "")}`;
      },
      stampOf: (e) => (e as { updated_at?: unknown }).updated_at,
      async fetchPage(win, pos) {
        const page = Number(pos ?? 1);
        const res = await enrollmentsList.execute(
          { page, limit: PAGE_SIZE, updatedAfter: win.since, updatedBefore: win.until },
          ctx,
        ) as Page;
        const more = res.meta?.pagination?.next_page;
        return { items: res.items ?? [], next: typeof more === "number" ? more : undefined };
      },
    }),
};

export default trigger;
