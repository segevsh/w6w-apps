import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
  campaignId?: string;
}

/**
 * Mark a lead not interested — **two different endpoints**, chosen by scope.
 *
 *   - no campaign → `POST /leads/notinterested/{leadIdOrEmail}` ("across all
 *     campaigns").
 *   - a campaign  → `POST /campaigns/{campaignId}/leads/{leadIdOrEmail}/notinterested`.
 *
 * Note the path segment is `notinterested` — **one word, all lowercase**, not
 * `not-interested` or `notInterested`. lemlist's other lead states are
 * camelCased in payloads (`notInterested` is a valid lead `state` value), so the
 * flat spelling in the URL is a genuine inconsistency and an easy thing to get
 * wrong. `tests/actions/mark-lead-not-interested.test.ts` pins the exact path.
 */
const markLeadNotInterested: ActionDefinition<Input> = {
  key: "mark-lead-not-interested",
  type: "perform",
  resource: "lead",
  title: "Mark Lead as Not Interested",
  description:
    "Mark a lead not interested. Scoped to one campaign when Campaign id is set, otherwise applied across every campaign the lead is in.",
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
      hint:
        "Leave empty to mark the lead not interested across ALL campaigns — a different lemlist " +
        "endpoint with a much wider blast radius.",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Updated lead records" }],

  execute(input, ctx) {
    const id = encodeURIComponent(input.leadIdOrEmail);
    const path = input.campaignId
      ? `/campaigns/${encodeURIComponent(input.campaignId)}/leads/${id}/notinterested`
      : `/leads/notinterested/${id}`;
    return new LemlistClient(ctx).request(path, { method: "POST" });
  },
};

export default markLeadNotInterested;
