import type { ActionDefinition } from "@w6w/types";
import { WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /job/assign/` — assign a user to a job.
 *
 * Body `{UUID, User, auth_secret}`, the same shape the lead side uses, but the
 * response is the **`{flag, data: [{UUID, ClientId, link}]}` envelope** rather
 * than the lead's bare array — the two resources genuinely differ here, and the
 * client does not paper over it.
 */
interface Input {
  uuid: string;
  user: string;
  authSecret: string;
}

const jobAssign: ActionDefinition<Input, WriteAck> = {
  key: "job-assign",
  type: "perform",
  resource: "job",
  title: "Assign Job",
  description: "Assign a team member to a job.",
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
      hint: "The Workiz user to assign the job to.",
    },
    authSecretParam(),
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the assignment" },
    { key: "data", type: "array", label: "Job identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/job/assign/", {
      method: "POST",
      body: { UUID: input.uuid, User: input.user, auth_secret: input.authSecret },
    });
  },
};

export default jobAssign;
