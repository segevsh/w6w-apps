import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  status?: string;
  pageSize?: number;
  nextPageToken?: string;
}

const userGetMany: ActionDefinition<Input> = {
  key: "user-get-many",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the account's users. Needs account-level scopes.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      row: "page",
      validation: { min: 1, max: 300, integer: true },
    },
    { key: "nextPageToken", label: "Page token", type: "string", row: "page", advanced: true },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
    { key: "total_records", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request("/users", {
      query: {
        status: unset(input.status),
        page_size: input.pageSize,
        next_page_token: unset(input.nextPageToken),
      },
    });
  },
};

export default userGetMany;
