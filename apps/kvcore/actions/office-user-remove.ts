import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  office_id: string;
  user_id: string;
}

/**
 * `DELETE /v2/public/office/{office_id}/user/{user_id}` — remove a user from
 * an office. Only removes the office membership; the user itself is
 * untouched (see `user-delete` to remove the user entirely).
 */
const officeUserRemove: ActionDefinition<Input> = {
  key: "office-user-remove",
  type: "perform",
  resource: "office",
  title: "Remove User from Office",
  description: "Remove a user from an office. Does not delete the user account itself.",
  idempotent: true,
  params: [
    { key: "office_id", label: "Office ID", type: "string", required: true },
    { key: "user_id", label: "User ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(
      `/office/${encodeURIComponent(input.office_id)}/user/${encodeURIComponent(input.user_id)}`,
      { method: "DELETE" },
    );
  },
};

export default officeUserRemove;
