import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";

/**
 * `PUT /admin/users/{id}/suspend.json`.
 *
 * Keyed on the numeric **user id**, not the username — this is an admin route,
 * and the admin routes are id-keyed throughout. `user-get` returns the id for a
 * username.
 *
 * Both `suspend_until` and `reason` are required by the schema. There is no
 * indefinite suspension on this endpoint: the reference's own example for the
 * date is `2121-02-22`, i.e. "forever" is expressed as a date a century out
 * rather than as a null.
 *
 * `reason` is shown to staff. `message` is different: the reference says it
 * "Will send an email with this message when present", so supplying it is what
 * turns a silent suspension into a notified one. The two are labelled so that
 * distinction is visible in the form — sending mail to a community member by
 * accident is not a recoverable mistake.
 */
interface Input {
  userId: number | string;
  suspendUntil: string;
  reason: string;
  message?: string;
  postAction?: string;
}

const userSuspend: ActionDefinition<Input> = {
  key: "user-suspend",
  type: "perform",
  resource: "user",
  title: "Suspend User",
  description: "Suspend an account until a given date, with a reason.",
  // Re-suspending with the same dates converges on the same state.
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Numeric id — this admin route is not keyed on username. `user-get` returns it.",
      validation: { integer: true },
    },
    {
      key: "suspendUntil",
      label: "Suspend until",
      type: "string",
      required: true,
      placeholder: "2121-02-22",
      hint: "A date. Discourse has no indefinite suspension here — use a far-future date.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Recorded for staff.",
    },
    {
      key: "message",
      label: "Email message",
      type: "text",
      config: { multiline: true },
      hint: "Supplying this SENDS the user an email. Leave blank to suspend silently.",
    },
    {
      key: "postAction",
      label: "Action on their posts",
      type: "string",
      advanced: true,
      placeholder: "delete",
      hint: "Discourse's reference gives `delete` as the example value.",
    },
  ],
  output: [
    { key: "suspension", type: "object", label: "Suspension" },
    { key: "suspension.suspended_till", type: "string", label: "Suspended until" },
    { key: "suspension.suspended_at", type: "string", label: "Suspended at" },
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(
      `/admin/users/${encodeURIComponent(String(input.userId))}/suspend.json`,
      {
        method: "PUT",
        body: compact({
          suspend_until: input.suspendUntil,
          reason: input.reason,
          message: unset(input.message),
          post_action: unset(input.postAction),
        }),
      },
    );
  },
};

export default userSuspend;
