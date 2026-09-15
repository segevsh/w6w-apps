import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

/**
 * `POST /document/{id}/skip` — mark a document `SKIPPED` instead of parsing it.
 *
 * Unlike `document-reprocess`, this one answers synchronously with the
 * updated Document record (`status: "SKIPPED"`).
 *
 * `idempotent: true`: skipping an already-skipped document leaves it skipped.
 */
interface Input {
  documentId: string;
}

const documentSkip: ActionDefinition<Input> = {
  key: "document-skip",
  type: "perform",
  resource: "document",
  title: "Skip Document",
  description: "Mark a document as skipped instead of parsing it.",
  idempotent: true,
  params: [documentIdParam],
  output: [
    { key: "id", type: "number", label: "Document ID" },
    { key: "status", type: "string", label: "Status — SKIPPED on success" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/document/${encodeId(input.documentId)}/skip`, {
      method: "POST",
    });
  },
};

export default documentSkip;
