import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { fieldsParam, modifiedSinceParam, paginationParams, sortParam } from "../lib/params.ts";

/**
 * `GET /v3/logged-time` — list logged time for a person or project.
 *
 * Every Logged Time endpoint answers `403` with the message "Time Tracking
 * is not enabled for this team" when the Float account has that feature
 * turned off — worth surfacing distinctly rather than treating it as a
 * generic auth failure, since reconnecting the credential will not fix it.
 */
interface Input {
  people_id?: number;
  project_id?: number;
  phase_id?: number;
  task_meta_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  "per-page"?: number;
  sort?: string;
  modified_since?: string;
  fields?: string;
}

const loggedTimeList: ActionDefinition<Input> = {
  key: "logged-time-list",
  type: "read",
  resource: "logged-time",
  title: "List Logged Time",
  description: "List logged time for a person or project within a date range. 403s with " +
    '"Time Tracking is not enabled for this team" if that feature is off.',
  params: [
    { key: "people_id", label: "Person ID", type: "number", validation: { integer: true } },
    { key: "project_id", label: "Project ID", type: "number", validation: { integer: true } },
    { key: "phase_id", label: "Phase ID", type: "number", validation: { integer: true } },
    {
      key: "task_meta_id",
      label: "Project task ID",
      type: "number",
      validation: { integer: true },
    },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "end_date", label: "End date", type: "date" },
    ...paginationParams(),
    sortParam,
    modifiedSinceParam,
    fieldsParam,
  ],
  output: [
    { key: "logged_time_id", type: "string", label: "Logged time ID (string, not an integer)" },
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/logged-time", {
      people_id: input.people_id,
      project_id: input.project_id,
      phase_id: input.phase_id,
      task_meta_id: input.task_meta_id,
      start_date: input.start_date,
      end_date: input.end_date,
      page: input.page,
      "per-page": input["per-page"],
      sort: input.sort,
      modified_since: input.modified_since,
      fields: input.fields,
    });
    return { items, pagination };
  },
};

export default loggedTimeList;
