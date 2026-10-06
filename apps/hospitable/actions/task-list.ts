import type { ActionDefinition } from "@w6w/types";
import { HospitableClient, listValue } from "../lib/client.ts";
import { PAGED, PAGED_OUTPUT, PROPERTY_IDS } from "../lib/params.ts";

/** `GET /v2/tasks` — List operations tasks (cleanings and the like) for properties. */
interface Input {
  property_ids: unknown;
  start_date?: string;
  end_date?: string;
  task_types?: unknown;
  statuses?: unknown;
  reservation_uuid?: string;
  teammate_uuid?: string;
  include?: string;
  page?: number;
  per_page?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List operations tasks for one or more properties. Dates default to today through two weeks ahead unless a reservation or teammate filter is set. Needs task:read.",
  params: [
    PROPERTY_IDS,
    {
      key: "start_date",
      label: "Start date",
      type: "date",
      hint: "YYYY-MM-DD; defaults to today.",
    },
    {
      key: "end_date",
      label: "End date",
      type: "date",
      hint: "YYYY-MM-DD; defaults to two weeks after the start.",
    },
    {
      key: "task_types",
      label: "Task types",
      type: "text",
      hint: "Comma separated task type ids (1-5); labels are in `meta.task_types` of the response.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "text",
      hint:
        "Comma separated: pending, accepted, rejected, cancelled, unassigned, not_started, on_the_way, arrived, in_progress, completed.",
    },
    { key: "reservation_uuid", label: "Reservation UUID", type: "string" },
    { key: "teammate_uuid", label: "Teammate UUID", type: "string" },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Only `marketplace` is supported on the list endpoint.",
    },
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/tasks", {
      query: {
        "properties[]": listValue(input.property_ids),
        start_date: input.start_date,
        end_date: input.end_date,
        "task_types[]": listValue(input.task_types),
        "status[]": listValue(input.statuses),
        reservation_uuid: input.reservation_uuid,
        teammate_uuid: input.teammate_uuid,
        include: input.include,
        page: input.page,
        per_page: input.per_page,
      },
    });
  },
};

export default taskList;
