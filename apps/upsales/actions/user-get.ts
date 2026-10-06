import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/master/users/{id}` — Fetch one user by ID (documented under /master/users). */
interface Input {
  id: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID (documented under /master/users).",
  params: [idParam("id", "User ID")],
  output: [{ key: "data", type: "object", label: "The user" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/master/users/${encodeId(input.id)}`);
    return { data };
  },
};

export default userGet;
