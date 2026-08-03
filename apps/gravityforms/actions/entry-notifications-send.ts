import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  notificationIds?: string[];
  event?: string;
}

/**
 * `POST /gf/v2/entries/[ENTRY_ID]/notifications` — send an existing entry's
 * notifications.
 *
 * This is the piece Create Entry deliberately skips, offered separately so an
 * import can decide per-entry whether anyone should be emailed. It is also how
 * you re-send a notification that bounced or was mis-configured at submission
 * time.
 *
 * Both body properties are optional:
 *
 *   - `_notifications` — comma-separated notification IDs to process. Omit to
 *     let Gravity Forms process the ones configured for the event. Get Form
 *     returns the IDs (`notifications` is keyed by them).
 *   - `_event` — the event to trigger. Defaults to `form_submission`.
 *
 * The response is the list of notification IDs that were processed; it is
 * nested under `notifications` here to give the action a declarable output
 * shape.
 *
 * Capability: `gravityforms_edit_entries`.
 */
const entryNotificationsSend: ActionDefinition<Input> = {
  key: "entry-notifications-send",
  type: "perform",
  resource: "entry",
  title: "Send Entry Notifications",
  description:
    "Process an entry's notifications, optionally restricted to specific notification IDs.",
  // Sends email. Running it twice sends twice.
  idempotent: false,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "notificationIds",
      label: "Notification IDs",
      type: "multiselect",
      hint:
        "Sent as `_notifications`, comma-separated. Leave empty to process every notification " +
        "configured for the event. Get Form lists the IDs.",
    },
    {
      key: "event",
      label: "Event",
      type: "string",
      default: "form_submission",
      hint: "The event to trigger (`_event`). Defaults to `form_submission`.",
    },
  ],
  output: [
    { key: "notifications", type: "array", label: "Notification IDs that were processed" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "sending Gravity Forms notifications", { entryId: input.entryId });
    const client = GravityFormsClient.fromConnection(ctx);

    const body: Record<string, unknown> = {};
    const ids = (input.notificationIds ?? []).filter((id) =>
      id !== undefined && id !== null &&
      String(id) !== ""
    );
    if (ids.length > 0) body._notifications = ids.join(",");
    if (input.event) body._event = input.event;

    const notifications = await client.request<unknown>(
      `/entries/${encodeURIComponent(String(input.entryId))}/notifications`,
      { method: "POST", body },
    );
    return { notifications };
  },
};

export default entryNotificationsSend;
