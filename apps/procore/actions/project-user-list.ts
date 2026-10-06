import type { ActionDefinition } from "@w6w/types";
import {
  companyIdParam,
  type Page,
  pageOutput,
  pagingParams,
  ProcoreClient,
  projectIdParam,
} from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  page?: number;
  perPage?: number;
  search?: string;
}

/** `GET /rest/v1.0/projects/{project_id}/users` */
const projectUserList: ActionDefinition<Input> = {
  key: "project-user-list",
  type: "read",
  resource: "user",
  title: "List Project Users",
  description: "List the users in a project's directory.",
  params: [
    companyIdParam,
    projectIdParam,
    ...pagingParams,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches first name, last name or email (`filters[search]`).",
    },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/users`,
      input,
      { "filters[search]": input.search },
    );
  },
};

export default projectUserList;
