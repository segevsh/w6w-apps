import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";

const collaboratorList: ActionDefinition<Record<string, never>> = {
  key: "collaborator-list",
  type: "read",
  resource: "collaborator",
  title: "List Collaborators",
  description:
    "The users who can see the base — the pool a collaborator column draws from. Each carries " +
    "an `email` (an `…@auth.local` identifier), a display `name` and an avatar URL.",
  params: [],
  output: [{ key: "user_list", type: "array", label: "Collaborators" }],

  execute(_input, ctx) {
    return new SeaTableClient(ctx).request("/related-users/");
  },
};

export default collaboratorList;
