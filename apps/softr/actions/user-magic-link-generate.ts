import type { ActionDefinition } from "@w6w/types";
import { encodeId, StudioClient } from "../lib/client.ts";
import { domainParam, userEmailParam } from "../lib/params.ts";

interface Input {
  domain: string;
  email: string;
}

const userMagicLinkGenerate: ActionDefinition<Input> = {
  key: "user-magic-link-generate",
  type: "perform",
  resource: "user",
  title: "Generate Magic Link",
  description: "Generate a Magic Link sign-in for a user of a published Softr app.",
  // Each call is documented to generate a fresh link; treated as non-idempotent
  // rather than assumed to return the same link twice.
  idempotent: false,
  params: [domainParam, userEmailParam],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request(
      `/users/magic-link/generate/${encodeId(input.email)}`,
      { method: "POST" },
    );
    return { result };
  },
};

export default userMagicLinkGenerate;
