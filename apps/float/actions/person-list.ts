import type { ActionDefinition } from "@w6w/types";
import { FloatClient, toCsv } from "../lib/client.ts";
import {
  activeParam,
  fieldsParam,
  modifiedSinceParam,
  paginationParams,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v3/people` — list people on the schedule.
 *
 * People are a distinct entity from Accounts: a Person exists on the
 * schedule and only has a linked Account if they were invited to sign in.
 * Each ACTIVE person contributes to a billing seat; archived people do not.
 */
interface Input {
  active?: string;
  department_id?: number;
  email?: string;
  people_code?: string;
  people_type_id?: string;
  employee_type?: number;
  tag_name?: string;
  page?: number;
  "per-page"?: number;
  sort?: string;
  modified_since?: string;
  fields?: string;
  expand?: string[] | string;
}

const personList: ActionDefinition<Input> = {
  key: "person-list",
  type: "read",
  resource: "person",
  title: "List People",
  description: "Search for people in your organization.",
  params: [
    activeParam,
    { key: "department_id", label: "Department ID", type: "number", validation: { integer: true } },
    { key: "email", label: "Email (exact match)", type: "string" },
    { key: "people_code", label: "People code (exact match)", type: "string" },
    {
      key: "people_type_id",
      label: "People type",
      type: "select",
      options: [
        { value: "1", label: "Employee" },
        { value: "2", label: "Contractor" },
        { value: "3", label: "Placeholder" },
        { value: "4", label: "Role placeholder (not returned by default)" },
      ],
      hint: "Accepts a comma-separated list (e.g. `1,2`). Type 4 is excluded unless requested.",
    },
    {
      key: "employee_type",
      label: "Employee type",
      type: "select",
      options: [{ value: 1, label: "Full-time" }, { value: 0, label: "Part-time" }],
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
        { value: "account", label: "Account" },
        { value: "managers", label: "Managers" },
        { value: "contracts", label: "Contracts" },
      ],
    },
  ],
  output: [
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "job_title", type: "string", label: "Job title" },
    { key: "active", type: "number", label: "Active (1) or archived (0)" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/people", {
      active: input.active,
      department_id: input.department_id,
      email: input.email,
      people_code: input.people_code,
      people_type_id: input.people_type_id,
      employee_type: input.employee_type,
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

export default personList;
