import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  office_id: string;
  user_id: string;
  is_admin: boolean;
  is_primary: boolean;
}

/** `POST /v2/public/office/{office_id}/user` — add an existing user to an office. */
const officeUserAdd: ActionDefinition<Input> = {
  key: "office-user-add",
  type: "perform",
  resource: "office",
  title: "Add User to Office",
  description: "Add an existing user to an office, optionally as an office admin.",
  idempotent: true,
  params: [
    { key: "office_id", label: "Office ID", type: "string", required: true },
    { key: "user_id", label: "User ID", type: "string", required: true },
    { key: "is_admin", label: "Office admin", type: "boolean", required: true, default: false },
    {
      key: "is_primary",
      label: "Primary office for this user",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const { office_id, ...body } = input;
    return await new KvCoreClient(ctx).json(`/office/${encodeURIComponent(office_id)}/user`, {
      method: "POST",
      body: {
        user_id: body.user_id,
        is_admin: body.is_admin ? 1 : 0,
        is_primary: body.is_primary ? 1 : 0,
      },
    });
  },
};

export default officeUserAdd;
