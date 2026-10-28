import type { ActionDefinition } from "@w6w/types";
import { seg, ZohoCliqClient } from "../lib/client.ts";

interface Input {
  userId: string;
}

interface Output {
  teams: Array<Record<string, unknown>>;
}

/** `GET /api/v2/users/{userid}/teams` — scope `ZohoCliq.Users.READ`; `{ data: [...] }`. */
const userTeamList: ActionDefinition<Input, Output> = {
  key: "user-team-list",
  type: "read",
  resource: "user",
  title: "List a User's Teams",
  description: "List the teams a user belongs to.",
  params: [{ key: "userId", label: "User ID", type: "string", required: true }],
  output: [{ key: "teams", type: "array", label: "Teams" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<{ data?: Array<Record<string, unknown>> }>(
      `/users/${seg(input.userId)}/teams`,
    );
    return { teams: body?.data ?? [] };
  },
};

export default userTeamList;
