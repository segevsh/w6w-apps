import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Remove Knowledge from Ticket Form — Detach a knowledge item from a ticket form. The knowledge item itself is not deleted.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  knowledgeId: string;
}

const ticketFormKnowledgeRemove: ActionDefinition<Input> = {
  key: "ticket-form-knowledge-remove",
  type: "perform",
  resource: "knowledge",
  title: "Remove Knowledge from Ticket Form",
  description:
    "Detach a knowledge item from a ticket form. The knowledge item itself is not deleted.",
  idempotent: true,
  params: [
    {
      "key": "ticketFormId",
      "label": "Ticket Form ID",
      "type": "string",
      "required": true,
      "hint":
        "The form's public ID (`public_id` from List Ticket Forms), as used in Aidbase's examples.",
    },
    {
      "key": "knowledgeId",
      "label": "Knowledge ID",
      "type": "string",
      "required": true,
      "hint": "A trained knowledge item (see Train Knowledge).",
    },
  ],
  output: [
    {
      "key": "ok",
      "type": "boolean",
      "label": "True when Aidbase answered success",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).done(`/ticket-form/${encodeId(input.ticketFormId)}/knowledge`, {
      method: "DELETE",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default ticketFormKnowledgeRemove;
