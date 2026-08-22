import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_STATUSES, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /conversations` — verified against Front's own OpenAPI document
 * (`list-conversations`).
 *
 * **This list is ordered by Front's bump settings, not by creation time.** The
 * spec says so: results come back "in reverse chronological order (most
 * recently updated first)", and *what counts as an update* is a company setting
 * — a comment may or may not bump a conversation to the top. A workflow that
 * pages this list expecting a stable order will see rows move between pages
 * while it reads. When order matters, `conversation-search` with an explicit
 * query is the honest tool.
 */
const action: ActionDefinition = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List conversations",
  description:
    "Conversations across the company, newest activity first. Filter by status — open work is " +
    "`assigned` plus `unassigned`, which are two statuses rather than one.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: CONVERSATION_STATUSES,
      hint: "Leave empty for every status. There is no single `open` value — open work is " +
        "`assigned` plus `unassigned`.",
    },
    {
      key: "sortOrder",
      label: "Sort Order",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Front's default (newest activity first)" },
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const statuses = Array.isArray(p.statuses)
      ? (p.statuses as string[])
      : typeof p.statuses === "string" && p.statuses
      ? [p.statuses]
      : [];

    ctx.log("info", "listing Front conversations", { statuses, returnAll, limit });

    return await new FrontClient(ctx).requestAll("/conversations", {
      q: { statuses },
      // `sort_by` is deliberately unset: Front's spec says it "only supports
      // `date`", which is already the default, so sending it adds nothing.
      query: { sort_order: p.sortOrder as string },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
