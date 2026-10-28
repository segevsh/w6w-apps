import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email?: string;
}

const listWhitelist: ActionDefinition<Input> = {
  key: "list-whitelist",
  type: "read",
  resource: "whitelist-entry",
  title: "List Whitelist",
  description:
    "Return the email rejection whitelist, up to 1000 results (POST /whitelists/list.json).",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "An address or search prefix to limit results.",
    },
  ],
  output: [{ key: "entries", type: "array", label: "Whitelist Entries" }],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/whitelists/list.json", { email: input.email });
  },
};

export default listWhitelist;
