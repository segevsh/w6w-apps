import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import {
  createdParam,
  idsParam,
  listOutput,
  modifiedParam,
  pagingParams,
  pagingQuery,
} from "../lib/params.ts";

/** `GET /crm/v2/tenant/{tenant}/leads`. */
interface Input {
  ids?: string;
  status?: string;
  customerId?: number;
  leadCustomerName?: string;
  leadPhone?: string;
  createdOnOrAfter?: string;
  modifiedOnOrAfter?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description: "List leads, optionally filtered by status, customer or contact details.",
  params: [
    idsParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Open", value: "Open" },
        { label: "Dismissed", value: "Dismissed" },
        { label: "Converted", value: "Converted" },
      ],
    },
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "leadCustomerName", label: "Lead customer name", type: "string" },
    { key: "leadPhone", label: "Lead phone", type: "string" },
    createdParam,
    modifiedParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("crm", "/leads", {
      query: compact({
        ids: idList(input.ids),
        status: input.status,
        customerId: input.customerId,
        leadCustomerName: input.leadCustomerName,
        leadPhone: input.leadPhone,
        createdOnOrAfter: input.createdOnOrAfter,
        modifiedOnOrAfter: input.modifiedOnOrAfter,
        ...pagingQuery(input),
      }),
    });
  },
};

export default leadList;
