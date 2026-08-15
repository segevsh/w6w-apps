import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import {
  accountIdParam,
  paginationParams,
  phoneNumberStatusOptions,
  phoneNumberUsageTypeOptions,
} from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/phone-number` — every phone number
 * assigned to the account, company-level and extension-level alike.
 *
 * Needs `ReadAccounts` (app) / `ReadCompanyPhoneNumbers` (user).
 */
interface Input {
  accountId?: string;
  usageType?: string[];
  status?: string;
  page?: number;
  perPage?: number;
}

const phoneNumberList: ActionDefinition<Input> = {
  key: "phone-number-list",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "List the account's phone numbers (company- and extension-level).",
  params: [
    accountIdParam,
    {
      key: "usageType",
      label: "Usage type",
      type: "multiselect",
      options: phoneNumberUsageTypeOptions,
      hint: "Leave empty to return every usage type.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: phoneNumberStatusOptions,
    },
    ...paginationParams(100, "RingCentral's own default."),
  ],
  output: [
    { key: "records", type: "array", label: "Phone numbers" },
    { key: "paging", type: "object", label: "page / perPage / totalPages / totalElements" },
    { key: "navigation", type: "object", label: "First/next/previous/last page links" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/phone-number`,
      {
        query: {
          usageType: input.usageType,
          status: input.status,
          page: input.page,
          perPage: input.perPage,
        },
      },
    );
  },
};

export default phoneNumberList;
