import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import {
  accountIdParam,
  extensionStatusOptions,
  extensionTypeOptions,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension` — every extension
 * (user, call queue, IVR menu, …) provisioned on the account.
 *
 * Needs `ReadAccounts` (app) / `ReadExtensions` (user). `status=Unassigned`
 * returns extensions with no `extensionNumber` — a documented special case,
 * not a bug in the filter.
 */
interface Input {
  accountId?: string;
  extensionNumber?: string;
  email?: string;
  status?: string[];
  type?: string[];
  page?: number;
  perPage?: number;
}

const extensionList: ActionDefinition<Input> = {
  key: "extension-list",
  type: "search",
  resource: "extension",
  title: "List Extensions",
  description: "List the account's extensions (users, call queues, IVR menus, and more).",
  params: [
    accountIdParam,
    { key: "extensionNumber", label: "Extension number", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Filter to one extension's email address.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: extensionStatusOptions,
      hint: "Leave empty to return every status.",
    },
    {
      key: "type",
      label: "Extension type",
      type: "multiselect",
      options: extensionTypeOptions,
      hint: "Leave empty to return every type.",
    },
    ...paginationParams(100, "RingCentral's own default."),
  ],
  output: [
    { key: "records", type: "array", label: "Extensions" },
    { key: "paging", type: "object", label: "page / perPage / totalPages / totalElements" },
    { key: "navigation", type: "object", label: "First/next/previous/last page links" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension`,
      {
        query: {
          extensionNumber: input.extensionNumber,
          email: input.email,
          status: input.status,
          type: input.type,
          page: input.page,
          perPage: input.perPage,
        },
      },
    );
  },
};

export default extensionList;
