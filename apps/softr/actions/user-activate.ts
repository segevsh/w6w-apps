import type { ActionDefinition } from "@w6w/types";
import { encodeId, StudioClient } from "../lib/client.ts";
import { domainParam, userEmailParam } from "../lib/params.ts";

interface Input {
  domain: string;
  email: string;
}

const userActivate: ActionDefinition<Input> = {
  key: "user-activate",
  type: "perform",
  resource: "user",
  title: "Activate User",
  description: "Re-activate a previously deactivated user in a published Softr app.",
  idempotent: true,
  params: [domainParam, userEmailParam],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request(
      `/users/${encodeId(input.email)}/activate`,
      { method: "POST" },
    );
    return { result };
  },
};

export default userActivate;
