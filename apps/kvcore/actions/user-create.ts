import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { userBody, userFields } from "../lib/params.ts";

/** `POST /v2/public/user` — create a new kvCORE user (agent or lender). */
const userCreate: ActionDefinition<Record<string, unknown>> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a new user (agent or lender). Requires an All-scoped token.",
  idempotent: false,
  params: userFields({ create: true }),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json("/user", { method: "POST", body: userBody(input) });
  },
};

export default userCreate;
