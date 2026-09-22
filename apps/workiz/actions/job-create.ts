import type { ActionDefinition } from "@w6w/types";
import { compact, WorkizClient } from "../lib/client.ts";
import { addressAndContactFields, authSecretParam, sourceFields } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /job/create/` — create a job.
 *
 * Every field is optional in the vendor's `body` schema, and the address/contact
 * block is the one the lead body shares. `JobDateTime`/`JobEndDateTime` are the
 * job's schedule pair (the lead's are `LeadDateTime`/`LeadEndDateTime`), and
 * `auth_secret` is sent the same way as on the lead side: the account token
 * authenticates the account, the account's secret accompanies the record.
 *
 * The response is `{flag, data: [{UUID, ClientId, link}]}` — keep `data[0].UUID`
 * to address the job afterwards. Not idempotent: every call creates a job.
 */
interface Input {
  authSecret: string;
  ClientId?: number;
  Address?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  Unit?: string;
  FirstName?: string;
  LastName?: string;
  Company?: string;
  Email?: string;
  Phone?: string;
  PhoneExt?: string;
  SecondPhone?: string;
  SecondPhoneExt?: string;
  Timezone?: string;
  ServiceArea?: string;
  JobSource?: string;
  JobType?: string;
  ReferralCompany?: string;
  Created?: string;
  CreatedBy?: string;
  JobDateTime?: string;
  JobEndDateTime?: string;
  JobNotes?: string;
  [key: string]: unknown;
}

const jobCreate: ActionDefinition<Input, WriteAck> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a Workiz job and return its UUID, client id and web-app link.",
  idempotent: false,
  params: [
    authSecretParam(),
    ...addressAndContactFields(),
    ...sourceFields(),
    {
      key: "Created",
      label: "Created",
      type: "datetime",
      hint: "When the job was created, if it is being backfilled from another system.",
    },
    { key: "CreatedBy", label: "Created by", type: "string" },
    {
      key: "JobDateTime",
      label: "Scheduled start",
      type: "datetime",
      hint: "The job's scheduled start. Workiz schedules jobs by date-time, so this is the value " +
        "that puts the job on the dispatch board.",
    },
    { key: "JobEndDateTime", label: "Scheduled end", type: "datetime" },
    { key: "JobNotes", label: "Job notes", type: "text" },
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the create" },
    { key: "data", type: "array", label: "New job identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/job/create/", {
      method: "POST",
      body: compact(input, { authSecret: "auth_secret" }),
    });
  },
};

export default jobCreate;
