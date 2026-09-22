import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { ConvertResult } from "../lib/schema.ts";

/**
 * `POST /lead/convert/` — convert a lead into a job.
 *
 * Body `{UUID, auth_secret}`; the response is a bare array carrying the **new
 * job's** identity `{ClientId, UUID, link}` — note the UUID it returns is the
 * job's, not the lead's, so it is the value `job-get`, `job-update` and
 * `job-add-payment` take afterwards.
 *
 * Not idempotent, and deliberately so: converting is a state transition whose
 * repeat behaviour the vendor does not document, and a retry that produced a
 * second job would be worse than a failed one. A workflow that is unsure
 * whether the first call landed should read the lead back before retrying.
 */
interface Input {
  uuid: string;
  authSecret: string;
}

const leadConvert: ActionDefinition<Input, ConvertResult[]> = {
  key: "lead-convert",
  type: "perform",
  resource: "lead",
  title: "Convert Lead to Job",
  description: "Convert a lead into a job and return the new job's UUID, client id and link.",
  idempotent: false,
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
    { key: "ClientId", type: "string", label: "Client id" },
    { key: "UUID", type: "string", label: "New job UUID" },
    { key: "link", type: "string", label: "Web-app link to the new job" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json<ConvertResult[]>("/lead/convert/", {
      method: "POST",
      body: { UUID: input.uuid, auth_secret: input.authSecret },
    });
    return body ?? [];
  },
};

export default leadConvert;
