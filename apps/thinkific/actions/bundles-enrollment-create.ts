import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam, ISO_DATETIME_HINT } from "../lib/params.ts";

interface Input {
  id: string;
  userId: number;
  activatedAt?: string;
  expiryDate?: string;
}

/**
 * `POST /bundles/{id}/enrollments` — enroll a User in a Bundle AND each
 * Course within it, in one call.
 *
 * The response is **201 or 202** ("Enrollments created synchronously" /
 * "...asynchronously") with no documented body schema for either — so this
 * action reports the HTTP status rather than inventing response fields the
 * vendor does not describe. Poll `bundles-enrollments-list` (or
 * `enrollments-list` filtered by `userId`) to see the resulting Enrollment
 * rows once they exist.
 */
const bundlesEnrollmentCreate: ActionDefinition<Input> = {
  key: "bundles-enrollment-create",
  type: "perform",
  resource: "bundles",
  title: "Create Bundle Enrollment",
  description: "Enroll a User in a Bundle and every Course it contains.",
  idempotent: false,
  params: [
    idParam("Bundle"),
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "activatedAt",
      label: "Activated at",
      type: "datetime",
      hint: "Leave empty to grant only free-preview content. Set to now for full access. " +
        ISO_DATETIME_HINT,
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "datetime",
      hint: "Leave empty for an enrollment that never expires. " + ISO_DATETIME_HINT,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status: 201 (sync) or 202 (async)" }],

  async execute(input, ctx) {
    const body = {
      user_id: input.userId,
      activated_at: input.activatedAt,
      expiry_date: input.expiryDate,
    };
    const status = await new ThinkificClient(ctx).status(
      `/bundles/${encodeURIComponent(input.id)}/enrollments`,
      { method: "POST", body },
    );
    return { status };
  },
};

export default bundlesEnrollmentCreate;
