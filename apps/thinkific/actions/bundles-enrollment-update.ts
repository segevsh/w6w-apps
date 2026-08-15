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
 * `PUT /bundles/{id}/enrollments` — update a User's Enrollment in a Bundle and
 * every Course within it. Returns 204 with no body.
 *
 * Unlike `PUT /enrollments/{id}`, this endpoint is not id-scoped to a single
 * Enrollment row — it is addressed by `(bundleId, userId)` in the body, which
 * is why `userId` is required here (it identifies *which* Enrollment to
 * touch) and not on the plain Enrollment update.
 */
const bundlesEnrollmentUpdate: ActionDefinition<Input> = {
  key: "bundles-enrollment-update",
  type: "perform",
  resource: "bundles",
  title: "Update Bundle Enrollment",
  description: "Update a User's activation/expiry for a Bundle and every Course within it.",
  idempotent: true,
  params: [
    idParam("Bundle"),
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "activatedAt",
      label: "Activated at",
      type: "datetime",
      hint: "Leave empty to leave the Enrollment as a free trial. " + ISO_DATETIME_HINT,
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "datetime",
      hint: "Leave empty for an enrollment that never expires. " + ISO_DATETIME_HINT,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const body = {
      user_id: input.userId,
      activated_at: input.activatedAt,
      expiry_date: input.expiryDate,
    };
    const status = await new ThinkificClient(ctx).status(
      `/bundles/${encodeURIComponent(input.id)}/enrollments`,
      { method: "PUT", body },
    );
    return { status };
  },
};

export default bundlesEnrollmentUpdate;
