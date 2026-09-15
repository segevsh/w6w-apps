import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/** `GET /parser/{id}` — a single mailbox's full configuration. */
interface Input {
  mailboxId: string;
}

const mailboxGet: ActionDefinition<Input> = {
  key: "mailbox-get",
  type: "read",
  resource: "mailbox",
  title: "Get Mailbox",
  description: "Fetch a single mailbox by id.",
  params: [mailboxIdParam],
  output: [
    { key: "id", type: "number", label: "Mailbox ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email_prefix", type: "string", label: "Email prefix" },
    { key: "document_count", type: "number", label: "Document count" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/parser/${encodeId(input.mailboxId)}`);
  },
};

export default mailboxGet;
