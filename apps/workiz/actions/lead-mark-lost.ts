import type { ActionDefinition } from "@w6w/types";
import { encodeId, WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { StatusAck } from "../lib/schema.ts";

/**
 * `POST /lead/markLost/{UUID}/` — mark a lead lost.
 *
 * The lead is addressed by UUID in the path and identified a second time by its
 * own `auth_secret` in the body — the two are not interchangeable: the path
 * token is the account's, the body secret is the record's.
 *
 * The response is a **bare array** of `{code, flag, msg}`, not the
 * `{flag, data}` envelope the create/update calls use. `flag` is the vendor's
 * verdict and `msg` its explanation, so a workflow should check the body rather
 * than the HTTP status. Marking an already-lost lead lost is a no-op, so the
 * call is safe to retry.
 */
interface Input {
  uuid: string;
  authSecret: string;
}

const leadMarkLost: ActionDefinition<Input, StatusAck[]> = {
  key: "lead-mark-lost",
  type: "perform",
  resource: "lead",
  title: "Mark Lead Lost",
  description: "Mark a lead lost, identified by UUID and its per-record auth secret.",
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
      `/lead/markLost/${encodeId(input.uuid)}/`,
      { method: "POST", body: { auth_secret: input.authSecret } },
    );
    return body ?? [];
  },
};

export default leadMarkLost;
