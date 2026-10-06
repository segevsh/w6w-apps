import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectUserList: ActionDefinition<Input> = {
  key: "project-user-list",
  type: "read",
  resource: "user",
  title: "List Project Users",
  description: "List the users who belong to a project.",
  params: [
    portalId,
    projectId,
    page,
    perPage,
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "hasNext", type: "boolean", label: "More pages available" },
    { key: "page", type: "number", label: "Page number returned" },
  ],

  async execute(input, ctx) {
    const client = new ProjectsClient(ctx);
    return listResult(
      await client.get(`/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/users`, {
        page: input.page,
        per_page: input.perPage,
      }),
      "users",
    );
  },
};

export default projectUserList;
