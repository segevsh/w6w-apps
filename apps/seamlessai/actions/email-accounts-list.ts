import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/email-accounts` — List Email Accounts. */
interface Input {
  searchText?: string;
  limit?: number;
  page?: number;
}

const emailAccountsList: ActionDefinition<Input> = {
  key: "email-accounts-list",
  type: "read",
  resource: "email-account",
  title: "List Email Accounts",
  description:
    "Connected sending mailboxes. Returns addresses and provider, never mailbox credentials.",
  params: [
    { key: "searchText", label: "Search text", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number, starting at 1.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
    { key: "total", type: "number", label: "Total accounts" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/email-accounts", {
      query: compact({
        searchText: input.searchText,
        limit: toInt(input.limit, "Limit"),
        page: toInt(input.page, "Page"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default emailAccountsList;
