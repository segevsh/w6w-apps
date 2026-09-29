import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, includeParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  include?: string;
}

/** `GET /v1/integration_api/users/show` — a marketplace user by ID. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one marketplace user by ID.",
  params: [idParam, includeParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).show("/users/show", { id: input.id, include: input.include });
  },
};

export default userGet;
