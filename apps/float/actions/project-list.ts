import type { ActionDefinition } from "@w6w/types";
import { FloatClient, intBool, toCsv } from "../lib/client.ts";
import {
  activeParam,
  fieldsParam,
  modifiedSinceParam,
  paginationParams,
  sortParam,
} from "../lib/params.ts";

/** `GET /v3/projects` — list projects. */
interface Input {
  project_code?: string;
  client_id?: number;
  active?: string;
  billable?: string;
  status?: number;
  tag_name?: string;
  page?: number;
  "per-page"?: number;
  sort?: string;
  modified_since?: string;
  fields?: string;
  expand?: string[] | string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "Search for projects.",
  params: [
    { key: "project_code", label: "Project code (exact match)", type: "string" },
    { key: "client_id", label: "Client ID", type: "number", validation: { integer: true } },
    activeParam,
    {
      key: "billable",
      label: "Billable only",
      type: "select",
      options: [{ value: "true", label: "Billable" }, { value: "false", label: "Non-billable" }],
      hint: "Leave empty to return both.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 0, label: "Draft" },
        { value: 1, label: "Tentative" },
        { value: 2, label: "Confirmed" },
        { value: 3, label: "Completed" },
        { value: 4, label: "Canceled" },
      ],
    },
    { key: "tag_name", label: "Tag name", type: "string", advanced: true },
    ...paginationParams(),
    sortParam,
    modifiedSinceParam,
    fieldsParam,
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "expenses", label: "Expenses" },
        { value: "phases", label: "Phases" },
        { value: "project_tasks", label: "Project tasks" },
        { value: "project_team", label: "Project team" },
        { value: "currency", label: "Currency" },
      ],
    },
  ],
  output: [
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "active", type: "number", label: "Active (1) or archived (0)" },
  ],

  async execute(input, ctx) {
    const nonBillable = input.billable === undefined
      ? undefined
      : intBool(input.billable === "false");
    const { items, pagination } = await new FloatClient(ctx).list("/projects", {
      project_code: input.project_code,
      client_id: input.client_id,
      active: input.active,
      non_billable: nonBillable,
      status: input.status,
      tag_name: input.tag_name,
      page: input.page,
      "per-page": input["per-page"],
      sort: input.sort,
      modified_since: input.modified_since,
      fields: input.fields,
      expand: toCsv(input.expand),
    });
    return { items, pagination };
  },
};

export default projectList;
