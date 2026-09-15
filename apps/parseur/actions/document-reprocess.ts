import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

/**
 * `POST /document/{id}/process` — reprocess a document.
 *
 * The response is always an acknowledgement
 * (`{"notification_set":{"info":["Document is being processed. Please
 * wait."]}}`), never the updated Document — see `lib/client.ts`. Poll
 * `document-get` afterwards to see the outcome.
 *
 * `idempotent: false`: each call spends processing credits again and can
 * re-fire `document.processed` webhooks, so a retried step is a second real
 * processing run, not a no-op.
 */
interface Input {
  documentId: string;
}

const documentReprocess: ActionDefinition<Input> = {
  key: "document-reprocess",
  type: "perform",
  resource: "document",
  title: "Reprocess Document",
  description: "Reprocess a document. Asynchronous — see the action's notes.",
  idempotent: false,
  params: [documentIdParam],
  output: [{ key: "notification_set", type: "object", label: "Vendor acknowledgement" }],

  async execute(input, ctx) {
    const body = await new ParseurClient(ctx).request<{ notification_set?: unknown }>(
      `/document/${encodeId(input.documentId)}/process`,
      { method: "POST" },
    );
    return { notification_set: body?.notification_set };
  },
};

export default documentReprocess;
