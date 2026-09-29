import type { ActionDefinition } from "@w6w/types";
import { compact, KvCoreClient, type KvCoreListPage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  offices?: number[];
  lenders?: number[];
  teams?: number[];
  since?: string;
  before?: string;
  status?: boolean;
  mls_id?: string;
  page?: number;
  limit?: number;
}

interface UserSummary {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  [key: string]: unknown;
}

/** `GET /v2/public/users` — list users, optionally filtered. */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users on the account. Combine filters to narrow the result.",
  params: [
    {
      key: "offices",
      label: "Office IDs",
      type: "multiselect",
      hint: "Members of any of these offices.",
    },
    {
      key: "lenders",
      label: "Lender IDs",
      type: "multiselect",
      hint: "Users whose default lender is one of these.",
    },
    {
      key: "teams",
      label: "Team IDs",
      type: "multiselect",
      hint: "Members of any of these teams.",
    },
    {
      key: "since",
      label: "Updated since",
      type: "datetime",
      hint: "UTC. Users updated at or after this time.",
    },
    {
      key: "before",
      label: "Updated before",
      type: "datetime",
      hint: "UTC. Users updated before this time.",
    },
    {
      key: "status",
      label: "Active only",
      type: "boolean",
      hint: "On: active users. Off: roster-only users. Leave empty for both.",
    },
    { key: "mls_id", label: "MLS ID(s)", type: "string", hint: "Comma-separated." },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
    { key: "total", type: "number", label: "Total matching users" },
    { key: "current_page", type: "number", label: "Current page" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json<KvCoreListPage<UserSummary>>("/users", {
      query: compact({
        "offices[]": input.offices?.map(String),
        "lenders[]": input.lenders?.map(String),
        "teams[]": input.teams?.map(String),
        since: input.since,
        before: input.before,
        status: input.status === undefined ? undefined : (input.status ? 1 : 0),
        mls_id: input.mls_id,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default userList;
