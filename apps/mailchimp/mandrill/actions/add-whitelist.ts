import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email: string;
  comment?: string;
}

const addWhitelist: ActionDefinition<Input> = {
  key: "add-whitelist",
  type: "perform",
  resource: "whitelist-entry",
  title: "Add Whitelist Entry",
  description:
    "Add an email to the rejection whitelist; removes any matching blacklist entry automatically (POST /whitelists/add.json).",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "comment", label: "Comment", type: "string" },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "added", type: "boolean", label: "Added" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/whitelists/add.json", {
      email: input.email,
      comment: input.comment,
    });
  },
};

export default addWhitelist;
