import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient, toList } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
  include?: string[] | string;
  maxWorkspaces?: number;
  maxCustomFields?: number;
  nameContains?: string;
  projectTypeId?: string;
  projectAfter?: string;
  projectBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List the caller company's projects.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "1-indexed page number (default 1)." },
    { key: "perPage", label: "Page size", type: "number", hint: "Page size, 1-100 (default 25)." },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [{ "value": "workspaces", "label": "Workspaces" }, {
        "value": "custom_fields",
        "label": "Custom fields",
      }, { "value": "cover_image", "label": "Cover image" }],
    },
    { key: "maxWorkspaces", label: "Max workspaces", type: "number" },
    { key: "maxCustomFields", label: "Max custom fields", type: "number" },
    { key: "nameContains", label: "Name contains", type: "string" },
    { key: "projectTypeId", label: "Project type ID", type: "string" },
    { key: "projectAfter", label: "Project after", type: "date" },
    { key: "projectBefore", label: "Project before", type: "date" },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    { key: "sort", label: "Sort", type: "string", hint: 'Sort key; "-" prefix = descending.' },
  ],
  output: [
    { key: "data", type: "array", label: "Data" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/projects`, {
      query: {
        page: input.page,
        per_page: input.perPage,
        include: toList(input.include),
        max_workspaces: input.maxWorkspaces,
        max_custom_fields: input.maxCustomFields,
        name_contains: input.nameContains,
        project_type_id: input.projectTypeId,
        project_after: input.projectAfter,
        project_before: input.projectBefore,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        sort: input.sort,
      },
    });
    return result;
  },
};

export default projectList;
