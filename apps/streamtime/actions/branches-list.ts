import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `GET /branches` — every branch, in one unpaginated array.
 *
 * One of only four resources Streamtime answers with a real list endpoint (with
 * rate cards, roles and users). There is no `offset`/`limit` and no query
 * parameter of any kind on this route, so nothing is exposed here — the response
 * is the whole set, and every entity in it is read-only per the schema.
 */
const branchesList: ActionDefinition<Record<string, never>> = {
  key: "branches-list",
  type: "search",
  resource: "branch",
  title: "List Branches",
  description:
    "List all branches of the organisation. Unpaginated — the response is the whole set.",
  params: [],
  output: [{ key: "branches", type: "array", label: "Branches" }],

  async execute(_input, ctx) {
    const branches = await new StreamtimeClient(ctx).request<unknown[]>("/branches");
    return { branches: branches ?? [] };
  },
};

export default branchesList;
