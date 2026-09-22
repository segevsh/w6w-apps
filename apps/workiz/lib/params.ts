import type { Param } from "@w6w/types";

/**
 * Param groups shared by the lead and job actions.
 *
 * Workiz's two record types (a lead and a job) carry almost the same body:
 * the address/contact block, the job-source block, a schedule pair and a notes
 * field. The bodies differ in the schedule field names (`LeadDateTime` /
 * `LeadEndDateTime` vs `JobDateTime` / `JobEndDateTime`), in the notes key, and
 * in which lifecycle fields the update bodies add. Only those differences are
 * declared per action; everything shared lives here.
 *
 * Field names are Workiz's own literal wire names — the mixed PascalCase and
 * `auth_secret` snake_case is not normalised, because the wire format is
 * whatever the vendor declared.
 */

/** `GET /lead/all/` and `GET /job/all/` take the identical filter set. */
export function listFilters(): Param[] {
  return [
    {
      key: "start_date",
      label: "Start date",
      type: "date",
      hint: "The earliest CreatedDate to return, as yyyy-MM-dd. Workiz's own NOTICE: if " +
        "start_date is not provided, the default range is the last 14 days.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "How many matching records to skip. Workiz's default is 0.",
    },
    {
      key: "records",
      label: "Records",
      type: "number",
      default: 100,
      hint: "How many records to return. Workiz's default is 100 and its declared maximum is 100.",
    },
    {
      key: "only_open",
      label: "Only open",
      type: "boolean",
      default: true,
      hint: "On by default, matching Workiz: open records only, excluding the Done and Canceled " +
        "statuses. Turn it off to include every record in range.",
    },
    {
      key: "status",
      label: "Statuses",
      type: "array",
      item: { type: "string", placeholder: "In progress" },
      hint: "Optional list of literal Workiz status values to filter by, e.g. Submited, " +
        "In progress. Sent as a repeated status parameter. Leave empty for every status.",
    },
  ];
}

/** The client/address block every lead and job body shares. */
export function addressAndContactFields(): Param[] {
  return [
    {
      key: "ClientId",
      label: "Client ID",
      type: "number",
      hint: "The numeric Workiz client id to attach the record to, when it is already known.",
    },
    { key: "Address", label: "Address", type: "string" },
    { key: "City", label: "City", type: "string" },
    { key: "State", label: "State", type: "string" },
    { key: "PostalCode", label: "Postal code", type: "string" },
    { key: "Country", label: "Country", type: "string" },
    { key: "Unit", label: "Unit", type: "string" },
    { key: "FirstName", label: "First name", type: "string" },
    { key: "LastName", label: "Last name", type: "string" },
    { key: "Company", label: "Company", type: "string" },
    { key: "Email", label: "Email", type: "string" },
    { key: "Phone", label: "Phone", type: "string" },
    { key: "PhoneExt", label: "Phone extension", type: "string" },
    { key: "SecondPhone", label: "Second phone", type: "string" },
    { key: "SecondPhoneExt", label: "Second phone extension", type: "string" },
    {
      key: "Timezone",
      label: "Time zone",
      type: "string",
      hint: "The record's IANA time zone, e.g. America/New_York.",
    },
    { key: "ServiceArea", label: "Service area", type: "string" },
  ];
}

/** Where the record came from — shared by every lead and job body. */
export function sourceFields(): Param[] {
  return [
    {
      key: "JobSource",
      label: "Job source",
      type: "string",
      hint: "The lead/job source, e.g. the channel a lead arrived through.",
    },
    { key: "JobType", label: "Job type", type: "string" },
    { key: "ReferralCompany", label: "Referral company", type: "string" },
  ];
}

/**
 * The per-record `auth_secret`.
 *
 * A separate secret from the account API token: Workiz returns it inside the
 * create/get response for a lead or job, and every write against an existing
 * record must hand it back. It is per-record, not per-connection, so it is a
 * plain action input rather than something `sign` injects.
 */
export function authSecretParam(): Param {
  return {
    key: "authSecret",
    label: "Record auth secret",
    type: "string",
    required: true,
    hint: "The record's own auth_secret, returned by the lead/job create or get response. " +
      "This is per-record — it is not the account API token the connection stores.",
  };
}
