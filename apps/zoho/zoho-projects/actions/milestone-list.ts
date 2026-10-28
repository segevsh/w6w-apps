import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId, projectId, sortBy, viewId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  viewId?: string;
}

const milestoneList: ActionDefinition<Input> = {
  key: "milestone-list",
  type: "read",
  resource: "milestone",
  title: "List Milestones",
  description: "List the milestones (phases) of a project. Uses the v3.1 endpoint.",
  params: [
    portalId,
    projectId,
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
      await client.get(`/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/phases`, {
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        view_id: input.viewId,
      }, "v3.1"),
      "phases",
    );
  },
};

export default milestoneList;
