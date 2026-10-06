import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Remove Knowledge from Email Inbox — Detach a knowledge item from a email inbox. The knowledge item itself is not deleted.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  knowledgeId: string;
}

const emailInboxKnowledgeRemove: ActionDefinition<Input> = {
  key: "email-inbox-knowledge-remove",
  type: "perform",
  resource: "knowledge",
  title: "Remove Knowledge from Email Inbox",
  description:
    "Detach a knowledge item from a email inbox. The knowledge item itself is not deleted.",
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
      method: "DELETE",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default emailInboxKnowledgeRemove;
