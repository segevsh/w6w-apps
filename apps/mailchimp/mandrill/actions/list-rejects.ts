import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email?: string;
  includeExpired?: boolean;
}

const listRejects: ActionDefinition<Input> = {
  key: "list-rejects",
  type: "read",
  resource: "reject",
  title: "List Rejects",
  description: "Return the email rejection denylist (POST /rejects/list.json).",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Limit results to one address." },
    { key: "includeExpired", label: "Include expired", type: "boolean", default: false },
  ],
  output: [{ key: "rejects", type: "array", label: "Rejects" }],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/rejects/list.json", {
      email: input.email,
      include_expired: input.includeExpired ?? false,
    });
  },
};

export default listRejects;
