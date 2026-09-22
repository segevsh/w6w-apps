import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";

interface Input {
  leads: Array<Record<string, unknown>>;
}

/**
 * `POST /api/public/blacklist/AddLeads` — exclude leads from every campaign.
 *
 * ## An entry needs one of four identifiers, and they are not equivalent
 *
 * The 200 schema in the document declares only `profileUrl` on an entry — but
 * the operation's own `description` documents four (`linkedInProfileId`,
 * `profileUrl`, `email`, `fullName`), says **at least one is required**, and
 * explains what each one does. That prose is the contract this action follows:
 * the schema is a generator artifact, thin enough that following it would make
 * two of the four identifiers unreachable.
 *
 *  - `linkedInProfileId` — the `linkedin_id` HeyReach already holds. Exact, and
 *    it skips resolution entirely, so the entry is never left `Matching`.
 *  - `profileUrl` — a LinkedIn profile or Sales Navigator URL. Normalized, so
 *    every spelling of the same profile collapses onto one entry.
 *  - `email` — a real address; spends one reverse-lookup credit when the
 *    workspace has reverse lookup enabled and the email is not already held.
 *  - `fullName` — a name-only rule. Never sent to a resolution vendor; it
 *    excludes by exact, case-insensitive name comparison and always reports
 *    `BroadMatch`.
 *
 * ## A 200 does not mean every entry landed
 *
 * The document says this outright. Read the response per entry: `added` is how
 * many were newly created, `entries` carries one row per input (correlated by
 * `inputIndex`, with `created: false` when the lead was already blacklisted),
 * `duplicates` lists identifiers already present or repeated in the batch, and
 * `validationErrors` carries one message per entry that was skipped — an
 * invalid URL, or an entry with no identifier at all.
 *
 * `idempotent: true`: re-adding a blacklisted identifier reports it as a
 * duplicate rather than storing it twice, which is what makes a retry safe.
 */
const action: ActionDefinition<Input> = {
  key: "blacklist-add-leads",
  type: "perform",
  resource: "blacklist",
  title: "Add Leads to Blacklist",
  description:
    "Blacklist up to 100 leads by LinkedIn member id, profile URL, email or full name, so no " +
    "campaign in this workspace contacts them (POST /api/public/blacklist/AddLeads).",
  idempotent: true,
  params: [
    {
      key: "leads",
      label: "Leads",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          {
            key: "linkedInProfileId",
            label: "LinkedIn member ID",
            type: "string",
            hint: "The `linkedin_id` HeyReach already holds. Exact, and skips resolution.",
          },
          {
            key: "profileUrl",
            label: "LinkedIn profile URL",
            type: "string",
            placeholder: "https://www.linkedin.com/in/john-doe/",
            hint: "LinkedIn profile or Sales Navigator URL. The legacy /pub/ form, company " +
              "URLs and bare domains are rejected.",
          },
          {
            key: "email",
            label: "Email address",
            type: "string",
            hint: "Spends a reverse-lookup credit when the workspace has it enabled.",
          },
          {
            key: "fullName",
            label: "Full name",
            type: "string",
            hint: "A name-only rule: excludes by exact, case-insensitive name comparison.",
          },
        ],
      },
      hint: "Up to 100 entries. Each needs at least one identifier, or it is reported in " +
        "`validationErrors`.",
    },
  ],
  output: [
    { key: "added", type: "number", label: "Entries newly created" },
    { key: "entries", type: "array", label: "One row per input (inputIndex, id, created)" },
    { key: "duplicates", type: "array", label: "Identifiers already blacklisted or repeated" },
    { key: "validationErrors", type: "array", label: "Entries that were skipped, with reasons" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/blacklist/AddLeads", {
      method: "POST",
      body: { leads: input.leads },
    });
  },
};

export default action;
