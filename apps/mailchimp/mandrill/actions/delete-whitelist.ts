import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email: string;
}

const deleteWhitelist: ActionDefinition<Input> = {
  key: "delete-whitelist",
  type: "perform",
  resource: "whitelist-entry",
  title: "Delete Whitelist Entry",
  description: "Remove an email from the rejection whitelist (POST /whitelists/delete.json).",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/whitelists/delete.json", { email: input.email });
  },
};

export default deleteWhitelist;
