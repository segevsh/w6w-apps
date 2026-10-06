import type { ActionDefinition } from "@w6w/types";
import {
  companyIdParam,
  type Page,
  pageOutput,
  pagingParams,
  ProcoreClient,
} from "../lib/client.ts";

interface Input {
  companyId: number;
  page?: number;
  perPage?: number;
  compact?: boolean;
}

/**
 * `GET /rest/v1.0/projects?company_id=` — `company_id` is a required query
 * parameter here, in addition to the company header.
 */
const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List the projects of a company that the signed-in user can see.",
  params: [
    { ...companyIdParam, required: true, hint: "The company whose projects to list." },
    ...pagingParams,
    {
      key: "compact",
      label: "Compact view",
      type: "boolean",
      hint: "Return only id, name and display_name for each project.",
    },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list("/rest/v1.0/projects", input, {
      company_id: input.companyId,
      serializer_view: input.compact ? "compact" : undefined,
    });
  },
};

export default projectList;
