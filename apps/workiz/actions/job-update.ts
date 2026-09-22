import type { ActionDefinition } from "@w6w/types";
import { compact, WorkizClient } from "../lib/client.ts";
import { addressAndContactFields, authSecretParam, sourceFields } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /job/update/` — update a job.
 *
 * `UUID` and `auth_secret` are both required in practice: Workiz's own note on
 * `UUID` is that "the value of the job's unique id field … is required to
 * update a job", and `auth_secret` is the job's per-record secret from a
 * `job-get` or `job-create` response. `Status` and `SubStatus` move the job
 * through the pipeline; `Tags` replaces its tag list.
 *
 * Sending the same body twice leaves the job in the same state, so this is safe
 * to retry.
 */
interface Input {
  uuid: string;
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
  CreatedBy?: string;
  JobDateTime?: string;
  JobEndDateTime?: string;
  JobNotes?: string;
  Status?: string;
  SubStatus?: string;
  Tags?: string[];
  [key: string]: unknown;
}

const jobUpdate: ActionDefinition<Input, WriteAck> = {
  key: "job-update",
  type: "perform",
  resource: "job",
  title: "Update Job",
  description: "Update a job's fields, status, sub-status and tags.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Job UUID",
      type: "string",
      required: true,
      hint: "The job's unique id. Workiz requires it in practice even though the schema lists " +
        "it as optional.",
    },
    authSecretParam(),
    ...addressAndContactFields(),
    ...sourceFields(),
    { key: "CreatedBy", label: "Created by", type: "string" },
    { key: "JobDateTime", label: "Scheduled start", type: "datetime" },
    { key: "JobEndDateTime", label: "Scheduled end", type: "datetime" },
    { key: "JobNotes", label: "Job notes", type: "text" },
    { key: "Status", label: "Status", type: "string" },
    { key: "SubStatus", label: "Sub-status", type: "string" },
    {
      key: "Tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replace the job's tag list.",
    },
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the update" },
    { key: "data", type: "array", label: "Updated job identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/job/update/", {
      method: "POST",
      body: compact(input, { authSecret: "auth_secret", uuid: "UUID" }),
    });
  },
};

export default jobUpdate;
