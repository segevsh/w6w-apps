import type { ActionDefinition } from "@w6w/types";
import {
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  TASK_TYPES,
} from "../lib/client.ts";

interface Input extends PageInput {
  personId?: number;
  assignedTo?: string;
  assignedUserId?: number;
  name?: string;
  type?: string;
  isCompleted?: boolean;
  due?: string;
  dueStart?: string;
  dueEnd?: string;
}

/**
 * `GET /tasks` — list and filter tasks.
 *
 * The `due` filter is the one worth pointing out: it takes three named ranges
 * rather than dates — `today`, `overdue`, `upcoming` — which is what makes "give
 * me every overdue task" a single call instead of a date computation the caller
 * has to get right in the account's timezone. `dueStart` / `dueEnd` are there
 * for an explicit window.
 *
 * `type` is documented as accepting a comma-separated list, so it is a
 * `multiselect` joined on commas.
 */
const searchTasks: ActionDefinition<Input> = {
  key: "search-tasks",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description:
    "List tasks, filtered by person, assignee, type, completion or due window. `due` accepts the " +
    "named ranges today / overdue / upcoming, which is usually easier than computing dates.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      hint: "Only tasks attached to this contact.",
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Only tasks assigned to this agent. Ids come from the List Users action.",
    },
    {
      key: "due",
      label: "Due",
      type: "select",
      options: [
        { value: "today", label: "Today" },
        { value: "overdue", label: "Overdue" },
        { value: "upcoming", label: "Upcoming" },
      ],
      hint: "Named due-date range.",
    },
    {
      key: "isCompleted",
      label: "Completed",
      type: "boolean",
      hint: "Filter to completed or outstanding tasks.",
    },
    {
      key: "type",
      label: "Types",
      type: "multiselect",
      options: TASK_TYPES.map((value) => ({ value, label: value })),
      hint: "One or more task types. Sent comma-separated.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      advanced: true,
      hint: 'Partial match on the task name — "world" finds "hello world".',
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      advanced: true,
      hint: "Full name of the assignee. Prefer the id where you have it.",
    },
    {
      key: "dueStart",
      label: "Due from",
      type: "string",
      advanced: true,
      hint: "Tasks due at or after this time.",
    },
    {
      key: "dueEnd",
      label: "Due until",
      type: "string",
      advanced: true,
      hint: "Tasks due at or before this time.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/tasks", {
      query: {
        ...pageQuery(input),
        personId: input.personId,
        assignedTo: input.assignedTo,
        assignedUserId: input.assignedUserId,
        name: input.name,
        type: Array.isArray(input.type) ? input.type.join(",") : input.type,
        isCompleted: input.isCompleted,
        due: input.due,
        dueStart: input.dueStart,
        dueEnd: input.dueEnd,
      },
    });
  },
};

export default searchTasks;
