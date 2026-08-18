import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `GET /user_management/users/{id}` — one authenticating identity.
 *
 * Two fields carry most of the meaning. **`email_verified`** decides whether
 * password sign-in works at all, and **`last_sign_in_at`** is the only
 * trustworthy answer to "is this seat being used" — a seat audit built on
 * created dates counts people who signed up once and never came back.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get a user",
  description: "One identity. `email_verified` decides whether password sign-in works, and " +
    "`last_sign_in_at` is the honest answer to whether a seat is being used.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "user_01E4ZCR3C56J083X43JQXF3JK5",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "email_verified", type: "boolean", label: "Verified — required for password sign-in" },
    { key: "last_sign_in_at", type: "string", label: "Last sign-in" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");
    return await new WorkOSClient(ctx).request(
      `/user_management/users/${encodeURIComponent(id)}`,
    );
  },
};

export default action;
