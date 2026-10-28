import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";

const userGet: ActionDefinition<{ accountId: string }> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a user by Atlassian account id.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "From `user-search`. Not a username — Atlassian removed those from the API.",
    },
  ],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "emailAddress", type: "string", label: "Email (only if visible to you)" },
    { key: "active", type: "boolean", label: "Active" },
  ],

  execute(input, ctx) {
    return new JiraClient(ctx).request("/user", { query: { accountId: input.accountId } });
  },
};

export default userGet;
