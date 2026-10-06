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
  search?: string;
}

/** `GET /rest/v1.0/companies/{company_id}/users` */
const companyUserList: ActionDefinition<Input> = {
  key: "company-user-list",
  type: "read",
  resource: "user",
  title: "List Company Users",
  description: "List the users in a company's directory.",
  params: [
    { ...companyIdParam, required: true },
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
      `/rest/v1.0/companies/${encodeURIComponent(String(input.companyId))}/users`,
      input,
      { "filters[search]": input.search },
    );
  },
};

export default companyUserList;
