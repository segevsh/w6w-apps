import type { ActionDefinition } from "@w6w/types";
import { encodeId, StudioClient } from "../lib/client.ts";
import { domainParam, userEmailParam } from "../lib/params.ts";

interface Input {
  domain: string;
  email: string;
}

const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Delete a user from a published Softr app.",
  idempotent: true,
  params: [domainParam, userEmailParam],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request(
      `/users/${encodeId(input.email)}`,
      { method: "DELETE" },
    );
    return { result };
  },
};

export default userDelete;
