import type { ActionDefinition } from "@w6w/types";
import { compact, FrontClient, json } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `PATCH /conversations/{conversation_id}` — verified against Front's own
 * OpenAPI document (`update-conversation`).
 *
 * ## Two fields on this route replace rather than merge, and one is missing here
 *
 * `tag_ids` is documented as "the tag IDs **replacing** the old conversation
 * tags". Sending one tag on a conversation that has three removes the other
 * two, silently, and the call succeeds. That is a genuinely destructive edit
 * hiding inside an ordinary-looking field, and Front already ships a
 * non-destructive alternative — `POST`/`DELETE /conversations/{id}/tags`, which
 * add and remove individually.
 *
 * **So this action does not expose `tag_ids` at all.** Tagging goes through
 * `conversation-tag-add` and `conversation-tag-remove`, where the intent is
 * written on the action. A workflow that genuinely wants to replace every tag
 * can remove then add.
 *
 * `custom_fields` behaves the same way — Front's own note says omitted fields
 * "will be erased" — but there is no per-field alternative, so it stays, with
 * the warning attached to the param. Read the conversation first, merge, send
 * the whole object.
 *
 * ## `status` versus `status_id`
 *
 * A company with ticketing enabled has named statuses with their own ids, and
 * Front accepts *one of the two*, never both. Both are offered; sending both is
 * refused here rather than at Front.
 */
const action: ActionDefinition = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update conversation",
  description:
    "Change a conversation's status, inbox, assignee or custom fields. Tags are deliberately " +
    "not here — Front's tag field replaces the whole set, so use Add/Remove Tag instead.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "open", label: "Open — back into the queue" },
        { value: "archived", label: "Archived — done" },
        { value: "spam", label: "Spam" },
        { value: "deleted", label: "Deleted — into the trash" },
      ],
    },
    {
      key: "statusId",
      label: "Ticket Status ID",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "sts_123",
      hint: "Ticketing companies only, and mutually exclusive with Status. `status-list` has " +
        "the ids.",
    },
    {
      key: "assigneeId",
      label: "Assignee ID",
      type: "string",
      default: "",
      hint: "Teammate id, or `null` to unassign. Assign Conversation does the same thing on its " +
        "own route.",
    },
    {
      key: "inboxId",
      label: "Move to Inbox ID",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "customFields",
      label: "Custom Fields",
      type: "json",
      default: "",
      advanced: true,
      hint: "⚠️ Replaces the WHOLE set — any custom field you omit is erased. Read the " +
        "conversation first and send them all.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");

    const status = String(p.status ?? "");
    const statusId = String(p.statusId ?? "");
    if (status && statusId) {
      throw new Error(
        "give either `status` or `statusId`, not both — Front accepts only one of the pair",
      );
    }

    // `null` unassigns, and it has to survive `compact`, so assignee is set
    // explicitly rather than folded in with the rest.
    const assigneeRaw = String(p.assigneeId ?? "").trim();
    const body: Record<string, unknown> = compact({
      status: status || undefined,
      status_id: statusId || undefined,
      inbox_id: String(p.inboxId ?? "") || undefined,
      custom_fields: json(p.customFields, "customFields"),
    });
    if (assigneeRaw) body.assignee_id = assigneeRaw === "null" ? null : assigneeRaw;

    if (Object.keys(body).length === 0) throw new Error("nothing to update");

    ctx.log("info", "updating Front conversation", { conversationId, fields: Object.keys(body) });
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}`,
      { method: "PATCH", body },
    );
    // Front answers 204 with no body; saying so beats returning undefined.
    return { ok: true };
  },
};

export default action;
