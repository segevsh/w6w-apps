import type { ActionDefinition } from "@w6w/types";
import { encodeId, StudioClient } from "../lib/client.ts";
import { domainParam, userEmailParam } from "../lib/params.ts";

interface Input {
  domain: string;
  email: string;
}

const userInvite: ActionDefinition<Input> = {
  key: "user-invite",
  type: "perform",
  resource: "user",
  title: "Invite User",
  description: "Send an invitation email to an existing user of a published Softr app. The app " +
    "must be published for the invitation to be sent.",
  // Each call sends a real email; retrying it is not side-effect-free.
  idempotent: false,
  params: [domainParam, userEmailParam],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request(
      `/users/${encodeId(input.email)}/invite`,
      { method: "POST" },
    );
    return { result };
  },
};

export default userInvite;
