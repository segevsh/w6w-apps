import type { TriggerDefinition } from "@w6w/types";
import enrollmentsList from "../actions/enrollments-list.ts";
import { PAGE_SIZE, pollSince } from "../lib/since-poll.ts";

interface Page {
  items?: unknown[];
  meta?: { pagination?: { next_page?: number | null } };
}

/**
 * `GET /enrollments` has no sort order, so this uses its documented `query[created_after]` /
 * `query[created_before]` window (brief §9.1 b) and pages through it.
 */
const trigger: TriggerDefinition = {
  key: "new-enrollment",
  title: "New Enrollment",
  description: "The run gets each newly created enrollment.",
  output: [
    { key: "id", type: "number", label: "Enrollment ID" },
    { key: "user_email", type: "string", label: "Student email" },
    { key: "course_name", type: "string", label: "Course name" },
  ],
  sample: {
    id: 101,
    user_email: "student@example.com",
    course_name: "Intro course",
    updated_at: "2026-11-09T12:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) =>
    pollSince<unknown>({
      state,
      idOf: (e) => String((e as { id?: unknown }).id ?? ""),
      stampOf: () => undefined,
      async fetchPage(win, pos) {
        const page = Number(pos ?? 1);
        const res = await enrollmentsList.execute(
          { page, limit: PAGE_SIZE, createdAfter: win.since, createdBefore: win.until },
          ctx,
        ) as Page;
        const more = res.meta?.pagination?.next_page;
        return { items: res.items ?? [], next: typeof more === "number" ? more : undefined };
      },
    }),
};

export default trigger;
