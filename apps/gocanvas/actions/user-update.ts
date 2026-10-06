import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  userId: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  enabled?: boolean;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user's name, phone or enabled flag. Enabling a user needs a free seat.",
  idempotent: true,
  params: [
    idParam("userId", "User ID"),
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Whether the user may log in. Leave unset to keep as is.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation message" },
  ],

  execute(input, ctx) {
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      enabled: input.enabled,
    });
    return new GoCanvasClient(ctx).request(`/users/${encodeId(input.userId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default userUpdate;
