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

/** `GET /rest/v1.0/projects/{project_id}/rfis` */
const rfiList: ActionDefinition<Input> = {
  key: "rfi-list",
  type: "read",
  resource: "rfi",
  title: "List RFIs",
  description: "List a project's Requests for Information, optionally by status or search term.",
  params: [
    companyIdParam,
    projectIdParam,
    ...pagingParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "draft", label: "Draft" },
        { value: "closed_with_revision", label: "Closed with revision" },
        { value: "closed_draft", label: "Closed draft" },
      ],
    },
    { key: "search", label: "Search", type: "string", hint: "Matches subject or number." },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/rfis`,
      input,
      { "filters[status]": input.status, search: input.search },
    );
  },
};

export default rfiList;
