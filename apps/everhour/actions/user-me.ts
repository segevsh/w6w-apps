import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /users/me` — Fetch the user the API key belongs to.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const userMe: ActionDefinition<Input> = {
  key: "user-me",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the user the API key belongs to.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "admin, supervisor or member" },
    { key: "status", type: "string", label: "Account status" },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).one(`/users/me`);
  },
};

export default userMe;
