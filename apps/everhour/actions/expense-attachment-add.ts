import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /expenses/{expenseId}/attachments` — Upload an attachment (base64) directly onto an expense.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  expenseId: number;
  name: string;
  content: string;
}

const expenseAttachmentAdd: ActionDefinition<Input> = {
  key: "expense-attachment-add",
  type: "perform",
  resource: "attachment",
  title: "Add Attachment To Expense",
  description: "Upload an attachment (base64) directly onto an expense.",
  idempotent: false,
  params: [
    {
      key: "expenseId",
      label: "Expense ID",
      type: "number",
      required: true,
      hint: "Numeric expense id (from List Expenses).",
    },
    {
      key: "name",
      label: "File name",
      type: "string",
      required: true,
      hint: "e.g. `receipt.png`.",
    },
    {
      key: "content",
      label: "Content (base64)",
      type: "text",
      required: true,
      hint: "Base64 file content. Only jpg, png and pdf are supported.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Attachment ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "token", type: "string", label: "Download token" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/expenses/${encodeId(input.expenseId)}/attachments`, {
      method: "POST",
      body: compact({ name: input.name, content: input.content }),
    });
  },
};

export default expenseAttachmentAdd;
