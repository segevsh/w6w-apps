import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /organization/members` — "Get members" (scope `organizations:read`). Answers a bare array
 * of members; it is not paginated. The member `id` is what `conversation-assign` takes as its
 * user.
 */
type Input = Record<string, never>;

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "user",
  title: "List Members",
  description: "List the members of the organization.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(_input, ctx) {
    return new SalesmsgClient(ctx).items("/organization/members");
  },
};

export default memberList;
