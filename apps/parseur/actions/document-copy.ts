import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

/**
 * `POST /document/{id}/copy/{target_mailbox_id}` — copy a document into
 * another mailbox.
 *
 * The OpenAPI document declares a bare `201` with no response schema, so the
 * body is returned through as-is.
 */
interface Input {
  documentId: string;
  targetMailboxId: string;
}

const documentCopy: ActionDefinition<Input> = {
  key: "document-copy",
  type: "perform",
  resource: "document",
  title: "Copy Document",
  description: "Copy a document into another mailbox.",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "targetMailboxId",
      label: "Target mailbox ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (undocumented shape)" }],

  async execute(input, ctx) {
    const result = await new ParseurClient(ctx).request(
      `/document/${encodeId(input.documentId)}/copy/${encodeId(input.targetMailboxId)}`,
      { method: "POST" },
    );
    return { result };
  },
};

export default documentCopy;
