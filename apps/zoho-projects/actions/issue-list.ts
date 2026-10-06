import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId, projectId, viewId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  viewId?: string;
}

const issueList: ActionDefinition<Input> = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List Issues",
  description:
    "List the issues (bugs) of a project. The vendor requires page and per_page, so they default to 1 and 100.",
  params: [
    portalId,
    projectId,
    page,
    perPage,
    {
      key: "sortBy",
      label: "Sort By",
      type: "select",
      hint: "Field to sort by.",
      options: [{ value: "created_time", label: "Created time" }, {
        value: "due_date",
        label: "Due date",
      }, { value: "modified_time", label: "Modified time" }],
    },
    viewId,
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "hasNext", type: "boolean", label: "More pages available" },
    { key: "page", type: "number", label: "Page number returned" },
  ],

  async execute(input, ctx) {
    const client = new ProjectsClient(ctx);
    return listResult(
      await client.get(`/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/issues`, {
        page: input.page ?? 1,
        per_page: input.perPage ?? 100,
        sort_by: input.sortBy,
        view_id: input.viewId,
      }),
      "issues",
    );
  },
};

export default issueList;
