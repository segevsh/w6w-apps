import type { ActionDefinition } from "@w6w/types";
import { asText, LodgifyClient, requireNumber, requireText, segment } from "../lib/client.ts";

/**
 * Add a message to a booking or an enquiry. Wraps
 * `POST /v1/reservation/booking/{id}/messages` and
 * `POST /v1/reservation/enquiry/{id}/messages`; both take an array of
 * `{subject, message, type (Owner|Comment|Renter), send_notification, message_id}`.
 * This sends one. `Owner` is a message from the host to the guest, `Renter` is from the
 * guest, `Comment` is an internal note.
 */
const action: ActionDefinition = {
  key: "send-message",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Add a message",
  description: "Add a message to a booking's or an enquiry's thread: a reply to the guest, a " +
    "guest message, or an internal comment.",
  params: [
    {
      key: "target",
      label: "Add to",
      type: "select",
      required: true,
      options: [
        { value: "booking", label: "Booking" },
        { value: "enquiry", label: "Enquiry" },
      ],
    },
    { key: "id", label: "Booking or enquiry ID", type: "number", required: true },
    { key: "message", label: "Message", type: "text", required: true },
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "type",
      label: "Message type",
      type: "select",
      default: "Owner",
      options: [
        { value: "Owner", label: "Owner (to the guest)" },
        { value: "Renter", label: "Renter (from the guest)" },
        { value: "Comment", label: "Comment (internal note)" },
      ],
    },
    {
      key: "sendNotification",
      label: "Notify the guest",
      type: "boolean",
      hint: "Send the guest an email notification.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Added" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = requireText(p.target, "target");
    if (target !== "booking" && target !== "enquiry") {
      throw new Error("`target` must be booking or enquiry");
    }
    const id = requireNumber(p.id, "id");
    const message: Record<string, unknown> = {
      message: requireText(p.message, "message"),
      type: asText(p.type) ?? "Owner",
    };
    const subject = asText(p.subject);
    if (subject) message.subject = subject;
    if (typeof p.sendNotification === "boolean") message.send_notification = p.sendNotification;
    return await new LodgifyClient(ctx).command(
      `/v1/reservation/${target}/${segment(id)}/messages`,
      { method: "POST", body: [message] },
    );
  },
};

export default action;
