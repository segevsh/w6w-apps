import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
  accessId: string;
}

const accessRevoke: ActionDefinition<Input> = {
  key: "access-revoke",
  type: "perform",
  resource: "access",
  title: "Revoke Access",
  description: "Revoke one access record from a customer.",
  idempotent: true,
  params: [
    CUSTOMER_ID(""),
    { "key": "accessId", "label": "Access ID", "type": "string", "required": true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Uscreen accepted the request" },
  ],

  async execute(input, ctx) {
    await new UscreenClient(ctx).call(
      "DELETE",
      `/customers/${seg(input.customerId)}/accesses/${seg(input.accessId)}`,
    );
    return { ok: true };
  },
};

export default accessRevoke;
