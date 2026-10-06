import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId, sortBy, viewId } from "../lib/params.ts";

interface Input {
  portalId: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  viewId?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List the projects of a portal.",
  params: [
    portalId,
    page,
    perPage,
    sortBy,
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
      await client.get(`/portal/${enc(input.portalId)}/projects`, {
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        view_id: input.viewId,
      }),
      "projects",
    );
  },
};

export default projectList;
