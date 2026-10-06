import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  email: string;
}

/** `POST /api/1/unsubscribeSubscriber/` */
const subscriberUnsubscribe: ActionDefinition<Input> = {
  key: "subscriber-unsubscribe",
  type: "perform",
  title: "Unsubscribe Subscriber",
  description: "Mark a subscriber of a list as unsubscribed (keeps the record).",
  idempotent: true,
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Subscriber email address.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await call(ctx, "unsubscribeSubscriber", {
      list_id: required("list_id", input.list_id),
      email: required("email", input.email),
    });
    return { ok: true };
  },
};

export default subscriberUnsubscribe;
