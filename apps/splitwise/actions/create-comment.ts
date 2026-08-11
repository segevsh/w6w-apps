import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `POST /create_comment` — post a comment on an expense.
 *
 * The body is `{expense_id, content}`, both at top level. The created comment
 * comes back with `comment_type: "User"`, distinguishing it from the System
 * entries Splitwise writes itself (see List Comments).
 *
 * ## Not idempotent
 *
 * There is no idempotency key, and Splitwise does not deduplicate identical
 * comments — a retry after a dropped connection posts the message twice, in a
 * thread people read. `false` is the honest flag.
 */
interface Input {
  expenseId: number;
  content: string;
}

const createComment: ActionDefinition<Input> = {
  key: "create-comment",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on an expense.",
  idempotent: false,
  params: [
    {
      key: "expenseId",
      label: "Expense ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "content",
      label: "Comment",
      type: "text",
      required: true,
      placeholder: "Does this include the delivery fee?",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "comment_type", type: "string", label: "System | User" },
    { key: "relation_id", type: "number", label: "Expense the comment is on" },
    { key: "created_at", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const expenseId = Number(input.expenseId);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      throw new Error(`expenseId must be a positive integer id, got "${String(input.expenseId)}"`);
    }
    const content = String(input.content ?? "").trim();
    if (!content) throw new Error("content is required");

    const res = await new SplitwiseClient(ctx).request("/create_comment", {
      method: "POST",
      body: { expense_id: expenseId, content },
    });
    return pick<Record<string, unknown>>(res, "comment", {});
  },
};

export default createComment;
