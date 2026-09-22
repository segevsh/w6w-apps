import type { ActionDefinition } from "@w6w/types";
import { compact, WorkizClient } from "../lib/client.ts";
import { addressAndContactFields, authSecretParam, sourceFields } from "../lib/params.ts";
import type { WriteAck } from "../lib/schema.ts";

/**
 * `POST /lead/create/` — create a lead.
 *
 * Every body field is optional in the vendor's `leadBody` schema, `auth_secret`
 * included, but the account token in the path is a different secret from
 * `auth_secret` and this app always sends both: the path token authenticates
 * the account, `auth_secret` is what Workiz's own examples carry as
 * `"sec_xyz"`.
 *
 * The response is `{flag, data: [{UUID, ClientId, link}]}` — the new lead's
 * UUID is the value every other lead action takes, so a workflow that creates a
 * lead should keep `data[0].UUID`. `flag: false` is the vendor refusing the
 * call; `data` is then empty.
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
  LeadDateTime?: string;
  LeadEndDateTime?: string;
  LeadLost?: number;
  LeadNotes?: string;
  [key: string]: unknown;
}

const leadCreate: ActionDefinition<Input, WriteAck> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a Workiz lead and return its UUID, client id and web-app link.",
  idempotent: false,
  params: [
    authSecretParam(),
    ...addressAndContactFields(),
    ...sourceFields(),
    {
      key: "Created",
      label: "Created",
      type: "datetime",
      hint: "When the lead was created, if it is being backfilled from another system.",
    },
    { key: "CreatedBy", label: "Created by", type: "string" },
    {
      key: "LeadDateTime",
      label: "Scheduled start",
      type: "datetime",
      hint: "The lead's scheduled start, matching the field on the lead record.",
    },
    { key: "LeadEndDateTime", label: "Scheduled end", type: "datetime" },
    {
      key: "LeadNotes",
      label: "Lead notes",
      type: "text",
      hint: "Free-text notes attached to the lead.",
    },
    {
      key: "LeadLost",
      label: "Lead lost",
      type: "number",
      hint: "Workiz's integer lost flag (1 or 0); send 1 to mark the lead lost at creation.",
    },
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the create" },
    { key: "data", type: "array", label: "New lead identity (UUID, ClientId, link)" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<WriteAck>("/lead/create/", {
      method: "POST",
      body: compact(input, { authSecret: "auth_secret" }),
    });
  },
};

export default leadCreate;
