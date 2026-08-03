import type { ActionDefinition } from "@w6w/types";
import { compact, optionalDate, TickTickClient } from "../lib/client.ts";
import { arrayOutput } from "../lib/params.ts";

interface Input {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
  priority?: number[];
  tag?: string[];
  status?: number[];
}

/**
 * `POST /open/v1/task/filter` — query tasks across projects.
 *
 * This is the closest thing the Open API has to a task search, and it is
 * newer than the reference most third-party TickTick libraries were written
 * against — plenty of them still say flatly that "there is no way to list
 * tasks". As of the 2026-08-03 reference there is.
 *
 * A `POST` whose body is filter criteria, returning a **bare JSON array** of
 * tasks. Every field is optional; sending `{}` is legal and TickTick's own note
 * is that "at least one filter is recommended to narrow down results".
 *
 * ## The date fields do not mean what List Completed Tasks' do
 *
 * Here, `startDate` / `endDate` bracket the task's **own `startDate`**
 * (`startDate ≤ task.startDate ≤ endDate`). In **List Completed Tasks** the same
 * two names bracket `completedTime`. Same spelling, different field — which is
 * why the two are separate actions with separate hints rather than one action
 * with a mode switch.
 *
 * ## A documentation bug this deliberately does not copy
 *
 * TickTick's parameter table spells the priority filter **`proiority`**. Its own
 * worked example in the same section sends `"priority": [0]`. The example is
 * what a running service accepts, so `priority` is what this action sends; the
 * typo is a typo. (Recorded here so a future reader comparing this code against
 * the doc's table does not "fix" it back.)
 *
 * ## Vocabularies
 *
 *   - `priority` — 0 None, 1 Low, 3 Medium, 5 High. Note the table says
 *     "Mediunm(3)"; same document, same section.
 *   - `status` — 0 Open, 2 Completed. This is the *task* scale; subtask status
 *     uses 0/1.
 *   - `tag` — singular, and documented as matching tasks that contain **all** of
 *     the listed tags, not any.
 *
 * No paging: the array comes back whole, and TickTick documents no limit,
 * offset or cursor.
 */
const filterTasks: ActionDefinition<Input, { items: unknown[]; count: number }> = {
  key: "filter-tasks",
  type: "search",
  resource: "task",
  title: "Filter Tasks",
  description:
    "Query tasks across projects by project, start-date range, priority, tags and status. The nearest thing to a task search in the Open API; results are unpaged.",
  params: [
    {
      key: "projectIds",
      label: "Projects",
      type: "string",
      repeat: true,
      hint: "Restrict to these project ids. Leave empty to search every project.",
    },
    {
      key: "startDate",
      label: "Start date from",
      type: "datetime",
      hint:
        "Matches tasks whose own `startDate` is at or after this. Note: this brackets the task's start, not its completion — List Completed Tasks is where the same two field names mean completion time.",
    },
    {
      key: "endDate",
      label: "Start date to",
      type: "datetime",
      hint: "Matches tasks whose own `startDate` is at or before this.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "multiselect",
      options: [
        { value: 0, label: "None" },
        { value: 1, label: "Low" },
        { value: 3, label: "Medium" },
        { value: 5, label: "High" },
      ],
      hint:
        "TickTick's parameter table misspells this `proiority`; its own example uses `priority`.",
    },
    {
      key: "tag",
      label: "Tags",
      type: "string",
      repeat: true,
      hint: "Matches tasks carrying **all** of these tags, not any of them.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: 0, label: "Open" },
        { value: 2, label: "Completed" },
      ],
      hint: "The task scale: 0 open, 2 completed. Subtasks use a different scale (0/1).",
    },
  ],
  output: arrayOutput("Tasks"),

  async execute(input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/task/filter", {
      method: "POST",
      body: compact({
        projectIds: input.projectIds,
        startDate: optionalDate(input.startDate),
        endDate: optionalDate(input.endDate),
        priority: input.priority,
        tag: input.tag,
        status: input.status,
      }),
    });
    return { items, count: items.length };
  },
};

export default filterTasks;
