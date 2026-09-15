import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `POST /parser/{id}/copy` — duplicate a mailbox's configuration.
 *
 * The OpenAPI document declares a bare `201` with no response schema or
 * example, so the body is returned through as-is rather than assumed to be
 * any particular shape.
 */
interface Input {
  mailboxId: string;
}

const mailboxCopy: ActionDefinition<Input> = {
  key: "mailbox-copy",
  type: "perform",
  resource: "mailbox",
  title: "Copy Mailbox",
  description: "Duplicate a mailbox's configuration into a new mailbox.",
  idempotent: false,
  params: [mailboxIdParam],
  output: [{ key: "result", type: "object", label: "Vendor response (undocumented shape)" }],

  async execute(input, ctx) {
    const result = await new ParseurClient(ctx).request(
      `/parser/${encodeId(input.mailboxId)}/copy`,
      { method: "POST" },
    );
    return { result };
  },
};

export default mailboxCopy;
