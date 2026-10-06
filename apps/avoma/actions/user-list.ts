import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { pageOutput } from "../lib/params.ts";

/**
 * `GET /v1/users/` — every user in the organization. Documented as a bare JSON array with no
 * parameters; it is returned as `results` with `count` so every list action reads alike.
 */
type Input = Record<string, never>;

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the organization's Avoma users with their role, team and active status.",
  params: [],
  output: pageOutput,

  execute(_input, ctx) {
    return new AvomaClient(ctx).list("/v1/users/", {});
  },
};

export default userList;
