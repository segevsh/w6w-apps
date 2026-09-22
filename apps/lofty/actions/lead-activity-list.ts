import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/leads/{leadId}/activities` — the lead's site-tracked activity.
 *
 * Answers a bare array of browse / search / favourite / showing-request /
 * submission events across tracking types 1, 2, 3, 23 and 39, merged and sorted
 * by created time descending. Each row has `type`, `text`, `link`, `picture`,
 * an optional `listing`, and `created` — a **millisecond** epoch, unlike the
 * formatted date strings the task and note endpoints use.
 *
 * ## Paging is pages, and the page size is not yours to choose
 *
 * The only knob is `curPage` (zero-based); the page size is fixed at 100. So
 * the way to read a long history is to keep asking for the next page until a
 * short or empty one comes back — `offset`/`limit` are not accepted here.
 */
interface Input {
  leadId: number;
  curPage?: number;
}

const action: ActionDefinition<Input> = {
  key: "lead-activity-list",
  type: "read",
  resource: "activity",
  title: "List Lead Activities",
  description: "List a lead's site-tracked activities (GET /v1.0/leads/{leadId}/activities).",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead whose site activity to read.",
    },
    {
      key: "curPage",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Zero-based page index. The page size is fixed at 100.",
    },
  ],
  output: [{ key: "", type: "array", label: "Activities, newest first" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request(`/leads/${input.leadId}/activities`, {
      query: { curPage: input.curPage },
    });
  },
};

export default action;
