import type { ActionDefinition } from "@w6w/types";
import { compact, optionalDate, TickTickClient } from "../lib/client.ts";
import { arrayOutput } from "../lib/params.ts";

interface Input {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
}

/**
 * `POST /open/v1/task/completed` — completed tasks in a time range.
 *
 * This exists because **Get Project With Data returns only undone tasks** —
 * TickTick's own definition table says `tasks` is "Undone tasks under project".
 * So a workflow that wants "what did we finish this week" has exactly one
 * endpoint, and this is it.
 *
 * Every field is optional; TickTick's note is that "at least one filter is
 * recommended to narrow down results". It does not say what the unfiltered
 * default range is, so leaving the dates empty is a request whose cost is
 * undocumented — the hints say so.
 *
 * ## `startDate` / `endDate` mean completion time here
 *
 * `startDate ≤ completedTime ≤ endDate`. That is a *different* field from the
 * one the identically-named parameters filter on in **Filter Tasks**, where they
 * bracket the task's own `startDate`. Two actions rather than one, precisely so
 * that difference lives in a hint instead of a caller's head.
 *
 * Returns a bare JSON array. No paging, no cursor, no documented cap.
 */
const listCompletedTasks: ActionDefinition<Input, { items: unknown[]; count: number }> = {
  key: "list-completed-tasks",
  type: "search",
  resource: "task",
  title: "List Completed Tasks",
  description:
    "List tasks completed within a time range, optionally restricted to some projects. The only way to see completed tasks — Get Project With Data returns undone ones only.",
  params: [
    {
      key: "projectIds",
      label: "Projects",
      type: "string",
      repeat: true,
      hint: "Restrict to these project ids. Leave empty to cover every project.",
    },
    {
      key: "startDate",
      label: "Completed from",
      type: "datetime",
      hint:
        "Inclusive lower bound on the task's `completedTime`. TickTick does not document the default range when this is omitted.",
    },
    {
      key: "endDate",
      label: "Completed to",
      type: "datetime",
      hint: "Inclusive upper bound on the task's `completedTime`.",
    },
  ],
  output: arrayOutput("Completed tasks"),

  async execute(input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/task/completed", {
      method: "POST",
      body: compact({
        projectIds: input.projectIds,
        startDate: optionalDate(input.startDate),
        endDate: optionalDate(input.endDate),
      }),
    });
    return { items, count: items.length };
  },
};

export default listCompletedTasks;
