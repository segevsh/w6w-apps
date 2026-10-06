import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "The user the credential belongs to, with their account (company) profile.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "account", type: "object", label: "Account" },
  ],

  async execute(_input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ user: unknown }>(
      `{ user { id name email phone timeZone account { id companyName companyEmail phone website locale } } }`,
    );
    return data.user;
  },
};

export default userGet;
