import type { ActionDefinition } from "@w6w/types";
import { compact, WorkizClient } from "../lib/client.ts";
import { addressAndContactFields, authSecretParam, sourceFields } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /lead/update/` — update a lead.
 *
 * `UUID` identifies the lead and is **required in practice**: Workiz's own note
 * on the field is that "the value of the lead's unique id field … is required to
 * update a lead", even though the schema lists it alongside the optional
 * fields. `auth_secret`, the lead's own per-record secret, is required the same
 * way — read it off a `lead-get` or the `lead-create` response.
 *
 * `Status` moves the lead through Workiz's pipeline, and `Tags` is the only
 * array-valued field on this body. The response is the same
 * `{flag, data: [{UUID, ClientId, link}]}` envelope the create returns.
 *
 * Sending the same body twice leaves the lead in the same state, so this is
 * safe to retry.
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
  LeadDateTime?: string;
  LeadEndDateTime?: string;
  LeadNotes?: string;
  Status?: string;
  Tags?: string[];
  [key: string]: unknown;
}

const leadUpdate: ActionDefinition<Input, WriteAck> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a lead's fields, status and tags.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Lead UUID",
      type: "string",
      required: true,
      hint: "The lead's unique id. Workiz requires it in practice even though the schema lists " +
        "it as optional.",
    },
    authSecretParam(),
    ...addressAndContactFields(),
    ...sourceFields(),
    { key: "CreatedBy", label: "Created by", type: "string" },
    { key: "LeadDateTime", label: "Scheduled start", type: "datetime" },
    { key: "LeadEndDateTime", label: "Scheduled end", type: "datetime" },
    { key: "LeadNotes", label: "Lead notes", type: "text" },
    {
      key: "Status",
      label: "Status",
      type: "string",
      hint: "The lead's pipeline status, e.g. the vendor's own Submited spelling or In progress.",
    },
    {
      key: "Tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replace the lead's tag list.",
    },
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the update" },
    { key: "data", type: "array", label: "Updated lead identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/lead/update/", {
      method: "POST",
      body: compact(input, { authSecret: "auth_secret", uuid: "UUID" }),
    });
  },
};

export default leadUpdate;
