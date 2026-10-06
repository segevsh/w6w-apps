import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Add Knowledge to Email Inbox — Attach a trained knowledge item to a email inbox.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  knowledgeId: string;
}

const emailInboxKnowledgeAdd: ActionDefinition<Input> = {
  key: "email-inbox-knowledge-add",
  type: "perform",
  resource: "knowledge",
  title: "Add Knowledge to Email Inbox",
  description: "Attach a trained knowledge item to a email inbox.",
  idempotent: true,
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID; for the knowledge endpoints Aidbase also accepts the inbox alias.",
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
    return new AidbaseClient(ctx).done(`/email-inbox/${encodeId(input.emailInboxId)}/knowledge`, {
      method: "PUT",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default emailInboxKnowledgeAdd;
