import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, stringList, V2 } from "../lib/client.ts";
import { leadOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
  title?: string;
  description?: string;
  userId?: string;
  step?: string;
  createdAt?: string;
  tags?: unknown;
}

/**
 * `PUT /api/v2/leads/{id}` — update a lead.
 *
 * Verified against the Update-a-lead table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22): `id` is the only required
 * parameter and every other row is optional, so this is a partial update.
 *
 * Two documented restrictions are worth repeating here because they surprise
 * callers:
 *
 *   - "If the lead is not assigned, the only parameters that can be updated on
 *     the lead are the `user_id`, the `title` and the `description` of the
 *     lead, all other parameters will be ignored." That is why `step` and
 *     `tags` carry an assign-first warning.
 *   - `user_id` is "the new user id or user email of the lead", i.e. a
 *     reassignment, and it is documented as erroring under USER-token auth.
 *
 * The document's table also lists `status`, `estimated_closing_date`, `fields`
 * and `append_desc`. They are deliberately not exposed: the reviewed surface
 * for this app is create/get/list/update/delete over a lead's own fields, and
 * the `fields`/`append_desc` pair is an alternative code path into the
 * description (`description` and `fields` are documented as mutually
 * exclusive).
 *
 * Idempotent: `PUT` converges on the values sent, so a retry cannot duplicate
 * anything.
 */
const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a lead's title, description, assignee, step, creation date or tags " +
    "(PUT /api/v2/leads/{id}).",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "userId",
      label: "Assign to",
      type: "string",
      hint: "User id or email of the lead's new owner. API-key connections only — the document " +
        "states this parameter errors under USER-token authentication.",
    },
    {
      key: "step",
      label: "Step",
      type: "string",
      hint: "Step id or name. Ignored while the lead is unassigned — assign it first.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "`YYYY-MM-DD HH:MM:SS` in the account's time zone, or `YYYY-MM-DDTHH:MM:SS.sssZ` in " +
        "UTC.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string", placeholder: "prospect" },
      advanced: true,
      hint: "Tags to attach. Ignored while the lead is unassigned.",
    },
  ],
  output: leadOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/leads/${encodeURIComponent(input.leadId)}`, {
      method: "PUT",
      body: {
        title: input.title,
        description: input.description,
        user_id: input.userId,
        step: input.step,
        created_at: input.createdAt,
        tags: stringList(input.tags),
      },
    });
  },
};

export default leadUpdate;
