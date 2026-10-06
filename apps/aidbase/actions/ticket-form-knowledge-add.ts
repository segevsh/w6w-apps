import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Add Knowledge to Ticket Form — Attach a trained knowledge item to a ticket form.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  knowledgeId: string;
}

const ticketFormKnowledgeAdd: ActionDefinition<Input> = {
  key: "ticket-form-knowledge-add",
  type: "perform",
  resource: "knowledge",
  title: "Add Knowledge to Ticket Form",
  description: "Attach a trained knowledge item to a ticket form.",
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
      method: "PUT",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default ticketFormKnowledgeAdd;
