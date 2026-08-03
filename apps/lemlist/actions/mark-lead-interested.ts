import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
  campaignId?: string;
}

/**
 * Mark a lead interested — **two different endpoints**, chosen by scope.
 *
 *   - no campaign → `POST /leads/interested/{leadIdOrEmail}`, which lemlist
 *     documents as "Mark a lead as interested across ALL campaigns".
 *   - a campaign  → `POST /campaigns/{campaignId}/leads/{leadIdOrEmail}/interested`,
 *     which scopes the change to that campaign.
 *
 * Both are real, separately documented routes ("Mark Lead as Interested" and
 * "Mark Lead as Interested in Campaign"). Collapsing them into one action with
 * an optional `campaignId` matches how a workflow thinks about it, and the
 * blast-radius difference is stated on the param rather than buried: without a
 * campaign this stops the lead everywhere.
 *
 * `idempotent: true` — marking an already-interested lead interested again
 * lands on the same state.
 */
const markLeadInterested: ActionDefinition<Input> = {
  key: "mark-lead-interested",
  type: "perform",
  resource: "lead",
  title: "Mark Lead as Interested",
  description:
    "Mark a lead interested. Scoped to one campaign when Campaign id is set, otherwise applied across every campaign the lead is in.",
  idempotent: true,
  params: [
    {
      key: "leadIdOrEmail",
      label: "Lead id or email",
      type: "string",
      required: true,
      placeholder: "lea_8xJSc7sV7ggpiVnXe",
      hint: "lemlist accepts either a `lea_...` id or the lead's email address.",
    },
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
      hint: "Leave empty to mark the lead interested across ALL campaigns — a different lemlist " +
        "endpoint with a much wider blast radius.",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Updated lead records" }],

  execute(input, ctx) {
    const id = encodeURIComponent(input.leadIdOrEmail);
    const path = input.campaignId
      ? `/campaigns/${encodeURIComponent(input.campaignId)}/leads/${id}/interested`
      : `/leads/interested/${id}`;
    return new LemlistClient(ctx).request(path, { method: "POST" });
  },
};

export default markLeadInterested;
