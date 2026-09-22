import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, csv, intList, LoftyClient } from "../lib/client.ts";

/**
 * `POST /v1.0/leads` — create a lead.
 *
 * Answers `{ "leadId": <id> }`, which is the handle every other lead
 * operation, and the task/note/communication sub-resources, take.
 *
 * ## Two ways to tag, and they mean different things
 *
 * `tags` **replaces** the lead's tags with the list supplied, while `tagsAdd`
 * only adds. On a create the two are often equivalent, but the distinction is
 * the reason both fields exist and a workflow that later updates the same lead
 * should know which one it used.
 *
 * ## Assignment skips routing
 *
 * Supplying `assignedUserId` assigns the lead directly and **skips automatic
 * lead routing**. Leave it unset and Lofty's own routing rules decide the
 * owner.
 *
 * ## The notice booleans send mail
 *
 * `welcomeEmail` and `leadAlert` are not stored flags — they cause Lofty to
 * send a welcome email to the lead and a new-lead alert to the agent. The spec
 * marks both "(Not supporting update)", so they only exist on create.
 */
interface Input {
  firstName: string;
  lastName?: string;
  emails?: string;
  phones?: string;
  leadTypes?: string;
  assignedUserId?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  referredBy?: string;
  stage?: string;
  groups?: string;
  segments?: string;
  tags?: string;
  tagsAdd?: string;
  source?: string;
  inquiry?: unknown;
  property?: unknown;
  unsubscription?: boolean;
  welcomeEmail?: boolean;
  leadAlert?: boolean;
  cannotText?: boolean;
  cannotCall?: boolean;
  cannotEmail?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a lead, optionally assigning an agent and skipping lead routing " +
    "(POST /v1.0/leads).",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated. e.g. jane.doe@example.com, jdoe-work@company.com",
    },
    {
      key: "phones",
      label: "Phones",
      type: "string",
      hint: "Comma-separated, no more than 20 characters per number. e.g. +14155551234",
    },
    {
      key: "leadTypes",
      label: "Lead type IDs",
      type: "string",
      hint: "Comma-separated ids: Other (-1), Seller (1), Buyer (2), Renter (5), Investor (6)...",
    },
    {
      key: "assignedUserId",
      label: "Assign to user ID",
      type: "number",
      hint: "Assigns directly and SKIPS automatic lead routing.",
    },
    { key: "source", label: "Source", type: "string" },
    { key: "stage", label: "Pipeline stage", type: "string", hint: "Under 20 characters." },
    { key: "segments", label: "Segments", type: "string", hint: "Comma-separated names." },
    {
      key: "tags",
      label: "Tags (replace)",
      type: "string",
      hint: "Comma-separated. Replaces the lead's tags.",
    },
    {
      key: "tagsAdd",
      label: "Tags (add)",
      type: "string",
      hint: "Comma-separated. Adds to existing tags instead of replacing them.",
    },
    { key: "groups", label: "Groups", type: "string", advanced: true, hint: "Comma-separated." },
    { key: "referredBy", label: "Referred by", type: "string", advanced: true },
    {
      key: "streetAddress",
      label: "Street address",
      type: "string",
      advanced: true,
      hint: "Deprecated by Lofty in favour of the `property` object.",
    },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "zipCode", label: "Zip code", type: "string", advanced: true },
    {
      key: "property",
      label: "Property",
      type: "json",
      advanced: true,
      hint: "Lofty's lead property / mailing-address object.",
    },
    {
      key: "inquiry",
      label: "Inquiry",
      type: "json",
      advanced: true,
      hint: "Lofty's lead inquiry object.",
    },
    {
      key: "welcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      hint: "Causes Lofty to email the lead. Create-only.",
    },
    {
      key: "leadAlert",
      label: "Send new-lead alert",
      type: "boolean",
      hint: "Causes Lofty to alert the agent. Create-only.",
    },
    { key: "unsubscription", label: "Unsubscribe", type: "boolean", advanced: true },
    { key: "cannotText", label: "Cannot text", type: "boolean", advanced: true },
    { key: "cannotCall", label: "Cannot call", type: "boolean", advanced: true },
    { key: "cannotEmail", label: "Cannot email", type: "boolean", advanced: true },
  ],
  output: [{ key: "leadId", type: "number", label: "Created lead ID" }],

  execute(input, ctx) {
    const body = compact({
      firstName: input.firstName,
      lastName: input.lastName,
      emails: csv(input.emails),
      phones: csv(input.phones),
      leadTypes: intList(input.leadTypes),
      assignedUserId: input.assignedUserId,
      streetAddress: input.streetAddress,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      referredBy: input.referredBy,
      stage: input.stage,
      groups: csv(input.groups),
      segments: csv(input.segments),
      tags: csv(input.tags),
      tagsAdd: csv(input.tagsAdd),
      source: input.source,
      inquiry: asOptionalJson<Record<string, unknown>>(input.inquiry, "`inquiry`"),
      property: asOptionalJson<Record<string, unknown>>(input.property, "`property`"),
      unsubscription: input.unsubscription,
      welcomeEmail: input.welcomeEmail,
      leadAlert: input.leadAlert,
      cannotText: input.cannotText,
      cannotCall: input.cannotCall,
      cannotEmail: input.cannotEmail,
    });
    return new LoftyClient(ctx).request<{ leadId?: number }>("/leads", { method: "POST", body });
  },
};

export default action;
