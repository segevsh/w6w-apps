import type { ActionDefinition } from "@w6w/types";
import { SignWellClient } from "../lib/client.ts";

/**
 * `GET /api/v1/bulk_sends` — verified against SignWell's OpenAPI document (`listBulkSends`).
 * Page-numbered: `page` (from 1) and `limit` (1–50, default 10) in; `bulk_sends[]` plus
 * `current_page`, `next_page`, `previous_page`, `total_count`, `total_pages` out. `user_email`
 * lists another user's bulk sends and needs the admin or manager role.
 */
const bulkSendList: ActionDefinition = {
  key: "bulk-send-list",
  type: "search",
  resource: "bulk-send",
  title: "List Bulk Sends",
  description: "List bulk sends, newest page first, with completion counts.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Starts at 1." },
    { key: "limit", label: "Limit", type: "number", hint: "1–50. SignWell's default is 10." },
    {
      key: "user_email",
      label: "User email",
      type: "string",
      hint: "Another user's bulk sends — needs the admin or manager role.",
    },
    { key: "api_application_id", label: "API application id", type: "string" },
  ],
  output: [
    { key: "bulk_sends", type: "array", label: "Bulk sends" },
    { key: "current_page", type: "number", label: "Current page" },
    { key: "next_page", type: "number", label: "Next page, if any" },
    { key: "total_count", type: "number", label: "Total bulk sends" },
    { key: "total_pages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    ctx.log("info", "listing SignWell bulk sends");
    return await new SignWellClient(ctx).request("/bulk_sends", {
      query: {
        page: i.page as number | undefined,
        limit: i.limit as number | undefined,
        user_email: i.user_email as string | undefined,
        api_application_id: i.api_application_id as string | undefined,
      },
    });
  },
};

export default bulkSendList;
