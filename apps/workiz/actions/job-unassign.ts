import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /job/unassign/` — clear a job's assignment.
 *
 * Same body shape as `job-assign` (`{UUID, User, auth_secret}`) and the same
 * `{flag, data: [{UUID, ClientId, link}]}` envelope. `User` names whose
 * assignment to clear.
 */
interface Input {
  uuid: string;
  user: string;
  authSecret: string;
}

const jobUnassign: ActionDefinition<Input, WriteAck> = {
  key: "job-unassign",
  type: "perform",
  resource: "job",
  title: "Unassign Job",
  description: "Remove a team member's assignment from a job.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Job UUID",
      type: "string",
      required: true,
      hint: "The job's unique id.",
    },
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      hint: "The Workiz user whose assignment should be cleared.",
    },
    authSecretParam(),
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the change" },
    { key: "data", type: "array", label: "Job identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/job/unassign/", {
      method: "POST",
      body: { UUID: input.uuid, User: input.user, auth_secret: input.authSecret },
    });
  },
};

export default jobUnassign;
