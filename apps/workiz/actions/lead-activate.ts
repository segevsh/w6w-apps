import type { ActionDefinition } from "@w6w/types";
import { encodeId, WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { StatusAck } from "../lib/schema.ts";

/**
 * `POST /lead/activate/{UUID}/` — put a lost lead back.
 *
 * The inverse of `lead-mark-lost`, with the same addressing: the account token
 * in the path, the lead's own `auth_secret` in the body. Workiz answers a bare
 * array of `{code, flag, msg}`, so the vendor's verdict is in the body, not the
 * status line. Activating an already-active lead is a no-op.
 */
interface Input {
  uuid: string;
  authSecret: string;
}

const leadActivate: ActionDefinition<Input, StatusAck[]> = {
  key: "lead-activate",
  type: "perform",
  resource: "lead",
  title: "Activate Lead",
  description: "Reactivate a lost lead, identified by UUID and its per-record auth secret.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Lead UUID",
      type: "string",
      required: true,
      hint: "The lead's unique id.",
    },
    authSecretParam(),
  ],
  output: [
    { key: "code", type: "string", label: "Vendor result code" },
    { key: "flag", type: "boolean", label: "Workiz accepted the change" },
    { key: "msg", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json<StatusAck[]>(
      `/lead/activate/${encodeId(input.uuid)}/`,
      { method: "POST", body: { auth_secret: input.authSecret } },
    );
    return body ?? [];
  },
};

export default leadActivate;
