import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, unset } from "../lib/client.ts";

interface Input {
  email?: string;
  userName?: string;
  startIndex?: number;
  count?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the domain's users, optionally filtered by exact email or username (case-insensitive). Needs the user-management scope and, on most domains, an admin token.",
  params: [
    { key: "email", label: "Email", type: "string", row: "filter" },
    { key: "userName", label: "Username", type: "string", row: "filter" },
    {
      key: "startIndex",
      label: "Start index",
      type: "number",
      advanced: true,
      row: "page",
      default: 1,
      validation: { min: 1, integer: true },
      hint: "1-based.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "resources", type: "array", label: "Users" },
    { key: "totalResults", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const email = unset(input.email);
    const userName = unset(input.userName);
    if (email && userName) {
      throw new Error("Filter by either email or username, not both — Egnyte takes one filter.");
    }
    const filter = email
      ? `email eq "${email.replaceAll('"', '\\"')}"`
      : userName
      ? `userName eq "${userName.replaceAll('"', '\\"')}"`
      : undefined;
    return new EgnyteClient(ctx).request("/v2/users", {
      query: { filter, startIndex: input.startIndex, count: input.count },
    });
  },
};

export default userList;
