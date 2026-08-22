import type { ActionDefinition } from "@w6w/types";
import { compact, FrontClient, unixSeconds } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `PATCH /conversations/{conversation_id}/reminders` — verified against Front's
 * own OpenAPI document (`update-conversation-reminders`).
 *
 * Snoozing is how a shared inbox handles "not now": the conversation leaves the
 * queue and comes back at a stated time. That makes it the natural partner of a
 * workflow that is waiting on something outside Front — a shipment, a renewal
 * date, a reply that has not come.
 *
 * ## A snooze belongs to a teammate, not to the conversation
 *
 * Front requires `teammate_id`, and what it means depends on the conversation:
 * on a **private** conversation it must be the teammate who owns it, and on a
 * **shared** one any teammate with access to the inbox will do — the reminder
 * is then shared with everyone in it. So a workflow snoozing on behalf of a
 * team can name any member; one snoozing a private thread must name its owner.
 *
 * ## Unsnoozing is the same call with no time
 *
 * `scheduled_at: null` cancels the reminder and brings the conversation back
 * now. That is why the time is optional here rather than required.
 *
 * Timestamps are **Unix seconds**, must be in the future, and must be within 50
 * years — the ISO string a form produces is converted for exactly this reason.
 */
const action: ActionDefinition = {
  key: "conversation-snooze",
  type: "perform",
  resource: "conversation",
  title: "Snooze conversation",
  description:
    "Take a conversation out of the queue until a stated time — or, with no time, put it back " +
    "now. The reminder belongs to a teammate, whom Front requires you to name.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "teammateId",
      label: "Teammate",
      type: "string",
      required: true,
      default: "",
      placeholder: "tea_55c8c149",
      hint: "Whose reminder this is. On a shared conversation, any teammate with inbox access — " +
        "the reminder is then shared. On a private one, its owner. An `alt:email:…` alias works.",
    },
    {
      key: "scheduledAt",
      label: "Wake At",
      type: "datetime",
      default: "",
      hint: "Must be in the future. Leave empty to UNSNOOZE — Front reads a missing time as " +
        "`null`, which cancels the reminder.",
    },
    {
      key: "statusId",
      label: "Waiting Status ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Ticketing companies only — the waiting status to park the conversation in. Front " +
        "uses the default waiting status when this is empty.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Snoozed" },
    { key: "scheduledAt", type: "number", label: "Wake At (Unix seconds)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const teammateId = String(p.teammateId ?? "").trim();
    if (!teammateId) throw new Error("`teammateId` is required — a reminder belongs to a person");

    const scheduledAt = unixSeconds(p.scheduledAt, "scheduledAt") ?? null;

    ctx.log(
      "info",
      scheduledAt === null ? "unsnoozing Front conversation" : "snoozing Front " +
        "conversation",
      { conversationId },
    );

    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/reminders`,
      {
        method: "PATCH",
        // `scheduled_at` must survive as an explicit null — that is the unsnooze.
        body: {
          teammate_id: teammateId,
          scheduled_at: scheduledAt,
          ...compact({ status_id: String(p.statusId ?? "") || undefined }),
        },
      },
    );
    return { ok: true, scheduledAt };
  },
};

export default action;
