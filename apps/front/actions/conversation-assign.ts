import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `PUT /conversations/{conversation_id}/assignee` — verified against Front's
 * own OpenAPI document (`update-conversation-assignee`).
 *
 * Assignment has its own route because it is the single most common edit in a
 * shared inbox, and because **`null` is a meaningful value**: it unassigns,
 * putting the conversation back in the unassigned queue where the next person
 * free picks it up. A workflow doing round-robin needs both halves.
 *
 * The teammate may be given as a **resource alias** — `alt:email:ada@example.com`
 * — instead of a `tea_…` id, which saves a lookup when the workflow knows who
 * somebody is by their address rather than by Front's id for them.
 */
const action: ActionDefinition = {
  key: "conversation-assign",
  type: "perform",
  resource: "conversation",
  title: "Assign conversation",
  description: "Give a conversation to a teammate, or unassign it. Accepts a teammate id or an " +
    "`alt:email:…` alias.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "assigneeId",
      label: "Assignee",
      type: "string",
      default: "",
      placeholder: "tea_55c8c149",
      hint: "Teammate id, or `alt:email:ada@example.com`. Leave empty (or type `null`) to " +
        "unassign and return it to the queue.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Assigned" },
    { key: "assigneeId", type: "string", label: "Assignee ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");

    const raw = String(p.assigneeId ?? "").trim();
    // Empty and the literal "null" both mean unassign — a form cannot type a
    // JSON null, and unassigning is half of what this route is for.
    const assignee = raw && raw !== "null" ? raw : null;

    ctx.log("info", assignee ? "assigning Front conversation" : "unassigning Front conversation", {
      conversationId,
    });
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/assignee`,
      { method: "PUT", body: { assignee_id: assignee } },
    );
    return { ok: true, assigneeId: assignee };
  },
};

export default action;
