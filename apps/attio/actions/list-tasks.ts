import type { ActionDefinition } from "@w6w/types";
import {
  AttioClient,
  compact,
  optionsFrom,
  PAGE_OUTPUT,
  pageParams,
  QUERY_DEFAULT_LIMIT,
} from "../lib/client.ts";

interface Input {
  linkedObject?: string;
  linkedRecordId?: string;
  assignee?: string;
  /**
   * Deliberately a string, not a boolean: the param is a three-way select whose
   * empty option means "Attio's default, both". A boolean cannot express that
   * third state — an unchecked box would send `false` and hide every completed
   * task. The client's query builder drops `""`, which is what makes it work.
   */
  isCompleted?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

/** The `sort` enum, verbatim from the query parameter. */
export const TASK_SORTS = [
  "created_at:asc",
  "created_at:desc",
  "completed_at:asc",
  "completed_at:desc",
] as const;

/**
 * `GET /v2/tasks` — list tasks, with the only real filter set in this API that
 * lives entirely on the query string.
 *
 * "List all tasks. Results are sorted by creation date, from oldest to newest."
 * — oldest first is the default, which is the opposite of most APIs and means an
 * unsorted `limit: 10` returns the ten *oldest* tasks. `sort` fixes that.
 *
 * ## `linked_object` and `linked_record_id` are a pair
 *
 * The schema states the dependency in both directions: "If provided,
 * `linked_record_id` must also be provided", and vice versa. Supplying one alone
 * is an error, not a partial filter, so they share a row on the form and say so.
 *
 * ## `assignee` has a third state that is not a value
 *
 * "Workspace members can be referenced by either their email address or ID.
 * **Pass an empty value or the string `null`** to find tasks with no assignee."
 * So the literal four-character string `"null"` is a meaningful filter value
 * here — unassigned tasks — and is offered as such rather than left to be
 * discovered.
 *
 * ## `is_completed` genuinely tri-states
 *
 * "By default, both completed and non-completed tasks are returned. Specify
 * `true` to only return completed tasks, or `false` to only return non-completed
 * tasks." Leaving it unset is a third, distinct behaviour — which is why it is
 * a select of three rather than a boolean, since an unchecked boolean would send
 * `false` and quietly hide every completed task.
 */
const listTasks: ActionDefinition<Input> = {
  key: "list-tasks",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks, filtered by linked record, assignee or completion. Note the default order is " +
    "**oldest first** — set a sort if you want the newest.",
  params: [
    {
      key: "linkedObject",
      label: "Linked object",
      type: "string",
      placeholder: "people",
      row: "linked",
      hint: "Only tasks linked to a record on this object. **Must be given together with the " +
        "linked record id** — either alone is an error.",
    },
    {
      key: "linkedRecordId",
      label: "Linked record id",
      type: "string",
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      row: "linked",
      hint: "Only tasks linked to this record. Must be paired with the linked object.",
    },
    {
      key: "assignee",
      label: "Assignee",
      type: "string",
      placeholder: "alice@attio.com",
      hint: "A workspace member's email address or UUID. Pass the literal string `null` to find " +
        "**unassigned** tasks — that is Attio's documented way to ask for them.",
    },
    {
      key: "isCompleted",
      label: "Completion",
      type: "select",
      options: [
        { value: "", label: "Both (Attio's default)" },
        { value: "true", label: "Completed only" },
        { value: "false", label: "Not completed only" },
      ],
      hint: "Left unset, Attio returns both. This is a select rather than a checkbox precisely " +
        "because an unchecked checkbox would send `false` and hide every completed task.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: optionsFrom(TASK_SORTS),
      hint:
        "Defaults to `created_at:asc` — **oldest first**. With `completed_at:asc`, tasks that " +
        "have no completion date sort first.",
    },
    ...pageParams({ defaultLimit: QUERY_DEFAULT_LIMIT }),
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list("/tasks", {
      query: compact({
        linked_object: input.linkedObject,
        linked_record_id: input.linkedRecordId,
        assignee: input.assignee,
        // `""` means "no preference" and is dropped by the client's query
        // builder, which is exactly the tri-state behaviour documented above.
        is_completed: input.isCompleted,
        sort: input.sort,
        limit: input.limit,
        offset: input.offset,
      }),
    });
    return { records };
  },
};

export default listTasks;
