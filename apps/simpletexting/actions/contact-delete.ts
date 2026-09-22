import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/contacts/{contactIdOrNumber}` — "Delete a Contact".
 *
 * Answers `204` with no body, so there is nothing to unwrap and nothing to
 * return but the status. Either addressing form works: the phone number
 * (preferred) or the hexadecimal contact ID.
 *
 * ## Idempotent, and not the same statement as "answers 204 twice"
 *
 * The end state after one call and after five is the same: that contact is
 * gone. The document lists only `204` for this path, so a repeat is not
 * documented — and the delete is worth retrying precisely because a contact the
 * workflow asked to delete is a contact whose continued existence is the
 * failure, not a duplicate to avoid.
 */
interface Input {
  contactIdOrNumber: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete one contact by phone number or ID.",
  idempotent: true,
  params: [contactIdParam],
  output: [
    { key: "contactIdOrNumber", type: "string", label: "Contact deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new SimpleTextingClient(ctx).status(
      `/api/contacts/${encodePathSegment(input.contactIdOrNumber)}`,
      { method: "DELETE" },
    );
    ctx.log("info", "deleted a SimpleTexting contact", { status });
    return { contactIdOrNumber: input.contactIdOrNumber, status };
  },
};

export default contactDelete;
