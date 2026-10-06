import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/users` — List the account's users.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  limit?: number;
  page?: number;
  search?: string;
  ids?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description: "List the account's users.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (maximum 100). Vendor default 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Name or email.",
    },
    {
      key: "ids",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{users[]}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/users", {
      query: { limit: input.limit, page: input.page, search: input.search, ids: input.ids },
    });
  },
};

export default userList;
