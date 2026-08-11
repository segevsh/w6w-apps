import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_comments?expense_id=…` — the comment thread on one expense.
 *
 * `expense_id` is a **query** parameter and it is required — this is the only
 * endpoint in the app's surface that identifies its subject that way rather
 * than in the path.
 *
 * ## Half the "comments" are not comments
 *
 * `comment_type` is `"System"` or `"User"`. System entries are Splitwise's own
 * audit trail, rendered as prose:
 *
 *     "John D. updated this transaction: - The cost changed from $6.99 to $8.99"
 *
 * A workflow that treats every row as something a person wrote will act on
 * those. This action returns the whole thread as Splitwise sends it and also
 * splits out `user_comments`, so a notifier can post the human ones without
 * reimplementing the filter.
 *
 * Deleted comments come back with `deleted_at` set rather than being omitted.
 * There is no pagination.
 */
interface Input {
  expenseId: number;
}

interface Comment {
  comment_type?: string;
  deleted_at?: string | null;
}

const listComments: ActionDefinition<Input> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description:
    "The comment thread on an expense. Splitwise mixes its own System audit entries into it, so " +
    "the human-written ones are also returned separately.",
  params: [
    {
      key: "expenseId",
      label: "Expense ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "comments", type: "array", label: "Every comment, System and User" },
    { key: "user_comments", type: "array", label: "Only the human-written, undeleted ones" },
  ],

  async execute(input, ctx) {
    const expenseId = Number(input.expenseId);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      throw new Error(`expenseId must be a positive integer id, got "${String(input.expenseId)}"`);
    }

    const body = await new SplitwiseClient(ctx).request("/get_comments", {
      query: { expense_id: expenseId },
    });
    const comments = pick<Comment[]>(body, "comments", []);
    return {
      comments,
      user_comments: comments.filter((c) => c?.comment_type === "User" && !c?.deleted_at),
    };
  },
};

export default listComments;
