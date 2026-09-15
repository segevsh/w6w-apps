import type { ActionDefinition } from "@w6w/types";
import { encodeId, StudioClient } from "../lib/client.ts";
import { domainParam, userEmailParam } from "../lib/params.ts";

interface Input {
  domain: string;
  email: string;
}

const userDeactivate: ActionDefinition<Input> = {
  key: "user-deactivate",
  type: "perform",
  resource: "user",
  title: "Deactivate User",
  description: "Deactivate a user in a published Softr app. Deactivated users cannot log in and " +
    "don't count toward the plan's user limit, but their record is retained.",
  idempotent: true,
  params: [domainParam, userEmailParam],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request(
      `/users/${encodeId(input.email)}/deactivate`,
      { method: "POST" },
    );
    return { result };
  },
};

export default userDeactivate;
