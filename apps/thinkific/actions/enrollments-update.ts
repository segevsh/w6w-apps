import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam, ISO_DATETIME_HINT } from "../lib/params.ts";

interface Input {
  id: string;
  activatedAt?: string;
  expiryDate?: string;
}

/** `PUT /enrollments/{id}` — update an Enrollment's activation/expiry. Returns 204. */
const enrollmentsUpdate: ActionDefinition<Input> = {
  key: "enrollments-update",
  type: "perform",
  resource: "enrollments",
  title: "Update Enrollment",
  description: "Update an Enrollment's activation and/or expiry date.",
  idempotent: true,
  params: [
    idParam("Enrollment"),
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
    const body = { activated_at: input.activatedAt, expiry_date: input.expiryDate };
    const status = await new ThinkificClient(ctx).status(
      `/enrollments/${encodeURIComponent(input.id)}`,
      { method: "PUT", body },
    );
    return { status };
  },
};

export default enrollmentsUpdate;
