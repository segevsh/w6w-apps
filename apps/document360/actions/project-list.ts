import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { listOutput, pagingParams, pagingQuery } from "../lib/params.ts";

/** List the projects (knowledge bases) the API key can access. Use it to find the project id. */
interface Input {
  page?: number;
  pageSize?: number;
  cursor?: string;
  includeTotalCount?: boolean;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description:
    "List the projects (knowledge bases) the API key can access. Use it to find the project id.",
  params: [...pagingParams],
  output: listOutput,

  async execute(input, ctx) {
    return await new Document360Client(ctx).list("/v3/projects", pagingQuery(input));
  },
};

export default projectList;
