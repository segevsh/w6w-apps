import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/loop_in/get_or_create`
 *
 * Get the email address that posts into a channel, thread or conversation, creating it if needed.
 */
interface Input {
  objType: string;
  objId: number;
}

const loopInGetOrCreate: ActionDefinition<Input> = {
  key: "loop-in-get-or-create",
  type: "perform",
  resource: "loop-in",
  title: "Get or Create Loop-in Email",
  description:
    "Get the email address that posts into a channel, thread or conversation, creating it if needed.",
  idempotent: true,
  params: [
    {
      key: "objType",
      label: "Object type",
      type: "select",
      required: true,
      options: [{ value: "CHANNEL", label: "CHANNEL" }, { value: "THREAD", label: "THREAD" }, {
        value: "CONVERSATION",
        label: "CONVERSATION",
      }],
    },
    { key: "objId", label: "Object ID", type: "number", required: true },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/loop_in/get_or_create",
      params: { "obj_type": input.objType, "obj_id": input.objId },
    });
  },
};

export default loopInGetOrCreate;
