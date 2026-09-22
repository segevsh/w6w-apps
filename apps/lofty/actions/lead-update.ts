import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, csv, intList, LoftyClient } from "../lib/client.ts";

/**
 * `PUT /v1.0/leads/{leadId}` — update a lead.
 *
 * Answers `{ "leadId": <id> }`. The caller must have manage permission on the
 * lead.
 *
 * ## Tag editing is three fields plus a sledgehammer
 *
 * `tags` replaces the whole set, `tagsAdd` and `tagsRemove` edit by literal
 * name, and `clearAllTags` removes everything and **takes precedence over the
 * other three**. Sending `clearAllTags` alongside a tag list therefore ends
 * with no tags at all, which is why it is a distinct, advanced field here.
 *
 * ## Deprecated address fields still work
 *
 * `streetAddress`, `city`, `state` and `zipCode` are documented as deprecated
 * in favour of the `property` object, but remain part of the body and are
 * exposed for accounts still using them. Prefer `property` on a new workflow.
 *
 * ## The rest of the body
 *
 * The spec shows 17 further fields beyond the ones implemented here without
 * naming them, so nothing is guessed at — the documented subset is complete and
 * anything unmapped can be added once its shape is confirmed.
 */
interface Input {
  leadId: number;
  firstName?: string;
  lastName?: string;
  emails?: string;
  phones?: string;
  leadTypes?: string;
  assignedUserId?: number;
  stage?: string;
  source?: string;
  groups?: string;
  segments?: string;
  tags?: string;
  tagsAdd?: string;
  tagsRemove?: string;
  clearAllTags?: boolean;
  isHidden?: boolean;
  referredBy?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  inquiry?: unknown;
  property?: unknown;
  cannotText?: boolean;
  cannotCall?: boolean;
  cannotEmail?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description:
    "Update a lead's fields, assignment, tags and pipeline stage (PUT /v1.0/leads/{leadId}).",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead to update.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "emails", label: "Emails", type: "string", hint: "Comma-separated." },
    { key: "phones", label: "Phones", type: "string", hint: "Comma-separated." },
    { key: "leadTypes", label: "Lead type IDs", type: "string", hint: "Comma-separated ids." },
    {
      key: "assignedUserId",
      label: "Assign to user ID",
      type: "number",
      hint: "Change the owner. See List Team Members for the ids.",
    },
    { key: "stage", label: "Pipeline stage", type: "string" },
    { key: "source", label: "Source", type: "string" },
    { key: "segments", label: "Segments", type: "string", hint: "Comma-separated names." },
    { key: "groups", label: "Groups", type: "string", advanced: true, hint: "Comma-separated." },
    {
      key: "tags",
      label: "Tags (replace)",
      type: "string",
      hint: "Comma-separated. Replaces the lead's entire tag set.",
    },
    {
      key: "tagsAdd",
      label: "Tags to add",
      type: "string",
      hint: "Comma-separated names, added to the existing tags.",
    },
    {
      key: "tagsRemove",
      label: "Tags to remove",
      type: "string",
      hint: "Comma-separated names. Only tags already on the lead are affected.",
    },
    {
      key: "clearAllTags",
      label: "Clear all tags",
      type: "boolean",
      hint: "Removes every tag and takes precedence over Tags, Tags to add and Tags to remove.",
    },
    { key: "isHidden", label: "Hidden", type: "boolean", advanced: true },
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
    { key: "property", label: "Property", type: "json", advanced: true },
    { key: "inquiry", label: "Inquiry", type: "json", advanced: true },
    { key: "cannotText", label: "Cannot text", type: "boolean", advanced: true },
    { key: "cannotCall", label: "Cannot call", type: "boolean", advanced: true },
    { key: "cannotEmail", label: "Cannot email", type: "boolean", advanced: true },
  ],
  output: [{ key: "leadId", type: "number", label: "Updated lead ID" }],

  execute(input, ctx) {
    const body = compact({
      firstName: input.firstName,
      lastName: input.lastName,
      emails: csv(input.emails),
      phones: csv(input.phones),
      leadTypes: intList(input.leadTypes),
      assignedUserId: input.assignedUserId,
      stage: input.stage,
      source: input.source,
      groups: csv(input.groups),
      segments: csv(input.segments),
      tags: csv(input.tags),
      tagsAdd: csv(input.tagsAdd),
      tagsRemove: csv(input.tagsRemove),
      clearAllTags: input.clearAllTags,
      isHidden: input.isHidden,
      referredBy: input.referredBy,
      streetAddress: input.streetAddress,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      inquiry: asOptionalJson<Record<string, unknown>>(input.inquiry, "`inquiry`"),
      property: asOptionalJson<Record<string, unknown>>(input.property, "`property`"),
      cannotText: input.cannotText,
      cannotCall: input.cannotCall,
      cannotEmail: input.cannotEmail,
    });
    return new LoftyClient(ctx).request<{ leadId?: number }>(`/leads/${input.leadId}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
