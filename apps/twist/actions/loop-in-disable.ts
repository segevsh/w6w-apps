import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/loop_in/disable`
 *
 * Disable a loop-in email address.
 */
interface Input {
  objType: string;
  objId: number;
}

const loopInDisable: ActionDefinition<Input> = {
  key: "loop-in-disable",
  type: "perform",
  resource: "loop-in",
  title: "Disable Loop-in Email",
  description: "Disable a loop-in email address.",
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
      path: "/loop_in/disable",
      params: { "obj_type": input.objType, "obj_id": input.objId },
    });
  },
};

export default loopInDisable;
