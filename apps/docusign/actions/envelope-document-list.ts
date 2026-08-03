import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  includeMetadata?: boolean;
  includeTabs?: boolean;
  recipientId?: string;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents` —
 * `EnvelopeDocuments: list`. Returns each document's `documentId` and `name`,
 * which is what `envelope-document-download` needs; the ids are small integers
 * assigned at envelope creation, not GUIDs.
 *
 * The list also includes Docusign's synthetic `certificate` entry (the
 * certificate of completion) when the account has it enabled — it is a real
 * downloadable document, not a placeholder.
 */
const envelopeDocumentList: ActionDefinition<Input> = {
  key: "envelope-document-list",
  type: "read",
  resource: "document",
  title: "List Envelope Documents",
  description: "List the documents in an envelope, with the document IDs needed to download them.",
  params: [
    envelopeIdParam,
    { key: "includeMetadata", label: "Include metadata", type: "boolean" },
    { key: "includeTabs", label: "Include tabs", type: "boolean" },
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "string",
      hint: "Return the documents as this recipient sees them.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "envelopeDocuments", type: "array", label: "Documents" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/documents`,
      {
        query: {
          include_metadata: input.includeMetadata,
          include_tabs: input.includeTabs,
          recipient_id: input.recipientId,
        },
      },
    );
  },
};

export default envelopeDocumentList;
