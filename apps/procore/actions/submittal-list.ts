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
  sort?: string;
}

/** `GET /rest/v1.0/projects/{project_id}/submittals` */
const submittalList: ActionDefinition<Input> = {
  key: "submittal-list",
  type: "read",
  resource: "submittal",
  title: "List Submittals",
  description: "List a project's submittals.",
  params: [
    companyIdParam,
    projectIdParam,
    ...pagingParams,
    { key: "sort", label: "Sort", type: "string", hint: "Procore's `sort` query value." },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/submittals`,
      input,
      { sort: input.sort },
    );
  },
};

export default submittalList;
