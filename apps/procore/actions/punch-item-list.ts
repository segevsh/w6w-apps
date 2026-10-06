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
  priority?: string;
  query?: string;
}

/** `GET /rest/v1.0/punch_items?project_id=` */
const punchItemList: ActionDefinition<Input> = {
  key: "punch-item-list",
  type: "read",
  resource: "punch-item",
  title: "List Punch Items",
  description: "List a project's punch list items.",
  params: [
    companyIdParam,
    projectIdParam,
    ...pagingParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: ["low", "medium", "high"].map((v) => ({ value: v, label: v })),
    },
    { key: "query", label: "Search", type: "string" },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list("/rest/v1.0/punch_items", input, {
      project_id: input.projectId,
      "filters[status]": input.status,
      "filters[priority]": input.priority,
      "filters[query]": input.query,
    });
  },
};

export default punchItemList;
