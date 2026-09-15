import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `GET /parser/{id}/schema` — the mailbox's fields, as a JSON Schema object.
 *
 * Useful for building a dynamic form or a downstream mapping step from
 * whatever fields this particular mailbox happens to extract, without
 * hard-coding them.
 */
interface Input {
  mailboxId: string;
}

const mailboxSchemaGet: ActionDefinition<Input> = {
  key: "mailbox-schema-get",
  type: "read",
  resource: "mailbox",
  title: "Get Mailbox Schema",
  description: "Get the mailbox's fields as a JSON Schema object.",
  params: [mailboxIdParam],
  output: [
    { key: "type", type: "string", label: "Schema type" },
    { key: "properties", type: "object", label: "Field definitions" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/parser/${encodeId(input.mailboxId)}/schema`);
  },
};

export default mailboxSchemaGet;
