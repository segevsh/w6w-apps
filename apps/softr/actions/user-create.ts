import type { ActionDefinition } from "@w6w/types";
import { StudioClient } from "../lib/client.ts";
import { domainParam } from "../lib/params.ts";

/**
 * `POST /v1/api/users` (`studio-api.softr.io`) — create a user in a published
 * Softr app.
 *
 * No response schema is documented for this endpoint (see `lib/client.ts`);
 * the raw parsed body is returned under `result` rather than a guessed set of
 * fields.
 */
interface Input {
  domain: string;
  fullName: string;
  email: string;
  password?: string;
  generateMagicLink?: boolean;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a user inside a published Softr app.",
  idempotent: false,
  params: [
    domainParam,
    { key: "fullName", label: "Full name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Leave empty to have Softr generate one automatically.",
    },
    {
      key: "generateMagicLink",
      label: "Generate a magic link",
      type: "boolean",
      hint: "Also create a Magic Link sign-in for this user.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const result = await new StudioClient(ctx, input.domain).request("/users", {
      method: "POST",
      body: {
        full_name: input.fullName,
        email: input.email,
        ...(input.password ? { password: input.password } : {}),
        ...(input.generateMagicLink !== undefined
          ? { generate_magic_link: input.generateMagicLink }
          : {}),
      },
    });
    return { result };
  },
};

export default userCreate;
