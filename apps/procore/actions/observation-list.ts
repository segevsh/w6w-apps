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
  status?: string;
  search?: string;
}

/**
 * `GET /rest/v1.0/observations/items?project_id=` — `project_id` is a query
 * parameter here, not a path segment. `filters[status]` takes integer codes.
 */
const observationList: ActionDefinition<Input> = {
  key: "observation-list",
  type: "read",
  resource: "observation",
  title: "List Observations",
  description: "List a project's observation items.",
  params: [
    companyIdParam,
    projectIdParam,
    ...pagingParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Initiated" },
        { value: "1", label: "Ready for review" },
        { value: "2", label: "Not accepted" },
        { value: "3", label: "Closed" },
        { value: "4", label: "Draft" },
      ],
    },
    { key: "search", label: "Search", type: "string" },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list("/rest/v1.0/observations/items", input, {
      project_id: input.projectId,
      "filters[status]": input.status,
      "filters[search]": input.search,
    });
  },
};

export default observationList;
