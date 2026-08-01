import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  id: number;
  cancelNote?: string;
  noShow?: boolean;
  admin?: boolean;
  noEmail?: boolean;
}

/**
 * PUT /appointments/{id}/cancel — cancel an appointment. `admin: true`
 * bypasses the client-facing cancellation rules (and unlocks `noShow`);
 * `noEmail: true` skips the cancellation email/SMS. Retrying with the same
 * input lands on the same canceled state, so this is marked idempotent.
 */
const appointmentCancel: ActionDefinition<Input> = {
  key: "appointment-cancel",
  type: "perform",
  resource: "appointment",
  title: "Cancel Appointment",
  description: "Cancel an appointment (PUT /appointments/{id}/cancel).",
  idempotent: true,
  params: [
    { key: "id", label: "Appointment ID", type: "number", required: true },
    {
      key: "cancelNote",
      label: "Cancellation note",
      type: "text",
      hint: "Included in the cancellation notification.",
    },
    {
      key: "noShow",
      label: "Mark as no-show",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Admin-only.",
    },
    {
      key: "admin",
      label: "Cancel as admin",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Bypasses client cancellation rules and allows setting no-show.",
    },
    {
      key: "noEmail",
      label: "Skip cancellation email/SMS",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],

  execute(input, ctx) {
    return new AcuityClient(ctx).request(
      `/appointments/${encodeURIComponent(input.id)}/cancel`,
      {
        method: "PUT",
        query: { admin: input.admin, noEmail: input.noEmail },
        body: { cancelNote: input.cancelNote, noShow: input.noShow },
      },
    );
  },
};

export default appointmentCancel;
