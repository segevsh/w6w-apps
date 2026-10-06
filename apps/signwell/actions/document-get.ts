import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { DOCUMENT_OUTPUT, idParam } from "../lib/params.ts";

/**
 * `GET /api/v1/documents/{id}` — verified against SignWell's OpenAPI document (`getDocument`).
 * `status` is the whole document's (Draft, Created, Sent, Pending, Viewed, Completed, …);
 * each recipient carries its own `status`, `signing_url` and bounce state. There is no list
 * endpoint for documents, so a document is only readable by id.
 */
const documentGet: ActionDefinition = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get a Document",
  description: "Read one document — its status, recipients (with each one's state), and files.",
  params: [idParam("Document id")],
  output: [...DOCUMENT_OUTPUT],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "getting a SignWell document", { id });
    return await new SignWellClient(ctx).request(`/documents/${encodeURIComponent(id)}`);
  },
};

export default documentGet;
